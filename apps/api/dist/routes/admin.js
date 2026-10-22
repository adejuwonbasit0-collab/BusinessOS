"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AdminController_1 = require("../controllers/AdminController");
const authenticate_1 = require("../middleware/authenticate");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
const ctrl = new AdminController_1.AdminController();
// All admin routes require authentication AND super_admin role.
// The rate limiter runs last so that only authorised super admins draw from
// their own budget.
router.use(authenticate_1.authenticate, (0, authenticate_1.authorize)('super_admin'), middleware_1.rateLimiter);
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
exports.default = router;
//# sourceMappingURL=admin.js.map