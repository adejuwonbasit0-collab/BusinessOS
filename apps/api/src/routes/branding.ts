import { Router } from 'express';
import { BrandingController, brandingUpload } from '../controllers/BrandingController';
import { authenticate, authorize } from '../middleware/authenticate';
import { rateLimiter } from '../middleware';

const router = Router();
const ctrl = new BrandingController();

// The public lookup resolves the business that owns a hostname. It is the
// only route on this router that does not require a session, and it exposes
// branding only — never records.
router.get('/public', ctrl.getPublicBranding);
router.get('/public-site', ctrl.getPublicSite);

router.use(authenticate, rateLimiter);

router.get('/', ctrl.getBranding);
router.patch('/', authorize('super_admin', 'owner', 'admin'), ctrl.updateBranding);
router.post('/preview', ctrl.previewBranding);
router.post('/assets', authorize('super_admin', 'owner', 'admin'), brandingUpload, ctrl.uploadAssetHandler);

export default router;
