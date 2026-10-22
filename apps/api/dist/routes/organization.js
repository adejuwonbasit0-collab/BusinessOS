"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.departmentsRouter = exports.rolesRouter = exports.branchesRouter = void 0;
const express_1 = require("express");
const BranchController_1 = require("../controllers/BranchController");
const RoleController_1 = require("../controllers/RoleController");
const DepartmentController_1 = require("../controllers/DepartmentController");
const authenticate_1 = require("../middleware/authenticate");
const middleware_1 = require("../middleware");
const validation_1 = require("../lib/validation");
// ── Branches ───────────────────────────────────────────────────────────────
const branchesRouter = (0, express_1.Router)();
exports.branchesRouter = branchesRouter;
const branchCtrl = new BranchController_1.BranchController();
branchesRouter.use(authenticate_1.authenticate, middleware_1.rateLimiter);
branchesRouter.get('/', branchCtrl.list);
branchesRouter.post('/', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), (0, validation_1.requireFields)('name'), branchCtrl.create);
branchesRouter.get('/regional-report', branchCtrl.regionalReport);
branchesRouter.get('/:id', branchCtrl.getOne);
branchesRouter.patch('/:id', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), branchCtrl.update);
branchesRouter.delete('/:id', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), branchCtrl.delete);
// ── Roles ──────────────────────────────────────────────────────────────────
const rolesRouter = (0, express_1.Router)();
exports.rolesRouter = rolesRouter;
const roleCtrl = new RoleController_1.RoleController();
rolesRouter.use(authenticate_1.authenticate, middleware_1.rateLimiter);
rolesRouter.get('/', roleCtrl.list);
rolesRouter.get('/permissions-catalog', roleCtrl.permissionsCatalog);
rolesRouter.get('/access-matrix', roleCtrl.accessMatrix);
rolesRouter.post('/', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), (0, validation_1.requireFields)('name'), roleCtrl.create);
rolesRouter.patch('/:id', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), roleCtrl.update);
rolesRouter.delete('/:id', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), roleCtrl.delete);
rolesRouter.post('/:id/assign', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), roleCtrl.assignToUser);
rolesRouter.post('/scopes', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), roleCtrl.setScope);
// ── Departments ────────────────────────────────────────────────────────────
const departmentsRouter = (0, express_1.Router)();
exports.departmentsRouter = departmentsRouter;
const deptCtrl = new DepartmentController_1.DepartmentController();
departmentsRouter.use(authenticate_1.authenticate, middleware_1.rateLimiter);
departmentsRouter.get('/', deptCtrl.list);
departmentsRouter.post('/', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), (0, validation_1.requireFields)('name'), deptCtrl.create);
departmentsRouter.patch('/:id', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), deptCtrl.update);
departmentsRouter.delete('/:id', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), deptCtrl.delete);
//# sourceMappingURL=organization.js.map