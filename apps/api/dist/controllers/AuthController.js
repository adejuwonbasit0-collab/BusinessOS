"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const otplib_1 = require("otplib");
const database_1 = require("../lib/database");
const redis_1 = require("../lib/redis");
const errors_1 = require("../lib/errors");
const EmailService_1 = require("../services/EmailService");
const index_1 = require("../services/index");
const index_2 = require("../services/index");
const ACCESS_TOKEN_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = 30;
function signAccessToken(user, tenantId) {
    return jsonwebtoken_1.default.sign({ sub: user.id, tenantId, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
}
function serializeUser(user) {
    return {
        id: user.id, tenantId: user.tenant_id, email: user.email,
        firstName: user.first_name, lastName: user.last_name,
        displayName: user.display_name || `${user.first_name} ${user.last_name}`,
        avatarUrl: user.avatar_url, role: user.role,
        isEmailVerified: user.is_email_verified, twoFactorEnabled: user.two_factor_enabled,
        timezone: user.timezone, locale: user.locale, preferences: user.preferences,
        createdAt: user.created_at,
    };
}
function serializeTenant(tenant) {
    return {
        id: tenant.id, name: tenant.name, slug: tenant.slug, subdomain: tenant.subdomain,
        customDomain: tenant.custom_domain, status: tenant.status, planName: tenant.plan_name,
        planSlug: tenant.plan_slug, primaryColor: tenant.primary_color, secondaryColor: tenant.secondary_color,
        logoUrl: tenant.logo_url, timezone: tenant.timezone, currency: tenant.currency, locale: tenant.locale,
        trialEndsAt: tenant.trial_ends_at, subscriptionStatus: tenant.subscription_status,
        usersCount: tenant.users_count, storageUsedBytes: tenant.storage_used_bytes,
        industry: tenant.industry, enabledModules: tenant.enabled_modules,
        featureAi: tenant.feature_ai, featureCustomDomain: tenant.feature_custom_domain,
        featureWhiteLabel: tenant.feature_white_label, featureSso: tenant.feature_sso,
        featureAuditLogs: tenant.feature_audit_logs, featureApiAccess: tenant.feature_api_access,
        featureAdvancedAnalytics: tenant.feature_advanced_analytics,
        maxUsers: tenant.max_users, maxStorageGb: tenant.max_storage_gb, maxWorkflows: tenant.max_workflows,
        maxBranches: tenant.max_branches,
    };
}
async function createSession(userId, req) {
    const refreshToken = crypto_1.default.randomBytes(40).toString('hex');
    const refreshTokenHash = crypto_1.default.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 86400000);
    await (0, database_1.db)('user_sessions').insert({
        user_id: userId, refresh_token_hash: refreshTokenHash,
        ip_address: req.ip, user_agent: req.headers['user-agent'],
        expires_at: expiresAt,
    });
    return refreshToken;
}
class AuthController {
    // ── POST /auth/register ─────────────────────────────────────────────────────
    register = async (req, res) => {
        const { firstName, lastName, email, password, businessName, plan = 'starter' } = req.body;
        const existingUser = await (0, database_1.db)('users').where({ email: email.toLowerCase() }).first();
        if (existingUser)
            throw new errors_1.AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
        const planRecord = await (0, database_1.db)('plans').where({ slug: plan }).first();
        if (!planRecord)
            throw new errors_1.AppError('Invalid plan selected', 400, 'INVALID_PLAN');
        const slug = await index_1.TenantService.generateUniqueSlug(businessName);
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const result = await database_1.db.transaction(async (trx) => {
            const [tenant] = await trx('tenants').insert({
                name: businessName, slug, subdomain: slug, plan_id: planRecord.id,
                status: 'trial', subscription_status: 'trialing', users_count: 1,
                enabled_modules: JSON.stringify(['crm', 'finance', 'workflows']),
            }).returning('*');
            const [user] = await trx('users').insert({
                tenant_id: tenant.id, email: email.toLowerCase(), password_hash: passwordHash,
                first_name: firstName, last_name: lastName, role: 'owner', status: 'active',
                is_email_verified: false,
            }).returning('*');
            return { tenant, user };
        });
        const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
        await redis_1.redis.set(`email_verify:${verificationToken}`, result.user.id, 'EX', 86400);
        EmailService_1.EmailService.sendVerificationEmail(result.user.email, verificationToken, result.tenant).catch(() => { });
        const accessToken = signAccessToken(result.user, result.tenant.id);
        const refreshToken = await createSession(result.user.id, req);
        res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60000 });
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 86400000 });
        index_2.AuditService.log({ tenantId: result.tenant.id, userId: result.user.id, action: 'user.register', resourceType: 'user', resourceId: result.user.id, ip: req.ip });
        res.status(201).json({
            success: true,
            data: { user: serializeUser(result.user), tenant: serializeTenant({ ...result.tenant, plan_name: planRecord.name, plan_slug: planRecord.slug }), tokens: { accessToken, refreshToken } },
        });
    };
    // ── POST /auth/login ──────────────────────────────────────────────────────
    login = async (req, res) => {
        const { email, password, rememberMe } = req.body;
        const user = await (0, database_1.db)('users')
            .join('tenants', 'users.tenant_id', 'tenants.id')
            .join('plans', 'tenants.plan_id', 'plans.id')
            .where({ 'users.email': email.toLowerCase() })
            .whereNull('users.deleted_at')
            .select('users.*', 'tenants.*', 'users.id as user_id', 'tenants.id as tenant_id', 'plans.name as plan_name', 'plans.slug as plan_slug', 'plans.feature_ai', 'plans.feature_custom_domain', 'plans.feature_white_label', 'plans.feature_sso', 'plans.feature_audit_logs', 'plans.feature_api_access', 'plans.feature_advanced_analytics', 'plans.max_users', 'plans.max_storage_gb', 'plans.max_workflows', 'plans.max_branches')
            .first();
        if (!user || !user.password_hash)
            throw new errors_1.AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
        const isValid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isValid) {
            index_2.AuditService.log({ action: 'user.login.failed', ip: req.ip, status: 'failure', description: `Failed login for ${email}` });
            throw new errors_1.AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
        }
        if (user.status === 'suspended')
            throw new errors_1.AppError('Your account has been suspended', 403, 'ACCOUNT_SUSPENDED');
        if (user.two_factor_enabled) {
            const tempToken = jsonwebtoken_1.default.sign({ sub: user.user_id, purpose: '2fa' }, process.env.JWT_SECRET, { expiresIn: '5m' });
            return res.json({ success: true, data: { requiresTwoFactor: true, tempToken } });
        }
        await (0, database_1.db)('users').where({ id: user.user_id }).update({ last_login_at: new Date() });
        const accessToken = signAccessToken({ id: user.user_id, role: user.role, email: user.email }, user.tenant_id);
        const refreshToken = await createSession(user.user_id, req);
        index_2.AuditService.log({ tenantId: user.tenant_id, userId: user.user_id, action: 'user.login', ip: req.ip });
        res.cookie('accessToken', accessToken, { httpOnly: true, sameSite: 'lax', maxAge: 15 * 60000 });
        res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'lax', maxAge: (rememberMe ? 30 : 1) * 86400000 });
        return res.json({
            success: true,
            data: { user: serializeUser({ ...user, id: user.user_id }), tenant: serializeTenant(user), tokens: { accessToken, refreshToken } },
        });
    };
    // ── POST /auth/2fa/verify ─────────────────────────────────────────────────
    verify2FA = async (req, res) => {
        const { tempToken, code } = req.body;
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(tempToken, process.env.JWT_SECRET);
            if (payload.purpose !== '2fa')
                throw new Error();
        }
        catch {
            throw new errors_1.AppError('Invalid or expired verification session', 401, 'INVALID_TEMP_TOKEN');
        }
        const user = await (0, database_1.db)('users').join('tenants', 'users.tenant_id', 'tenants.id').join('plans', 'tenants.plan_id', 'plans.id')
            .where({ 'users.id': payload.sub })
            .select('users.*', 'tenants.*', 'users.id as user_id', 'tenants.id as tenant_id', 'plans.name as plan_name', 'plans.slug as plan_slug')
            .first();
        if (!user)
            throw new errors_1.AppError('User not found', 404, 'NOT_FOUND');
        const isValidTotp = otplib_1.authenticator.check(code, user.two_factor_secret);
        const backupCodes = user.two_factor_backup_codes || [];
        const isBackupCode = backupCodes.includes(code);
        if (!isValidTotp && !isBackupCode)
            throw new errors_1.AppError('Invalid verification code', 401, 'INVALID_2FA_CODE');
        if (isBackupCode) {
            await (0, database_1.db)('users').where({ id: user.user_id }).update({ two_factor_backup_codes: backupCodes.filter((c) => c !== code) });
        }
        await (0, database_1.db)('users').where({ id: user.user_id }).update({ last_login_at: new Date() });
        const accessToken = signAccessToken({ id: user.user_id, role: user.role, email: user.email }, user.tenant_id);
        const refreshToken = await createSession(user.user_id, req);
        res.json({
            success: true,
            data: { user: serializeUser({ ...user, id: user.user_id }), tenant: serializeTenant(user), tokens: { accessToken, refreshToken } },
        });
    };
    // ── POST /auth/2fa/setup ──────────────────────────────────────────────────
    setup2FA = async (req, res) => {
        const secret = otplib_1.authenticator.generateSecret();
        const otpauth = otplib_1.authenticator.keyuri(req.user.email, 'NexOS', secret);
        await redis_1.redis.set(`2fa_setup:${req.user.id}`, secret, 'EX', 600);
        res.json({ success: true, data: { secret, otpauth } });
    };
    verifySetup2FA = async (req, res) => {
        const { token } = req.body;
        const secret = await redis_1.redis.get(`2fa_setup:${req.user.id}`);
        if (!secret)
            throw new errors_1.AppError('Setup session expired. Please try again.', 400, 'SETUP_EXPIRED');
        const isValid = otplib_1.authenticator.check(token, secret);
        if (!isValid)
            throw new errors_1.AppError('Invalid verification code', 400, 'INVALID_CODE');
        const backupCodes = Array.from({ length: 8 }, () => crypto_1.default.randomBytes(4).toString('hex'));
        await (0, database_1.db)('users').where({ id: req.user.id }).update({
            two_factor_enabled: true, two_factor_secret: secret, two_factor_backup_codes: backupCodes,
        });
        await redis_1.redis.del(`2fa_setup:${req.user.id}`);
        res.json({ success: true, data: { backupCodes } });
    };
    // ── POST /auth/logout ──────────────────────────────────────────────────────
    logout = async (req, res) => {
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {
            const hash = crypto_1.default.createHash('sha256').update(refreshToken).digest('hex');
            await (0, database_1.db)('user_sessions').where({ refresh_token_hash: hash }).delete();
        }
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        res.json({ success: true, message: 'Logged out' });
    };
    // ── POST /auth/refresh ─────────────────────────────────────────────────────
    refresh = async (req, res) => {
        const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
        if (!refreshToken)
            throw new errors_1.AppError('No refresh token provided', 401, 'NO_REFRESH_TOKEN');
        const hash = crypto_1.default.createHash('sha256').update(refreshToken).digest('hex');
        const session = await (0, database_1.db)('user_sessions').where({ refresh_token_hash: hash }).where('expires_at', '>', new Date()).first();
        if (!session)
            throw new errors_1.AppError('Invalid or expired session', 401, 'INVALID_SESSION');
        const user = await (0, database_1.db)('users').where({ id: session.user_id }).first();
        if (!user || user.status !== 'active')
            throw new errors_1.AppError('User not found or inactive', 401, 'USER_INACTIVE');
        await (0, database_1.db)('user_sessions').where({ id: session.id }).update({ last_used_at: new Date() });
        const accessToken = signAccessToken(user, user.tenant_id);
        res.cookie('accessToken', accessToken, { httpOnly: true, sameSite: 'lax', maxAge: 15 * 60000 });
        res.json({ success: true, data: { tokens: { accessToken } } });
    };
    // ── GET /auth/me ──────────────────────────────────────────────────────────
    me = async (req, res) => {
        const user = await (0, database_1.db)('users').where({ id: req.user.id }).first();
        // Only the plan's name and slug are pulled in under aliases. Selecting
        // `plans.*` here overwrote the workspace columns that share a name with
        // the plan (`id`, `name`, `slug`, `description`, `created_at`, …), so
        // `/auth/me` reported the *plan* as the workspace — the sidebar showed
        // "Enterprise" instead of "Acme Corp" and `tenant.id` was the plan id.
        const tenant = await (0, database_1.db)('tenants').join('plans', 'tenants.plan_id', 'plans.id')
            .where({ 'tenants.id': req.tenant.id })
            .select('tenants.*', 'plans.name as plan_name', 'plans.slug as plan_slug')
            .first();
        res.json({ success: true, data: { user: serializeUser(user), tenant: serializeTenant(tenant) } });
    };
    // ── GET /auth/verify-email/:token ─────────────────────────────────────────
    verifyEmail = async (req, res) => {
        const { token } = req.params;
        const userId = await redis_1.redis.get(`email_verify:${token}`);
        if (!userId)
            throw new errors_1.AppError('Invalid or expired verification link', 400, 'INVALID_TOKEN');
        await (0, database_1.db)('users').where({ id: userId }).update({ is_email_verified: true, email_verified_at: new Date() });
        await redis_1.redis.del(`email_verify:${token}`);
        res.json({ success: true, message: 'Email verified successfully' });
    };
    // ── POST /auth/forgot-password ────────────────────────────────────────────
    forgotPassword = async (req, res) => {
        const { email } = req.body;
        const user = await (0, database_1.db)('users').where({ email: email.toLowerCase() }).first();
        // Always return success to prevent email enumeration
        if (user) {
            const token = crypto_1.default.randomBytes(32).toString('hex');
            const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
            await (0, database_1.db)('password_reset_tokens').insert({
                user_id: user.id, token_hash: tokenHash, expires_at: new Date(Date.now() + 3600000),
            });
            const tenant = await (0, database_1.db)('tenants').where({ id: user.tenant_id }).first();
            EmailService_1.EmailService.sendPasswordReset(user.email, token, tenant).catch(() => { });
        }
        res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    };
    // ── POST /auth/reset-password ─────────────────────────────────────────────
    resetPassword = async (req, res) => {
        const { token, password } = req.body;
        const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
        const resetToken = await (0, database_1.db)('password_reset_tokens')
            .where({ token_hash: tokenHash }).whereNull('used_at').where('expires_at', '>', new Date()).first();
        if (!resetToken)
            throw new errors_1.AppError('Invalid or expired reset link', 400, 'INVALID_TOKEN');
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        await database_1.db.transaction(async (trx) => {
            await trx('users').where({ id: resetToken.user_id }).update({ password_hash: passwordHash });
            await trx('password_reset_tokens').where({ id: resetToken.id }).update({ used_at: new Date() });
            await trx('user_sessions').where({ user_id: resetToken.user_id }).delete();
        });
        res.json({ success: true, message: 'Password reset successfully. Please sign in.' });
    };
    // ── POST /auth/magic-link ─────────────────────────────────────────────────
    sendMagicLink = async (req, res) => {
        const { email } = req.body;
        const user = await (0, database_1.db)('users').where({ email: email.toLowerCase() }).first();
        if (user) {
            const token = crypto_1.default.randomBytes(32).toString('hex');
            await redis_1.redis.set(`magic_link:${token}`, user.id, 'EX', 900);
            const tenant = await (0, database_1.db)('tenants').where({ id: user.tenant_id }).first();
            EmailService_1.EmailService.sendMagicLink(user.email, token, tenant).catch(() => { });
        }
        res.json({ success: true, message: 'If an account exists, a sign-in link has been sent.' });
    };
    // ── GET /auth/sessions ─────────────────────────────────────────────────────
    getSessions = async (req, res) => {
        const sessions = await (0, database_1.db)('user_sessions').where({ user_id: req.user.id }).where('expires_at', '>', new Date()).orderBy('last_used_at', 'desc');
        res.json({ success: true, data: { sessions } });
    };
    revokeSession = async (req, res) => {
        const { sessionId } = req.params;
        await (0, database_1.db)('user_sessions').where({ id: sessionId, user_id: req.user.id }).delete();
        res.json({ success: true, message: 'Session revoked' });
    };
}
exports.AuthController = AuthController;
//# sourceMappingURL=AuthController.js.map