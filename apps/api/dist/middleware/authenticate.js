"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireModule = exports.requireFeature = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("../lib/database");
const errors_1 = require("../lib/errors");
const authenticate = async (req, res, next) => {
    try {
        let token = '';
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer '))
            token = authHeader.slice(7);
        else if (req.cookies?.accessToken)
            token = req.cookies.accessToken;
        const apiKey = req.headers['x-api-key'];
        if (apiKey && !token)
            return authenticateWithApiKey(apiKey, req, res, next);
        if (!token)
            throw new errors_1.AppError('Authentication required', 401, 'NO_TOKEN');
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await (0, database_1.db)('users').where({ id: payload.sub, status: 'active' }).whereNull('deleted_at').first();
        if (!user)
            throw new errors_1.AppError('User not found or inactive', 401, 'USER_NOT_FOUND');
        req.user = user;
        req.tenantId = payload.tenantId;
        // `tenantMiddleware` may already have resolved a workspace from the
        // request host (or the `x-tenant-id` header). That workspace has to be
        // the one the token belongs to — otherwise a user could point a request
        // at somebody else's workspace and read its data, because every
        // controller scopes its queries by `req.tenant.id`.
        if (!req.tenant) {
            req.tenant = await (0, database_1.db)('tenants').where({ id: payload.tenantId }).first();
        }
        else if (req.tenant.id !== payload.tenantId) {
            throw new errors_1.AppError('This credential does not belong to the requested workspace', 403, 'TENANT_MISMATCH');
        }
        next();
    }
    catch (err) {
        if (err.name === 'TokenExpiredError')
            return next(new errors_1.AppError('Token expired', 401, 'TOKEN_EXPIRED'));
        if (err.name === 'JsonWebTokenError')
            return next(new errors_1.AppError('Invalid token', 401, 'INVALID_TOKEN'));
        next(err);
    }
};
exports.authenticate = authenticate;
async function authenticateWithApiKey(rawKey, req, res, next) {
    try {
        const keyHash = crypto_1.default.createHash('sha256').update(rawKey).digest('hex');
        const apiKey = await (0, database_1.db)('api_keys')
            .join('tenants', 'api_keys.tenant_id', 'tenants.id')
            .where({ 'api_keys.key_hash': keyHash, 'api_keys.is_active': true })
            .whereNull('api_keys.deleted_at')
            .select('api_keys.*', 'tenants.status as tenant_status')
            .first();
        if (!apiKey)
            throw new errors_1.AppError('Invalid API key', 401, 'INVALID_API_KEY');
        if (apiKey.tenant_status === 'suspended')
            throw new errors_1.AppError('Account suspended', 403, 'ACCOUNT_SUSPENDED');
        if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date())
            throw new errors_1.AppError('API key expired', 401, 'API_KEY_EXPIRED');
        (0, database_1.db)('api_keys').where({ id: apiKey.id }).update({ request_count: database_1.db.raw('request_count + 1'), last_used_at: new Date() }).catch(() => { });
        req.apiKey = apiKey;
        req.tenantId = apiKey.tenant_id;
        // Same rule as for JWTs: a workspace resolved from the request host must
        // be the one the API key belongs to.
        if (!req.tenant) {
            req.tenant = await (0, database_1.db)('tenants').where({ id: apiKey.tenant_id }).first();
        }
        else if (req.tenant.id !== apiKey.tenant_id) {
            throw new errors_1.AppError('This credential does not belong to the requested workspace', 403, 'TENANT_MISMATCH');
        }
        next();
    }
    catch (err) {
        next(err);
    }
}
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user)
            return next(new errors_1.AppError('Authentication required', 401, 'NO_AUTH'));
        if (roles.length && !roles.includes(req.user.role))
            return next(new errors_1.AppError('Insufficient permissions', 403, 'FORBIDDEN'));
        next();
    };
};
exports.authorize = authorize;
const requireFeature = (feature) => {
    return (req, res, next) => {
        if (!req.tenant)
            return next(new errors_1.AppError('Tenant context required', 400, 'NO_TENANT'));
        const hasFeature = req.tenant[`feature_${feature}`] || req.tenant.plan_features?.[feature];
        if (!hasFeature)
            return next(new errors_1.AppError(`Your plan does not include ${feature}. Please upgrade.`, 403, 'FEATURE_NOT_AVAILABLE'));
        next();
    };
};
exports.requireFeature = requireFeature;
// Industry/module gating: checks tenant.enabled_modules contains the given module key
const requireModule = (moduleKey) => {
    return (req, res, next) => {
        if (!req.tenant)
            return next(new errors_1.AppError('Tenant context required', 400, 'NO_TENANT'));
        const enabled = req.tenant.enabled_modules || [];
        if (!enabled.includes(moduleKey)) {
            return next(new errors_1.AppError(`The "${moduleKey}" module is not enabled for your workspace.`, 403, 'MODULE_NOT_ENABLED'));
        }
        next();
    };
};
exports.requireModule = requireModule;
//# sourceMappingURL=authenticate.js.map