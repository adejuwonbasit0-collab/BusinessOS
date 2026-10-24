import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import { db } from '../lib/database';
import { redis } from '../lib/redis';
import { AppError } from '../lib/errors';
import { EmailService } from '../services/EmailService';
import { TenantService } from '../services/index';
import { AuditService } from '../services/index';
import { resolveTenantByHostname } from '../services/TenantContextService';

const ACCESS_TOKEN_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = 30;

/**
 * Converts a free-form string into a URL-safe slug.
 *
 * Used for the workspace subdomain derived from the user's preferred
 * username (or, as a fallback, the business name). The result is always
 * lowercase, contains only letters, digits and single hyphens, and never
 * starts or ends with a hyphen — matching the validation on the register
 * form so a value the user typed is the value that becomes the hostname.
 */
function slugify(value: string): string {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Whether a sign-in is blocked until the address is verified.
 *
 * Off by default — the upgrade brief only requires enforcement when it has
 * been configured as mandatory.
 */
const REQUIRE_EMAIL_VERIFICATION = (process.env.REQUIRE_EMAIL_VERIFICATION || 'false').toLowerCase() === 'true';

function signAccessToken(user: any, tenantId: string) {
  return jwt.sign(
    { sub: user.id, tenantId, role: user.role, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_EXPIRES } as any
  );
}

function serializeUser(user: any) {
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

function serializeTenant(tenant: any) {
  return {
    id: tenant.id, name: tenant.name, slug: tenant.slug, subdomain: tenant.subdomain,
    customDomain: tenant.custom_domain, status: tenant.status, planName: tenant.plan_name,
    planSlug: tenant.plan_slug, primaryColor: tenant.primary_color, secondaryColor: tenant.secondary_color,
    logoUrl: tenant.logo_url, logoLightUrl: tenant.logo_light_url, logoDarkUrl: tenant.logo_dark_url,
    faviconUrl: tenant.favicon_url, brandFont: tenant.brand_font,
    legalName: tenant.legal_name, tradingName: tenant.trading_name, description: tenant.description,
    country: tenant.country, socialLinks: tenant.social_links || {},
    dateFormat: tenant.date_format, numberFormat: tenant.number_format,
    timezone: tenant.timezone, currency: tenant.currency, locale: tenant.locale,
    trialEndsAt: tenant.trial_ends_at, subscriptionStatus: tenant.subscription_status,
    usersCount: tenant.users_count, storageUsedBytes: tenant.storage_used_bytes,
    industry: tenant.industry, enabledModules: tenant.enabled_modules || [],
    onboardingCompleted: tenant.onboarding_completed === true,
    onboardingStep: tenant.onboarding_step || 'business',
    dashboardPresetKey: tenant.dashboard_preset_key || 'general',
    featureAi: tenant.feature_ai, featureCustomDomain: tenant.feature_custom_domain,
    featureWhiteLabel: tenant.feature_white_label, featureSso: tenant.feature_sso,
    featureAuditLogs: tenant.feature_audit_logs, featureApiAccess: tenant.feature_api_access,
    featureAdvancedAnalytics: tenant.feature_advanced_analytics,
    maxUsers: tenant.max_users, maxStorageGb: tenant.max_storage_gb, maxWorkflows: tenant.max_workflows,
    maxBranches: tenant.max_branches,
  };
}

async function createSession(userId: string, req: Request) {
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 86400000);

  await db('user_sessions').insert({
    user_id: userId, refresh_token_hash: refreshTokenHash,
    ip_address: req.ip, user_agent: req.headers['user-agent'],
    expires_at: expiresAt,
  });

  return refreshToken;
}

export class AuthController {
  // Public availability helper used by the workspace-name picker during
  // registration. It deliberately only reveals whether a hostname is usable,
  // never tenant/account information.
  usernameSuggestions = async (req: Request, res: Response) => {
    const requested = slugify(String(req.query.username || ''));
    if (requested.length < 3) {
      return res.json({ success: true, data: { normalized: requested, available: false, suggestions: [] } });
    }

    const candidates = Array.from(new Set([
      requested,
      `${requested}-hq`,
      `${requested}-app`,
      `${requested}-${new Date().getFullYear()}`,
      `${requested}1`,
    ]));
    const existing = await db('tenants').whereIn('subdomain', candidates).pluck('subdomain');
    const available = candidates.filter((candidate) => !existing.includes(candidate));
    return res.json({
      success: true,
      data: { normalized: requested, available: !existing.includes(requested), suggestions: available.slice(0, 4) },
    });
  };

  // ── POST /auth/register ─────────────────────────────────────────────────────
  register = async (req: Request, res: Response) => {
    const { firstName, lastName, email, password, businessName, plan = 'starter', industry, customIndustry, phone, username } = req.body;

    const existingUser = await db('users').where({ email: email.toLowerCase() }).first();
    if (existingUser) throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');

    const planRecord = await db('plans').where({ slug: plan }).first();
    if (!planRecord) throw new AppError('Invalid plan selected', 400, 'INVALID_PLAN');

    // The preferred username becomes the workspace subdomain. When the
    // caller supplied one it is used verbatim (after slugification); otherwise
    // we fall back to deriving one from the business name so the workspace
    // always has a usable hostname.
    const rawSlug = username ? slugify(username) : slugify(businessName);
    if (username && rawSlug.length < 3) throw new AppError('Choose a workspace username with at least 3 letters or numbers.', 400, 'INVALID_USERNAME');
    // Never silently change a username the owner deliberately chose. The UI
    // supplies availability suggestions; the owner chooses the final address.
    if (username && await db('tenants').where({ subdomain: rawSlug }).first()) {
      throw new AppError('That workspace username is already taken. Choose one of the suggestions.', 409, 'USERNAME_TAKEN');
    }
    const slug = username ? rawSlug : await TenantService.generateUniqueSlug(rawSlug || businessName);
    const passwordHash = await bcrypt.hash(password, 12);

    const coreModules = await db('module_registry').where({ is_core: true, is_active: true }).pluck('key');

    let initialModules = coreModules;
    let initialIndustry = industry || 'general';
    let initialDashboardPreset = 'general';
    let initialSettings: Record<string, any> = {};

    if (industry && industry !== 'other') {
      const preset = await db('industry_presets').where({ key: industry }).first();
      if (preset) {
        initialIndustry = preset.key;
        initialDashboardPreset = preset.dashboard_preset_key || preset.key || 'general';
        const presetMods = typeof preset.default_modules === 'string' ? JSON.parse(preset.default_modules) : (preset.default_modules || []);
        initialModules = Array.from(new Set([...coreModules, ...presetMods]));
        const terms = typeof preset.terminology_overrides === 'string' ? JSON.parse(preset.terminology_overrides) : (preset.terminology_overrides || {});
        initialSettings.terminologyOverrides = terms;
      }
    } else if (industry === 'other' || customIndustry) {
      initialIndustry = 'other';
      initialDashboardPreset = 'general';
      initialSettings.customIndustryName = customIndustry || 'Custom Business';
    }

    const result = await db.transaction(async (trx) => {
      const [tenant] = await trx('tenants').insert({
        name: businessName, slug, subdomain: slug, plan_id: planRecord.id,
        status: 'trial', subscription_status: 'trialing', users_count: 1,
        phone: phone || null,
        industry: initialIndustry,
        enabled_modules: JSON.stringify(initialModules),
        onboarding_completed: true,
        onboarding_step: 'complete',
        onboarding_data: JSON.stringify({ industry: initialIndustry, customIndustry }),
        dashboard_preset_key: initialDashboardPreset,
        settings: JSON.stringify(initialSettings),
      }).returning('*');

      const [user] = await trx('users').insert({
        tenant_id: tenant.id, email: email.toLowerCase(), password_hash: passwordHash,
        first_name: firstName, last_name: lastName, role: 'owner', status: 'active',
        is_email_verified: false,
      }).returning('*');

      // The workspace owns its platform subdomain from the moment it exists.
      await trx('tenant_domains').insert({
        tenant_id: tenant.id, hostname: slug, type: 'subdomain',
        is_primary: true, is_verified: true, status: 'active', ssl_status: 'not_applicable',
        verified_at: new Date(),
      } as any);

      // Every inventory-enabled workspace needs somewhere to receive stock.
      // Creating this operational default at provisioning time makes the
      // intended flow work immediately: product → purchase → receive → POS.
      await trx('warehouses').insert({
        tenant_id: tenant.id, name: 'Main Warehouse', code: 'MAIN',
        is_default: true, is_active: true,
      });

      return { tenant, user };
    });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await redis.set(`email_verify:${verificationToken}`, result.user.id, 'EX', 86400);
    EmailService.sendVerificationEmail(result.user.email, verificationToken, result.tenant).catch(() => {});

    const accessToken = signAccessToken(result.user, result.tenant.id);
    const refreshToken = await createSession(result.user.id, req);

    res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 86400000 });

    AuditService.log({ tenantId: result.tenant.id, userId: result.user.id, action: 'user.register', resourceType: 'user', resourceId: result.user.id, ip: req.ip });

    res.status(201).json({
      success: true,
      data: { user: serializeUser(result.user), tenant: serializeTenant({ ...result.tenant, plan_name: planRecord.name, plan_slug: planRecord.slug }), tokens: { accessToken, refreshToken } },
    });
  };

  // ── POST /auth/login ──────────────────────────────────────────────────────
  login = async (req: Request, res: Response) => {
    const { email, password, rememberMe, workspaceHost } = req.body;

    const user = await db('users')
      .join('tenants', 'users.tenant_id', 'tenants.id')
      .join('plans', 'tenants.plan_id', 'plans.id')
      .where({ 'users.email': email.toLowerCase() })
      .whereNull('users.deleted_at')
      // The user's own columns are selected explicitly. A wildcard
      // `users.*` followed by `tenants.*` let the workspace's `status`,
      // `created_at` and `timezone` overwrite the user's — so a suspended
      // *account* was reported as a suspended *workspace*, and the account
      // status was never actually checked.
      .select(
    'users.id as user_id', 'users.email', 'users.password_hash', 'users.first_name',
    'users.last_name', 'users.display_name', 'users.avatar_url', 'users.role',
    'users.status as user_status', 'users.is_email_verified', 'users.two_factor_enabled',
    'users.two_factor_secret', 'users.two_factor_backup_codes', 'users.timezone',
    'users.locale', 'users.preferences', 'users.created_at as user_created_at',
    'users.tenant_id',
    'tenants.*',
        'plans.name as plan_name', 'plans.slug as plan_slug', 'plans.feature_ai',
        'plans.feature_custom_domain', 'plans.feature_white_label', 'plans.feature_sso',
        'plans.feature_audit_logs', 'plans.feature_api_access', 'plans.feature_advanced_analytics',
        'plans.max_users', 'plans.max_storage_gb', 'plans.max_workflows', 'plans.max_branches',
      )
      .first();

    if (!user || !user.password_hash) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      AuditService.log({ action: 'user.login.failed', ip: req.ip, status: 'failure', description: `Failed login for ${email}` });
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // A branded business login is tenant-bound. The host only narrows a
    // successful credential match; it can never select or elevate a tenant.
    if (workspaceHost) {
      const workspace = await resolveTenantByHostname(String(workspaceHost));
      if (workspace && workspace.id !== user.tenant_id) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }
    }

    // `users.status` and `tenants.status` are two different things: the
    // account of the person signing in, and the workspace they belong to.
    if (user.user_status === 'suspended') throw new AppError('Your account has been suspended', 403, 'ACCOUNT_SUSPENDED');
    if (user.status === 'suspended') throw new AppError('This workspace has been suspended', 403, 'TENANT_SUSPENDED');
    if (user.status === 'cancelled') throw new AppError('This workspace has been cancelled', 403, 'TENANT_CANCELLED');

    // Email verification is only enforced when the deployment makes it
    // mandatory. The check is a server-side gate, not a hidden button.
    if (REQUIRE_EMAIL_VERIFICATION && !user.is_email_verified) {
      return res.json({ success: true, data: { requiresEmailVerification: true, email: user.email } });
    }

    if (user.two_factor_enabled) {
      const tempToken = jwt.sign({ sub: user.user_id, purpose: '2fa' }, process.env.JWT_SECRET!, { expiresIn: '5m' });
      return res.json({ success: true, data: { requiresTwoFactor: true, tempToken } });
    }

    await db('users').where({ id: user.user_id }).update({ last_login_at: new Date() });

    const accessToken = signAccessToken({ id: user.user_id, role: user.role, email: user.email }, user.tenant_id);
    const refreshToken = await createSession(user.user_id, req);

    AuditService.log({ tenantId: user.tenant_id, userId: user.user_id, action: 'user.login', ip: req.ip });

    res.cookie('accessToken', accessToken, { httpOnly: true, sameSite: 'lax', maxAge: 15 * 60000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'lax', maxAge: (rememberMe ? 30 : 1) * 86400000 });

    return res.json({
      success: true,
      data: {
        user: serializeUser({ ...user, id: user.user_id, created_at: user.user_created_at }),
        tenant: serializeTenant(user),
        tokens: { accessToken, refreshToken },
        // The client routes a brand-new account into the onboarding wizard
        // and everybody else straight into the workspace.
        requiresOnboarding: user.onboarding_completed !== true,
      },
    });
  };

  // ── POST /auth/2fa/verify ─────────────────────────────────────────────────
  verify2FA = async (req: Request, res: Response) => {
    const { tempToken, code } = req.body;

    let payload: any;
    try {
      payload = jwt.verify(tempToken, process.env.JWT_SECRET!);
      if (payload.purpose !== '2fa') throw new Error();
    } catch {
      throw new AppError('Invalid or expired verification session', 401, 'INVALID_TEMP_TOKEN');
    }

    const user = await db('users').join('tenants', 'users.tenant_id', 'tenants.id').join('plans', 'tenants.plan_id', 'plans.id')
      .where({ 'users.id': payload.sub })
      // Same rule as in `login`: the user's columns are aliased so the
      // workspace's `status`/`created_at` cannot overwrite them.
      .select(
        'users.id as user_id', 'users.email', 'users.first_name', 'users.last_name',
        'users.display_name', 'users.avatar_url', 'users.role', 'users.status as user_status',
        'users.is_email_verified', 'users.two_factor_enabled', 'users.two_factor_secret',
        'users.two_factor_backup_codes', 'users.timezone', 'users.locale', 'users.preferences',
        'users.created_at as user_created_at',
        'users.tenant_id',
        'tenants.*',
        'plans.name as plan_name', 'plans.slug as plan_slug',
      )
      .first();

    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const isValidTotp = authenticator.check(code, user.two_factor_secret);
    const backupCodes: string[] = user.two_factor_backup_codes || [];
    const isBackupCode = backupCodes.includes(code);

    if (!isValidTotp && !isBackupCode) throw new AppError('Invalid verification code', 401, 'INVALID_2FA_CODE');

    if (isBackupCode) {
      await db('users').where({ id: user.user_id }).update({ two_factor_backup_codes: backupCodes.filter((c) => c !== code) });
    }

    await db('users').where({ id: user.user_id }).update({ last_login_at: new Date() });

    const accessToken = signAccessToken({ id: user.user_id, role: user.role, email: user.email }, user.tenant_id);
    const refreshToken = await createSession(user.user_id, req);

    res.json({
      success: true,
      data: { user: serializeUser({ ...user, id: user.user_id, created_at: user.user_created_at }), tenant: serializeTenant(user), tokens: { accessToken, refreshToken } },
    });
  };

  // ── POST /auth/2fa/setup ──────────────────────────────────────────────────
  setup2FA = async (req: Request, res: Response) => {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(req.user!.email, 'NexOS', secret);
    await redis.set(`2fa_setup:${req.user!.id}`, secret, 'EX', 600);
    res.json({ success: true, data: { secret, otpauth } });
  };

  verifySetup2FA = async (req: Request, res: Response) => {
    const { token } = req.body;
    const secret = await redis.get(`2fa_setup:${req.user!.id}`);
    if (!secret) throw new AppError('Setup session expired. Please try again.', 400, 'SETUP_EXPIRED');

    const isValid = authenticator.check(token, secret);
    if (!isValid) throw new AppError('Invalid verification code', 400, 'INVALID_CODE');

    const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));
    await db('users').where({ id: req.user!.id }).update({
      two_factor_enabled: true, two_factor_secret: secret, two_factor_backup_codes: backupCodes,
    });
    await redis.del(`2fa_setup:${req.user!.id}`);

    res.json({ success: true, data: { backupCodes } });
  };

  // ── POST /auth/logout ──────────────────────────────────────────────────────
  logout = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await db('user_sessions').where({ refresh_token_hash: hash }).delete();
    }
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out' });
  };

  // ── POST /auth/refresh ─────────────────────────────────────────────────────
  refresh = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    if (!refreshToken) throw new AppError('No refresh token provided', 401, 'NO_REFRESH_TOKEN');

    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const session = await db('user_sessions').where({ refresh_token_hash: hash }).where('expires_at', '>', new Date()).first();
    if (!session) throw new AppError('Invalid or expired session', 401, 'INVALID_SESSION');

    const user = await db('users').where({ id: session.user_id }).first();
    if (!user || user.status !== 'active') throw new AppError('User not found or inactive', 401, 'USER_INACTIVE');

    await db('user_sessions').where({ id: session.id }).update({ last_used_at: new Date() });

    const accessToken = signAccessToken(user, user.tenant_id);
    res.cookie('accessToken', accessToken, { httpOnly: true, sameSite: 'lax', maxAge: 15 * 60000 });

    res.json({ success: true, data: { tokens: { accessToken } } });
  };

  // ── GET /auth/me ──────────────────────────────────────────────────────────
  me = async (req: Request, res: Response) => {
    const user = await db('users').where({ id: req.user!.id }).first();
    // Only the plan's name and slug are pulled in under aliases. Selecting
    // `plans.*` here overwrote the workspace columns that share a name with
    // the plan (`id`, `name`, `slug`, `description`, `created_at`, …), so
    // `/auth/me` reported the *plan* as the workspace — the sidebar showed
    // "Enterprise" instead of "Acme Corp" and `tenant.id` was the plan id.
    const tenant = await db('tenants').join('plans', 'tenants.plan_id', 'plans.id')
      .where({ 'tenants.id': req.tenant!.id })
      .select('tenants.*', 'plans.name as plan_name', 'plans.slug as plan_slug')
      .first();

    res.json({ success: true, data: { user: serializeUser(user), tenant: serializeTenant(tenant) } });
  };

  // ── GET /auth/verify-email/:token ─────────────────────────────────────────
  verifyEmail = async (req: Request, res: Response) => {
    const { token } = req.params;
    const userId = await redis.get(`email_verify:${token}`);
    if (!userId) throw new AppError('Invalid or expired verification link', 400, 'INVALID_TOKEN');

    await db('users').where({ id: userId }).update({ is_email_verified: true, email_verified_at: new Date() });
    await redis.del(`email_verify:${token}`);

    res.json({ success: true, message: 'Email verified successfully' });
  };

  // ── POST /auth/forgot-password ────────────────────────────────────────────
  forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;
    const user = await db('users').where({ email: email.toLowerCase() }).first();

    // Always return success to prevent email enumeration
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await db('password_reset_tokens').insert({
        user_id: user.id, token_hash: tokenHash, expires_at: new Date(Date.now() + 3600000),
      });
      const tenant = await db('tenants').where({ id: user.tenant_id }).first();
      EmailService.sendPasswordReset(user.email, token, tenant).catch(() => {});
    }

    res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
  };

  // ── POST /auth/reset-password ─────────────────────────────────────────────
  resetPassword = async (req: Request, res: Response) => {
    const { token, password } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await db('password_reset_tokens')
      .where({ token_hash: tokenHash }).whereNull('used_at').where('expires_at', '>', new Date()).first();
    if (!resetToken) throw new AppError('Invalid or expired reset link', 400, 'INVALID_TOKEN');

    const passwordHash = await bcrypt.hash(password, 12);
    await db.transaction(async (trx) => {
      await trx('users').where({ id: resetToken.user_id }).update({ password_hash: passwordHash });
      await trx('password_reset_tokens').where({ id: resetToken.id }).update({ used_at: new Date() });
      await trx('user_sessions').where({ user_id: resetToken.user_id }).delete();
    });

    res.json({ success: true, message: 'Password reset successfully. Please sign in.' });
  };

  // ── POST /auth/magic-link ─────────────────────────────────────────────────
  sendMagicLink = async (req: Request, res: Response) => {
    const { email } = req.body;
    const user = await db('users').where({ email: email.toLowerCase() }).first();
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      await redis.set(`magic_link:${token}`, user.id, 'EX', 900);
      const tenant = await db('tenants').where({ id: user.tenant_id }).first();
      EmailService.sendMagicLink(user.email, token, tenant).catch(() => {});
    }
    res.json({ success: true, message: 'If an account exists, a sign-in link has been sent.' });
  };

  // ── GET /auth/sessions ─────────────────────────────────────────────────────
  getSessions = async (req: Request, res: Response) => {
    const sessions = await db('user_sessions').where({ user_id: req.user!.id }).where('expires_at', '>', new Date()).orderBy('last_used_at', 'desc');
    res.json({ success: true, data: { sessions } });
  };

  revokeSession = async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    await db('user_sessions').where({ id: sessionId, user_id: req.user!.id }).delete();
    res.json({ success: true, message: 'Session revoked' });
  };
}
