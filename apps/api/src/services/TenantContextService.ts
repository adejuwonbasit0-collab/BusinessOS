import { db } from '../lib/database';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';

/**
 * Central tenant identity and branding resolution.
 *
 * Every part of the platform that needs to know *which business* a request
 * belongs to goes through this service: the dashboard, the public website,
 * documents, e-mail and the API. Keeping the resolution in one place is what
 * makes the guarantees in the upgrade brief checkable:
 *
 *   * the tenant is resolved from a verified hostname, a verified custom
 *     domain or the authenticated credential — never from an untrusted
 *     request parameter on its own;
 *   * a cached tenant record is only ever returned for the key it was stored
 *     under, so one tenant's branding can never leak into another's page;
 *   * a change to a tenant's identity invalidates the cached copies
 *     immediately instead of after the five-minute TTL.
 */

const TENANT_CACHE_TTL_SECONDS = 300;

export interface TenantBranding {
  businessName: string;
  legalName: string | null;
  tradingName: string | null;
  description: string | null;
  logoUrl: string | null;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  address: Record<string, any>;
  country: string | null;
  currency: string;
  timezone: string;
  locale: string;
  dateFormat: string;
  numberFormat: string;
  socialLinks: Record<string, string>;
  registrationNumber: string | null;
  websiteTitle: string;
  hidePoweredBy: boolean;
  dashboardTheme?: string;
}

/**
 * Strips the port, lower-cases the host and removes a trailing dot so that
 * `Acme.Example.com:3002` and `acme.example.com` resolve to the same
 * tenant.
 */
export function normalizeHostname(rawHost: string | undefined | null): string | null {
  if (!rawHost) return null;
  let host = rawHost.trim().toLowerCase();
  if (!host) return null;
  // Strip a port, but keep an IPv6 literal intact.
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    if (end !== -1) host = host.slice(0, end + 1);
  } else {
    host = host.split(':')[0];
  }
  while (host.endsWith('.')) host = host.slice(0, -1);
  return host || null;
}

/** The platform's own hostnames — they never resolve to a tenant. */
export function isPlatformHost(host: string | null): boolean {
  if (!host) return true;
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return true;
  const platformDomain = (process.env.PLATFORM_DOMAIN || 'nexos.app').toLowerCase();
  return host === platformDomain || host === `www.${platformDomain}`;
}

/**
 * The tenant columns the platform needs everywhere, plus the plan columns that
 * drive entitlements.
 *
 * `plans.*` is deliberately *not* selected: the plan and the tenant share
 * column names (`id`, `name`, `slug`, `description`, `created_at` …) and a
 * wildcard join silently overwrites the tenant's own values with the plan's.
 */
const TENANT_COLUMNS = [
  'tenants.id', 'tenants.name', 'tenants.slug', 'tenants.subdomain', 'tenants.custom_domain',
  'tenants.domain_verified', 'tenants.plan_id', 'tenants.status', 'tenants.subscription_status',
  'tenants.trial_ends_at', 'tenants.industry', 'tenants.company_size',
  'tenants.primary_color', 'tenants.secondary_color', 'tenants.logo_url', 'tenants.logo_light_url',
  'tenants.logo_dark_url', 'tenants.favicon_url', 'tenants.brand_font',
  'tenants.legal_name', 'tenants.trading_name', 'tenants.description', 'tenants.business_email',
  'tenants.contact_email', 'tenants.phone', 'tenants.address', 'tenants.country',
  'tenants.registration_number', 'tenants.business_hours', 'tenants.social_links',
  'tenants.timezone', 'tenants.locale', 'tenants.currency', 'tenants.date_format', 'tenants.number_format',
  'tenants.users_count', 'tenants.storage_used_bytes', 'tenants.api_calls_this_month',
  'tenants.onboarding_completed', 'tenants.onboarding_step', 'tenants.onboarding_data',
  'tenants.dashboard_preset_key', 'tenants.enabled_modules', 'tenants.settings',
  'tenants.created_at', 'tenants.updated_at',
  'plans.name as plan_name', 'plans.slug as plan_slug',
  'plans.max_users', 'plans.max_storage_gb', 'plans.max_workflows', 'plans.max_api_keys',
  'plans.max_branches', 'plans.max_websites',
  'plans.feature_ai', 'plans.feature_custom_domain', 'plans.feature_white_label',
  'plans.feature_sso', 'plans.feature_audit_logs', 'plans.feature_api_access',
  'plans.feature_advanced_analytics', 'plans.features as plan_features',
];

