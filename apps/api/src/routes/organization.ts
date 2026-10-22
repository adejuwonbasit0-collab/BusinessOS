import { Router } from 'express';
import { BranchController } from '../controllers/BranchController';
import { RoleController } from '../controllers/RoleController';
import { DepartmentController } from '../controllers/DepartmentController';
import { authenticate, authorize } from '../middleware/authenticate';
import { rateLimiter } from '../middleware';
import { requireFields } from '../lib/validation';

// ── Branches ───────────────────────────────────────────────────────────────
const branchesRouter = Router();
const branchCtrl = new BranchController();
branchesRouter.use(authenticate, rateLimiter);
branchesRouter.get('/', branchCtrl.list);
branchesRouter.post('/', authorize('super_admin', 'owner', 'admin'), requireFields('name'), branchCtrl.create);
branchesRouter.get('/regional-report', branchCtrl.regionalReport);
branchesRouter.get('/:id', branchCtrl.getOne);
branchesRouter.patch('/:id', authorize('super_admin', 'owner', 'admin'), branchCtrl.update);
branchesRouter.delete('/:id', authorize('super_admin', 'owner', 'admin'), branchCtrl.delete);

// ── Roles ──────────────────────────────────────────────────────────────────
const rolesRouter = Router();
const roleCtrl = new RoleController();
rolesRouter.use(authenticate, rateLimiter);
rolesRouter.get('/', roleCtrl.list);
rolesRouter.get('/permissions-catalog', roleCtrl.permissionsCatalog);
rolesRouter.get('/access-matrix', roleCtrl.accessMatrix);
rolesRouter.post('/', authorize('super_admin', 'owner', 'admin'), requireFields('name'), roleCtrl.create);
rolesRouter.patch('/:id', authorize('super_admin', 'owner', 'admin'), roleCtrl.update);
rolesRouter.delete('/:id', authorize('super_admin', 'owner', 'admin'), roleCtrl.delete);
rolesRouter.post('/:id/assign', authorize('super_admin', 'owner', 'admin'), roleCtrl.assignToUser);
rolesRouter.post('/scopes', authorize('super_admin', 'owner', 'admin'), roleCtrl.setScope);

// ── Departments ────────────────────────────────────────────────────────────
const departmentsRouter = Router();
const deptCtrl = new DepartmentController();
departmentsRouter.use(authenticate, rateLimiter);
departmentsRouter.get('/', deptCtrl.list);
departmentsRouter.post('/', authorize('super_admin', 'owner', 'admin'), requireFields('name'), deptCtrl.create);
departmentsRouter.patch('/:id', authorize('super_admin', 'owner', 'admin'), deptCtrl.update);
departmentsRouter.delete('/:id', authorize('super_admin', 'owner', 'admin'), deptCtrl.delete);

export { branchesRouter, rolesRouter, departmentsRouter };
