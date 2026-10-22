import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../lib/database';
import { AppError } from '../lib/errors';
import { resolveTenantById } from '../services/TenantContextService';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token = '';
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7);
    else if (req.cookies?.accessToken) token = req.cookies.accessToken;

    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey && !token) return authenticateWithApiKey(apiKey, req, res, next);

    if (!token) throw new AppError('Authentication required', 401, 'NO_TOKEN');

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await db('users').where({ id: payload.sub, status: 'active' }).whereNull('deleted_at').first();
    if (!user) throw new AppError('User not found or inactive', 401, 'USER_NOT_FOUND');

    req.user = user;
    req.tenantId = payload.tenantId;

    // `tenantMiddleware` may already have resolved a workspace from the
    // request host. That workspace has to be the one the token belongs to —
    // otherwise a user could point a request at somebody else's workspace and
    // read its data, because every controller scopes its queries by
    // `req.tenant.id`.
    if (!req.tenant) {
      req.tenant = await resolveTenantById(payload.tenantId);
    } else if (req.tenant.id !== payload.tenantId) {
      throw new AppError('This credential does not belong to the requested workspace', 403, 'TENANT_MISMATCH');
    }

    // The `x-tenant-id` header is a hint only. It is never used to *resolve*
    // a workspace (the middleware resolves from the hostname), so a caller
    // cannot use it to reach another tenant's data — but a header that
    // contradicts the credential is a misdirected request and is rejected
    // rather than silently ignored.
    const headerTenantId = (req as any).headerTenantId;
    if (headerTenantId && headerTenantId !== payload.tenantId) {
      throw new AppError('This credential does not belong to the requested workspace', 403, 'TENANT_MISMATCH');
    }

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') return next(new AppError('Token expired', 401, 'TOKEN_EXPIRED'));
    if (err.name === 'JsonWebTokenError') return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
    next(err);
  }
};

async function authenticateWithApiKey(rawKey: string, req: Request, res: Response, next: NextFunction) {
  try {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await db('api_keys')
      .join('tenants', 'api_keys.tenant_id', 'tenants.id')
      .where({ 'api_keys.key_hash': keyHash, 'api_keys.is_active': true })
      .whereNull('api_keys.deleted_at')
      .select('api_keys.*', 'tenants.status as tenant_status')
      .first();

    if (!apiKey) throw new AppError('Invalid API key', 401, 'INVALID_API_KEY');
    if (apiKey.tenant_status === 'suspended') throw new AppError('Account suspended', 403, 'ACCOUNT_SUSPENDED');
    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) throw new AppError('API key expired', 401, 'API_KEY_EXPIRED');

    db('api_keys').where({ id: apiKey.id }).update({ request_count: db.raw('request_count + 1'), last_used_at: new Date() }).catch(() => {});

    req.apiKey = apiKey;
    req.tenantId = apiKey.tenant_id;

    // Same rule as for JWTs: a workspace resolved from the request host must
    // be the one the API key belongs to.
    if (!req.tenant) {
      req.tenant = await resolveTenantById(apiKey.tenant_id);
    } else if (req.tenant.id !== apiKey.tenant_id) {
      throw new AppError('This credential does not belong to the requested workspace', 403, 'TENANT_MISMATCH');
    }

    const headerTenantId = (req as any).headerTenantId;
    if (headerTenantId && headerTenantId !== apiKey.tenant_id) {
      throw new AppError('This credential does not belong to the requested workspace', 403, 'TENANT_MISMATCH');
    }

    next();
  } catch (err) {
    next(err);
  }
}

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401, 'NO_AUTH'));
    if (roles.length && !roles.includes(req.user.role)) return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
    next();
  };
};

export const requireFeature = (feature: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenant) return next(new AppError('Tenant context required', 400, 'NO_TENANT'));
    const hasFeature = req.tenant[`feature_${feature}`] || req.tenant.plan_features?.[feature];
    if (!hasFeature) return next(new AppError(`Your plan does not include ${feature}. Please upgrade.`, 403, 'FEATURE_NOT_AVAILABLE'));
    next();
  };
};

// Industry/module gating: checks tenant.enabled_modules contains the given module key
export const requireModule = (moduleKey: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenant) return next(new AppError('Tenant context required', 400, 'NO_TENANT'));
    const enabled: string[] = req.tenant.enabled_modules || [];
    if (!enabled.includes(moduleKey)) {
      return next(new AppError(`The "${moduleKey}" module is not enabled for your workspace.`, 403, 'MODULE_NOT_ENABLED'));
    }
    next();
  };
};
