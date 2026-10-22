import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { resolveTenantByHostname } from '../services/TenantContextService';

/**
 * Resolves the tenant that a request belongs to.
 *
 * The tenant is derived from the *hostname* the request arrived on — a
 * platform subdomain or a verified independent domain. It is deliberately not
 * derived from the `x-tenant-id` header: that header is client controlled, so
 * trusting it would let an anonymous caller point a public request at an
 * arbitrary workspace. The header is still accepted as a *hint*, but
 * `authenticate` compares it against the credential and rejects a mismatch, so
 * it can only ever narrow the request down, never widen it.
 *
 * Requests to the platform's own hostname (the dashboard, the admin console,
 * the API itself) resolve to no tenant — those requests are scoped by the
 * authenticated credential instead.
 */
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hint = req.headers['x-tenant-id'] as string | undefined;
    if (hint) {
      (req as any).headerTenantId = hint;
    }

    const tenant = await resolveTenantByHostname(req.hostname);

    if (tenant) {
      if (tenant.status === 'suspended') {
        throw new AppError('This workspace has been suspended', 403, 'TENANT_SUSPENDED');
      }
      req.tenant = tenant;
    }

    next();
  } catch (err) {
    next(err);
  }
};
