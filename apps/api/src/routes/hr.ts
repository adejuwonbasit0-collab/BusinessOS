import { Router } from 'express';
import { HRController } from '../controllers/HRController';
import { authenticate, authorize } from '../middleware/authenticate';
import { rateLimiter } from '../middleware';
import { requireFields } from '../lib/validation';

const router = Router();
const ctrl = new HRController();
router.use(authenticate, rateLimiter);

router.get('/staff', ctrl.listStaff);

router.post('/attendance/check-in', ctrl.checkIn);
router.post('/attendance/check-out', ctrl.checkOut);
router.get('/attendance', ctrl.listAttendance);

router.get('/leave-types', ctrl.listLeaveTypes);
router.post('/leave-types', authorize('super_admin', 'owner', 'admin'), requireFields('name'), ctrl.createLeaveType);
router.get('/leave-requests', ctrl.listLeaveRequests);
router.post('/leave-requests', requireFields('leaveTypeId', 'startDate', 'endDate'), ctrl.requestLeave);
router.post('/leave-requests/:id/decide', authorize('super_admin', 'owner', 'admin', 'manager'), ctrl.decideLeaveRequest);

router.get('/payroll/runs', authorize('super_admin', 'owner', 'admin'), ctrl.listPayrollRuns);
router.post('/payroll/runs', authorize('super_admin', 'owner', 'admin'), requireFields('periodLabel', 'periodStart', 'periodEnd'), ctrl.createPayrollRun);
router.get('/payroll/payslips', ctrl.listPayslips);
router.post('/payroll/compensation', authorize('super_admin', 'owner', 'admin'), requireFields('userId', 'baseSalary'), ctrl.setCompensation);

router.get('/recruitment/openings', ctrl.listJobOpenings);
router.post('/recruitment/openings', authorize('super_admin', 'owner', 'admin', 'manager'), requireFields('title'), ctrl.createJobOpening);
router.get('/recruitment/candidates', ctrl.listCandidates);
router.post('/recruitment/candidates', authorize('super_admin', 'owner', 'admin', 'manager'), requireFields('jobOpeningId', 'firstName', 'lastName'), ctrl.addCandidate);
router.patch('/recruitment/candidates/:id/stage', authorize('super_admin', 'owner', 'admin', 'manager'), ctrl.moveCandidateStage);

router.get('/reviews', ctrl.listReviews);
router.post('/reviews', authorize('super_admin', 'owner', 'admin', 'manager'), requireFields('userId', 'reviewPeriod'), ctrl.createReview);
router.post('/reviews/:id/complete', authorize('super_admin', 'owner', 'admin', 'manager'), ctrl.completeReview);

router.get('/stats', ctrl.stats);

export default router;
