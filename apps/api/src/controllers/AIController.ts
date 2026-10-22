import { Request, Response } from 'express';
import { db } from '../lib/database';
import { AppError } from '../lib/errors';
import { AIService } from '../services/AIService';
import { AuditService } from '../services/index';

export class AIController {
  // ── 1. Analyze a business description ─────────────────────────────────────
  analyzeBusinessDescription = async (req: Request, res: Response) => {
    const { description } = req.body;
    if (!description?.trim()) throw new AppError('Business description is required', 400, 'MISSING_DESCRIPTION');

    const analysis = await AIService.analyzeBusinessDescription(description);

    // Store the analysis for this tenant so we can apply it
    await db('audit_logs').insert({
      tenant_id: req.tenant!.id, user_id: req.user!.id, action: 'ai.business_analysis',
      description: `AI analyzed business: ${description.slice(0, 100)}`,
      new_values: JSON.stringify(analysis),
    });

    res.json({ success: true, data: { analysis } });
  };

  // ── 2. Apply a business analysis (actually configure the tenant) ───────────
  applyBusinessAnalysis = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { analysis } = req.body;

    if (!analysis?.recommendedModules?.length) {
      throw new AppError('Invalid analysis object', 400, 'INVALID_ANALYSIS');
    }

    await db('tenants').where({ id: tenantId }).update({
      industry: analysis.industry,
      enabled_modules: JSON.stringify(analysis.recommendedModules),
      settings: db.raw(`settings || ?::jsonb`, [JSON.stringify({
        terminologyOverrides: analysis.terminologyOverrides,
        aiGeneratedAt: new Date().toISOString(),
        businessType: analysis.businessType,
      })]),
    });

    // Insert suggested workflows as drafts
    if (analysis.suggestedWorkflows?.length) {
      await db('workflows').insert(
        analysis.suggestedWorkflows.map((wf: any) => ({
          tenant_id: tenantId, created_by: req.user!.id, name: wf.name,
          description: wf.description, status: 'draft', trigger_type: wf.triggerType,
          trigger_config: JSON.stringify(wf.triggerConfig || {}), steps: JSON.stringify(wf.steps || []),
        }))
      );
    }

