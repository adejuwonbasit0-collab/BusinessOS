"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const AuthController_1 = require("../controllers/AuthController");
const authenticate_1 = require("../middleware/authenticate");
const index_1 = require("../middleware/index");
const router = (0, express_1.Router)();
const ctrl = new AuthController_1.AuthController();
// The auth routes are unauthenticated, so the limiter falls back to keying on
// the client address. Only failed responses count towards it — a successful
// sign-in is legitimate traffic and must not eat into the budget shared by
// everyone behind the same address. `authRateLimiter` additionally applies a
// much tighter limit to the credential endpoints.
router.use(index_1.authFloodLimiter);
router.post('/register', index_1.authRateLimiter, [
    (0, express_validator_1.body)('firstName').notEmpty(),
    (0, express_validator_1.body)('lastName').notEmpty(),
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 8 }),
    (0, express_validator_1.body)('businessName').notEmpty(),
], index_1.validate, (0, index_1.asyncHandler)(ctrl.register));
router.post('/login', index_1.authRateLimiter, [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty(),
], index_1.validate, (0, index_1.asyncHandler)(ctrl.login));
router.post('/2fa/verify', (0, index_1.asyncHandler)(ctrl.verify2FA));
router.post('/2fa/setup', authenticate_1.authenticate, (0, index_1.asyncHandler)(ctrl.setup2FA));
router.post('/2fa/verify-setup', authenticate_1.authenticate, (0, index_1.asyncHandler)(ctrl.verifySetup2FA));
router.post('/logout', (0, index_1.asyncHandler)(ctrl.logout));
router.post('/refresh', (0, index_1.asyncHandler)(ctrl.refresh));
router.get('/me', authenticate_1.authenticate, (0, index_1.asyncHandler)(ctrl.me));
router.get('/verify-email/:token', (0, index_1.asyncHandler)(ctrl.verifyEmail));
router.post('/forgot-password', index_1.authRateLimiter, (0, index_1.asyncHandler)(ctrl.forgotPassword));
router.post('/reset-password', (0, index_1.asyncHandler)(ctrl.resetPassword));
router.post('/magic-link', index_1.authRateLimiter, (0, index_1.asyncHandler)(ctrl.sendMagicLink));
router.get('/sessions', authenticate_1.authenticate, (0, index_1.asyncHandler)(ctrl.getSessions));
router.delete('/sessions/:sessionId', authenticate_1.authenticate, (0, index_1.asyncHandler)(ctrl.revokeSession));
exports.default = router;
//# sourceMappingURL=auth.js.map