"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleController = void 0;
const database_1 = require("../lib/database");
const errors_1 = require("../lib/errors");
const index_1 = require("../services/index");
class RoleController {
    // ── GET /roles ─────────────────────────────────────────────────────────────
    list = async (req, res) => {
        const tenantId = req.tenant.id;
        const roles = await (0, database_1.db)('role_definitions').where({ tenant_id: tenantId }).orderBy('name');
        const rolesWithPerms = await Promise.all(roles.map(async (role) => {
            const perms = await (0, database_1.db)('role_permissions').join('permissions', 'role_permissions.permission_id', 'permissions.id')
                .where({ role_id: role.id }).select('permissions.key');
            const [{ count }] = await (0, database_1.db)('users').where({ custom_role_id: role.id }).whereNull('deleted_at').count('id as count');
            return { ...role, permissions: perms.map((p) => p.key), userCount: parseInt(count) };
        }));
        res.json({ success: true, data: { roles: rolesWithPerms } });
    };
    // ── GET /roles/permissions-catalog ────────────────────────────────────────
    permissionsCatalog = async (req, res) => {
        const permissions = await (0, database_1.db)('permissions').orderBy(['module', 'action']);
        const grouped = permissions.reduce((acc, perm) => {
            acc[perm.module] = acc[perm.module] || [];
            acc[perm.module].push(perm);
            return acc;
        }, {});
        res.json({ success: true, data: { permissions, grouped } });
    };
    // ── POST /roles ────────────────────────────────────────────────────────────
    create = async (req, res) => {
        const tenantId = req.tenant.id;
        const { name, description, permissionKeys = [] } = req.body;
        const existing = await (0, database_1.db)('role_definitions').where({ tenant_id: tenantId, name }).first();
        if (existing)
            throw new errors_1.AppError('A role with this name already exists', 409, 'DUPLICATE_ROLE');
        const result = await database_1.db.transaction(async (trx) => {
            const [role] = await trx('role_definitions').insert({ tenant_id: tenantId, name, description, is_system: false }).returning('*');
            if (permissionKeys.length > 0) {
                const perms = await trx('permissions').whereIn('key', permissionKeys);
                await trx('role_permissions').insert(perms.map((p) => ({ role_id: role.id, permission_id: p.id })));
            }
            return role;
        });
        index_1.AuditService.log({ tenantId, userId: req.user.id, action: 'role.create', resourceType: 'role', resourceId: result.id, ip: req.ip });
        res.status(201).json({ success: true, data: { role: result } });
    };
    // ── PATCH /roles/:id ───────────────────────────────────────────────────────
    update = async (req, res) => {
        const { id } = req.params;
        const { name, description, permissionKeys } = req.body;
        const role = await (0, database_1.db)('role_definitions').where({ id, tenant_id: req.tenant.id }).first();
        if (!role)
            throw new errors_1.NotFoundError('Role');
        if (role.is_system)
            throw new errors_1.AppError('System roles cannot be modified', 400, 'SYSTEM_ROLE_LOCKED');
        await database_1.db.transaction(async (trx) => {
            const update = { updated_at: new Date() };
            if (name)
                update.name = name;
            if (description !== undefined)
                update.description = description;
            await trx('role_definitions').where({ id }).update(update);
            if (Array.isArray(permissionKeys)) {
                await trx('role_permissions').where({ role_id: id }).delete();
                if (permissionKeys.length > 0) {
                    const perms = await trx('permissions').whereIn('key', permissionKeys);
                    await trx('role_permissions').insert(perms.map((p) => ({ role_id: id, permission_id: p.id })));
                }
            }
        });
        const updated = await (0, database_1.db)('role_definitions').where({ id }).first();
        res.json({ success: true, data: { role: updated } });
    };
    // ── DELETE /roles/:id ──────────────────────────────────────────────────────
    delete = async (req, res) => {
        const { id } = req.params;
        const role = await (0, database_1.db)('role_definitions').where({ id, tenant_id: req.tenant.id }).first();
        if (!role)
            throw new errors_1.NotFoundError('Role');
        if (role.is_system)
            throw new errors_1.AppError('System roles cannot be deleted', 400, 'SYSTEM_ROLE_LOCKED');
        const [{ count }] = await (0, database_1.db)('users').where({ custom_role_id: id }).whereNull('deleted_at').count('id as count');
        if (parseInt(count) > 0)
            throw new errors_1.AppError('Cannot delete a role assigned to active users', 400, 'ROLE_IN_USE');
        await (0, database_1.db)('role_definitions').where({ id }).delete();
        res.json({ success: true, message: 'Role deleted' });
    };
    // ── GET /roles/access-matrix ───────────────────────────────────────────────
    accessMatrix = async (req, res) => {
        const tenantId = req.tenant.id;
        const [roles, permissions] = await Promise.all([
            (0, database_1.db)('role_definitions').where({ tenant_id: tenantId }),
            (0, database_1.db)('permissions').orderBy(['module', 'action']),
        ]);
        const matrix = await Promise.all(roles.map(async (role) => {
            const perms = await (0, database_1.db)('role_permissions').where({ role_id: role.id }).pluck('permission_id');
            return { roleId: role.id, roleName: role.name, permissionIds: perms };
        }));
        res.json({ success: true, data: { roles, permissions, matrix } });
    };
    // ── POST /roles/:id/assign ─────────────────────────────────────────────────
    assignToUser = async (req, res) => {
        const { id } = req.params;
        const { userId } = req.body;
        const role = await (0, database_1.db)('role_definitions').where({ id, tenant_id: req.tenant.id }).first();
        if (!role)
            throw new errors_1.NotFoundError('Role');
        await (0, database_1.db)('users').where({ id: userId, tenant_id: req.tenant.id }).update({ custom_role_id: id });
        res.json({ success: true, message: 'Role assigned' });
    };
    // ── Permission scopes (branch/department overrides) ──────────────────────
    setScope = async (req, res) => {
        const tenantId = req.tenant.id;
        const { userId, roleId, scopeType, scopeId, grantedPermissions = [], deniedPermissions = [] } = req.body;
        const [scope] = await (0, database_1.db)('permission_scopes').insert({
            tenant_id: tenantId, user_id: userId || null, role_id: roleId || null,
            scope_type: scopeType, scope_id: scopeId,
            granted_permissions: grantedPermissions, denied_permissions: deniedPermissions,
        }).returning('*');
        res.status(201).json({ success: true, data: { scope } });
    };
}
exports.RoleController = RoleController;
//# sourceMappingURL=RoleController.js.map