import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

const DAY = 86400000;
const now = new Date();
const ago = (days: number) => new Date(now.getTime() - days * DAY);

export async function seed(knex: Knex): Promise<void> {
  const tenant = await knex('tenants').where({ slug: 'acmecorp' }).first();
  if (!tenant) {
    console.log('⚠️  Acme Corp tenant not found — skipping platform seed (run 001 first).');
    return;
  }
  const tenantId = tenant.id;

  const owner = await knex('users').where({ tenant_id: tenantId, email: 'james@acmecorp.com' }).first();
  const admin = await knex('users').where({ tenant_id: tenantId, email: 'sarah@acmecorp.com' }).first();
  const ownerId = owner?.id;
  const adminId = admin?.id;

  // ── Reset ───────────────────────────────────────────────────────────────────
  await knex('workflow_runs').del();
  await knex('workflows').where({ tenant_id: tenantId }).del();
  await knex('webhook_deliveries').del();
  await knex('webhooks').where({ tenant_id: tenantId }).del();
  await knex('integrations').where({ tenant_id: tenantId }).del();
  await knex('tenant_installed_apps').where({ tenant_id: tenantId }).del();
  await knex('form_submissions').del();
  await knex('form_definitions').where({ tenant_id: tenantId }).del();
  await knex('portal_pages').del();
  await knex('portals').where({ tenant_id: tenantId }).del();
  await knex('custom_records').del();
  await knex('custom_tables').where({ tenant_id: tenantId }).del();
  await knex('white_label_configs').where({ tenant_id: tenantId }).del();
  await knex('inventory_transfer_items').del();
  await knex('inventory_transfers').where({ tenant_id: tenantId }).del();
  await knex('branch_transfers').where({ tenant_id: tenantId }).del();

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFLOWS
  // ═══════════════════════════════════════════════════════════════════════════
  const workflowSeeds = [
    {
      name: 'Welcome new customer', status: 'active', trigger: 'contact.created',
      description: 'Sends a welcome email and creates an onboarding task when a contact becomes a customer.',
      runs: 42, success: 41, errors: 1,
      steps: [
        { type: 'send_email', name: 'Send welcome email', config: { to: '{{trigger.contact.email}}', subject: 'Welcome to NexOS', body: 'Hi {{trigger.contact.first_name}}, welcome aboard!' } },
        { type: 'create_task', name: 'Create onboarding task', config: { title: 'Onboard {{trigger.contact.company_name}}', assignee: 'owner' } },
        { type: 'wait', name: 'Wait 2 days', config: { delayMinutes: 1440 } },
        { type: 'notify_user', name: 'Ping account owner', config: { message: 'Onboarding started for {{trigger.contact.company_name}}' } },
      ],
    },
    {
      name: 'Send invoice when due', status: 'active', trigger: 'invoice.created',
      description: 'Emails every new invoice to the contact and notifies the finance channel.',
      runs: 128, success: 127, errors: 1,
      steps: [
        { type: 'send_email', name: 'Email invoice', config: { to: '{{trigger.contact.email}}', subject: 'Invoice {{trigger.invoice.invoice_number}}', body: 'Your invoice is attached.' } },
        { type: 'notify_user', name: 'Notify finance', config: { message: 'Invoice {{trigger.invoice.invoice_number}} issued' } },
      ],
    },
    {
      name: 'Chase overdue invoices', status: 'active', trigger: 'invoice.overdue',
      description: 'Escalates overdue invoices — a reminder email, then a task for the account owner.',
      runs: 17, success: 16, errors: 1,
      steps: [
        { type: 'condition', name: 'Is more than 7 days late?', config: { field: 'trigger.invoice.daysOverdue', operator: 'greater_than', value: 7, stopOnFalse: false } },
        { type: 'send_email', name: 'Send payment reminder', config: { to: '{{trigger.contact.email}}', subject: 'Reminder: invoice {{trigger.invoice.invoice_number}} is overdue' } },
        { type: 'create_task', name: 'Escalate to owner', config: { title: 'Chase {{trigger.invoice.invoice_number}}', priority: 'high' } },
      ],
    },
    {
      name: 'Score and route inbound leads', status: 'active', trigger: 'contact.created',
      description: 'AI-scores every new lead and creates a task for the best-scoring ones.',
      runs: 63, success: 61, errors: 2,
      steps: [
        { type: 'score_lead', name: 'AI lead score', config: { threshold: 70 } },
        { type: 'condition', name: 'Score above 70?', config: { field: 'variables.leadScore', operator: 'greater_than', value: 70, stopOnFalse: true } },
        { type: 'create_task', name: 'Call hot lead', config: { title: 'Call {{trigger.contact.first_name}} — hot lead', priority: 'urgent' } },
      ],
    },
    {
      name: 'Nightly billing digest', status: 'paused', trigger: 'schedule.daily',
      description: 'Sends the finance team a daily summary of collections and overdue balances.',
      runs: 30, success: 30, errors: 0,
      steps: [
        { type: 'set_variable', name: 'Set report window', config: { key: 'window', value: 'yesterday' } },
        { type: 'http_request', name: 'Pull billing totals', config: { url: '/api/v1/invoices/stats/summary', method: 'GET' } },
        { type: 'send_email', name: 'Email digest', config: { to: 'finance@acmecorp.com', subject: 'Daily billing digest' } },
      ],
    },
    {
      name: 'Win-back campaign', status: 'draft', trigger: 'deal.lost',
      description: 'Starts a win-back sequence for lost deals worth more than $5,000.',
      runs: 0, success: 0, errors: 0,
      steps: [
        { type: 'condition', name: 'Deal over $5k?', config: { field: 'trigger.deal.amount', operator: 'greater_than', value: 5000, stopOnFalse: true } },
        { type: 'wait', name: 'Wait 1 week', config: { delayMinutes: 10080 } },
        { type: 'send_email', name: 'Win-back email', config: { to: '{{trigger.contact.email}}', subject: 'We would love to work together again' } },
      ],
    },
  ];

  const workflowIds: string[] = [];
  for (const w of workflowSeeds) {
    const id = uuidv4();
    workflowIds.push(id);
    await knex('workflows').insert({
      id, tenant_id: tenantId, created_by: ownerId, name: w.name, description: w.description,
      status: w.status, trigger_type: w.trigger,
      trigger_config: JSON.stringify({ filters: [] }),
      steps: JSON.stringify(w.steps),
      settings: JSON.stringify({ retryOnFailure: true, maxRetries: 3 }),
      run_count: w.runs, success_count: w.success, error_count: w.errors,
      last_run_at: w.runs > 0 ? ago(Math.floor(Math.random() * 10) + 1) : null,
      created_at: ago(60 + workflowIds.length * 4),
    });

    // A handful of run history rows so the run log has something to show.
    const runCount = Math.min(6, w.runs);
    for (let r = 0; r < runCount; r++) {
      const ok = r !== 0 || w.errors === 0;
      await knex('workflow_runs').insert({
        id: uuidv4(), workflow_id: id, tenant_id: tenantId,
        status: ok ? 'completed' : 'failed',
        trigger_data: JSON.stringify({ contact: { first_name: 'Sample', company_name: 'Acme Client' } }),
        context: JSON.stringify({}), current_step: w.steps.length,
        step_results: JSON.stringify(w.steps.map((s: any, i: number) => ({
          stepIndex: i, stepType: s.type, stepName: s.name,
          status: 'completed', durationMs: 120 + i * 30,
        }))),
        error_message: ok ? null : 'SMTP provider rejected the message.',
        duration_ms: 400 + w.steps.length * 90,
        started_at: ago(r * 2 + 1), completed_at: ago(r * 2 + 1),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOKS & INTEGRATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const webhookIds = [uuidv4(), uuidv4()];
  await knex('webhooks').insert([
    { id: webhookIds[0], tenant_id: tenantId, name: 'Data warehouse sync', url: 'https://hooks.nexos.app/acme/warehouse', events: ['invoice.paid', 'order.fulfilled'], secret: 'whsec_demo_1', is_active: true },
    { id: webhookIds[1], tenant_id: tenantId, name: 'Opsgenie alerts', url: 'https://api.opsgenie.com/v2/alerts/nexos', events: ['project.overdue', 'invoice.overdue'], secret: 'whsec_demo_2', is_active: false },
  ]);
  for (let i = 0; i < 6; i++) {
    await knex('webhook_deliveries').insert({
      id: uuidv4(), webhook_id: webhookIds[0], tenant_id: tenantId,
      event: i % 2 === 0 ? 'invoice.paid' : 'order.fulfilled',
      payload: JSON.stringify({ id: uuidv4(), amount: 1200 + i * 250 }),
      status_code: i === 3 ? 500 : 200, success: i !== 3, attempt: i === 3 ? 3 : 1,
      created_at: ago(i + 1),
    });
  }

  await knex('integrations').insert([
    { id: uuidv4(), tenant_id: tenantId, provider: 'slack', status: 'active', config: JSON.stringify({ channel: '#acme-ops' }), connected_at: ago(120) },
    { id: uuidv4(), tenant_id: tenantId, provider: 'stripe', status: 'active', config: JSON.stringify({ mode: 'test' }), connected_at: ago(90) },
    { id: uuidv4(), tenant_id: tenantId, provider: 'sendgrid', status: 'inactive', config: JSON.stringify({ from: 'billing@acmecorp.com' }), connected_at: ago(45) },
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // MARKETPLACE INSTALLS
  // ═══════════════════════════════════════════════════════════════════════════
  const listings = await knex('marketplace_listings')
    .whereIn('name', ['Professional Services Pack', 'Advanced Reporting Suite', 'AI Lead Scorer', 'Paystack Checkout'])
    .select('id', 'name', 'version');
  for (const l of listings) {
    await knex('tenant_installed_apps').insert({
      id: uuidv4(), tenant_id: tenantId, listing_id: l.id, installed_by: adminId,
      installed_version: l.version, is_active: true, config: JSON.stringify({}),
      installed_at: ago(20 + listings.indexOf(l) * 6),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PORTALS
  // ═══════════════════════════════════════════════════════════════════════════
  type PortalPageDef = {
    name: string; slug: string; home: boolean;
    components: any[]; requiresAuth?: boolean;
  };
  type PortalDef = {
    name: string; slug: string; type: string; published: boolean;
    description: string; theme: Record<string, any>; pages: PortalPageDef[];
  };

  const portalDefs: PortalDef[] = [
    {
      name: 'Customer Portal', slug: 'customer-portal', type: 'customer', published: true,
      description: 'Self-service hub where customers track usage, raise tickets and download invoices.',
      theme: { primaryColor: '#4f8ef7', accentColor: '#8b5cf6', radius: 'lg' },
      pages: [
        { name: 'Home', slug: '/', home: true, components: [
          { type: 'hero', title: 'Welcome back', subtitle: 'Your account at a glance' },
          { type: 'stats', items: [{ label: 'Open tickets', value: 2 }, { label: 'Active licences', value: 32 }] },
          { type: 'table', title: 'Recent invoices', columns: ['Number', 'Date', 'Amount', 'Status'] },
        ] },
        { name: 'Invoices', slug: '/invoices', home: false, components: [
          { type: 'table', title: 'All invoices', columns: ['Number', 'Issue date', 'Due date', 'Amount', 'Status'] },
        ] },
        { name: 'Support', slug: '/support', home: false, requiresAuth: true, components: [
          { type: 'form', title: 'Raise a ticket', submitLabel: 'Submit ticket' },
        ] },
      ],
    },
    {
      name: 'Partner Portal', slug: 'partner-portal', type: 'vendor', published: false,
      description: 'Shared workspace for resellers — pipeline, commissions and enablement material.',
      theme: { primaryColor: '#10b981', accentColor: '#f59e0b', radius: 'md' },
      pages: [
        { name: 'Home', slug: '/', home: true, components: [
          { type: 'hero', title: 'Partner portal', subtitle: 'Track your NexOS business' },
          { type: 'stats', items: [{ label: 'Referrals', value: 14 }, { label: 'Commission', value: 18200 }] },
        ] },
        { name: 'Deal Registration', slug: '/deals', home: false, components: [
          { type: 'form', title: 'Register a new deal', submitLabel: 'Submit for review' },
        ] },
      ],
    },
  ];

  for (const p of portalDefs) {
    const id = uuidv4();
    await knex('portals').insert({
      id, tenant_id: tenantId, created_by: adminId, name: p.name, slug: p.slug, type: p.type,
      is_published: p.published, description: p.description,
      theme: JSON.stringify(p.theme), settings: JSON.stringify({ requireInvite: true }),
      created_at: ago(35),
    });
    for (let i = 0; i < p.pages.length; i++) {
      const pg = p.pages[i];
      await knex('portal_pages').insert({
        id: uuidv4(), portal_id: id, name: pg.name, slug: pg.slug, is_home: pg.home,
        components: JSON.stringify(pg.components), layout: JSON.stringify({ width: 'full' }),
        requires_auth: pg.requiresAuth !== false, sort_order: i,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMS
  // ═══════════════════════════════════════════════════════════════════════════
  const formDefs = [
    {
      name: 'New project request', description: 'Intake form used by the sales team to request a delivery engagement.',
      published: true, submissions: 24,
      fields: [
        { label: 'Project name', type: 'text', required: true },
        { label: 'Client company', type: 'text', required: true },
        { label: 'Target start date', type: 'date', required: false },
        { label: 'Budget range', type: 'select', options: ['< $25k', '$25k – $75k', '$75k – $150k', '> $150k'], required: true },
        { label: 'Brief', type: 'textarea', required: true },
      ],
    },
    {
      name: 'Expense claim', description: 'Staff reimbursement claim form — routes to finance for approval.',
      published: true, submissions: 87,
      fields: [
        { label: 'Amount', type: 'number', required: true },
        { label: 'Category', type: 'select', options: ['Travel', 'Software', 'Equipment', 'Other'], required: true },
        { label: 'Receipt link', type: 'url', required: false },
        { label: 'Reason', type: 'textarea', required: true },
      ],
    },
    {
      name: 'Support request', description: 'Public intake form for the customer support team.',
      published: false, submissions: 5,
      fields: [
        { label: 'Your email', type: 'email', required: true },
        { label: 'Subject', type: 'text', required: true },
        { label: 'How can we help?', type: 'textarea', required: true },
      ],
    },
  ];

  for (const f of formDefs) {
    const id = uuidv4();
    await knex('form_definitions').insert({
      id, tenant_id: tenantId, created_by: adminId, name: f.name, description: f.description,
      fields: JSON.stringify(f.fields),
      settings: JSON.stringify({ submitButtonText: 'Submit', successMessage: 'Thanks — we received your request.' }),
      is_published: f.published, submission_count: f.submissions, created_at: ago(30),
    });
    const n = Math.min(4, f.submissions);
    for (let i = 0; i < n; i++) {
      await knex('form_submissions').insert({
        id: uuidv4(), form_id: id, tenant_id: tenantId,
        data: JSON.stringify({ 'Project name': `Customer rollout ${i + 1}`, 'Amount': 250 + i * 120 }),
        submitter_email: `customer${i + 1}@example.com`, ip_address: '10.0.2.14',
        user_agent: 'Mozilla/5.0', created_at: ago(i * 3 + 1),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM TABLES (no-code data)
  // ═══════════════════════════════════════════════════════════════════════════
  const tableDefs = [
    {
      name: 'competitor_pricing', label: 'Competitor Pricing',
      fields: [
        { name: 'competitor', type: 'text', label: 'Competitor' },
        { name: 'plan', type: 'text', label: 'Plan' },
        { name: 'price', type: 'number', label: 'Monthly price' },
        { name: 'notes', type: 'text', label: 'Notes' },
      ],
      views: [{ name: 'All', filters: [], sorts: [{ field: 'price', dir: 'asc' }] }],
      records: [
        { competitor: 'Globex Suite', plan: 'Business', price: 129, notes: 'Closest analogue — undercuts on price.' },
        { competitor: 'Initech Cloud', plan: 'Enterprise', price: 249, notes: 'Weak reporting, stronger support.' },
        { competitor: 'Stark Analytics', plan: 'Starter', price: 79, notes: 'Entry tier only, no API.' },
        { competitor: 'Wayne Analytics', plan: 'Business', price: 149, notes: 'Feature parity, pricier.' },
      ],
    },
    {
      name: 'office_assets', label: 'Office Assets',
      fields: [
        { name: 'item', type: 'text', label: 'Item' },
        { name: 'serial', type: 'text', label: 'Serial number' },
        { name: 'assigned_to', type: 'text', label: 'Assigned to' },
        { name: 'condition', type: 'select', label: 'Condition' },
      ],
      views: [{ name: 'All', filters: [], sorts: [] }],
      records: [
        { item: 'MacBook Pro 16"', serial: 'C02XK1', assigned_to: 'Priya Sharma', condition: 'Excellent' },
        { item: 'Dell U2723QE', serial: 'MON4412', assigned_to: 'Marcus Kim', condition: 'Good' },
        { item: 'ThinkPad X1', serial: 'PF3K9Z1', assigned_to: 'Diego Alvarez', condition: 'Good' },
        { item: 'Meeting room AV kit', serial: 'AV-0042', assigned_to: 'Facilities', condition: 'Fair' },
      ],
    },
  ];

  for (const t of tableDefs) {
    const id = uuidv4();
    await knex('custom_tables').insert({
      id, tenant_id: tenantId, created_by: adminId, name: t.name, label: t.label,
      fields: JSON.stringify(t.fields), views: JSON.stringify(t.views), is_public: false,
      created_at: ago(28),
    });
    for (const r of t.records) {
      await knex('custom_records').insert({
        id: uuidv4(), table_id: id, tenant_id: tenantId, created_by: adminId,
        data: JSON.stringify(r), created_at: ago(Math.floor(Math.random() * 20) + 1),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WHITE LABEL
  // ═══════════════════════════════════════════════════════════════════════════
  await knex('white_label_configs').insert({
    id: uuidv4(), tenant_id: tenantId, brand_name: 'Acme Corp',
    primary_color: '#4f8ef7', secondary_color: '#8b5cf6',
    support_email: 'support@acmecorp.com', support_phone: '+1 212 555 0140',
    terms_url: 'https://acmecorp.com/terms', privacy_url: 'https://acmecorp.com/privacy',
    email_settings: JSON.stringify({ fromName: 'Acme Corp', replyTo: 'support@acmecorp.com' }),
    smtp_settings: JSON.stringify({ host: 'smtp.acmecorp.com', port: 587 }),
    hide_powered_by: false,
    custom_css: JSON.stringify({ '--radius': '0.625rem' }),
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INVENTORY TRANSFERS & BRANCH TRANSFERS
  // ═══════════════════════════════════════════════════════════════════════════
  const warehouses = await knex('warehouses').where({ tenant_id: tenantId }).select('id', 'name');
  const products = await knex('products').where({ tenant_id: tenantId }).select('id', 'name');
  if (warehouses.length >= 2 && products.length >= 2) {
    const transferId = uuidv4();
    await knex('inventory_transfers').insert({
      id: transferId, tenant_id: tenantId,
      from_warehouse_id: warehouses[0].id, to_warehouse_id: warehouses[1].id,
      transfer_number: 'TRF-2026-0001', status: 'in_transit', requested_by: adminId,
      notes: 'Rebalancing stock ahead of the West Coast rollout.', created_at: ago(6),
    });
    await knex('inventory_transfer_items').insert([
      { id: uuidv4(), transfer_id: transferId, product_id: products[0].id, quantity: 25 },
      { id: uuidv4(), transfer_id: transferId, product_id: products[1].id, quantity: 40 },
    ]);

    const completedId = uuidv4();
    await knex('inventory_transfers').insert({
      id: completedId, tenant_id: tenantId,
      from_warehouse_id: warehouses[1].id, to_warehouse_id: warehouses[0].id,
      transfer_number: 'TRF-2026-0002', status: 'completed', requested_by: adminId,
      notes: 'Returned excess scanners.', completed_at: ago(2), created_at: ago(9),
    });
    await knex('inventory_transfer_items').insert([
      { id: uuidv4(), transfer_id: completedId, product_id: products[2]?.id ?? products[0].id, quantity: 6 },
    ]);
  }

  const branches = await knex('branches').where({ tenant_id: tenantId }).select('id', 'name');
  if (branches.length >= 2) {
    await knex('branch_transfers').insert([
      { id: uuidv4(), tenant_id: tenantId, from_branch_id: branches[0].id, to_branch_id: branches[1].id, requested_by: adminId, resource_type: 'staff', resource_id: 'emma-wilson', status: 'approved', notes: 'Relocating one account manager to the West Coast team.', completed_at: ago(14) },
      { id: uuidv4(), tenant_id: tenantId, from_branch_id: branches[1].id, to_branch_id: branches[2]?.id ?? branches[0].id, requested_by: ownerId, resource_type: 'asset', resource_id: 'AV-KIT-001', status: 'pending', notes: 'Moving the AV kit to the Europe office for the field event.' },
    ]);
  }

  console.log(`✅ Seeded platform data: ${workflowSeeds.length} workflows, ${portalDefs.length} portals, ${formDefs.length} forms, ${tableDefs.length} custom tables, white-label + integrations.`);
}
