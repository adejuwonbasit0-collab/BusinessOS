"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ProjectController_1 = require("../controllers/ProjectController");
const authenticate_1 = require("../middleware/authenticate");
const middleware_1 = require("../middleware");
const validation_1 = require("../lib/validation");
const router = (0, express_1.Router)();
const ctrl = new ProjectController_1.ProjectController();
router.use(authenticate_1.authenticate, middleware_1.rateLimiter);
router.get('/', ctrl.listProjects);
router.post('/', (0, validation_1.requireFields)('name'), ctrl.createProject);
router.get('/stats', ctrl.stats);
// ── Static sub-routes must be declared before '/:id' ─────────────────────────
// Express matches routes in registration order, so '/:id' registered first
// would swallow '/tasks/all' (as id = 'tasks') and '/tasks/:id/status'.
router.get('/tasks/all', ctrl.listTasks);
router.post('/tasks', (0, validation_1.requireFields)('title'), ctrl.createTask);
router.patch('/tasks/:id/status', ctrl.updateTaskStatus);
router.post('/tasks/:id/comments', ctrl.addComment);
router.post('/milestones', (0, validation_1.requireFields)('projectId', 'name'), ctrl.createMilestone);
router.get('/:id', ctrl.getProject);
router.patch('/:id/status', ctrl.updateProjectStatus);
exports.default = router;
//# sourceMappingURL=projects.js.map