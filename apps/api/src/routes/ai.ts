import { Router } from 'express';
import { AIController } from '../controllers/AIController';
import { authenticate, authorize, requireFeature } from '../middleware/authenticate';
import { rateLimiter } from '../middleware';

const router = Router();
const ctrl = new AIController();

router.use(authenticate, rateLimiter);
router.use(requireFeature('ai'));

router.post('/analyze', ctrl.analyzeBusinessDescription);
router.post('/apply-analysis', authorize('super_admin', 'owner', 'admin'), ctrl.applyBusinessAnalysis);
router.post('/generate-workflow', ctrl.generateWorkflow);
router.post('/generate-report', ctrl.generateReport);
router.post('/generate-sops', ctrl.generateSOPs);
router.post('/generate-policies', ctrl.generatePolicies);
router.post('/generate-form', ctrl.generateForm);
router.post('/generate-website-content', ctrl.generateWebsiteContent);
router.post('/generate-dashboard', ctrl.generateDashboard);
router.post('/chat', ctrl.chat);
router.post('/score-lead', ctrl.scoreLead);
router.post('/generate-portal', ctrl.generatePortal);

export default router;
