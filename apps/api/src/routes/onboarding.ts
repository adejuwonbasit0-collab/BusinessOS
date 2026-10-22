import { Router } from 'express';
import { OnboardingController } from '../controllers/OnboardingController';
import { authenticate, authorize } from '../middleware/authenticate';
import { rateLimiter } from '../middleware';
import { requireFields } from '../lib/validation';

const router = Router();
const ctrl = new OnboardingController();

router.use(authenticate, rateLimiter);

router.get('/state', ctrl.getState);
router.put('/state', ctrl.saveState);
router.post('/recommend', requireFields('description'), ctrl.recommend);
router.post('/complete', authorize('super_admin', 'owner', 'admin'), ctrl.complete);
router.post('/reset', authorize('super_admin', 'owner', 'admin'), ctrl.reset);

export default router;
