import { Request, Response } from 'express';
import { db } from '../lib/database';
import { AppError, NotFoundError } from '../lib/errors';
import { AuditService } from '../services/index';
import { AIService } from '../services/AIService';

export class AppBuilderController {
  // ── Portals ────────────────────────────────────────────────────────────────
  listPortals = async (req: Request, res: Response) => {
    const portals = await db('portals').where({ tenant_id: req.tenant!.id }).whereNull('deleted_at').orderBy('created_at', 'desc');
    res.json({ success: true, data: { portals } });
  };

  createPortal = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { name, type = 'customer', description, theme } = req.body;
    if (!name) throw new AppError('Portal name required', 400, 'MISSING_NAME');

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    const [portal] = await db('portals').insert({
      tenant_id: tenantId, created_by: req.user!.id, name, slug: `${slug}-${Date.now()}`,
      type, description, theme: JSON.stringify(theme || {}),
    }).returning('*');

    // Auto-create a home page
    await db('portal_pages').insert({ portal_id: portal.id, name: 'Home', slug: '/', is_home: true, components: JSON.stringify([]) });

    AuditService.log({ tenantId, userId: req.user!.id, action: 'portal.create', resourceId: portal.id, ip: req.ip });
    res.status(201).json({ success: true, data: { portal } });
  };

  getPortal = async (req: Request, res: Response) => {
    const { id } = req.params;
    const portal = await db('portals').where({ id, tenant_id: req.tenant!.id }).whereNull('deleted_at').first();
    if (!portal) throw new NotFoundError('Portal');
    const pages = await db('portal_pages').where({ portal_id: id }).orderBy('sort_order');
    res.json({ success: true, data: { portal, pages } });
  };

  updatePortal = async (req: Request, res: Response) => {
    const { id } = req.params;
    const portal = await db('portals').where({ id, tenant_id: req.tenant!.id }).whereNull('deleted_at').first();
    if (!portal) throw new NotFoundError('Portal');

    const allowed: any = {};
    for (const f of ['name', 'description', 'is_published', 'custom_domain']) {
      if (req.body[f] !== undefined) allowed[f] = req.body[f];
    }
    if (req.body.theme) allowed.theme = JSON.stringify(req.body.theme);
    if (req.body.settings) allowed.settings = JSON.stringify(req.body.settings);
    allowed.updated_at = new Date();

    const [updated] = await db('portals').where({ id }).update(allowed).returning('*');
    res.json({ success: true, data: { portal: updated } });
  };

  deletePortal = async (req: Request, res: Response) => {
    const { id } = req.params;
    const portal = await db('portals').where({ id, tenant_id: req.tenant!.id }).whereNull('deleted_at').first();
    if (!portal) throw new NotFoundError('Portal');
    await db('portals').where({ id }).update({ deleted_at: new Date() });
    res.json({ success: true, message: 'Portal deleted' });
  };

  // ── Portal pages ───────────────────────────────────────────────────────────
  savePage = async (req: Request, res: Response) => {
    const { portalId, pageId } = req.params;
    const { components, layout, name } = req.body;

    const existing = await db('portal_pages').where({ id: pageId, portal_id: portalId }).first();
    if (!existing) throw new NotFoundError('Page');

    const update: any = { updated_at: new Date() };
    if (components !== undefined) update.components = JSON.stringify(components);
    if (layout !== undefined) update.layout = JSON.stringify(layout);
    if (name) update.name = name;

    await db('portal_pages').where({ id: pageId }).update(update);
    res.json({ success: true, message: 'Page saved' });
  };

  addPage = async (req: Request, res: Response) => {
    const { portalId } = req.params;
    const { name, slug } = req.body;
    const [page] = await db('portal_pages').insert({
      portal_id: portalId, name, slug: slug || `/${name.toLowerCase().replace(/\s+/g, '-')}`,
      components: JSON.stringify([]),
    }).returning('*');
    res.status(201).json({ success: true, data: { page } });
  };

  // ── AI portal generation ──────────────────────────────────────────────────
  generatePortalWithAI = async (req: Request, res: Response) => {
    const { portalType, description } = req.body;
    const tenant = req.tenant!;

    const portalConfig = await AIService.generatePortalConfig(
      portalType,
      tenant.settings?.businessType || tenant.industry || 'business',
      description || ''
    );

    // Create the portal and pages from AI config
    const slug = `${portalConfig.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
    const [portal] = await db('portals').insert({
      tenant_id: req.tenant!.id, created_by: req.user!.id,
      name: portalConfig.name, slug, type: portalType, description,
    }).returning('*');

    if (portalConfig.pages?.length) {
      await db('portal_pages').insert(
        portalConfig.pages.map((page: any, i: number) => ({
          portal_id: portal.id, name: page.name, slug: page.slug,
          is_home: i === 0, components: JSON.stringify(page.components || []),
          sort_order: i,
        }))
      );
    }

    res.status(201).json({ success: true, data: { portal, config: portalConfig } });
  };

  // ── Form Builder ──────────────────────────────────────────────────────────
  listForms = async (req: Request, res: Response) => {
    const forms = await db('form_definitions')
      .where({ tenant_id: req.tenant!.id }).whereNull('deleted_at')
      .orderBy('created_at', 'desc');
    res.json({ success: true, data: { forms } });
  };

  createForm = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { name, description, fields, settings } = req.body;
    if (!name) throw new AppError('Form name required', 400, 'MISSING_NAME');

    const [form] = await db('form_definitions').insert({
      tenant_id: tenantId, created_by: req.user!.id, name, description,
      fields: JSON.stringify(fields || []), settings: JSON.stringify(settings || {}),
    }).returning('*');

    res.status(201).json({ success: true, data: { form } });
  };

  updateForm = async (req: Request, res: Response) => {
    const { id } = req.params;
    const form = await db('form_definitions').where({ id, tenant_id: req.tenant!.id }).whereNull('deleted_at').first();
    if (!form) throw new NotFoundError('Form');

    const update: any = { updated_at: new Date() };
    for (const f of ['name', 'description', 'is_published', 'webhook_url']) {
      if (req.body[f] !== undefined) update[f] = req.body[f];
    }
    if (req.body.fields !== undefined) update.fields = JSON.stringify(req.body.fields);
    if (req.body.settings !== undefined) update.settings = JSON.stringify(req.body.settings);

    const [updated] = await db('form_definitions').where({ id }).update(update).returning('*');
    res.json({ success: true, data: { form: updated } });
  };

  deleteForm = async (req: Request, res: Response) => {
    const { id } = req.params;
    await db('form_definitions').where({ id, tenant_id: req.tenant!.id }).update({ deleted_at: new Date() });
    res.json({ success: true, message: 'Form deleted' });
  };

  /**
   * Public form submission.
   *
   * The tenant is taken from the *form itself*, not from the request. A
   * public submission carries no credential, so the workspace it belongs to
   * has to come from the record being submitted to — otherwise a caller could
   * post a submission into any workspace by choosing the tenant id.
   *
   * When the request was made on a workspace hostname, that workspace has to
   * be the one that owns the form.
   */
  submitForm = async (req: Request, res: Response) => {
    const { id } = req.params;
    const form = await db('form_definitions').where({ id, is_published: true }).whereNull('deleted_at').first();
    if (!form) throw new NotFoundError('Form');

    if (req.tenant && req.tenant.id !== form.tenant_id) {
      throw new AppError('This form belongs to a different workspace', 403, 'TENANT_MISMATCH');
    }

    const [submission] = await db('form_submissions').insert({
      form_id: id, tenant_id: form.tenant_id, data: JSON.stringify(req.body),
      submitter_email: req.body.email || null, ip_address: req.ip,
    }).returning('*');

    await db('form_definitions').where({ id }).update({ submission_count: db.raw('submission_count + 1') });

    // Fire workflow trigger if configured
    const { WorkflowEngine } = await import('../services/WorkflowEngine');
    WorkflowEngine.trigger(form.tenant_id, 'form.submitted', { formId: id, ...req.body }).catch(() => {});

    res.status(201).json({ success: true, data: { submissionId: submission.id } });
  };

  getFormSubmissions = async (req: Request, res: Response) => {
    const { id } = req.params;
    const submissions = await db('form_submissions').where({ form_id: id, tenant_id: req.tenant!.id }).orderBy('created_at', 'desc').limit(100);
    res.json({ success: true, data: { submissions } });
  };

  generateFormWithAI = async (req: Request, res: Response) => {
    const { purpose } = req.body;
    if (!purpose) throw new AppError('Purpose required', 400, 'MISSING_PURPOSE');

    const tenant = req.tenant!;
    const businessType = tenant.settings?.businessType || tenant.industry || 'business';
    const formConfig = await AIService.generateForms(businessType, purpose);

    const [form] = await db('form_definitions').insert({
      tenant_id: req.tenant!.id, created_by: req.user!.id,
      name: formConfig.name, description: formConfig.purpose,
      fields: JSON.stringify(formConfig.fields || []),
    }).returning('*');

    res.status(201).json({ success: true, data: { form, config: formConfig } });
  };

  // ── Custom Tables (No-Code Database Builder) ──────────────────────────────
  listTables = async (req: Request, res: Response) => {
    const tables = await db('custom_tables').where({ tenant_id: req.tenant!.id }).whereNull('deleted_at').orderBy('name');
    res.json({ success: true, data: { tables } });
  };

  createTable = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { name, label, fields } = req.body;
    if (!name) throw new AppError('Table name required', 400, 'MISSING_NAME');

    const [table] = await db('custom_tables').insert({
      tenant_id: tenantId, created_by: req.user!.id,
      name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'), label: label || name,
      fields: JSON.stringify(fields || []),
    }).returning('*');

    AuditService.log({ tenantId, userId: req.user!.id, action: 'custom_table.create', resourceId: table.id, ip: req.ip });
    res.status(201).json({ success: true, data: { table } });
  };

  updateTable = async (req: Request, res: Response) => {
    const { id } = req.params;
    const table = await db('custom_tables').where({ id, tenant_id: req.tenant!.id }).whereNull('deleted_at').first();
    if (!table) throw new NotFoundError('Table');

    const update: any = { updated_at: new Date() };
    if (req.body.label) update.label = req.body.label;
    if (req.body.fields !== undefined) update.fields = JSON.stringify(req.body.fields);
    if (req.body.views !== undefined) update.views = JSON.stringify(req.body.views);

    const [updated] = await db('custom_tables').where({ id }).update(update).returning('*');
    res.json({ success: true, data: { table: updated } });
  };

  deleteTable = async (req: Request, res: Response) => {
    const { id } = req.params;
    await db('custom_tables').where({ id, tenant_id: req.tenant!.id }).update({ deleted_at: new Date() });
    res.json({ success: true, message: 'Table deleted' });
  };

  // ── Custom Table Records ──────────────────────────────────────────────────
  listRecords = async (req: Request, res: Response) => {
    const { tableId } = req.params;
    const { limit = 100, offset = 0 } = req.query as any;
    const records = await db('custom_records').where({ table_id: tableId, tenant_id: req.tenant!.id }).whereNull('deleted_at').orderBy('created_at', 'desc').limit(parseInt(limit)).offset(parseInt(offset));
    const [{ count }] = await db('custom_records').where({ table_id: tableId, tenant_id: req.tenant!.id }).whereNull('deleted_at').count('id as count');
    res.json({ success: true, data: { records, total: parseInt(count as string) } });
  };

  createRecord = async (req: Request, res: Response) => {
    const { tableId } = req.params;
    const [record] = await db('custom_records').insert({
      table_id: tableId, tenant_id: req.tenant!.id, created_by: req.user!.id, data: JSON.stringify(req.body.data || {}),
    }).returning('*');
    res.status(201).json({ success: true, data: { record } });
  };

  updateRecord = async (req: Request, res: Response) => {
    const { tableId, recordId } = req.params;
    const record = await db('custom_records').where({ id: recordId, table_id: tableId, tenant_id: req.tenant!.id }).whereNull('deleted_at').first();
    if (!record) throw new NotFoundError('Record');
    await db('custom_records').where({ id: recordId }).update({ data: JSON.stringify(req.body.data || {}), updated_at: new Date() });
    res.json({ success: true, message: 'Record updated' });
  };

  deleteRecord = async (req: Request, res: Response) => {
    const { tableId, recordId } = req.params;
    await db('custom_records').where({ id: recordId, table_id: tableId, tenant_id: req.tenant!.id }).update({ deleted_at: new Date() });
    res.json({ success: true, message: 'Record deleted' });
  };
}