function baseQuery() {
  return db('tenants')
    .leftJoin('plans', 'tenants.plan_id', 'plans.id')
    .whereNull('tenants.deleted_at')
    .select(TENANT_COLUMNS);
}

async function cachedGet(key: string): Promise<any | null> {
  try {
    const raw = await redis.get(key);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    logger.warn('Tenant cache read failed:', (err as Error).message);
  }
  return null;
}

async function cachedSet(key: string, value: any): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', TENANT_CACHE_TTL_SECONDS);
  } catch (err) {
    logger.warn('Tenant cache write failed:', (err as Error).message);
  }
}

/** Removes a tenant from every cache slot it can be looked up under. */
export async function invalidateTenantCache(tenantId: string): Promise<void> {
  const tenant = await db('tenants').where({ id: tenantId }).first();
  const keys = [`tenant:ctx:id:${tenantId}`];
  if (tenant?.subdomain) keys.push(`tenant:ctx:sub:${tenant.subdomain}`);
  if (tenant?.custom_domain) keys.push(`tenant:ctx:dom:${normalizeHostname(tenant.custom_domain)}`);
  const domains = await db('tenant_domains').where({ tenant_id: tenantId }).whereNull('deleted_at');
  for (const domain of domains) keys.push(`tenant:ctx:dom:${normalizeHostname(domain.hostname)}`);
  try {
    await redis.del(...keys);
  } catch (err) {
    logger.warn('Tenant cache invalidation failed:', (err as Error).message);
  }
}

/** Resolves a tenant by its primary key. */
export async function resolveTenantById(tenantId: string): Promise<any | null> {
  if (!tenantId) return null;
  const cacheKey = `tenant:ctx:id:${tenantId}`;
  const cached = await cachedGet(cacheKey);
  if (cached) return cached;

  const tenant = await baseQuery().where({ 'tenants.id': tenantId }).first();
  if (tenant) await cachedSet(cacheKey, tenant);
  return tenant || null;
}

/**
 * Resolves the tenant that owns a hostname.
 *
 * Three sources are consulted, in order:
 *   1. a platform subdomain (`<slug>.nexos.app`);
 *   2. a verified entry in `tenant_domains` (independent domains);
 *   3. the legacy `tenants.custom_domain` column, but only when the tenant
 *      has actually verified it.
 *
 * An unverified domain never resolves to a tenant.
 */
export async function resolveTenantByHostname(hostname: string | undefined | null): Promise<any | null> {
  const host = normalizeHostname(hostname);
  if (!host || isPlatformHost(host)) return null;

  const cacheKey = `tenant:ctx:dom:${host}`;
  const cached = await cachedGet(cacheKey);
  if (cached) return cached;

  const platformDomain = (process.env.PLATFORM_DOMAIN || 'nexos.app').toLowerCase();

  // 1. Platform subdomain.
  if (host.endsWith(`.${platformDomain}`)) {
    const subdomain = host.slice(0, -(platformDomain.length + 1));
    if (subdomain && subdomain !== 'www') {
      const tenant = await baseQuery().where({ 'tenants.subdomain': subdomain }).first();
      if (tenant) {
        await cachedSet(cacheKey, tenant);
        await cachedSet(`tenant:ctx:sub:${subdomain}`, tenant);
        return tenant;
      }
    }
  }

  // Local development uses `<subdomain>.localhost`; use the same tenant
  // lookup as production subdomains so branding can be verified locally.
  if (host.endsWith('.localhost')) {
    const subdomain = host.slice(0, -'.localhost'.length);
    if (subdomain) {
      const tenant = await baseQuery().where({ 'tenants.subdomain': subdomain }).first();
      if (tenant) {
        await cachedSet(cacheKey, tenant);
        await cachedSet(`tenant:ctx:sub:${subdomain}`, tenant);
        return tenant;
      }
    }
  }

  // 2. Verified independent domain.
  const verified = await baseQuery()
    .join('tenant_domains', 'tenant_domains.tenant_id', 'tenants.id')
    .where({ 'tenant_domains.hostname': host, 'tenant_domains.is_verified': true })
    .whereNull('tenant_domains.deleted_at')
    .first();
  if (verified) {
    await cachedSet(cacheKey, verified);
    return verified;
  }

  // 3. Legacy custom domain column — only when verified.
  const legacy = await baseQuery().where({ 'tenants.custom_domain': host, 'tenants.domain_verified': true }).first();
  if (legacy) {
    await cachedSet(cacheKey, legacy);
    return legacy;
  }

  return null;
}

