"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchController = void 0;
const database_1 = require("../lib/database");
const errors_1 = require("../lib/errors");
const index_1 = require("../services/index");
const validation_1 = require("../lib/validation");
class BranchController {
    list = async (req, res) => {
        const tenantId = req.tenant.id;
        const branches = await (0, database_1.db)('branches')
            .leftJoin('users as manager', 'branches.manager_id', 'manager.id')
            .where({ 'branches.tenant_id': tenantId }).whereNull('branches.deleted_at')
            .select('branches.*', database_1.db.raw("CONCAT(manager.first_name, ' ', manager.last_name) as manager_name"))
            .orderBy('branches.is_default', 'desc').orderBy('branches.name');
        res.json({ success: true, data: { branches } });
    };
    create = async (req, res) => {
        const tenantId = req.tenant.id;
        const { name, code, type = 'branch', phone, email, address, timezone, managerId } = req.body;
        const tenant = await (0, database_1.db)('tenants').join('plans', 'tenants.plan_id', 'plans.id').where({ 'tenants.id': tenantId }).first();
        if (tenant.max_branches !== -1) {
            const [{ count }] = await (0, database_1.db)('branches').where({ tenant_id: tenantId }).whereNull('deleted_at').count('id as count');
            if (parseInt(count) >= tenant.max_branches) {
                throw new errors_1.AppError(`Branch limit (${tenant.max_branches}) reached for your plan. Please upgrade.`, 403, 'BRANCH_LIMIT');
            }
        }
        const [{ count: existingCount }] = await (0, database_1.db)('branches').where({ tenant_id: tenantId }).count('id as count');
        const isFirst = parseInt(existingCount) === 0;
        const [branch] = await (0, database_1.db)('branches').insert({
            tenant_id: tenantId, name, code, type, phone, email,
            address: (0, validation_1.toJsonb)(address), timezone: timezone || 'UTC', manager_id: managerId || null,
            is_default: isFirst,
        }).returning('*');
        index_1.AuditService.log({ tenantId, userId: req.user.id, action: 'branch.create', resourceType: 'branch', resourceId: branch.id, ip: req.ip });
        res.status(201).json({ success: true, data: { branch } });
    };
    getOne = async (req, res) => {
        const { id } = req.params;
        const branch = await (0, database_1.db)('branches').where({ id, tenant_id: req.tenant.id }).whereNull('deleted_at').first();
        if (!branch)
            throw new errors_1.NotFoundError('Branch');
        const [staffCount, departmentCount] = await Promise.all([
            (0, database_1.db)('users').where({ branch_id: id }).whereNull('deleted_at').count('id as count').first(),
            (0, database_1.db)('departments').where({ branch_id: id }).count('id as count').first(),
        ]);
        res.json({ success: true, data: { branch, staffCount: parseInt(staffCount.count), departmentCount: parseInt(departmentCount.count) } });
    };
    update = async (req, res) => {
        const { id } = req.params;
        const branch = await (0, database_1.db)('branches').where({ id, tenant_id: req.tenant.id }).whereNull('deleted_at').first();
        if (!branch)
            throw new errors_1.NotFoundError('Branch');
        const allowed = ['name', 'code', 'type', 'phone', 'email', 'address', 'timezone', 'manager_id', 'is_active'];
        const fieldMap = { managerId: 'manager_id', isActive: 'is_active' };
        const update = { updated_at: new Date() };
        for (const key of Object.keys(req.body)) {
            const dbKey = fieldMap[key] || (allowed.includes(key) ? key : null);
            if (!dbKey)
                continue;
            // `address` is a jsonb column — a bare string would make PostgreSQL
            // reject the statement with "invalid input syntax for type json".
            update[dbKey] = dbKey === 'address' ? (0, validation_1.toJsonb)(req.body[key]) : req.body[key];
        }
        const [updated] = await (0, database_1.db)('branches').where({ id }).update(update).returning('*');
        res.json({ success: true, data: { branch: updated } });
    };
    delete = async (req, res) => {
        const { id } = req.params;
        const branch = await (0, database_1.db)('branches').where({ id, tenant_id: req.tenant.id }).whereNull('deleted_at').first();
        if (!branch)
            throw new errors_1.NotFoundError('Branch');
        if (branch.is_default)
            throw new errors_1.AppError('Cannot delete the default branch', 400, 'CANNOT_DELETE_DEFAULT');
        await (0, database_1.db)('branches').where({ id }).update({ deleted_at: new Date() });
        res.json({ success: true, message: 'Branch deleted' });
    };
    // ── Regional reporting ─────────────────────────────────────────────────────
    regionalReport = async (req, res) => {
        const tenantId = req.tenant.id;
        const branches = await (0, database_1.db)('branches').where({ tenant_id: tenantId }).whereNull('deleted_at');
        const report = await Promise.all(branches.map(async (branch) => {
            const [revenue, staffCount] = await Promise.all([
                (0, database_1.db)('sales_orders').where({ tenant_id: tenantId, branch_id: branch.id }).sum('total as total').first(),
                (0, database_1.db)('users').where({ branch_id: branch.id }).whereNull('deleted_at').count('id as count').first(),
            ]);
            return {
                branchId: branch.id, branchName: branch.name,
                revenue: parseFloat(revenue?.total || '0'),
                staffCount: parseInt(staffCount?.count || '0'),
            };
        }));
        res.json({ success: true, data: { report } });
    };
}
exports.BranchController = BranchController;
//# sourceMappingURL=BranchController.js.map