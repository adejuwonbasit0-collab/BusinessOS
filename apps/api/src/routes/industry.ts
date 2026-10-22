import { Router } from 'express';
import { IndustryController } from '../controllers/IndustryController';
import { authenticate, authorize } from '../middleware/authenticate';
import { rateLimiter } from '../middleware';
import { requireFields } from '../lib/validation';

const router = Router();
const ctrl = new IndustryController();
router.use(authenticate, rateLimiter);

router.get('/', ctrl.listPresets);
router.get('/categories', ctrl.listCategories);
router.get('/modules', ctrl.listModules);
router.get('/current', ctrl.getCurrentConfig);
router.post('/select', authorize('super_admin', 'owner', 'admin'), requireFields('industryKey'), ctrl.selectIndustry);
router.post('/custom', authorize('super_admin', 'owner', 'admin'), requireFields('name'), ctrl.createCustomIndustry);
router.patch('/modules', authorize('super_admin', 'owner', 'admin'), ctrl.toggleModule);

export default router;
