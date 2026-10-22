import { db } from '../lib/database';
import { logger } from '../lib/logger';
import { AppError } from '../lib/errors';

interface AuditParams {
  tenantId?: string; userId?: string; action: string;
  resourceType?: string; resourceId?: string; ip?: string; userAgent?: string;
  oldValues?: any; newValues?: any; metadata?: any;
  status?: 'success' | 'failure' | 'warning'; description?: string;
}

export class AuditService {
  static log(params: AuditParams): void {
    db('audit_logs').insert({
      tenant_id: params.tenantId || null,
      user_id: params.userId || null,
      action: params.action,
      resource_type: params.resourceType || null,
      resource_id: params.resourceId || null,
      ip_address: params.ip || null,
      user_agent: params.userAgent || null,
      old_values: params.oldValues ? JSON.stringify(params.oldValues) : '{}',
      new_values: params.newValues ? JSON.stringify(params.newValues) : '{}',
      metadata: params.metadata ? JSON.stringify(params.metadata) : '{}',
      status: params.status || 'success',
      description: params.description || null,
    }).catch((err) => logger.error('AuditService.log failed:', err));
  }
}

export class TenantService {
  static async generateUniqueSlug(name: string): Promise<string> {
    let base = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
    if (!base) base = 'workspace';

    let slug = base;
    for (let attempt = 1; attempt <= 1000; attempt++) {
      const existing = await db('tenants').where({ slug }).first();
      if (!existing) return slug;
      slug = `${base}-${attempt}`;
    }
    throw new AppError('Unable to generate a unique workspace slug', 500, 'SLUG_GENERATION_FAILED');
  }

  static async incrementStorage(tenantId: string, bytes: number) {
    await db('tenants').where({ id: tenantId }).update({ storage_used_bytes: db.raw('storage_used_bytes + ?', [bytes]) });
  }

  static async decrementStorage(tenantId: string, bytes: number) {
    await db('tenants').where({ id: tenantId }).update({ storage_used_bytes: db.raw('GREATEST(0, storage_used_bytes - ?)', [bytes]) });
  }
}
