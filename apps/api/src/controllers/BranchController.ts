import { Request, Response } from 'express';
import { db } from '../lib/database';
import { AppError, NotFoundError } from '../lib/errors';
import { AuditService } from '../services/index';
import { toJsonb } from '../lib/validation';

export class BranchController {
  list = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const branches = await db('branches')
      .leftJoin('users as manager', 'branches.manager_id', 'manager.id')
      .where({ 'branches.tenant_id': tenantId }).whereNull('branches.deleted_at')
      .select('branches.*', db.raw("CONCAT(manager.first_name, ' ', manager.last_name) as manager_name"))
      .orderBy('branches.is_default', 'desc').orderBy('branches.name');

    res.json({ success: true, data: { branches } });
  };

  create = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { name, code, type = 'branch', phone, email, address, timezone, managerId } = req.body;

    const tenant = await db('tenants').join('plans', 'tenants.plan_id', 'plans.id').where({ 'tenants.id': tenantId }).first();
    if (tenant.max_branches !== -1) {
      const [{ count }] = await db('branches').where({ tenant_id: tenantId }).whereNull('deleted_at').count('id as count');
      if (parseInt(count as string) >= tenant.max_branches) {
        throw new AppError(`Branch limit (${tenant.max_branches}) reached for your plan. Please upgrade.`, 403, 'BRANCH_LIMIT');
      }
    }

    const [{ count: existingCount }] = await db('branches').where({ tenant_id: tenantId }).count('id as count');
    const isFirst = parseInt(existingCount as string) === 0;

    const [branch] = await db('branches').insert({
      tenant_id: tenantId, name, code, type, phone, email,
      address: toJsonb(address), timezone: timezone || 'UTC', manager_id: managerId || null,
      is_default: isFirst,
    }).returning('*');

    AuditService.log({ tenantId, userId: req.user!.id, action: 'branch.create', resourceType: 'branch', resourceId: branch.id, ip: req.ip });
    res.status(201).json({ success: true, data: { branch } });
  };

  getOne = async (req: Request, res: Response) => {
    const { id } = req.params;
    const branch = await db('branches').where({ id, tenant_id: req.tenant!.id }).whereNull('deleted_at').first();
    if (!branch) throw new NotFoundError('Branch');

    const [staffCount, departmentCount] = await Promise.all([
      db('users').where({ branch_id: id }).whereNull('deleted_at').count('id as count').first(),
      db('departments').where({ branch_id: id }).count('id as count').first(),
    ]);

    res.json({ success: true, data: { branch, staffCount: parseInt((staffCount as any).count), departmentCount: parseInt((departmentCount as any).count) } });
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const branch = await db('branches').where({ id, tenant_id: req.tenant!.id }).whereNull('deleted_at').first();
    if (!branch) throw new NotFoundError('Branch');

    const allowed = ['name', 'code', 'type', 'phone', 'email', 'address', 'timezone', 'manager_id', 'is_active'];
    const fieldMap: Record<string, string> = { managerId: 'manager_id', isActive: 'is_active' };
    const update: any = { updated_at: new Date() };
    for (const key of Object.keys(req.body)) {
      const dbKey = fieldMap[key] || (allowed.includes(key) ? key : null);
      if (!dbKey) continue;
      // `address` is a jsonb column — a bare string would make PostgreSQL
      // reject the statement with "invalid input syntax for type json".
      update[dbKey] = dbKey === 'address' ? toJsonb(req.body[key]) : req.body[key];
    }

    const [updated] = await db('branches').where({ id }).update(update).returning('*');
    res.json({ success: true, data: { branch: updated } });
  };

  delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    const branch = await db('branches').where({ id, tenant_id: req.tenant!.id }).whereNull('deleted_at').first();
    if (!branch) throw new NotFoundError('Branch');
    if (branch.is_default) throw new AppError('Cannot delete the default branch', 400, 'CANNOT_DELETE_DEFAULT');

    await db('branches').where({ id }).update({ deleted_at: new Date() });
    res.json({ success: true, message: 'Branch deleted' });
  };

  // ── Regional reporting ─────────────────────────────────────────────────────
  regionalReport = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const branches = await db('branches').where({ tenant_id: tenantId }).whereNull('deleted_at');

    const report = await Promise.all(branches.map(async (branch) => {
      const [revenue, staffCount] = await Promise.all([
        db('sales_orders').where({ tenant_id: tenantId, branch_id: branch.id }).sum('total as total').first(),
        db('users').where({ branch_id: branch.id }).whereNull('deleted_at').count('id as count').first(),
      ]);
      return {
        branchId: branch.id, branchName: branch.name,
        revenue: parseFloat((revenue as any)?.total || '0'),
        staffCount: parseInt((staffCount as any)?.count || '0'),
      };
    }));

    res.json({ success: true, data: { report } });
  };
}
