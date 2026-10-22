import { Router } from 'express';
import { WorkflowController } from '../controllers/WorkflowController';
import { authenticate, authorize } from '../middleware/authenticate';
import { rateLimiter } from '../middleware';

const router = Router();
const ctrl = new WorkflowController();
router.use(authenticate, rateLimiter);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/stats', ctrl.stats);
router.get('/:id', ctrl.getOne);
router.patch('/:id', ctrl.update);
router.post('/:id/toggle', ctrl.toggle);
router.delete('/:id', authorize('super_admin', 'owner', 'admin'), ctrl.delete);
router.post('/:id/test-run', ctrl.testRun);
router.get('/:id/runs', ctrl.getRuns);
router.post('/:id/duplicate', ctrl.duplicate);

export default router;