/**
 * The branding of a tenant, merged from the tenant record and the optional
 * white-label override.
 *
 * The white-label row only *extends* the identity (hide "powered by", extra
 * support details); the business name, logo and colours always come from the
 * tenant so that branding is available on every plan.
 */
export async function getTenantBranding(tenantId: string): Promise<TenantBranding> {
  const tenant = await resolveTenantById(tenantId);
  if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

  const whiteLabel = await db('white_label_configs').where({ tenant_id: tenantId }).first();

  const businessName = whiteLabel?.brand_name || tenant.name || 'Business';
  const primaryColor = tenant.primary_color || whiteLabel?.primary_color || '#4f8ef7';
  const secondaryColor = tenant.secondary_color || whiteLabel?.secondary_color || '#8b5cf6';

  return {
    businessName,
    legalName: tenant.legal_name || null,
    tradingName: tenant.trading_name || null,
    description: tenant.description || null,
    logoUrl: tenant.logo_url || whiteLabel?.brand_logo_url || null,
    logoLightUrl: tenant.logo_light_url || tenant.logo_url || whiteLabel?.brand_logo_url || null,
    logoDarkUrl: tenant.logo_dark_url || null,
    faviconUrl: tenant.favicon_url || whiteLabel?.brand_favicon_url || null,
    primaryColor,
    secondaryColor,
    fontFamily: tenant.brand_font || null,
    supportEmail: tenant.contact_email || tenant.business_email || whiteLabel?.support_email || null,
    supportPhone: tenant.phone || whiteLabel?.support_phone || null,
    address: tenant.address || {},
    country: tenant.country || null,
    currency: tenant.currency || 'USD',
    timezone: tenant.timezone || 'UTC',
    locale: tenant.locale || 'en',
    dateFormat: tenant.date_format || 'MMM d, yyyy',
    numberFormat: tenant.number_format || 'en-US',
    socialLinks: tenant.social_links || {},
    registrationNumber: tenant.registration_number || null,
    websiteTitle: businessName,
    hidePoweredBy: whiteLabel?.hide_powered_by === true,
    dashboardTheme: tenant.settings?.dashboardTheme || 'indigo',
  };
}

/**
 * The navigation for a tenant.
 *
 * The navigation is derived from the tenant's dashboard preset and then
 * filtered by the modules the tenant actually has enabled, so a hotel does not
 * see inventory modules and a freelancer does not see warehouse screens.
 */
export async function getTenantNavigation(tenant: any): Promise<any[]> {
  const enabled: string[] = tenant.enabled_modules || [];

  let preset: any = null;
  const presetKey = tenant.dashboard_preset_key;
  if (presetKey) {
    preset = await db('dashboard_presets').where({ key: presetKey, is_active: true }).first();
  }
  if (!preset) {
    preset = await db('dashboard_presets').where({ is_default: true, is_active: true }).first();
  }
  if (!preset) return [];

  const navigation = Array.isArray(preset.navigation) ? preset.navigation : [];
  return navigation.filter((item: any) => {
    if (!item || !item.href) return false;
    // Items that belong to no module (settings, and anything explicitly
    // marked as always visible) stay for every tenant.
    if (!item.module || item.module === 'dashboard') return true;
    return enabled.includes(item.module);
  });
}
