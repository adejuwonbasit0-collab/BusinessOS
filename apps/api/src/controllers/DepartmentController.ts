import { Request, Response } from 'express';
import { db } from '../lib/database';
import { NotFoundError } from '../lib/errors';

export class DepartmentController {
  list = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const departments = await db('departments')
      .leftJoin('branches', 'departments.branch_id', 'branches.id')
      .leftJoin('users as head', 'departments.head_user_id', 'head.id')
      .where({ 'departments.tenant_id': tenantId })
      .select('departments.*', 'branches.name as branch_name', db.raw("CONCAT(head.first_name, ' ', head.last_name) as head_name"))
      .orderBy('departments.name');

    const withCounts = await Promise.all(departments.map(async (d) => {
      const [{ count }] = await db('users').where({ department_id: d.id }).whereNull('deleted_at').count('id as count');
      return { ...d, staffCount: parseInt(count as string) };
    }));

    res.json({ success: true, data: { departments: withCounts } });
  };

  create = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { name, branchId, headUserId, description } = req.body;
    const [department] = await db('departments').insert({
      tenant_id: tenantId, name, branch_id: branchId || null, head_user_id: headUserId || null, description,
    }).returning('*');
    res.status(201).json({ success: true, data: { department } });
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const department = await db('departments').where({ id, tenant_id: req.tenant!.id }).first();
    if (!department) throw new NotFoundError('Department');

    const allowed = ['name', 'branch_id', 'head_user_id', 'description'];
    const fieldMap: Record<string, string> = { branchId: 'branch_id', headUserId: 'head_user_id' };
    const update: any = { updated_at: new Date() };
    for (const key of Object.keys(req.body)) {
      const dbKey = fieldMap[key] || (allowed.includes(key) ? key : null);
      if (dbKey) update[dbKey] = req.body[key];
    }

    const [updated] = await db('departments').where({ id }).update(update).returning('*');
    res.json({ success: true, data: { department: updated } });
  };

  delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    const department = await db('departments').where({ id, tenant_id: req.tenant!.id }).first();
    if (!department) throw new NotFoundError('Department');
    await db('departments').where({ id }).delete();
    res.json({ success: true, message: 'Department deleted' });
  };
}
