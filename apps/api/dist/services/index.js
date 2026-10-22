"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantService = exports.AuditService = void 0;
const database_1 = require("../lib/database");
const logger_1 = require("../lib/logger");
const errors_1 = require("../lib/errors");
class AuditService {
    static log(params) {
        (0, database_1.db)('audit_logs').insert({
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
        }).catch((err) => logger_1.logger.error('AuditService.log failed:', err));
    }
}
exports.AuditService = AuditService;
class TenantService {
    static async generateUniqueSlug(name) {
        let base = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
        if (!base)
            base = 'workspace';
        let slug = base;
        for (let attempt = 1; attempt <= 1000; attempt++) {
            const existing = await (0, database_1.db)('tenants').where({ slug }).first();
            if (!existing)
                return slug;
            slug = `${base}-${attempt}`;
        }
        throw new errors_1.AppError('Unable to generate a unique workspace slug', 500, 'SLUG_GENERATION_FAILED');
    }
    static async incrementStorage(tenantId, bytes) {
        await (0, database_1.db)('tenants').where({ id: tenantId }).update({ storage_used_bytes: database_1.db.raw('storage_used_bytes + ?', [bytes]) });
    }
    static async decrementStorage(tenantId, bytes) {
        await (0, database_1.db)('tenants').where({ id: tenantId }).update({ storage_used_bytes: database_1.db.raw('GREATEST(0, storage_used_bytes - ?)', [bytes]) });
    }
}
exports.TenantService = TenantService;
//# sourceMappingURL=index.js.map