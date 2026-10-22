import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { AdminIndustryController } from '../controllers/AdminIndustryController';
import { authenticate, authorize } from '../middleware/authenticate';
import { rateLimiter } from '../middleware';

const router = Router();
const ctrl = new AdminController();
const industryCtrl = new AdminIndustryController();

// All admin routes require authentication AND super_admin role.
// The rate limiter runs last so that only authorised super admins draw from
// their own budget.
router.use(authenticate, authorize('super_admin'), rateLimiter);

router.get('/stats', ctrl.platformStats);

router.get('/tenants', ctrl.listTenants);
router.get('/tenants/:id', ctrl.getTenant);
router.post('/tenants/:id/suspend', ctrl.suspendTenant);
router.post('/tenants/:id/unsuspend', ctrl.unsuspendTenant);
router.delete('/tenants/:id', ctrl.deleteTenant);
router.post('/tenants/:id/impersonate', ctrl.impersonateTenant);

router.get('/users', ctrl.listAllUsers);
router.get('/audit-logs', ctrl.listAuditLogs);
router.get('/revenue', ctrl.revenueOverview);

// ── Business catalogue ────────────────────────────────────────────────────
// The platform owner manages the industry catalogue, its categories and the
// dashboard presets without editing application source code.
router.get('/industries', industryCtrl.listAll);
router.post('/industries', industryCtrl.createPreset);
router.patch('/industries/:key', industryCtrl.updatePreset);
router.delete('/industries/:key', industryCtrl.deactivatePreset);
router.post('/industry-categories', industryCtrl.createCategory);
router.patch('/industry-categories/:key', industryCtrl.updateCategory);
router.patch('/dashboard-presets/:key', industryCtrl.updateDashboardPreset);

export default router;
