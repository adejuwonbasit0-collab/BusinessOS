"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const database_1 = require("../lib/database");
const errors_1 = require("../lib/errors");
const index_1 = require("../services/index");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class AdminController {
    // ── Platform stats ─────────────────────────────────────────────────────────
    platformStats = async (req, res) => {
        const [totalTenants, activeTenants, trialTenants, suspendedTenants, totalUsers, mrrData, newTenantsThisMonth, churnThisMonth,] = await Promise.all([
            (0, database_1.db)('tenants').whereNull('deleted_at').count('id as count').first(),
            (0, database_1.db)('tenants').where({ status: 'active' }).whereNull('deleted_at').count('id as count').first(),
            (0, database_1.db)('tenants').where({ status: 'trial' }).whereNull('deleted_at').count('id as count').first(),
            (0, database_1.db)('tenants').where({ status: 'suspended' }).whereNull('deleted_at').count('id as count').first(),
            (0, database_1.db)('users').whereNull('deleted_at').count('id as count').first(),
            (0, database_1.db)('tenants').join('plans', 'tenants.plan_id', 'plans.id')
                .where({ 'tenants.status': 'active' }).whereNull('tenants.deleted_at')
                .sum('plans.price_monthly as total').first(),
            (0, database_1.db)('tenants').whereNull('deleted_at').where('created_at', '>=', new Date(new Date().getFullYear(), new Date().getMonth(), 1)).count('id as count').first(),
            (0, database_1.db)('tenants').where({ status: 'cancelled' }).where('updated_at', '>=', new Date(new Date().getFullYear(), new Date().getMonth(), 1)).count('id as count').first(),
        ]);
        res.json({
            success: true,
            data: {
                tenants: {
                    total: parseInt(totalTenants?.count || '0'),
                    active: parseInt(activeTenants?.count || '0'),
                    trial: parseInt(trialTenants?.count || '0'),
                    suspended: parseInt(suspendedTenants?.count || '0'),
                    newThisMonth: parseInt(newTenantsThisMonth?.count || '0'),
                    churnThisMonth: parseInt(churnThisMonth?.count || '0'),
                },
                users: { total: parseInt(totalUsers?.count || '0') },
                // `plans.price_monthly` is stored in cents, so the sum is converted
                // back to dollars here — the admin console renders MRR as "$<value>".
                mrr: parseFloat(mrrData?.total || '0') / 100,
            },
        });
    };
    // ── Tenant management ──────────────────────────────────────────────────────
    listTenants = async (req, res) => {
        const { page = 1, limit = 25, search, status, plan } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let query = (0, database_1.db)('tenants').join('plans', 'tenants.plan_id', 'plans.id').whereNull('tenants.deleted_at');
        if (status)
            query = query.where('tenants.status', status);
        if (plan)
            query = query.where('plans.slug', plan);
        if (search)
            query = query.where((q) => q.whereILike('tenants.name', `%${search}%`).orWhereILike('tenants.subdomain', `%${search}%`));
        const [{ count }] = await query.clone().count('tenants.id as count');
        const tenants = await query.clone()
            .select('tenants.*', 'plans.name as plan_name', 'plans.slug as plan_slug', 'plans.price_monthly')
            .orderBy('tenants.created_at', 'desc').limit(parseInt(limit)).offset(offset);
        res.json({
            success: true,
            data: {
                tenants,
                pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count), totalPages: Math.ceil(parseInt(count) / parseInt(limit)) },
            },
        });
    };
    getTenant = async (req, res) => {
        const { id } = req.params;
        const tenant = await (0, database_1.db)('tenants').join('plans', 'tenants.plan_id', 'plans.id')
            .where({ 'tenants.id': id }).whereNull('tenants.deleted_at')
            .select('tenants.*', 'plans.name as plan_name', 'plans.slug as plan_slug', 'plans.price_monthly')
            .first();
        if (!tenant)
            throw new errors_1.NotFoundError('Tenant');
        const [userCount, storageGb] = await Promise.all([
            (0, database_1.db)('users').where({ tenant_id: id }).whereNull('deleted_at').count('id as count').first(),
            (0, database_1.db)('media_files').where({ tenant_id: id }).whereNull('deleted_at').sum('size_bytes as total').first(),
        ]);
        res.json({ success: true, data: { tenant: { ...tenant, userCount: parseInt(userCount?.count || '0'), storageBytes: parseInt(storageGb?.total || '0') } } });
    };
    suspendTenant = async (req, res) => {
        const { id } = req.params;
        const { reason } = req.body;
        const tenant = await (0, database_1.db)('tenants').where({ id }).whereNull('deleted_at').first();
        if (!tenant)
            throw new errors_1.NotFoundError('Tenant');
        await (0, database_1.db)('tenants').where({ id }).update({ status: 'suspended', updated_at: new Date() });
        index_1.AuditService.log({ tenantId: id, userId: req.user?.id, action: 'admin.tenant.suspend', description: reason || 'Suspended by admin', ip: req.ip });
        res.json({ success: true, message: 'Tenant suspended' });
    };
    unsuspendTenant = async (req, res) => {
        const { id } = req.params;
        const tenant = await (0, database_1.db)('tenants').where({ id }).whereNull('deleted_at').first();
        if (!tenant)
            throw new errors_1.NotFoundError('Tenant');
        await (0, database_1.db)('tenants').where({ id }).update({ status: 'active', updated_at: new Date() });
        index_1.AuditService.log({ tenantId: id, userId: req.user?.id, action: 'admin.tenant.unsuspend', ip: req.ip });
        res.json({ success: true, message: 'Tenant reactivated' });
    };
    deleteTenant = async (req, res) => {
        const { id } = req.params;
        const tenant = await (0, database_1.db)('tenants').where({ id }).whereNull('deleted_at').first();
        if (!tenant)
            throw new errors_1.NotFoundError('Tenant');
        await (0, database_1.db)('tenants').where({ id }).update({ deleted_at: new Date(), status: 'cancelled' });
        index_1.AuditService.log({ tenantId: id, userId: req.user?.id, action: 'admin.tenant.delete', ip: req.ip });
        res.json({ success: true, message: 'Tenant deleted' });
    };
    // ── Impersonation — generates a short-lived JWT scoped to a tenant ────────
    impersonateTenant = async (req, res) => {
        const { id } = req.params;
        const tenant = await (0, database_1.db)('tenants').where({ id }).whereNull('deleted_at').first();
        if (!tenant)
            throw new errors_1.NotFoundError('Tenant');
        const ownerUser = await (0, database_1.db)('users').where({ tenant_id: id, role: 'owner' }).whereNull('deleted_at').first();
        if (!ownerUser)
            throw new errors_1.AppError('No owner account found for this tenant', 404, 'NO_OWNER');
        const token = jsonwebtoken_1.default.sign({ sub: ownerUser.id, tenantId: id, role: ownerUser.role, email: ownerUser.email, impersonatedBy: req.user?.id }, process.env.JWT_SECRET, { expiresIn: '2h' });
        index_1.AuditService.log({ tenantId: id, userId: req.user?.id, action: 'admin.tenant.impersonate', description: `Impersonated ${tenant.name}`, ip: req.ip });
        res.json({ success: true, data: { token, tenant: { id: tenant.id, name: tenant.name, subdomain: tenant.subdomain } } });
    };
    // ── All users across all tenants ───────────────────────────────────────────
    listAllUsers = async (req, res) => {
        const { page = 1, limit = 25, search } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let query = (0, database_1.db)('users').join('tenants', 'users.tenant_id', 'tenants.id').whereNull('users.deleted_at').where('users.role', '!=', 'super_admin');
        if (search)
            query = query.where((q) => q.whereILike('users.email', `%${search}%`).orWhereILike('users.first_name', `%${search}%`).orWhereILike('users.last_name', `%${search}%`));
        const [{ count }] = await query.clone().count('users.id as count');
        const users = await query.clone()
            .select('users.id', 'users.first_name', 'users.last_name', 'users.email', 'users.role', 'users.status', 'users.last_login_at', 'tenants.name as tenant_name', 'tenants.id as tenant_id')
            .orderBy('users.created_at', 'desc').limit(parseInt(limit)).offset(offset);
        res.json({ success: true, data: { users, pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count) } } });
    };
    // ── Audit logs across all tenants ─────────────────────────────────────────
    listAuditLogs = async (req, res) => {
        const { action, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let query = (0, database_1.db)('audit_logs').leftJoin('users', 'audit_logs.user_id', 'users.id').leftJoin('tenants', 'audit_logs.tenant_id', 'tenants.id');
        if (action)
            query = query.whereILike('audit_logs.action', `%${action}%`);
        const [{ count }] = await query.clone().count('audit_logs.id as count');
        const logs = await query.clone()
            .select('audit_logs.*', database_1.db.raw("CONCAT(users.first_name, ' ', users.last_name) as user_name"), 'users.email as user_email', 'tenants.name as tenant_name')
            .orderBy('audit_logs.created_at', 'desc').limit(parseInt(limit)).offset(offset);
        res.json({ success: true, data: { logs, pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count) } } });
    };
    // ── Revenue overview across all tenants ────────────────────────────────────
    revenueOverview = async (req, res) => {
        const rows = await (0, database_1.db)('tenants')
            .join('plans', 'tenants.plan_id', 'plans.id')
            .where({ 'tenants.status': 'active' }).whereNull('tenants.deleted_at')
            .groupBy('plans.name', 'plans.price_monthly')
            .select('plans.name as plan_name', 'plans.price_monthly', database_1.db.raw('COUNT(tenants.id) as tenant_count'), database_1.db.raw('COUNT(tenants.id) * plans.price_monthly as mrr'));
        // Plan prices are stored in cents; the admin console renders MRR as
        // "$<value>", so convert to dollars before handing it over.
        const byPlan = rows.map((row) => ({
            plan_name: row.plan_name,
            price_monthly: parseFloat(row.price_monthly) / 100,
            tenant_count: parseInt(row.tenant_count, 10),
            mrr: parseFloat(row.mrr) / 100,
        }));
        const totalMRR = byPlan.reduce((sum, p) => sum + p.mrr, 0);
        res.json({ success: true, data: { byPlan, totalMRR } });
    };
}
exports.AdminController = AdminController;
//# sourceMappingURL=AdminController.js.map