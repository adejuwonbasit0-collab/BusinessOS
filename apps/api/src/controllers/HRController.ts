import { Request, Response } from 'express';
import { db } from '../lib/database';
import { AppError, NotFoundError, ValidationError } from '../lib/errors';
import { AuditService } from '../services/index';

export class HRController {
  // ── Staff directory (reuses users table) ──────────────────────────────────
  listStaff = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const staff = await db('users')
      .leftJoin('departments', 'users.department_id', 'departments.id')
      .leftJoin('branches', 'users.branch_id', 'branches.id')
      .where({ 'users.tenant_id': tenantId }).whereNull('users.deleted_at')
      .select('users.id', 'users.first_name', 'users.last_name', 'users.email', 'users.role', 'users.status', 'users.avatar_url', 'departments.name as department_name', 'branches.name as branch_name')
      .orderBy('users.first_name');
    res.json({ success: true, data: { staff } });
  };

  // ── Attendance ─────────────────────────────────────────────────────────────
  checkIn = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const userId = req.body.userId || req.user!.id;
    const today = new Date().toISOString().slice(0, 10);

    const existing = await db('attendance_records').where({ user_id: userId, date: today }).first();
    if (existing) throw new AppError('Already checked in today', 400, 'ALREADY_CHECKED_IN');

    const [record] = await db('attendance_records').insert({
      tenant_id: tenantId, user_id: userId, branch_id: req.user!.branch_id || null, date: today, check_in_at: new Date(), status: 'present',
    }).returning('*');

    res.status(201).json({ success: true, data: { record } });
  };

  checkOut = async (req: Request, res: Response) => {
    const userId = req.body.userId || req.user!.id;
    const today = new Date().toISOString().slice(0, 10);

    const record = await db('attendance_records').where({ user_id: userId, date: today }).first();
    if (!record) throw new NotFoundError('Attendance record');

    const hoursWorked = record.check_in_at ? (Date.now() - new Date(record.check_in_at).getTime()) / 3600000 : 0;
    await db('attendance_records').where({ id: record.id }).update({ check_out_at: new Date(), hours_worked: Math.round(hoursWorked * 100) / 100 });

    res.json({ success: true, message: 'Checked out' });
  };

  listAttendance = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { userId, startDate, endDate } = req.query as any;
    let query = db('attendance_records').join('users', 'attendance_records.user_id', 'users.id').where({ 'attendance_records.tenant_id': tenantId });
    if (userId) query = query.where('attendance_records.user_id', userId);
    if (startDate) query = query.where('attendance_records.date', '>=', startDate);
    if (endDate) query = query.where('attendance_records.date', '<=', endDate);

    const records = await query.select('attendance_records.*', db.raw("CONCAT(users.first_name, ' ', users.last_name) as user_name")).orderBy('attendance_records.date', 'desc').limit(100);
    res.json({ success: true, data: { records } });
  };

  // ── Leave management ───────────────────────────────────────────────────────
  listLeaveTypes = async (req: Request, res: Response) => {
    const types = await db('leave_types').where({ tenant_id: req.tenant!.id });
    res.json({ success: true, data: { leaveTypes: types } });
  };

  createLeaveType = async (req: Request, res: Response) => {
    const { name, defaultDaysPerYear, requiresApproval, isPaid } = req.body;
    const [type] = await db('leave_types').insert({
      tenant_id: req.tenant!.id, name, default_days_per_year: defaultDaysPerYear || 0,
      requires_approval: requiresApproval !== false, is_paid: isPaid !== false,
    }).returning('*');
    res.status(201).json({ success: true, data: { leaveType: type } });
  };

  listLeaveRequests = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { status, userId } = req.query as any;
    let query = db('leave_requests').join('users', 'leave_requests.user_id', 'users.id').join('leave_types', 'leave_requests.leave_type_id', 'leave_types.id')
      .where({ 'leave_requests.tenant_id': tenantId });
    if (status) query = query.where('leave_requests.status', status);
    if (userId) query = query.where('leave_requests.user_id', userId);

    const requests = await query.select('leave_requests.*', db.raw("CONCAT(users.first_name, ' ', users.last_name) as user_name"), 'leave_types.name as leave_type_name').orderBy('leave_requests.created_at', 'desc');
    res.json({ success: true, data: { requests } });
  };

  requestLeave = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { leaveTypeId, startDate, endDate, reason } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new ValidationError([
        { field: 'startDate', message: 'must be a valid date' },
        { field: 'endDate', message: 'must be a valid date' },
      ]);
    }
    if (end < start) {
      throw new AppError('The end date must not be before the start date', 400, 'INVALID_DATE_RANGE');
    }
    const days = (end.getTime() - start.getTime()) / 86400000 + 1;

    const [request] = await db('leave_requests').insert({
      tenant_id: tenantId, user_id: req.user!.id, leave_type_id: leaveTypeId,
      start_date: startDate, end_date: endDate, total_days: days, reason,
    }).returning('*');

    res.status(201).json({ success: true, data: { request } });
  };

  decideLeaveRequest = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { decision, rejectionReason } = req.body; // decision: 'approved' | 'rejected'
    const request = await db('leave_requests').where({ id, tenant_id: req.tenant!.id }).first();
    if (!request) throw new NotFoundError('Leave request');

    await db('leave_requests').where({ id }).update({
      status: decision, approved_by: req.user!.id, approved_at: new Date(), rejection_reason: decision === 'rejected' ? rejectionReason : null,
    });

    if (decision === 'approved') {
      const year = new Date(request.start_date).getFullYear();
      const existing = await db('leave_balances').where({ user_id: request.user_id, leave_type_id: request.leave_type_id, year }).first();
      if (existing) {
        await db('leave_balances').where({ id: existing.id }).update({ used_days: db.raw('used_days + ?', [request.total_days]) });
      }
    }

    res.json({ success: true, message: `Leave request ${decision}` });
  };

  // ── Payroll ────────────────────────────────────────────────────────────────
  listPayrollRuns = async (req: Request, res: Response) => {
    const runs = await db('payroll_runs').where({ tenant_id: req.tenant!.id }).orderBy('period_start', 'desc');
    res.json({ success: true, data: { runs } });
  };

  createPayrollRun = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { periodLabel, periodStart, periodEnd } = req.body;

    // The latest compensation record per user.
    //
    // This used to select `MAX(id)` grouped by user, but `id` is a random
    // v4 uuid — PostgreSQL has no `max(uuid)` aggregate, so the query failed
    // with "function max(uuid) does not exist" and every payroll run 500'd.
    // `DISTINCT ON` picks the most recent record per user by effective date.
    const compensations = await db('compensation_records as cr')
      .join('users as u', 'cr.user_id', 'u.id')
      .where({ 'u.tenant_id': tenantId }).whereNull('u.deleted_at')
      .distinctOn('cr.user_id')
      .orderBy('cr.user_id')
      .orderBy('cr.effective_date', 'desc')
      .orderBy('cr.created_at', 'desc')
      .select('cr.*');

    const result = await db.transaction(async (trx) => {
      let totalGross = 0;
      const [run] = await trx('payroll_runs').insert({
        tenant_id: tenantId, period_label: periodLabel, period_start: periodStart, period_end: periodEnd, status: 'processing',
      }).returning('*');

      for (const comp of compensations) {
        // `numeric` columns are returned by node-postgres as strings, so the
        // value has to be parsed before it takes part in arithmetic —
        // otherwise `totalGross += baseSalary` concatenates instead of adding
        // and the payroll run fails with "invalid input syntax for type numeric".
        const baseSalary = parseFloat(comp.base_salary);
        const monthlyGross = comp.pay_frequency === 'annually' ? baseSalary / 12 : baseSalary;
        const tax = monthlyGross * 0.2; // simplified flat estimate; real systems use tax tables
        const net = monthlyGross - tax;
        totalGross += monthlyGross;

        await trx('payslips').insert({
          tenant_id: tenantId, payroll_run_id: run.id, user_id: comp.user_id,
          base_salary: monthlyGross, tax_amount: tax, net_pay: net,
        });
      }

      const [updated] = await trx('payroll_runs').where({ id: run.id }).update({
        status: 'completed', total_gross: totalGross, total_deductions: totalGross * 0.2, total_net: totalGross * 0.8,
        processed_by: req.user!.id, processed_at: new Date(),
      }).returning('*');

      return updated;
    });

    AuditService.log({ tenantId, userId: req.user!.id, action: 'payroll.process', resourceType: 'payroll_run', resourceId: result.id, ip: req.ip });
    res.status(201).json({ success: true, data: { run: result } });
  };

  listPayslips = async (req: Request, res: Response) => {
    const { runId, userId } = req.query as any;
    let query = db('payslips').join('users', 'payslips.user_id', 'users.id').where({ 'payslips.tenant_id': req.tenant!.id });
    if (runId) query = query.where('payslips.payroll_run_id', runId);
    if (userId) query = query.where('payslips.user_id', userId);
    const payslips = await query.select('payslips.*', db.raw("CONCAT(users.first_name, ' ', users.last_name) as user_name"));
    res.json({ success: true, data: { payslips } });
  };

  setCompensation = async (req: Request, res: Response) => {
    const { userId, baseSalary, payFrequency = 'monthly', effectiveDate } = req.body;
    const [comp] = await db('compensation_records').insert({
      tenant_id: req.tenant!.id, user_id: userId, base_salary: baseSalary, pay_frequency: payFrequency, effective_date: effectiveDate || new Date(),
    }).returning('*');
    res.status(201).json({ success: true, data: { compensation: comp } });
  };

  // ── Recruitment ────────────────────────────────────────────────────────────
  listJobOpenings = async (req: Request, res: Response) => {
    const openings = await db('job_openings').where({ tenant_id: req.tenant!.id }).orderBy('created_at', 'desc');
    const withCandidateCounts = await Promise.all(openings.map(async (o) => {
      const [{ count }] = await db('job_candidates').where({ job_opening_id: o.id }).count('id as count');
      return { ...o, candidateCount: parseInt(count as string) };
    }));
    res.json({ success: true, data: { openings: withCandidateCounts } });
  };

  createJobOpening = async (req: Request, res: Response) => {
    const { title, description, departmentId, branchId, employmentType, openingsCount, salaryMin, salaryMax } = req.body;
    const [opening] = await db('job_openings').insert({
      tenant_id: req.tenant!.id, title, description, department_id: departmentId || null, branch_id: branchId || null,
      employment_type: employmentType || 'full_time', openings_count: openingsCount || 1, salary_min: salaryMin, salary_max: salaryMax,
      hiring_manager_id: req.user!.id,
    }).returning('*');
    res.status(201).json({ success: true, data: { opening } });
  };

  listCandidates = async (req: Request, res: Response) => {
    const { jobOpeningId } = req.query as any;
    let query = db('job_candidates').where({ tenant_id: req.tenant!.id });
    if (jobOpeningId) query = query.where('job_opening_id', jobOpeningId);
    const candidates = await query.orderBy('created_at', 'desc');
    res.json({ success: true, data: { candidates } });
  };

  addCandidate = async (req: Request, res: Response) => {
    const { jobOpeningId, firstName, lastName, email, phone } = req.body;
    const [candidate] = await db('job_candidates').insert({
      tenant_id: req.tenant!.id, job_opening_id: jobOpeningId, first_name: firstName, last_name: lastName, email, phone,
    }).returning('*');
    res.status(201).json({ success: true, data: { candidate } });
  };

  moveCandidateStage = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { stage } = req.body;
    const candidate = await db('job_candidates').where({ id, tenant_id: req.tenant!.id }).first();
    if (!candidate) throw new NotFoundError('Candidate');
    await db('job_candidates').where({ id }).update({ stage, updated_at: new Date() });
    res.json({ success: true, message: 'Candidate stage updated' });
  };

  // ── Performance reviews ────────────────────────────────────────────────────
  listReviews = async (req: Request, res: Response) => {
    const { userId } = req.query as any;
    let query = db('performance_reviews').join('users', 'performance_reviews.user_id', 'users.id').where({ 'performance_reviews.tenant_id': req.tenant!.id });
    if (userId) query = query.where('performance_reviews.user_id', userId);
    const reviews = await query.select('performance_reviews.*', db.raw("CONCAT(users.first_name, ' ', users.last_name) as user_name")).orderBy('performance_reviews.created_at', 'desc');
    res.json({ success: true, data: { reviews } });
  };

  createReview = async (req: Request, res: Response) => {
    const { userId, reviewPeriod } = req.body;
    const [review] = await db('performance_reviews').insert({
      tenant_id: req.tenant!.id, user_id: userId, reviewer_id: req.user!.id, review_period: reviewPeriod,
    }).returning('*');
    res.status(201).json({ success: true, data: { review } });
  };

  completeReview = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { overallRating, competencyScores, strengths, areasForImprovement, goalsNextPeriod } = req.body;
    const review = await db('performance_reviews').where({ id, tenant_id: req.tenant!.id }).first();
    if (!review) throw new NotFoundError('Review');

    await db('performance_reviews').where({ id }).update({
      status: 'completed', overall_rating: overallRating, competency_scores: competencyScores || {},
      strengths, areas_for_improvement: areasForImprovement, goals_next_period: goalsNextPeriod, completed_at: new Date(),
    });
    res.json({ success: true, message: 'Review completed' });
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  stats = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const [headcount, pendingLeave, openJobs, todayAttendance] = await Promise.all([
      db('users').where({ tenant_id: tenantId, status: 'active' }).whereNull('deleted_at').count('id as count').first(),
      db('leave_requests').where({ tenant_id: tenantId, status: 'pending' }).count('id as count').first(),
      db('job_openings').where({ tenant_id: tenantId, status: 'open' }).count('id as count').first(),
      db('attendance_records').where({ tenant_id: tenantId, date: new Date().toISOString().slice(0, 10) }).count('id as count').first(),
    ]);
    res.json({
      success: true,
      data: {
        headcount: parseInt((headcount as any)?.count || '0'),
        pendingLeaveRequests: parseInt((pendingLeave as any)?.count || '0'),
        openJobOpenings: parseInt((openJobs as any)?.count || '0'),
        presentToday: parseInt((todayAttendance as any)?.count || '0'),
      },
    });
  };
}
