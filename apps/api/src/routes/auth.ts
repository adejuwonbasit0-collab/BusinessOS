import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/AuthController';
import { authenticate } from '../middleware/authenticate';
import { asyncHandler, validate, authRateLimiter, authFloodLimiter } from '../middleware/index';

const router = Router();
const ctrl = new AuthController();

// The auth routes are unauthenticated, so the limiter falls back to keying on
// the client address. Only failed responses count towards it — a successful
// sign-in is legitimate traffic and must not eat into the budget shared by
// everyone behind the same address. `authRateLimiter` additionally applies a
// much tighter limit to the credential endpoints.
router.use(authFloodLimiter);

router.post('/register', authRateLimiter, [
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('businessName').notEmpty(),
], validate, asyncHandler(ctrl.register));

router.post('/login', authRateLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], validate, asyncHandler(ctrl.login));

router.post('/2fa/verify', asyncHandler(ctrl.verify2FA));
router.post('/2fa/setup', authenticate, asyncHandler(ctrl.setup2FA));
router.post('/2fa/verify-setup', authenticate, asyncHandler(ctrl.verifySetup2FA));

router.post('/logout', asyncHandler(ctrl.logout));
router.post('/refresh', asyncHandler(ctrl.refresh));
router.get('/me', authenticate, asyncHandler(ctrl.me));
router.get('/verify-email/:token', asyncHandler(ctrl.verifyEmail));
router.post('/forgot-password', authRateLimiter, asyncHandler(ctrl.forgotPassword));
router.post('/reset-password', asyncHandler(ctrl.resetPassword));
router.post('/magic-link', authRateLimiter, asyncHandler(ctrl.sendMagicLink));

router.get('/sessions', authenticate, asyncHandler(ctrl.getSessions));
router.delete('/sessions/:sessionId', authenticate, asyncHandler(ctrl.revokeSession));

export default router;
