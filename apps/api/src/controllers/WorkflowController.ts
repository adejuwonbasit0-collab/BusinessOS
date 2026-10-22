import { Request, Response } from 'express';
import { db } from '../lib/database';
import { AppError, NotFoundError } from '../lib/errors';
import { AuditService } from '../services/index';
import { WorkflowEngine } from '../services/WorkflowEngine';

export class WorkflowController {
  list = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { status, search } = req.query as any;

    let query = db('workflows').where({ tenant_id: tenantId }).whereNull('deleted_at');
    if (status) query = query.where('status', status);
    if (search) query = query.whereILike('name', `%${search}%`);

    const workflows = await query.orderBy('created_at', 'desc');
    res.json({ success: true, data: { workflows } });
  };

  create = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { name, description, triggerType, triggerConfig, steps, settings } = req.body;
    if (!name) throw new AppError('Workflow name is required', 400, 'MISSING_NAME');
    if (!triggerType) throw new AppError('Trigger type is required', 400, 'MISSING_TRIGGER');

    const tenant = await db('tenants').join('plans', 'tenants.plan_id', 'plans.id')
      .where({ 'tenants.id': tenantId }).select('plans.max_workflows', 'plans.feature_api_access').first();

    if (tenant?.max_workflows !== -1) {
      const [{ count }] = await db('workflows').where({ tenant_id: tenantId }).whereNot('status', 'archived').count('id as count');
      if (parseInt(count as string) >= (tenant?.max_workflows || 50)) {
        throw new AppError(`Workflow limit reached for your plan. Please upgrade.`, 403, 'WORKFLOW_LIMIT');
      }
    }

    const [workflow] = await db('workflows').insert({
      tenant_id: tenantId, created_by: req.user!.id, name, description,
      status: 'draft', trigger_type: triggerType,
      trigger_config: JSON.stringify(triggerConfig || {}),
      steps: JSON.stringify(steps || []),
      settings: JSON.stringify(settings || {}),
    }).returning('*');

    AuditService.log({ tenantId, userId: req.user!.id, action: 'workflow.create', resourceType: 'workflow', resourceId: workflow.id, ip: req.ip });
    res.status(201).json({ success: true, data: { workflow } });
  };

  getOne = async (req: Request, res: Response) => {
    const { id } = req.params;
    const workflow = await db('workflows').where({ id, tenant_id: req.tenant!.id }).whereNull('deleted_at').first();
    if (!workflow) throw new NotFoundError('Workflow');

    const recentRuns = await db('workflow_runs').where({ workflow_id: id }).orderBy('started_at', 'desc').limit(10);
    res.json({ success: true, data: { workflow, recentRuns } });
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const workflow = await db('workflows').where({ id, tenant_id: req.tenant!.id }).whereNull('deleted_at').first();
    if (!workflow) throw new NotFoundError('Workflow');

    const update: any = { updated_at: new Date() };
    for (const field of ['name', 'description', 'status']) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }
    if (req.body.triggerType !== undefined) update.trigger_type = req.body.triggerType;
    if (req.body.triggerConfig !== undefined) update.trigger_config = JSON.stringify(req.body.triggerConfig);
    if (req.body.steps !== undefined) update.steps = JSON.stringify(req.body.steps);
    if (req.body.settings !== undefined) update.settings = JSON.stringify(req.body.settings);

    const [updated] = await db('workflows').where({ id }).update(update).returning('*');
    res.json({ success: true, data: { workflow: updated } });
  };

  toggle = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { active } = req.body;
    const workflow = await db('workflows').where({ id, tenant_id: req.tenant!.id }).whereNull('deleted_at').first();
    if (!workflow) throw new NotFoundError('Workflow');

    const newStatus = active ? 'active' : 'paused';
    await db('workflows').where({ id }).update({ status: newStatus, updated_at: new Date() });
    AuditService.log({ tenantId: req.tenant!.id, userId: req.user!.id, action: `workflow.${active ? 'activate' : 'pause'}`, resourceId: id, ip: req.ip });

    res.json({ success: true, data: { status: newStatus } });
  };

  delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    const workflow = await db('workflows').where({ id, tenant_id: req.tenant!.id }).whereNull('deleted_at').first();
    if (!workflow) throw new NotFoundError('Workflow');

    await db('workflows').where({ id }).update({ deleted_at: new Date(), status: 'archived' });
    res.json({ success: true, message: 'Workflow deleted' });
  };

  testRun = async (req: Request, res: Response) => {
    const { id } = req.params;
    const workflow = await db('workflows').where({ id, tenant_id: req.tenant!.id }).whereNull('deleted_at').first();
    if (!workflow) throw new NotFoundError('Workflow');

    const run = await WorkflowEngine.testRun(id, req.tenant!.id, req.user!.id);
    res.json({ success: true, data: { run } });
  };

  getRuns = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { limit = 20 } = req.query as any;
    const runs = await db('workflow_runs').where({ workflow_id: id }).orderBy('started_at', 'desc').limit(parseInt(limit));
    res.json({ success: true, data: { runs } });
  };

  stats = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const [overview, recentErrors] = await Promise.all([
      db('workflows').where({ tenant_id: tenantId }).whereNull('deleted_at')
        .select(
          db.raw("COUNT(*) as total"),
          db.raw("SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active"),
          db.raw("SUM(run_count) as total_runs"),
          db.raw("SUM(success_count) as total_success"),
          db.raw("SUM(error_count) as total_errors")
        ).first(),
      db('workflow_runs').join('workflows', 'workflow_runs.workflow_id', 'workflows.id')
        .where({ 'workflow_runs.tenant_id': tenantId, 'workflow_runs.status': 'failed' })
        .orderBy('workflow_runs.started_at', 'desc').limit(5)
        .select('workflow_runs.*', 'workflows.name as workflow_name'),
    ]);

    res.json({ success: true, data: { overview, recentErrors } });
  };

  duplicate = async (req: Request, res: Response) => {
    const { id } = req.params;
    const workflow = await db('workflows').where({ id, tenant_id: req.tenant!.id }).whereNull('deleted_at').first();
    if (!workflow) throw new NotFoundError('Workflow');

    const [copy] = await db('workflows').insert({
      tenant_id: req.tenant!.id, created_by: req.user!.id,
      name: `${workflow.name} (Copy)`, description: workflow.description,
      status: 'draft', trigger_type: workflow.trigger_type,
      trigger_config: workflow.trigger_config, steps: workflow.steps,
    }).returning('*');

    res.status(201).json({ success: true, data: { workflow: copy } });
  };
}
