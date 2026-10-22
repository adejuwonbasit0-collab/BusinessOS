import { Router } from 'express';
import { ProjectController } from '../controllers/ProjectController';
import { authenticate } from '../middleware/authenticate';
import { rateLimiter } from '../middleware';
import { requireFields } from '../lib/validation';

const router = Router();
const ctrl = new ProjectController();
router.use(authenticate, rateLimiter);

router.get('/', ctrl.listProjects);
router.post('/', requireFields('name'), ctrl.createProject);
router.get('/stats', ctrl.stats);

// ── Static sub-routes must be declared before '/:id' ─────────────────────────
// Express matches routes in registration order, so '/:id' registered first
// would swallow '/tasks/all' (as id = 'tasks') and '/tasks/:id/status'.
router.get('/tasks/all', ctrl.listTasks);
router.post('/tasks', requireFields('title'), ctrl.createTask);
router.patch('/tasks/:id/status', ctrl.updateTaskStatus);
router.post('/tasks/:id/comments', ctrl.addComment);

router.post('/milestones', requireFields('projectId', 'name'), ctrl.createMilestone);

router.get('/:id', ctrl.getProject);
router.patch('/:id/status', ctrl.updateProjectStatus);

export default router;
