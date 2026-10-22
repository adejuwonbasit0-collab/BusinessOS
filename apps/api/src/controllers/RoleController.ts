import { Request, Response } from 'express';
import { db } from '../lib/database';
import { AppError, NotFoundError } from '../lib/errors';
import { AuditService } from '../services/index';

export class RoleController {
  // ── GET /roles ─────────────────────────────────────────────────────────────
  list = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const roles = await db('role_definitions').where({ tenant_id: tenantId }).orderBy('name');

    const rolesWithPerms = await Promise.all(roles.map(async (role) => {
      const perms = await db('role_permissions').join('permissions', 'role_permissions.permission_id', 'permissions.id')
        .where({ role_id: role.id }).select('permissions.key');
      const [{ count }] = await db('users').where({ custom_role_id: role.id }).whereNull('deleted_at').count('id as count');
      return { ...role, permissions: perms.map((p) => p.key), userCount: parseInt(count as string) };
    }));

    res.json({ success: true, data: { roles: rolesWithPerms } });
  };

  // ── GET /roles/permissions-catalog ────────────────────────────────────────
  permissionsCatalog = async (req: Request, res: Response) => {
    const permissions = await db('permissions').orderBy(['module', 'action']);
    const grouped = permissions.reduce((acc: Record<string, any[]>, perm) => {
      acc[perm.module] = acc[perm.module] || [];
      acc[perm.module].push(perm);
      return acc;
    }, {});
    res.json({ success: true, data: { permissions, grouped } });
  };

  // ── POST /roles ────────────────────────────────────────────────────────────
  create = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { name, description, permissionKeys = [] } = req.body;

    const existing = await db('role_definitions').where({ tenant_id: tenantId, name }).first();
    if (existing) throw new AppError('A role with this name already exists', 409, 'DUPLICATE_ROLE');

    const result = await db.transaction(async (trx) => {
      const [role] = await trx('role_definitions').insert({ tenant_id: tenantId, name, description, is_system: false }).returning('*');

      if (permissionKeys.length > 0) {
        const perms = await trx('permissions').whereIn('key', permissionKeys);
        await trx('role_permissions').insert(perms.map((p) => ({ role_id: role.id, permission_id: p.id })));
      }
      return role;
    });

    AuditService.log({ tenantId, userId: req.user!.id, action: 'role.create', resourceType: 'role', resourceId: result.id, ip: req.ip });
    res.status(201).json({ success: true, data: { role: result } });
  };

  // ── PATCH /roles/:id ───────────────────────────────────────────────────────
  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, permissionKeys } = req.body;
    const role = await db('role_definitions').where({ id, tenant_id: req.tenant!.id }).first();
    if (!role) throw new NotFoundError('Role');
    if (role.is_system) throw new AppError('System roles cannot be modified', 400, 'SYSTEM_ROLE_LOCKED');

    await db.transaction(async (trx) => {
      const update: any = { updated_at: new Date() };
      if (name) update.name = name;
      if (description !== undefined) update.description = description;
      await trx('role_definitions').where({ id }).update(update);

      if (Array.isArray(permissionKeys)) {
        await trx('role_permissions').where({ role_id: id }).delete();
        if (permissionKeys.length > 0) {
          const perms = await trx('permissions').whereIn('key', permissionKeys);
          await trx('role_permissions').insert(perms.map((p) => ({ role_id: id, permission_id: p.id })));
        }
      }
    });

    const updated = await db('role_definitions').where({ id }).first();
    res.json({ success: true, data: { role: updated } });
  };

  // ── DELETE /roles/:id ──────────────────────────────────────────────────────
  delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    const role = await db('role_definitions').where({ id, tenant_id: req.tenant!.id }).first();
    if (!role) throw new NotFoundError('Role');
    if (role.is_system) throw new AppError('System roles cannot be deleted', 400, 'SYSTEM_ROLE_LOCKED');

    const [{ count }] = await db('users').where({ custom_role_id: id }).whereNull('deleted_at').count('id as count');
    if (parseInt(count as string) > 0) throw new AppError('Cannot delete a role assigned to active users', 400, 'ROLE_IN_USE');

    await db('role_definitions').where({ id }).delete();
    res.json({ success: true, message: 'Role deleted' });
  };

  // ── GET /roles/access-matrix ───────────────────────────────────────────────
  accessMatrix = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const [roles, permissions] = await Promise.all([
      db('role_definitions').where({ tenant_id: tenantId }),
      db('permissions').orderBy(['module', 'action']),
    ]);

    const matrix = await Promise.all(roles.map(async (role) => {
      const perms = await db('role_permissions').where({ role_id: role.id }).pluck('permission_id');
      return { roleId: role.id, roleName: role.name, permissionIds: perms };
    }));

    res.json({ success: true, data: { roles, permissions, matrix } });
  };

  // ── POST /roles/:id/assign ─────────────────────────────────────────────────
  assignToUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.body;
    const role = await db('role_definitions').where({ id, tenant_id: req.tenant!.id }).first();
    if (!role) throw new NotFoundError('Role');

    await db('users').where({ id: userId, tenant_id: req.tenant!.id }).update({ custom_role_id: id });
    res.json({ success: true, message: 'Role assigned' });
  };

  // ── Permission scopes (branch/department overrides) ──────────────────────
  setScope = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { userId, roleId, scopeType, scopeId, grantedPermissions = [], deniedPermissions = [] } = req.body;

    const [scope] = await db('permission_scopes').insert({
      tenant_id: tenantId, user_id: userId || null, role_id: roleId || null,
      scope_type: scopeType, scope_id: scopeId,
      granted_permissions: grantedPermissions, denied_permissions: deniedPermissions,
    }).returning('*');

    res.status(201).json({ success: true, data: { scope } });
  };
}