    AuditService.log({ tenantId, userId: req.user!.id, action: 'ai.apply_analysis', ip: req.ip });
    res.json({ success: true, message: 'Business configuration applied successfully' });
  };

  // ── 3. Generate workflow from natural language ─────────────────────────────
  generateWorkflow = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { description } = req.body;
    if (!description?.trim()) throw new AppError('Description is required', 400, 'MISSING_DESCRIPTION');

    const tenant = req.tenant!;
    const tenantContext = `${tenant.name} (${tenant.industry || 'general business'}), modules: ${(tenant.enabled_modules || []).join(', ')}`;

    const workflow = await AIService.generateWorkflowFromDescription(description, tenantContext);

    // Persist as a draft workflow
    const [saved] = await db('workflows').insert({
      tenant_id: tenantId, created_by: req.user!.id, name: workflow.name,
      description: workflow.description, status: 'draft', trigger_type: workflow.triggerType,
      trigger_config: JSON.stringify(workflow.triggerConfig || {}), steps: JSON.stringify(workflow.steps || []),
    }).returning('*');

    AuditService.log({ tenantId, userId: req.user!.id, action: 'ai.generate_workflow', resourceId: saved.id, ip: req.ip });
    res.status(201).json({ success: true, data: { workflow: saved } });
  };

  // ── 4. Generate report from live data ─────────────────────────────────────
  generateReport = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { reportType, period = '30d' } = req.body;
    if (!reportType) throw new AppError('Report type is required', 400, 'MISSING_REPORT_TYPE');

    const days = parseInt(period) || 30;
    const since = new Date(Date.now() - days * 86400000);

    // Gather live data for the report
    const [revenue, expenses, contacts, openDeals, invoiceStats] = await Promise.all([
      db('invoices').where({ tenant_id: tenantId, status: 'paid' }).where('paid_at', '>=', since).sum('total as total').first(),
      db('expenses').where({ tenant_id: tenantId }).where('expense_date', '>=', since).sum('amount as total').first(),
      db('contacts').where({ tenant_id: tenantId }).whereNull('deleted_at').count('id as count').first(),
      db('deals').where({ tenant_id: tenantId, status: 'open' }).whereNull('deleted_at').count('id as count').first(),
      db('invoices').where({ tenant_id: tenantId }).whereNull('deleted_at')
        .select(db.raw('COUNT(*) as total'), db.raw("SUM(CASE WHEN status='paid' THEN total ELSE 0 END) as paid"),
          db.raw("SUM(CASE WHEN status='overdue' THEN amount_due ELSE 0 END) as overdue")).first(),
    ]);

    const data = {
      period: `Last ${days} days`, revenue: revenue?.total || 0, expenses: expenses?.total || 0,
      profit: (parseFloat(revenue?.total || '0') - parseFloat(expenses?.total || '0')).toFixed(2),
      totalContacts: contacts?.count || 0, openDeals: openDeals?.count || 0,
      invoiceStats: { total: invoiceStats?.total, paid: invoiceStats?.paid, overdue: invoiceStats?.overdue },
    };

    const tenant = req.tenant!;
    const report = await AIService.generateReport(reportType, data, `${tenant.name} (${tenant.industry || 'business'})`);

    res.json({ success: true, data: { report, rawData: data } });
  };

  // ── 5. Generate SOPs ──────────────────────────────────────────────────────
  generateSOPs = async (req: Request, res: Response) => {
    const { departments } = req.body;
    const tenant = req.tenant!;
    const businessType = tenant.settings?.businessType || tenant.industry || 'general business';

    const deptList = departments?.length
      ? departments
      : await db('departments').where({ tenant_id: req.tenant!.id }).pluck('name').then((d: string[]) => d.length ? d : ['Operations', 'Sales', 'Customer Service']);

    const sops = await AIService.generateSOPs(businessType, deptList);
    res.json({ success: true, data: { sops } });
  };

  // ── 6. Generate Policies ──────────────────────────────────────────────────
  generatePolicies = async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    const businessType = tenant.settings?.businessType || tenant.name;
    const industry = tenant.industry || 'general';

    const policies = await AIService.generatePolicies(businessType, industry);
    res.json({ success: true, data: { policies } });
  };

  // ── 7. Generate Form ──────────────────────────────────────────────────────
  generateForm = async (req: Request, res: Response) => {
    const { purpose } = req.body;
    if (!purpose?.trim()) throw new AppError('Form purpose is required', 400, 'MISSING_PURPOSE');

    const tenant = req.tenant!;
    const businessType = tenant.settings?.businessType || tenant.name;

    const form = await AIService.generateForms(businessType, purpose);
    res.json({ success: true, data: { form } });
  };

  // ── 8. Generate Website Content ───────────────────────────────────────────
  generateWebsiteContent = async (req: Request, res: Response) => {
    const { description } = req.body;
    const tenant = req.tenant!;
    const businessType = tenant.settings?.businessType || tenant.industry || 'business';

    const content = await AIService.generateWebsiteContent(businessType, tenant.name, description || '');
    res.json({ success: true, data: { content } });
  };

  // ── 9. Generate Dashboard Layout ──────────────────────────────────────────
  generateDashboard = async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    const businessType = tenant.settings?.businessType || tenant.industry || 'business';
    const modules: string[] = tenant.enabled_modules || [];

    const dashboard = await AIService.generateDashboard(businessType, modules);
    res.json({ success: true, data: { dashboard } });
  };

  // ── 10. Chat with AI assistant ────────────────────────────────────────────
  chat = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { messages, systemContext } = req.body;
    if (!messages?.length) throw new AppError('Messages array required', 400, 'MISSING_MESSAGES');

    const tenant = req.tenant!;
    const tenantContext = {
      name: tenant.name,
      industry: tenant.industry || 'general',
      enabledModules: tenant.enabled_modules || [],
    };

    const reply = await AIService.chat(messages, tenantContext, systemContext || '');

    // Log AI usage
    await db('audit_logs').insert({
      tenant_id: tenantId, user_id: req.user!.id, action: 'ai.chat',
      description: `AI chat: ${messages[messages.length - 1]?.content?.slice(0, 100)}`,
    }).catch(() => {});

    res.json({ success: true, data: { reply } });
  };

  // ── 11. Score a lead with AI reasoning ───────────────────────────────────
  scoreLead = async (req: Request, res: Response) => {
    const { contactId } = req.body;
    const contact = await db('contacts').where({ id: contactId, tenant_id: req.tenant!.id }).first();
    if (!contact) throw new AppError('Contact not found', 404, 'NOT_FOUND');

    const activities = await db('activities').where({ contact_id: contactId }).count('id as count').first();
    const deals = await db('deals').where({ contact_id: contactId }).sum('amount as total').first();

    const contactData = {
      type: contact.type, leadSource: contact.lead_source, companyName: contact.company_name,
      jobTitle: contact.job_title, emailSubscribed: contact.email_subscribed,
      activitiesCount: activities?.count || 0, totalDealValue: deals?.total || 0,
      daysSinceCreated: Math.floor((Date.now() - new Date(contact.created_at).getTime()) / 86400000),
      lastContactedDaysAgo: contact.last_contacted_at
        ? Math.floor((Date.now() - new Date(contact.last_contacted_at).getTime()) / 86400000)
        : null,
    };

    const result = await AIService.scoreLeadWithReasoning(contactData);

    await db('contacts').where({ id: contactId }).update({ lead_score: result.score, updated_at: new Date() });

    res.json({ success: true, data: { ...result, contactId } });
  };

  // ── 12. Generate portal config (App Builder) ──────────────────────────────
  generatePortal = async (req: Request, res: Response) => {
    const { portalType, description } = req.body;
    if (!['customer', 'staff', 'vendor'].includes(portalType)) {
      throw new AppError('portalType must be customer, staff, or vendor', 400, 'INVALID_PORTAL_TYPE');
    }

    const tenant = req.tenant!;
    const businessType = tenant.settings?.businessType || tenant.industry || 'business';

    const portal = await AIService.generatePortalConfig(portalType, businessType, description || '');
    res.json({ success: true, data: { portal } });
  };
}
