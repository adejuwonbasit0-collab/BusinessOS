"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantMiddleware = void 0;
const database_1 = require("../lib/database");
const redis_1 = require("../lib/redis");
const errors_1 = require("../lib/errors");
const tenantMiddleware = async (req, res, next) => {
    try {
        let tenant = null;
        const tenantId = req.headers['x-tenant-id'];
        const host = req.hostname;
        if (tenantId) {
            tenant = await getCachedTenant('id', tenantId);
        }
        else if (host) {
            const platformDomain = process.env.PLATFORM_DOMAIN || 'nexos.app';
            if (host.endsWith(`.${platformDomain}`)) {
                const subdomain = host.replace(`.${platformDomain}`, '');
                tenant = await getCachedTenant('subdomain', subdomain);
            }
            else if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
                tenant = await getCachedTenant('custom_domain', host);
            }
        }
        if (tenant) {
            if (tenant.status === 'suspended') {
                throw new errors_1.AppError('This workspace has been suspended', 403, 'TENANT_SUSPENDED');
            }
            req.tenant = tenant;
        }
        next();
    }
    catch (err) {
        next(err);
    }
};
exports.tenantMiddleware = tenantMiddleware;
async function getCachedTenant(field, value) {
    const cacheKey = `tenant:${field}:${value}`;
    const cached = await redis_1.redis.get(cacheKey);
    if (cached)
        return JSON.parse(cached);
    const tenant = await (0, database_1.db)('tenants')
        .join('plans', 'tenants.plan_id', 'plans.id')
        .where({ [`tenants.${field}`]: value })
        .whereNull('tenants.deleted_at')
        .select('tenants.*', 'plans.name as plan_name', 'plans.slug as plan_slug', 'plans.max_users', 'plans.max_storage_gb', 'plans.max_workflows', 'plans.max_api_keys', 'plans.max_branches', 'plans.feature_ai', 'plans.feature_custom_domain', 'plans.feature_white_label', 'plans.feature_sso', 'plans.feature_audit_logs', 'plans.feature_api_access', 'plans.feature_advanced_analytics', 'plans.features as plan_features')
        .first();
    if (tenant)
        await redis_1.redis.set(cacheKey, JSON.stringify(tenant), 'EX', 300);
    return tenant;
}
//# sourceMappingURL=tenant.js.map