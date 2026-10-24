import { Router } from 'express';
import { WebsiteController } from '../controllers/WebsiteController';
import { authenticate, authorize } from '../middleware/authenticate';
import { rateLimiter } from '../middleware';

const router = Router();
const ctrl = new WebsiteController();
router.use(authenticate, rateLimiter);
router.get('/', ctrl.list);
router.post('/', authorize('super_admin', 'owner', 'admin'), ctrl.createOrUpdate);
export default router;
