import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const DAY = 86400000;

const now = new Date();
const ago = (days: number) => new Date(now.getTime() - days * DAY);
const ahead = (days: number) => new Date(now.getTime() + days * DAY);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export async function seed(knex: Knex): Promise<void> {
  const tenant = await knex('tenants').where({ slug: 'acmecorp' }).first();
  if (!tenant) {
    console.log('⚠️  Acme Corp tenant not found — skipping operations seed (run 001 first).');
    return;
  }
  const tenantId = tenant.id;

  // ── Reset every table this seed owns (idempotent re-runs) ────────────────
  await knex('task_comments').del();
  await knex('tasks').del();
  await knex('milestones').del();
  await knex('project_members').del();
  await knex('projects').del();
  await knex('sales_order_items').del();
  await knex('sales_orders').del();
  await knex('quotation_items').del();
  await knex('quotations').del();
  await knex('pos_sessions').del();
  await knex('refunds').del();
  await knex('purchase_order_items').del();
  await knex('purchase_orders').del();
  await knex('suppliers').del();
  await knex('stock_movements').del();
  await knex('stock_levels').del();
  await knex('warehouses').del();
  await knex('product_variants').del();
  await knex('invoice_items').del();
  await knex('payments').del();
  await knex('invoices').del();
  await knex('expenses').del();
  await knex('attendance_records').del();
  await knex('leave_requests').del();
  await knex('leave_balances').del();
  await knex('leave_types').del();
  await knex('payslips').del();
  await knex('payroll_runs').del();
  await knex('compensation_records').del();
  await knex('job_candidates').del();
  await knex('job_openings').del();
  await knex('performance_reviews').del();
  await knex('team_members').del();
  await knex('teams').del();
  await knex('document_signatures').del();
  await knex('approval_requests').del();
  await knex('documents').del();
  await knex('bookings').del();
  await knex('availability_rules').del();
  await knex('bookable_resources').del();
  await knex('messages').del();
  await knex('message_thread_participants').del();
  await knex('message_threads').del();
  await knex('communication_logs').del();
  await knex('notifications').del();
  await knex('journal_entry_lines').del();
  await knex('journal_entries').del();
  await knex('chart_of_accounts').del();
  await knex('budgets').del();
  await knex('tax_rates').del();
  await knex('activities').del();
  await knex('contact_list_members').del();
  await knex('contact_lists').del();
  await knex('deals').del();
  await knex('pipeline_stages').del();
  await knex('pipelines').del();
  await knex('products').del();
  await knex('product_categories').del();
  await knex('contacts').del();
  await knex('role_permissions').del();
  await knex('permission_scopes').del();
  await knex('role_definitions').del();

  // Break the user → department/branch circular references before dropping them.
  await knex('users').where({ tenant_id: tenantId }).update({ department_id: null, branch_id: null, custom_role_id: null });
  await knex('departments').where({ tenant_id: tenantId }).del();
  await knex('branches').where({ tenant_id: tenantId }).del();

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. BRANCHES & DEPARTMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  const hq = uuidv4();
  const west = uuidv4();
  const europe = uuidv4();
  await knex('branches').insert([
    { id: hq, tenant_id: tenantId, name: 'Headquarters', code: 'NYC-01', type: 'headquarters', phone: '+1 212 555 0140', email: 'hq@acmecorp.com', address: JSON.stringify({ line1: '120 Hudson St', city: 'New York', state: 'NY', postal_code: '10013', country: 'US' }), timezone: 'America/New_York', is_active: true, is_default: true },
    { id: west, tenant_id: tenantId, name: 'West Coast', code: 'SFO-02', type: 'branch', phone: '+1 415 555 0188', email: 'west@acmecorp.com', address: JSON.stringify({ line1: '500 Howard St', city: 'San Francisco', state: 'CA', postal_code: '94105', country: 'US' }), timezone: 'America/Los_Angeles', is_active: true, is_default: false },
    { id: europe, tenant_id: tenantId, name: 'Europe', code: 'LDN-03', type: 'branch', phone: '+44 20 7946 0810', email: 'europe@acmecorp.com', address: JSON.stringify({ line1: '22 Bishopsgate', city: 'London', postal_code: 'EC2N 4BQ', country: 'GB' }), timezone: 'Europe/London', is_active: true, is_default: false },
  ]);

  const eng = uuidv4();
  const salesDept = uuidv4();
  const ops = uuidv4();
  const fin = uuidv4();
  const people = uuidv4();
  await knex('departments').insert([
    { id: eng, tenant_id: tenantId, branch_id: hq, name: 'Engineering', description: 'Product engineering, platform and QA.' },
    { id: salesDept, tenant_id: tenantId, branch_id: hq, name: 'Sales', description: 'Pipeline, account management and partnerships.' },
    { id: ops, tenant_id: tenantId, branch_id: hq, name: 'Operations', description: 'Customer operations, logistics and support.' },
    { id: fin, tenant_id: tenantId, branch_id: hq, name: 'Finance', description: 'Billing, accounting and procurement.' },
    { id: people, tenant_id: tenantId, branch_id: hq, name: 'People & Culture', description: 'Hiring, payroll, learning and engagement.' },
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. PEOPLE
  // ═══════════════════════════════════════════════════════════════════════════
  const staffHash = await bcrypt.hash('Demo@acme123', 12);

  const existing = await knex('users').where({ tenant_id: tenantId }).select('id', 'email', 'role');
  const byEmail = new Map(existing.map((u: any) => [u.email, u.id]));

  const owner = byEmail.get('james@acmecorp.com')!;
  const admin = byEmail.get('sarah@acmecorp.com')!;
  const manager = byEmail.get('marcus@acmecorp.com')!;
  const staff = byEmail.get('linda@acmecorp.com')!;

  const newPeople = [
    { email: 'priya@acmecorp.com', first: 'Priya', last: 'Sharma', role: 'manager', dept: eng, branch: hq, title: 'Engineering Manager' },
    { email: 'diego@acmecorp.com', first: 'Diego', last: 'Alvarez', role: 'staff', dept: eng, branch: west, title: 'Senior Backend Engineer' },
    { email: 'emma@acmecorp.com', first: 'Emma', last: 'Wilson', role: 'staff', dept: salesDept, branch: hq, title: 'Account Executive' },
    { email: 'noah@acmecorp.com', first: 'Noah', last: 'Bennett', role: 'manager', dept: salesDept, branch: europe, title: 'Regional Sales Lead' },
    { email: 'aisha@acmecorp.com', first: 'Aisha', last: 'Khan', role: 'staff', dept: ops, branch: hq, title: 'Operations Specialist' },
    { email: 'tom@acmecorp.com', first: 'Tom', last: 'OBrien', role: 'staff', dept: fin, branch: hq, title: 'Financial Controller' },
    { email: 'rachel@acmecorp.com', first: 'Rachel', last: 'Morgan', role: 'staff', dept: people, branch: hq, title: 'People Operations Partner' },
  ];

  const peopleIds: Record<string, string> = {
    james: owner, sarah: admin, marcus: manager, linda: staff,
  };
  for (const p of newPeople) {
    const id = uuidv4();
    peopleIds[p.email.split('@')[0]] = id;
    await knex('users').insert({
      id, tenant_id: tenantId, email: p.email, password_hash: staffHash,
      first_name: p.first, last_name: p.last, display_name: `${p.first} ${p.last}`,
      role: p.role, status: 'active', is_email_verified: true, email_verified_at: ago(120),
      department_id: p.dept, branch_id: p.branch,
      timezone: 'UTC', locale: 'en', preferences: JSON.stringify({ jobTitle: p.title }), last_login_at: ago(1),
    });
  }

  // Attach the original four demo users to departments/branches.
  await knex('users').where({ id: owner }).update({ department_id: ops, branch_id: hq, preferences: JSON.stringify({ jobTitle: 'Chief Executive Officer' }) });
  await knex('users').where({ id: admin }).update({ department_id: ops, branch_id: hq, preferences: JSON.stringify({ jobTitle: 'Head of Operations' }) });
  await knex('users').where({ id: manager }).update({ department_id: salesDept, branch_id: hq, preferences: JSON.stringify({ jobTitle: 'Sales Director' }) });
  await knex('users').where({ id: staff }).update({ department_id: ops, branch_id: west, preferences: JSON.stringify({ jobTitle: 'Customer Success Manager' }) });

  await knex('tenants').where({ id: tenantId }).update({ users_count: existing.length + newPeople.length });

  const teamAlpha = uuidv4();
  const teamBeta = uuidv4();
  await knex('teams').insert([
    { id: teamAlpha, tenant_id: tenantId, department_id: eng, lead_user_id: peopleIds.priya, name: 'Platform Core' },
    { id: teamBeta, tenant_id: tenantId, department_id: salesDept, lead_user_id: manager, name: 'Enterprise Sales' },
  ]);
  await knex('team_members').insert([
    { team_id: teamAlpha, user_id: peopleIds.priya }, { team_id: teamAlpha, user_id: peopleIds.diego },
    { team_id: teamBeta, user_id: manager }, { team_id: teamBeta, user_id: peopleIds.emma }, { team_id: teamBeta, user_id: peopleIds.noah },
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. CRM — contacts, pipeline, deals, activities
  // ═══════════════════════════════════════════════════════════════════════════
  const contactRows = [
    { first: 'Sarah', last: 'Reynolds', email: 'sarah@techflow.com', company: 'TechFlow Inc', type: 'customer', score: 82, source: 'referral', title: 'CTO' },
    { first: 'Marcus', last: 'Kim', email: 'm.kim@nexuslabs.co', company: 'Nexus Labs', type: 'lead', score: 74, source: 'website', title: 'Head of Product' },
    { first: 'Linda', last: 'Park', email: 'linda@buildright.com', company: 'BuildRight LLC', type: 'prospect', score: 65, source: 'linkedin', title: 'Operations Director' },
    { first: 'Ana', last: 'Torres', email: 'ana@finpro.com', company: 'FinPro Group', type: 'lead', score: 91, source: 'webinar', title: 'CFO' },
    { first: 'David', last: 'Chen', email: 'd.chen@cloudpeak.io', company: 'CloudPeak', type: 'customer', score: 77, source: 'partner', title: 'VP Engineering' },
    { first: 'Olivia', last: 'Grant', email: 'olivia@harborstone.co', company: 'Harborstone Retail', type: 'customer', score: 88, source: 'referral', title: 'COO' },
    { first: 'Ethan', last: 'Cole', email: 'ethan@lumenworks.dev', company: 'Lumen Works', type: 'prospect', score: 58, source: 'website', title: 'Founder' },
    { first: 'Fatima', last: 'Al-Sayed', email: 'fatima@meridianbank.com', company: 'Meridian Bank', type: 'lead', score: 83, source: 'conference', title: 'Head of Digital' },
    { first: 'George', last: 'Petrov', email: 'george@atlasfreight.eu', company: 'Atlas Freight', type: 'customer', score: 71, source: 'partner', title: 'Logistics Lead' },
    { first: 'Hannah', last: 'Olsen', email: 'hannah@northwind.no', company: 'Northwind AS', type: 'lead', score: 62, source: 'linkedin', title: 'CTO' },
    { first: 'Isaac', last: 'Moreau', email: 'isaac@brightpath.fr', company: 'BrightPath', type: 'churned', score: 35, source: 'website', title: 'COO' },
    { first: 'Julia', last: 'Novak', email: 'julia@verdant.co', company: 'Verdant Group', type: 'prospect', score: 79, source: 'webinar', title: 'Procurement Lead' },
  ];

  const contactIds: string[] = [];
  for (const c of contactRows) {
    const id = uuidv4();
    contactIds.push(id);
    // A couple of accounts are deliberately stale so churn-risk has a real signal.
    const stale = c.type === 'churned' || c.company === 'Harborstone Retail';
    await knex('contacts').insert({
      id, tenant_id: tenantId, owner_id: peopleIds.emma ?? manager,
      first_name: c.first, last_name: c.last, email: c.email, phone: `+1 555 ${Math.floor(1000 + Math.random() * 8999)}`,
      job_title: c.title, company_name: c.company, company_size: '51-200', industry: 'technology',
      type: c.type, status: 'active', lead_source: c.source, lead_score: c.score,
      email_subscribed: true, tags: [c.type], custom_fields: JSON.stringify({}),
      last_contacted_at: stale ? ago(130 + Math.floor(Math.random() * 40)) : ago(Math.floor(Math.random() * 25)),
      created_at: ago(200 + Math.floor(Math.random() * 150)),
      updated_at: ago(Math.floor(Math.random() * 30)),
    });
  }

  const pipelineId = uuidv4();
  await knex('pipelines').insert({ id: pipelineId, tenant_id: tenantId, name: 'Sales Pipeline', is_default: true });

  const stageIds = {
    qualified: uuidv4(), proposal: uuidv4(), negotiation: uuidv4(), closed: uuidv4(), lost: uuidv4(),
  };
  await knex('pipeline_stages').insert([
    { id: stageIds.qualified, pipeline_id: pipelineId, tenant_id: tenantId, name: 'Qualified', color: '#4f8ef7', sort_order: 1, probability: 20, stage_type: 'open' },
    { id: stageIds.proposal, pipeline_id: pipelineId, tenant_id: tenantId, name: 'Proposal', color: '#8b5cf6', sort_order: 2, probability: 50, stage_type: 'open' },
    { id: stageIds.negotiation, pipeline_id: pipelineId, tenant_id: tenantId, name: 'Negotiation', color: '#f59e0b', sort_order: 3, probability: 75, stage_type: 'open' },
    { id: stageIds.closed, pipeline_id: pipelineId, tenant_id: tenantId, name: 'Closed Won', color: '#10b981', sort_order: 4, probability: 100, stage_type: 'won' },
    { id: stageIds.lost, pipeline_id: pipelineId, tenant_id: tenantId, name: 'Closed Lost', color: '#ef4444', sort_order: 5, probability: 0, stage_type: 'lost' },
  ]);

  const dealRows = [
    { contact: 0, name: 'TechFlow Annual License', amount: 12400, stage: stageIds.closed, status: 'won', prob: 100, owner: owner },
    { contact: 4, name: 'CloudPeak Enterprise Platform', amount: 46000, stage: stageIds.closed, status: 'won', prob: 100, owner: manager },
    { contact: 5, name: 'Harborstone Retail Rollout', amount: 28500, stage: stageIds.closed, status: 'won', prob: 100, owner: peopleIds.emma },
    { contact: 8, name: 'Atlas Freight Deployment', amount: 31500, stage: stageIds.closed, status: 'won', prob: 100, owner: peopleIds.noah },
    { contact: 1, name: 'Nexus Labs Platform Access', amount: 8200, stage: stageIds.proposal, status: 'open', prob: 50, owner: manager },
    { contact: 2, name: 'BuildRight Field Service Suite', amount: 19800, stage: stageIds.proposal, status: 'open', prob: 50, owner: peopleIds.emma },
    { contact: 7, name: 'Meridian Bank Compliance Suite', amount: 74000, stage: stageIds.negotiation, status: 'open', prob: 75, owner: manager },
    { contact: 11, name: 'Verdant Group Procurement Portal', amount: 36500, stage: stageIds.negotiation, status: 'open', prob: 75, owner: peopleIds.noah },
    { contact: 3, name: 'FinPro Advisory Dashboard', amount: 14300, stage: stageIds.qualified, status: 'open', prob: 20, owner: peopleIds.emma },
    { contact: 9, name: 'Northwind Developer Portal', amount: 9600, stage: stageIds.qualified, status: 'open', prob: 20, owner: peopleIds.noah },
    { contact: 10, name: 'BrightPath Legacy Renewal', amount: 5400, stage: stageIds.lost, status: 'lost', prob: 0, owner: manager },
  ];

  const dealIds: string[] = [];
  for (const d of dealRows) {
    const id = uuidv4();
    dealIds.push(id);
    await knex('deals').insert({
      id, tenant_id: tenantId, contact_id: contactIds[d.contact], owner_id: d.owner,
      pipeline_id: pipelineId, stage_id: d.stage, name: d.name, amount: d.amount, currency: 'USD',
      status: d.status, probability: d.prob,
      close_date: ymd(ahead(Math.floor(Math.random() * 60) - 20)),
      won_at: d.status === 'won' ? ago(Math.floor(Math.random() * 120)) : null,
      lost_at: d.status === 'lost' ? ago(40) : null,
      lost_reason: d.status === 'lost' ? 'Budget reallocated internally.' : null,
      custom_fields: JSON.stringify({}),
      created_at: ago(Math.floor(Math.random() * 150) + 30),
    });
  }

  const activityTypes = ['call', 'email', 'meeting', 'note', 'task', 'demo'] as const;
  for (let i = 0; i < 48; i++) {
    const d = dealRows[i % dealRows.length];
    const type = activityTypes[i % activityTypes.length];
    const completed = i % 3 !== 0;
    await knex('activities').insert({
      id: uuidv4(), tenant_id: tenantId, user_id: peopleIds.emma,
      contact_id: contactIds[d.contact], deal_id: dealIds[i % dealIds.length],
      type, subject: `${type === 'email' ? 'Follow-up email' : type === 'call' ? 'Discovery call' : type === 'meeting' ? 'Product demo' : type === 'demo' ? 'Technical demo' : type === 'task' ? 'Prepare proposal' : 'Account note'} — ${d.name}`,
      body: 'Activity logged from the seeded demo workspace.',
      status: completed ? 'completed' : 'pending',
      scheduled_at: ago(Math.floor(Math.random() * 40)),
      completed_at: completed ? ago(Math.floor(Math.random() * 30)) : null,
      created_at: ago(Math.floor(Math.random() * 60)),
    });
  }

  const listId = uuidv4();
  await knex('contact_lists').insert([
    { id: listId, tenant_id: tenantId, name: 'Enterprise Pipeline', description: 'Accounts with an active deal above $10k.', is_dynamic: true, filter_rules: JSON.stringify({ minDealValue: 10000 }) },
  ]);
  await knex('contact_list_members').insert(contactIds.slice(0, 6).map((cid) => ({ contact_id: cid, list_id: listId })));

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. CATALOG, INVENTORY & SUPPLIERS
  // ═══════════════════════════════════════════════════════════════════════════
  const catSoftware = uuidv4();
  const catHardware = uuidv4();
  const catServices = uuidv4();
  await knex('product_categories').insert([
    { id: catSoftware, tenant_id: tenantId, name: 'Software & Licences', slug: 'software' },
    { id: catHardware, tenant_id: tenantId, name: 'Hardware', slug: 'hardware' },
    { id: catServices, tenant_id: tenantId, name: 'Professional Services', slug: 'services' },
  ]);

  const productRows = [
    { name: 'NexOS Pro License', sku: 'NXS-PRO', type: 'subscription', price: 149, cost: 40, unit: 'seat', cat: catSoftware, track: true, reorder: 25 },
    { name: 'NexOS Enterprise License', sku: 'NXS-ENT', type: 'subscription', price: 399, cost: 120, unit: 'seat', cat: catSoftware, track: true, reorder: 15 },
    { name: 'Analytics Add-on', sku: 'NXS-ANL', type: 'subscription', price: 89, cost: 20, unit: 'seat', cat: catSoftware, track: true, reorder: 30 },
    { name: 'Onboarding Package', sku: 'SVC-ONB', type: 'service', price: 2500, cost: 900, unit: 'engagement', cat: catServices, track: false, reorder: 0 },
    { name: 'Custom Integration Sprint', sku: 'SVC-INT', type: 'service', price: 4800, cost: 1800, unit: 'sprint', cat: catServices, track: false, reorder: 0 },
    { name: 'API Gateway Node', sku: 'HW-NODE', type: 'product', price: 1250, cost: 780, unit: 'unit', cat: catHardware, track: true, reorder: 10 },
    { name: 'Edge Sensor Kit', sku: 'HW-EDGE', type: 'product', price: 320, cost: 165, unit: 'kit', cat: catHardware, track: true, reorder: 40 },
    { name: 'Barcode Scanner', sku: 'HW-SCAN', type: 'product', price: 180, cost: 95, unit: 'unit', cat: catHardware, track: true, reorder: 25 },
    { name: 'Warehouse Tablet', sku: 'HW-TAB', type: 'product', price: 640, cost: 410, unit: 'unit', cat: catHardware, track: true, reorder: 12 },
    { name: 'Annual Support & SLA', sku: 'NXS-SUP', type: 'subscription', price: 2400, cost: 600, unit: 'year', cat: catServices, track: false, reorder: 0 },
  ];

  const productIds: string[] = [];
  for (const p of productRows) {
    const id = uuidv4();
    productIds.push(id);
    await knex('products').insert({
      id, tenant_id: tenantId, name: p.name, description: `${p.name} sold by Acme Corp.`,
      sku: p.sku, type: p.type, price: p.price, cost: p.cost,
      billing_period: p.type === 'subscription' ? 'monthly' : 'one_time', unit: p.unit,
      tax_rate: 8.5, track_inventory: p.track, is_active: true,
      category_id: p.cat, has_variants: false, barcode: `88${p.sku}`,
      reorder_point: p.reorder, reorder_quantity: p.reorder * 3,
    });
  }

  const warehouseMain = uuidv4();
  const warehouseOverflow = uuidv4();
  await knex('warehouses').insert([
    { id: warehouseMain, tenant_id: tenantId, branch_id: hq, name: 'Main Warehouse', code: 'WH-NYC', address: JSON.stringify({ line1: '12 Industrial Way', city: 'Newark', state: 'NJ', country: 'US' }), is_active: true, is_default: true },
    { id: warehouseOverflow, tenant_id: tenantId, branch_id: west, name: 'West Coast Depot', code: 'WH-SFO', address: JSON.stringify({ line1: '880 Cargo Ave', city: 'Oakland', state: 'CA', country: 'US' }), is_active: true, is_default: false },
  ]);

  for (let i = 0; i < productIds.length; i++) {
    const p = productRows[i];
    if (!p.track) continue;
    const onHand = i % 4 === 0 ? Math.max(1, Math.floor(p.reorder / 3)) : 40 + i * 17; // i%4===0 → below reorder point
    const reserved = Math.floor(onHand * 0.1);
    await knex('stock_levels').insert([
      { id: uuidv4(), tenant_id: tenantId, warehouse_id: warehouseMain, product_id: productIds[i], quantity_on_hand: onHand, quantity_reserved: reserved, quantity_available: onHand - reserved },
      { id: uuidv4(), tenant_id: tenantId, warehouse_id: warehouseOverflow, product_id: productIds[i], quantity_on_hand: Math.floor(onHand / 2), quantity_reserved: 0, quantity_available: Math.floor(onHand / 2) },
    ]);
    await knex('stock_movements').insert([
      { id: uuidv4(), tenant_id: tenantId, warehouse_id: warehouseMain, product_id: productIds[i], movement_type: 'purchase', quantity: onHand + 20, reference_type: 'purchase_order', created_by: peopleIds.tom, notes: 'Initial stock intake', created_at: ago(90) },
      { id: uuidv4(), tenant_id: tenantId, warehouse_id: warehouseMain, product_id: productIds[i], movement_type: 'sale', quantity: -20, reference_type: 'sales_order', created_by: peopleIds.emma, notes: 'Customer fulfilment', created_at: ago(14) },
    ]);
  }

  const supplierIds = [uuidv4(), uuidv4(), uuidv4()];
  await knex('suppliers').insert([
    { id: supplierIds[0], tenant_id: tenantId, name: 'Northwind Components', contact_name: 'Iris Hall', email: 'orders@northwind-components.com', phone: '+1 312 555 0177', address: JSON.stringify({ city: 'Chicago', country: 'US' }), payment_terms: 'Net 30', is_active: true },
    { id: supplierIds[1], tenant_id: tenantId, name: 'Vertex Logistics', contact_name: 'Carlos Ruiz', email: 'supply@vertexlogistics.com', phone: '+34 91 555 0192', address: JSON.stringify({ city: 'Madrid', country: 'ES' }), payment_terms: 'Net 45', is_active: true },
    { id: supplierIds[2], tenant_id: tenantId, name: 'Lumen Cloud Services', contact_name: 'Anya Petrov', email: 'billing@lumencloud.dev', phone: '+49 30 555 0111', address: JSON.stringify({ city: 'Berlin', country: 'DE' }), payment_terms: 'Net 15', is_active: true },
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. FINANCE — invoices, payments, expenses (8 months of history)
  // ═══════════════════════════════════════════════════════════════════════════
  const customerIdx = [0, 4, 5, 8];
  let invoiceSeq = 1;
  const invoiceIds: string[] = [];

  for (let monthsAgo = 7; monthsAgo >= 0; monthsAgo--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const count = 3 + (monthsAgo % 3);
    for (let k = 0; k < count; k++) {
      const id = uuidv4();
      invoiceIds.push(id);
      const ci = customerIdx[(k + monthsAgo) % customerIdx.length];
      const productId = productIds[(k + monthsAgo) % productIds.length];
      const product = productRows[(k + monthsAgo) % productRows.length];
      const qty = product.type === 'subscription' ? 20 + ((k * 7 + monthsAgo * 3) % 40) : 1 + (k % 3);
      const subtotal = Number((product.price * qty).toFixed(2));
      const tax = Number((subtotal * 0.085).toFixed(2));
      const total = Number((subtotal + tax).toFixed(2));
      const issued = new Date(monthDate.getFullYear(), monthDate.getMonth(), 3 + k * 5);
      const due = new Date(issued.getTime() + 30 * DAY);
      const isCurrentMonth = monthsAgo === 0;

      let status: string = 'paid';
      if (isCurrentMonth && k === count - 1) status = 'draft';
      else if (isCurrentMonth && k === count - 2) status = 'sent';
      else if (monthsAgo === 1 && k === 0) status = 'overdue';
      else if (monthsAgo === 0 && k === 1) status = 'overdue';

      const paidAt = status === 'paid' ? new Date(issued.getTime() + (5 + k * 4) * DAY) : null;
      const recurring = product.type === 'subscription';

      await knex('invoices').insert({
        id, tenant_id: tenantId, contact_id: contactIds[ci], created_by: owner,
        invoice_number: `INV-${issued.getFullYear()}-${String(invoiceSeq++).padStart(4, '0')}`,
        status, subtotal, discount_amount: 0, tax_amount: tax, total,
        amount_paid: status === 'paid' ? total : 0, amount_due: status === 'paid' ? 0 : total,
        currency: 'USD', payment_method: status === 'paid' ? 'bank_transfer' : null,
        issue_date: ymd(issued), due_date: ymd(due),
        sent_at: status !== 'draft' ? new Date(issued.getTime() + DAY) : null,
        paid_at: paidAt, is_recurring: recurring,
        recurring_interval: recurring ? 'monthly' : null,
        recurring_next_date: recurring && status === 'paid' ? ymd(new Date(issued.getFullYear(), issued.getMonth() + 1, 3)) : null,
        created_at: issued, updated_at: paidAt ?? issued,
      });

      await knex('invoice_items').insert({
        id: uuidv4(), invoice_id: id, product_id: productId, name: product.name,
        description: `${qty} × ${product.name}`, quantity: qty, unit: product.unit,
        unit_price: product.price, discount_amount: 0, tax_rate: 8.5, tax_amount: tax, total, sort_order: 0,
      });

      if (status === 'paid') {
        await knex('payments').insert({
          id: uuidv4(), tenant_id: tenantId, invoice_id: id, contact_id: contactIds[ci],
          amount: total, currency: 'USD', method: 'bank_transfer', status: 'completed',
          reference: `PMT-${String(invoiceSeq).padStart(6, '0')}`, paid_at: paidAt, created_at: paidAt,
        });
      }
    }
  }

  const expenseCategories = ['Software & Subscriptions', 'Payroll & Benefits', 'Marketing', 'Office & Rent', 'Travel', 'Professional Services', 'Utilities'];
  const vendors = ['Lumen Cloud Services', 'Vertex Logistics', 'WeWork', 'Delta Air Lines', 'Vertex Logistics', 'Deloitte Advisory', 'Con Edison'];
  for (let monthsAgo = 7; monthsAgo >= 0; monthsAgo--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const count = 4 + (monthsAgo % 3);
    for (let k = 0; k < count; k++) {
      const cat = expenseCategories[(k + monthsAgo) % expenseCategories.length];
      const amount = Number((900 + ((k * 1375 + monthsAgo * 421) % 7400)).toFixed(2));
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), 2 + k * 6);
      const status = monthsAgo === 0 && k === count - 1 ? 'pending' : 'approved';
      await knex('expenses').insert({
        id: uuidv4(), tenant_id: tenantId, created_by: peopleIds.tom,
        branch_id: k % 3 === 0 ? hq : k % 3 === 1 ? west : europe,
        category: cat, vendor: vendors[(k + monthsAgo) % vendors.length],
        description: `${cat} — ${ymd(date)}`,
        amount, currency: 'USD', expense_date: ymd(date),
        status, approved_by: status === 'approved' ? admin : null,
        approved_at: status === 'approved' ? new Date(date.getTime() + 2 * DAY) : null,
        is_recurring: cat === 'Software & Subscriptions' || cat === 'Office & Rent',
        recurring_interval: cat === 'Software & Subscriptions' ? 'monthly' : cat === 'Office & Rent' ? 'yearly' : null,
        created_at: date,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. SALES ORDERS, QUOTATIONS, POS
  // ═══════════════════════════════════════════════════════════════════════════
  const channels = ['pos', 'online', 'phone', 'manual'] as const;
  let orderSeq = 1;
  for (let monthsAgo = 3; monthsAgo >= 0; monthsAgo--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const count = 7 + (monthsAgo % 4);
    for (let k = 0; k < count; k++) {
      const id = uuidv4();
      const p = productRows[(k + monthsAgo) % productRows.length];
      const qty = 1 + ((k * 3) % 9);
      const subtotal = Number((p.price * qty).toFixed(2));
      const tax = Number((subtotal * 0.085).toFixed(2));
      const total = Number((subtotal + tax).toFixed(2));
      const created = new Date(monthDate.getFullYear(), monthDate.getMonth(), 2 + k * 4);
      const status = k % 9 === 8 ? 'cancelled' : k % 4 === 0 ? 'draft' : 'fulfilled';
      const paid = status === 'fulfilled';
      await knex('sales_orders').insert({
        id, tenant_id: tenantId, branch_id: k % 2 === 0 ? hq : west,
        warehouse_id: warehouseMain, contact_id: contactIds[(k + monthsAgo) % contactIds.length],
        created_by: peopleIds.emma, order_number: `SO-${created.getFullYear()}-${String(orderSeq++).padStart(4, '0')}`,
        channel: channels[(k + monthsAgo) % channels.length], status,
        payment_status: paid ? 'paid' : status === 'cancelled' ? 'refunded' : 'unpaid',
        subtotal, discount_amount: 0, tax_amount: tax, total,
        amount_paid: paid ? total : 0, currency: 'USD',
        created_at: created, updated_at: created,
      });
      await knex('sales_order_items').insert({
        id: uuidv4(), order_id: id, product_id: productIds[(k + monthsAgo) % productIds.length],
        name: p.name, quantity: qty, unit_price: p.price, discount_amount: 0, tax_amount: tax, total,
      });
    }
  }

  const quoteRows = [
    { contact: 7, status: 'sent', total: 74000, product: 1 },
    { contact: 11, status: 'sent', total: 36500, product: 4 },
    { contact: 2, status: 'accepted', total: 19800, product: 0 },
    { contact: 9, status: 'draft', total: 9600, product: 0 },
  ];
  for (let i = 0; i < quoteRows.length; i++) {
    const q = quoteRows[i];
    const id = uuidv4();
    await knex('quotations').insert({
      id, tenant_id: tenantId, contact_id: contactIds[q.contact], created_by: manager,
      quote_number: `QT-2026-${String(i + 1).padStart(4, '0')}`, type: i % 2 === 0 ? 'quotation' : 'estimate',
      status: q.status, subtotal: q.total, discount_amount: 0, tax_amount: 0, total: q.total,
      currency: 'USD', valid_until: ymd(ahead(20 + i * 5)), notes: 'Prepared by the enterprise sales team.',
      created_at: ago(10 + i * 6),
    });
    await knex('quotation_items').insert({
      id: uuidv4(), quotation_id: id, product_id: productIds[q.product],
      name: productRows[q.product].name, quantity: 1, unit_price: q.total, total: q.total,
    });
  }

  await knex('pos_sessions').insert([
    { id: uuidv4(), tenant_id: tenantId, branch_id: hq, opened_by: staff, closed_by: staff, opening_cash: 500, closing_cash: 6840, expected_cash: 6815, cash_difference: 25, status: 'closed', opened_at: ago(1), closed_at: ago(1) },
    { id: uuidv4(), tenant_id: tenantId, branch_id: west, opened_by: peopleIds.aisha, opening_cash: 250, status: 'open', opened_at: ago(0) },
  ]);

  await knex('purchase_orders').insert([
    { id: uuidv4(), tenant_id: tenantId, supplier_id: supplierIds[0], warehouse_id: warehouseMain, created_by: peopleIds.tom, po_number: 'PO-2026-0001', status: 'received', subtotal: 18400, tax_amount: 0, total: 18400, currency: 'USD', order_date: ymd(ago(95)), expected_date: ymd(ago(80)), received_at: ago(80), notes: 'Q3 hardware replenishment.' },
    { id: uuidv4(), tenant_id: tenantId, supplier_id: supplierIds[1], warehouse_id: warehouseOverflow, created_by: peopleIds.tom, po_number: 'PO-2026-0002', status: 'sent', subtotal: 7200, tax_amount: 0, total: 7200, currency: 'USD', order_date: ymd(ago(12)), expected_date: ymd(ahead(18)), notes: 'Sensors for the West coast depot.' },
    { id: uuidv4(), tenant_id: tenantId, supplier_id: supplierIds[2], warehouse_id: warehouseMain, created_by: peopleIds.tom, po_number: 'PO-2026-0003', status: 'draft', subtotal: 3600, tax_amount: 0, total: 3600, currency: 'USD', order_date: ymd(ago(3)), expected_date: ymd(ahead(27)), notes: 'Cloud capacity increase.' },
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. PROJECTS, MILESTONES, TASKS  ← the project manager
  // ═══════════════════════════════════════════════════════════════════════════
  type TaskSeed = { title: string; status: string; priority: string; due: number; hours: number; assignee: string; desc?: string };
  type MilestoneSeed = { name: string; due: number; status: string };
  type ProjectSeed = {
    name: string; description: string; status: string; budget: number; start: number; end: number;
    progress: number; owner: string; client?: number; members: string[];
    milestones: MilestoneSeed[]; tasks: TaskSeed[];
  };

  const projectSeeds: ProjectSeed[] = [
    {
      name: 'NexOS Platform v2.0',
      description: 'Rebuild the core platform on the new multi-tenant runtime with faster dashboards, granular permissions and a public API.',
      status: 'active', budget: 180000, start: 70, end: -45, progress: 62, owner: peopleIds.priya,
      client: 0, members: [peopleIds.priya, peopleIds.diego, peopleIds.james],
      milestones: [
        { name: 'Architecture sign-off', due: -45, status: 'completed' },
        { name: 'Core runtime migration', due: 8, status: 'pending' },
        { name: 'Public API beta', due: -30, status: 'pending' },
        { name: 'GA release', due: -45, status: 'pending' },
      ],
      tasks: [
        { title: 'Design multi-tenant data isolation strategy', status: 'done', priority: 'high', due: 60, hours: 12, assignee: peopleIds.priya, desc: 'Write up the isolation model and row-level security plan.' },
        { title: 'Migrate billing service to new schema', status: 'done', priority: 'urgent', due: 40, hours: 24, assignee: peopleIds.diego },
        { title: 'Implement granular permission matrix', status: 'in_progress', priority: 'high', due: 6, hours: 32, assignee: peopleIds.diego },
        { title: 'Rebuild dashboard query layer with caching', status: 'in_progress', priority: 'high', due: -4, hours: 40, assignee: peopleIds.priya },
        { title: 'Ship public REST API v1', status: 'in_review', priority: 'urgent', due: -9, hours: 56, assignee: peopleIds.diego },
        { title: 'Write SDK documentation', status: 'todo', priority: 'medium', due: 14, hours: 20, assignee: peopleIds.priya },
        { title: 'Load-test 10k concurrent tenants', status: 'todo', priority: 'high', due: 21, hours: 16, assignee: peopleIds.diego },
        { title: 'Migrate legacy audit logs to new store', status: 'blocked', priority: 'low', due: -20, hours: 8, assignee: peopleIds.diego, desc: 'Blocked: waiting on the new storage bucket provisioning.' },
      ],
    },
    {
      name: 'Mobile App Redesign',
      description: 'Rebuild the companion iOS and Android apps on the new design system with offline-first sync.',
      status: 'active', budget: 95000, start: 45, end: -25, progress: 41, owner: peopleIds.priya,
      client: 5, members: [peopleIds.priya, peopleIds.diego, peopleIds.linda],
      milestones: [
        { name: 'Design system freeze', due: -20, status: 'completed' },
        { name: 'Offline sync engine', due: 12, status: 'pending' },
        { name: 'Beta release', due: -25, status: 'pending' },
      ],
      tasks: [
        { title: 'Audit legacy navigation', status: 'done', priority: 'medium', due: 38, hours: 6, assignee: peopleIds.linda },
        { title: 'Build design token pipeline', status: 'done', priority: 'high', due: 22, hours: 18, assignee: peopleIds.priya },
        { title: 'Prototype offline sync conflict resolution', status: 'in_progress', priority: 'urgent', due: -2, hours: 36, assignee: peopleIds.diego },
        { title: 'Implement push notification service', status: 'in_progress', priority: 'medium', due: 10, hours: 20, assignee: peopleIds.diego },
        { title: 'Accessibility audit (WCAG 2.2 AA)', status: 'todo', priority: 'high', due: 16, hours: 14, assignee: peopleIds.linda },
        { title: 'Beta rollout to 200 customers', status: 'todo', priority: 'medium', due: 25, hours: 8, assignee: peopleIds.linda },
      ],
    },
    {
      name: 'Q3 Marketing Campaign',
      description: 'Multi-channel demand generation programme across paid, content and field events.',
      status: 'active', budget: 60000, start: 55, end: -15, progress: 78, owner: manager,
      client: 3, members: [manager, peopleIds.emma, peopleIds.noah],
      milestones: [
        { name: 'Creative approved', due: -35, status: 'completed' },
        { name: 'Launch paid social', due: -20, status: 'completed' },
        { name: 'Field event — London', due: -15, status: 'pending' },
      ],
      tasks: [
        { title: 'Finalise messaging framework', status: 'done', priority: 'high', due: 48, hours: 10, assignee: manager },
        { title: 'Produce 12 demo videos', status: 'done', priority: 'medium', due: 30, hours: 30, assignee: peopleIds.emma },
        { title: 'Launch paid social programme', status: 'done', priority: 'high', due: 12, hours: 8, assignee: peopleIds.emma },
        { title: 'Book venue for London field event', status: 'in_progress', priority: 'high', due: 4, hours: 6, assignee: peopleIds.noah },
        { title: 'Draft attendee follow-up sequence', status: 'todo', priority: 'medium', due: 11, hours: 5, assignee: peopleIds.noah },
        { title: 'Publish campaign retrospective', status: 'todo', priority: 'low', due: 30, hours: 4, assignee: manager },
      ],
    },
    {
      name: 'SOC 2 Type II Certification',
      description: 'Achieve SOC 2 Type II attestation covering security, availability and confidentiality.',
      status: 'planning', budget: 45000, start: -20, end: -160, progress: 18, owner: peopleIds.tom,
      members: [peopleIds.tom, peopleIds.priya, peopleIds.rachel],
      milestones: [
        { name: 'Gap assessment complete', due: 20, status: 'pending' },
        { name: 'Controls implemented', due: -80, status: 'pending' },
        { name: 'Observation window start', due: -120, status: 'pending' },
      ],
      tasks: [
        { title: 'Hire external auditor', status: 'done', priority: 'high', due: -10, hours: 4, assignee: peopleIds.tom },
        { title: 'Map existing controls to Trust Services Criteria', status: 'in_progress', priority: 'urgent', due: 3, hours: 24, assignee: peopleIds.tom },
        { title: 'Draft access control policy', status: 'in_progress', priority: 'medium', due: 9, hours: 12, assignee: peopleIds.rachel },
        { title: 'Automate evidence collection for change management', status: 'todo', priority: 'medium', due: 18, hours: 20, assignee: peopleIds.priya },
        { title: 'Schedule penetration test', status: 'todo', priority: 'high', due: 26, hours: 6, assignee: peopleIds.priya },
      ],
    },
    {
      name: 'Warehouse Automation Rollout',
      description: 'Roll out barcode scanning and guided picking across the main warehouse and the West Coast depot.',
      status: 'active', budget: 120000, start: 85, end: -40, progress: 55, owner: peopleIds.aisha,
      client: 8, members: [peopleIds.aisha, peopleIds.linda, peopleIds.tom],
      milestones: [
        { name: 'Site survey & layout', due: -55, status: 'completed' },
        { name: 'Hardware installed — NYC', due: -18, status: 'completed' },
        { name: 'Hardware installed — SFO', due: -25, status: 'pending' },
        { name: 'Full rollout go-live', due: -40, status: 'pending' },
      ],
      tasks: [
        { title: 'Complete warehouse site survey', status: 'done', priority: 'medium', due: 70, hours: 10, assignee: peopleIds.aisha },
        { title: 'Procure scanners and tablets', status: 'done', priority: 'high', due: 40, hours: 8, assignee: peopleIds.tom },
        { title: 'Configure picking routes', status: 'done', priority: 'high', due: 15, hours: 24, assignee: peopleIds.aisha },
        { title: 'Install hardware at NYC warehouse', status: 'done', priority: 'urgent', due: -18, hours: 32, assignee: peopleIds.linda },
        { title: 'Train NYC shift operators', status: 'in_progress', priority: 'medium', due: 2, hours: 16, assignee: peopleIds.aisha },
        { title: 'Install hardware at SFO depot', status: 'todo', priority: 'high', due: 13, hours: 28, assignee: peopleIds.linda },
        { title: 'Tune reorder points from velocity data', status: 'todo', priority: 'medium', due: 22, hours: 12, assignee: peopleIds.tom },
        { title: 'Publish automation runbook', status: 'todo', priority: 'low', due: 28, hours: 6, assignee: peopleIds.aisha },
      ],
    },
    {
      name: 'Customer Portal Migration',
      description: 'Move self-service customers onto the new customer portal with SSO and usage dashboards.',
      status: 'completed', budget: 75000, start: 150, end: 40, progress: 100, owner: manager,
      client: 5, members: [manager, peopleIds.emma, peopleIds.diego],
      milestones: [
        { name: 'Migration plan signed off', due: 120, status: 'completed' },
        { name: 'Beta migrated', due: 70, status: 'completed' },
        { name: 'All accounts migrated', due: 40, status: 'completed' },
      ],
      tasks: [
        { title: 'Map legacy self-service features', status: 'done', priority: 'high', due: 130, hours: 18, assignee: manager },
        { title: 'Implement SAML SSO', status: 'done', priority: 'urgent', due: 95, hours: 28, assignee: peopleIds.diego },
        { title: 'Build usage dashboard widgets', status: 'done', priority: 'medium', due: 80, hours: 22, assignee: peopleIds.emma },
        { title: 'Run migration dry-runs', status: 'done', priority: 'high', due: 65, hours: 16, assignee: peopleIds.diego },
        { title: 'Migrate remaining accounts', status: 'done', priority: 'urgent', due: 45, hours: 14, assignee: peopleIds.emma },
        { title: 'Decommission legacy portal', status: 'done', priority: 'low', due: 38, hours: 8, assignee: peopleIds.diego },
      ],
    },
  ];

  const projectIds: string[] = [];
  for (const p of projectSeeds) {
    const id = uuidv4();
    projectIds.push(id);
    await knex('projects').insert({
      id, tenant_id: tenantId, name: p.name, description: p.description,
      client_contact_id: p.client !== undefined ? contactIds[p.client] : null,
      owner_id: p.owner, status: p.status, start_date: ymd(ago(p.start)), end_date: ymd(ahead(p.end)),
      budget: p.budget, progress_percent: p.progress,
      created_at: ago(p.start + 2), updated_at: ago(Math.floor(Math.random() * 5)),
    });
    await knex('project_members').insert(p.members.map((m) => ({ project_id: id, user_id: m, role_on_project: m === p.owner ? 'owner' : 'member' })));

    const milestoneIds: string[] = [];
    for (let mi = 0; mi < p.milestones.length; mi++) {
      const ms = p.milestones[mi];
      const msId = uuidv4();
      milestoneIds.push(msId);
      await knex('milestones').insert({
        id: msId, project_id: id, tenant_id: tenantId, name: ms.name,
        due_date: ymd(ahead(ms.due)), status: ms.status, sort_order: mi,
      });
    }

    for (let ti = 0; ti < p.tasks.length; ti++) {
      const t = p.tasks[ti];
      const taskId = uuidv4();
      const dueDate = ymd(ahead(t.due));
      const done = t.status === 'done';
      await knex('tasks').insert({
        id: taskId, tenant_id: tenantId, project_id: id,
        milestone_id: milestoneIds[ti % milestoneIds.length],
        assignee_id: t.assignee, created_by: p.owner,
        title: t.title, description: t.desc ?? null,
        status: t.status, priority: t.priority, due_date: dueDate,
        estimated_hours: t.hours, actual_hours: done ? t.hours : Number((t.hours * 0.6).toFixed(2)),
        sort_order: ti,
        completed_at: done ? ago(Math.max(1, t.due + 2)) : null,
        created_at: ago(Math.max(1, t.due + 20)), updated_at: ago(Math.floor(Math.random() * 6)),
      });

      if (ti % 3 === 0) {
        await knex('task_comments').insert({
          id: uuidv4(), task_id: taskId, user_id: t.assignee,
          body: 'Progress update shared with the project channel. Next checkpoint scheduled for the end of the week.',
          created_at: ago(Math.floor(Math.random() * 10) + 1),
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. HR — attendance, leave, payroll, recruitment, reviews
  // ═══════════════════════════════════════════════════════════════════════════
  const employeeIds = [owner, admin, manager, staff, peopleIds.priya, peopleIds.diego, peopleIds.emma, peopleIds.noah, peopleIds.aisha, peopleIds.tom, peopleIds.rachel];

  for (let d = 45; d >= 0; d--) {
    const date = ago(d);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue; // weekends off
    const isToday = d === 0;
    for (let u = 0; u < employeeIds.length; u++) {
      const userId = employeeIds[u];
      const roll = (d + u) % 11;
      let status = 'present';
      if (roll === 3) status = 'late';
      else if (roll === 7) status = 'absent';
      else if (roll === 9) status = 'on_leave';
      const checkIn = status === 'absent' || status === 'on_leave' ? null : new Date(date.getTime() + (8 + (roll % 3) * 0.5) * 3600000);
      await knex('attendance_records').insert({
        id: uuidv4(), tenant_id: tenantId, user_id: userId, branch_id: u % 2 === 0 ? hq : west,
        date: ymd(date), check_in_at: checkIn,
        check_out_at: checkIn ? new Date(checkIn.getTime() + (8.5 + (u % 2)) * 3600000) : null,
        status, hours_worked: status === 'present' || status === 'late' ? 8.5 : 0,
        notes: null,
      });
    }
  }

  const leaveTypes = [
    { id: uuidv4(), name: 'Annual Leave', days: 25 },
    { id: uuidv4(), name: 'Sick Leave', days: 12 },
    { id: uuidv4(), name: 'Personal Leave', days: 5 },
  ];
  await knex('leave_types').insert(leaveTypes.map((l) => ({
    id: l.id, tenant_id: tenantId, name: l.name, default_days_per_year: l.days, requires_approval: true, is_paid: true,
  })));

  for (const u of employeeIds) {
    await knex('leave_balances').insert(leaveTypes.map((l, i) => ({
      id: uuidv4(), tenant_id: tenantId, user_id: u, leave_type_id: l.id, year: now.getFullYear(),
      allocated_days: l.days, used_days: i === 0 ? (u.length % 9) : 0,
    })));
  }

  const leaveRequests = [
    { user: peopleIds.emma, type: leaveTypes[0], start: 12, end: 16, days: 5, status: 'approved' },
    { user: peopleIds.diego, type: leaveTypes[0], start: -10, end: -8, days: 3, status: 'approved' },
    { user: peopleIds.aisha, type: leaveTypes[1], start: 5, end: 6, days: 2, status: 'pending' },
    { user: staff, type: leaveTypes[0], start: 30, end: 44, days: 11, status: 'pending' },
    { user: peopleIds.tom, type: leaveTypes[2], start: -30, end: -30, days: 1, status: 'rejected' },
  ];
  for (const lr of leaveRequests) {
    const start = ahead(lr.start);
    await knex('leave_requests').insert({
      id: uuidv4(), tenant_id: tenantId, user_id: lr.user, leave_type_id: lr.type.id,
      start_date: ymd(start), end_date: ymd(new Date(start.getTime() + (lr.days - 1) * DAY)),
      total_days: lr.days, reason: 'Time off request submitted through the HR portal.',
      status: lr.status, approved_by: lr.status === 'pending' ? null : admin,
      approved_at: lr.status === 'pending' ? null : ago(5),
      rejection_reason: lr.status === 'rejected' ? 'Peak close — please pick another date.' : null,
      created_at: ago(14),
    });
  }

  for (let m = 2; m >= 0; m--) {
    const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 0);
    const runId = uuidv4();
    const gross = 96400 - m * 1200;
    await knex('payroll_runs').insert({
      id: runId, tenant_id: tenantId,
      period_label: start.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      period_start: ymd(start), period_end: ymd(end),
      status: m === 0 ? 'completed' : 'completed',
      total_gross: gross, total_deductions: gross * 0.22, total_net: gross * 0.78,
      processed_by: peopleIds.tom, processed_at: new Date(end.getTime() + 3 * DAY),
    });
    let allocated = 0;
    for (const u of employeeIds) {
      const base = 5200 + (u.length % 6) * 620;
      allocated += base;
      await knex('payslips').insert({
        id: uuidv4(), tenant_id: tenantId, payroll_run_id: runId, user_id: u,
        base_salary: base, bonuses: (u.length % 4) * 250, overtime_pay: 0,
        deductions: Number((base * 0.22).toFixed(2)), tax_amount: Number((base * 0.19).toFixed(2)),
        net_pay: Number((base * 0.78).toFixed(2)),
        breakdown: JSON.stringify({ health: 240, pension: 180, other: 0 }),
        status: 'paid', paid_at: new Date(end.getTime() + 4 * DAY),
      });
    }
    await knex('payroll_runs').where({ id: runId }).update({ total_gross: allocated });
  }

  for (const u of employeeIds) {
    await knex('compensation_records').insert({
      id: uuidv4(), tenant_id: tenantId, user_id: u, base_salary: 5200 + (u.length % 6) * 620,
      currency: 'USD', pay_frequency: 'monthly', effective_date: ymd(ago(200)),
    });
  }

  const openings = [
    { title: 'Senior Frontend Engineer', dept: eng, type: 'full_time', count: 2, min: 140000, max: 185000 },
    { title: 'Customer Success Manager', dept: ops, type: 'full_time', count: 1, min: 85000, max: 105000 },
    { title: 'Financial Analyst', dept: fin, type: 'full_time', count: 1, min: 90000, max: 115000 },
    { title: 'Product Designer', dept: eng, type: 'contract', count: 1, min: 110000, max: 140000 },
  ];
  for (const o of openings) {
    const id = uuidv4();
    await knex('job_openings').insert({
      id, tenant_id: tenantId, department_id: o.dept, branch_id: hq, title: o.title,
      description: `We are hiring a ${o.title} to join the Acme Corp team.`,
      employment_type: o.type, status: 'open', openings_count: o.count,
      salary_min: o.min, salary_max: o.max, hiring_manager_id: admin,
      created_at: ago(25),
    });
    const candidates = [
      { first: 'Nina', last: 'Hoffmann', stage: 'interview', rating: 5 },
      { first: 'Omar', last: 'Fahmy', stage: 'screening', rating: 4 },
      { first: 'Lucia', last: 'Ferrer', stage: 'applied', rating: null },
      { first: 'Ben', last: 'Carter', stage: 'offer', rating: 5 },
    ];
    for (const c of candidates) {
      await knex('job_candidates').insert({
        id: uuidv4(), tenant_id: tenantId, job_opening_id: id,
        first_name: c.first, last_name: c.last,
        email: `${c.first.toLowerCase()}.${c.last.toLowerCase()}@example.com`,
        phone: '+1 555 0199', stage: c.stage, rating: c.rating,
        notes: c.stage === 'offer' ? 'Offer sent, awaiting response.' : null,
        created_at: ago(18),
      });
    }
  }

  for (let i = 0; i < employeeIds.length; i++) {
    await knex('performance_reviews').insert({
      id: uuidv4(), tenant_id: tenantId, user_id: employeeIds[i], reviewer_id: admin,
      review_period: `Q${((now.getMonth() / 3) | 0) + 1} ${now.getFullYear()}`,
      status: i % 4 === 0 ? 'in_progress' : 'completed',
      overall_rating: 3 + (i % 3),
      competency_scores: JSON.stringify({ delivery: 4, collaboration: 5, ownership: 4, communication: 3 }),
      strengths: 'Consistent delivery, strong collaboration across teams, excellent customer empathy.',
      areas_for_improvement: 'Improve written communication of technical trade-offs and estimates.',
      goals_next_period: 'Lead one cross-team initiative end-to-end and mentor a new joiner.',
      employee_comments: 'Comfortable with the goals. Would like more exposure to commercial planning.',
      completed_at: i % 4 === 0 ? null : ago(20),
      created_at: ago(40),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. ACCOUNTING — chart of accounts, journals, budgets, tax
  // ═══════════════════════════════════════════════════════════════════════════
  const accounts = [
    { code: '1000', name: 'Cash & Bank', type: 'asset' },
    { code: '1100', name: 'Accounts Receivable', type: 'asset' },
    { code: '1200', name: 'Inventory', type: 'asset' },
    { code: '1500', name: 'Fixed Assets', type: 'asset' },
    { code: '2000', name: 'Accounts Payable', type: 'liability' },
    { code: '2100', name: 'Deferred Revenue', type: 'liability' },
    { code: '3000', name: 'Retained Earnings', type: 'equity' },
    { code: '4000', name: 'Subscription Revenue', type: 'revenue' },
    { code: '4100', name: 'Services Revenue', type: 'revenue' },
    { code: '5000', name: 'Cost of Goods Sold', type: 'expense' },
    { code: '6000', name: 'Operating Expenses', type: 'expense' },
    { code: '6100', name: 'Payroll Expense', type: 'expense' },
    { code: '6200', name: 'Marketing Expense', type: 'expense' },
  ];
  const accountIds: Record<string, string> = {};
  for (const a of accounts) {
    const id = uuidv4();
    accountIds[a.code] = id;
    await knex('chart_of_accounts').insert({ id, tenant_id: tenantId, code: a.code, name: a.name, type: a.type, is_active: true });
  }

  for (let m = 5; m >= 0; m--) {
    const date = new Date(now.getFullYear(), now.getMonth() - m, 28);
    const revenue = Number((62000 + m * 5400).toFixed(2));
    const cogs = Number((revenue * 0.22).toFixed(2));
    const opex = Number((revenue * 0.46).toFixed(2));
    const entryId = uuidv4();
    await knex('journal_entries').insert({
      id: entryId, tenant_id: tenantId, entry_number: `JE-${date.getFullYear()}-${String(6 - m).padStart(4, '0')}`,
      entry_date: ymd(date), description: `Monthly close — ${date.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`,
      reference_type: 'manual', created_by: peopleIds.tom, status: 'posted', created_at: date,
    });
    await knex('journal_entry_lines').insert([
      { id: uuidv4(), journal_entry_id: entryId, account_id: accountIds['1000'], debit: revenue, credit: 0, memo: 'Cash received' },
      { id: uuidv4(), journal_entry_id: entryId, account_id: accountIds['4000'], debit: 0, credit: revenue, memo: 'Subscription revenue' },
      { id: uuidv4(), journal_entry_id: entryId, account_id: accountIds['5000'], debit: cogs, credit: 0, memo: 'Cost of goods sold' },
      { id: uuidv4(), journal_entry_id: entryId, account_id: accountIds['1200'], debit: 0, credit: cogs, memo: 'Inventory relieved' },
      { id: uuidv4(), journal_entry_id: entryId, account_id: accountIds['6000'], debit: opex, credit: 0, memo: 'Operating expenses' },
      { id: uuidv4(), journal_entry_id: entryId, account_id: accountIds['2100'], debit: 0, credit: opex, memo: 'Deferred revenue' },
    ]);
  }

  for (const [i, cat] of ['Marketing', 'Software & Subscriptions', 'Payroll & Benefits', 'Office & Rent'].entries()) {
    await knex('budgets').insert({
      id: uuidv4(), tenant_id: tenantId, department_id: [ops, fin, people, ops][i], branch_id: hq,
      name: `${cat} — ${now.getFullYear()}`, category: cat, fiscal_year: now.getFullYear(),
      allocated_amount: [40000, 24000, 520000, 96000][i],
      spent_amount: [21400, 19800, 386000, 74000][i],
      currency: 'USD',
    });
  }

  await knex('tax_rates').insert([
    { id: uuidv4(), tenant_id: tenantId, name: 'US Sales Tax', rate: 8.5, jurisdiction: 'New York', is_default: true, is_active: true },
    { id: uuidv4(), tenant_id: tenantId, name: 'VAT Standard', rate: 20, jurisdiction: 'European Union', is_default: false, is_active: true },
    { id: uuidv4(), tenant_id: tenantId, name: 'VAT Reduced', rate: 5, jurisdiction: 'European Union', is_default: false, is_active: true },
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. DOCUMENTS, BOOKINGS, COMMUNICATION
  // ═══════════════════════════════════════════════════════════════════════════
  const docs = [
    { title: 'Master Services Agreement — TechFlow', type: 'contract', status: 'signed', contact: 0, eff: -320, exp: 400 },
    { title: 'CloudPeak Enterprise Order Form', type: 'contract', status: 'signed', contact: 4, eff: -180, exp: 550 },
    { title: 'Employee Handbook 2026', type: 'policy', status: 'signed', contact: undefined, eff: -60, exp: 300 },
    { title: 'Acceptable Use Policy', type: 'policy', status: 'signed', contact: undefined, eff: -60, exp: 300 },
    { title: 'Harborstone Statement of Work', type: 'contract', status: 'pending_signature', contact: 5, eff: -5, exp: 360 },
    { title: 'Meridian Bank Compliance Addendum', type: 'contract', status: 'pending_review', contact: 7, eff: 2, exp: 720 },
    { title: 'Q3 Revenue Report', type: 'report', status: 'signed', contact: undefined, eff: -12, exp: 90 },
    { title: 'Vendor Security Questionnaire', type: 'other', status: 'draft', contact: undefined, eff: 5, exp: 120 },
  ];
  for (const d of docs) {
    const id = uuidv4();
    await knex('documents').insert({
      id, tenant_id: tenantId, created_by: admin, title: d.title, type: d.type, status: d.status,
      related_contact_id: d.contact !== undefined ? contactIds[d.contact] : null,
      effective_date: ymd(ahead(d.eff)), expiry_date: ymd(ahead(d.exp)),
      tags: [d.type], created_at: ago(Math.abs(d.eff) + 3),
    });
    if (d.status === 'signed' || d.status === 'pending_signature') {
      await knex('document_signatures').insert({
        id: uuidv4(), document_id: id, tenant_id: tenantId,
        signer_name: d.contact !== undefined ? 'Sarah Reynolds' : 'James Donovan',
        signer_email: d.contact !== undefined ? 'sarah@techflow.com' : 'james@acmecorp.com',
        signer_user_id: d.contact !== undefined ? null : owner,
        status: d.status === 'signed' ? 'signed' : 'pending',
        signed_at: d.status === 'signed' ? ago(Math.abs(d.eff) + 2) : null,
        ip_address: '10.0.1.24',
      });
    }
    if (d.status === 'pending_review' || d.status === 'pending_signature') {
      await knex('approval_requests').insert({
        id: uuidv4(), tenant_id: tenantId, resource_type: 'document', resource_id: id,
        requested_by: admin, approver_id: owner, status: 'pending',
        comments: 'Please review the commercial terms before we send this out.', created_at: ago(4),
      });
    }
  }

  const resources = [
    { name: 'Boardroom — Hudson St', type: 'room', capacity: 14 },
    { name: 'Focus Room 3', type: 'room', capacity: 4 },
    { name: 'Demo Studio', type: 'room', capacity: 20 },
    { name: 'Company Vehicle 1', type: 'vehicle', capacity: null },
    { name: 'Projector Kit', type: 'equipment', capacity: null },
    { name: 'Sarah Reynolds', type: 'staff', capacity: 1 },
  ];
  const resourceIds: string[] = [];
  for (const r of resources) {
    const id = uuidv4();
    resourceIds.push(id);
    await knex('bookable_resources').insert({
      id, tenant_id: tenantId, branch_id: hq, name: r.name, type: r.type,
      capacity: r.capacity, metadata: JSON.stringify({}), is_active: true,
    });
    for (let dow = 1; dow <= 5; dow++) {
      await knex('availability_rules').insert({
        id: uuidv4(), tenant_id: tenantId, resource_id: id,
        day_of_week: dow, start_time: '09:00:00', end_time: '18:00:00',
      });
    }
  }

  const bookingRows = [
    { res: 0, title: 'Quarterly board meeting', start: 3, dur: 2, status: 'confirmed', size: 10 },
    { res: 1, title: 'Discovery call — Harborstone', start: 1, dur: 1, status: 'confirmed', size: 3 },
    { res: 2, title: 'Product demo — Meridian Bank', start: 6, dur: 2, status: 'pending', size: 8 },
    { res: 3, title: 'Client site visit', start: -2, dur: 3, status: 'completed', size: 2 },
    { res: 5, title: 'Onboarding session — TechFlow', start: 9, dur: 1, status: 'confirmed', size: 1 },
    { res: 4, title: 'AV equipment reservation', start: -5, dur: 4, status: 'completed', size: null },
    { res: 2, title: 'Partner workshop', start: 14, dur: 3, status: 'pending', size: 25 },
  ];
  for (const b of bookingRows) {
    const start = ahead(b.start);
    await knex('bookings').insert({
      id: uuidv4(), tenant_id: tenantId, resource_id: resourceIds[b.res],
      contact_id: contactIds[(b.res + 1) % contactIds.length],
      assigned_to: peopleIds.rachel, created_by: peopleIds.rachel,
      title: b.title, notes: 'Booked through the operations assistant.',
      start_at: new Date(start.getTime() + 14 * 3600000),
      end_at: new Date(start.getTime() + (14 + b.dur) * 3600000),
      status: b.status, party_size: b.size, price: b.size ? Number((b.size * 45).toFixed(2)) : 0,
    });
  }

  const threadId = uuidv4();
  await knex('message_threads').insert({ id: threadId, tenant_id: tenantId, type: 'group', name: 'Operations', created_by: admin });
  await knex('message_thread_participants').insert(
    [owner, admin, manager, staff, peopleIds.aisha].map((u) => ({ thread_id: threadId, user_id: u, joined_at: ago(40) }))
  );
  const messages = [
    { sender: admin, body: 'Morning all — the Q3 close is done and every module now reconciles against the bank feed.' },
    { sender: manager, body: 'Nice. I pushed the three enterprise renewals over the line this morning. Atlas Freight signs tomorrow.' },
    { sender: peopleIds.aisha, body: 'Warehouse hardware install at NYC finished a day early. SFO is scheduled for next week.' },
    { sender: staff, body: 'Customer feedback is all positive on the new portal — the usage dashboard is the most requested feature.' },
    { sender: admin, body: 'Great work everyone. I will circulate the close summary before Friday.' },
  ];
  for (let i = 0; i < messages.length; i++) {
    await knex('messages').insert({
      id: uuidv4(), thread_id: threadId, tenant_id: tenantId, sender_id: messages[i].sender,
      body: messages[i].body, attachments: JSON.stringify([]),
      created_at: ago(5 - i * 0.5),
    });
  }

  for (const n of [
    { title: 'Invoice INV-2026-0016 is overdue', message: 'Payment for TechFlow Inc is now 12 days overdue. Consider sending a reminder.', type: 'warning', link: '/finance', user: owner },
    { title: 'Task completed: Migrate billing service to new schema', message: 'Diego Alvarez moved "Migrate billing service to new schema" to Done.', type: 'success', link: '/projects', user: peopleIds.priya },
    { title: '2 products below reorder point', message: 'Edge Sensor Kit and Barcode Scanner are at or below their reorder point.', type: 'warning', link: '/inventory', user: peopleIds.tom },
    { title: 'New message in Operations', message: 'Sarah Reynolds posted a new message in the Operations channel.', type: 'info', link: '/communication', user: manager },
    { title: 'Leave request awaiting approval', message: 'Aisha Khan requested 2 days of sick leave.', type: 'info', link: '/hr', user: admin },
  ]) {
    await knex('notifications').insert({
      id: uuidv4(), tenant_id: tenantId, user_id: n.user, title: n.title,
      message: n.message, type: n.type, link: n.link, is_read: false, created_at: ago(1),
    });
  }

  for (let i = 0; i < 12; i++) {
    await knex('communication_logs').insert({
      id: uuidv4(), tenant_id: tenantId, contact_id: contactIds[i % contactIds.length], sent_by: peopleIds.emma,
      channel: i % 4 === 0 ? 'sms' : 'email', recipient: contactRows[i % contactRows.length].email,
      subject: ['Welcome to NexOS', 'Your invoice is ready', 'Quick follow-up', 'Renewal notice'][i % 4],
      body: 'Message sent from the NexOS communication center.',
      status: i % 5 === 0 ? 'failed' : i % 3 === 0 ? 'opened' : 'delivered',
      sent_at: ago(i + 1), created_at: ago(i + 1),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. CUSTOM ROLES
  // ═══════════════════════════════════════════════════════════════════════════
  const roleIds = [uuidv4(), uuidv4(), uuidv4()];
  await knex('role_definitions').insert([
    { id: roleIds[0], tenant_id: tenantId, name: 'Administrator', description: 'Full access to every module.', is_system: true },
    { id: roleIds[1], tenant_id: tenantId, name: 'Project Manager', description: 'Manages projects, tasks and the delivery team.', is_system: false },
    { id: roleIds[2], tenant_id: tenantId, name: 'Account Executive', description: 'Owns leads, deals and customer relationships.', is_system: false },
  ]);

  const allPerms = await knex('permissions').select('id', 'module');
  for (let i = 0; i < roleIds.length; i++) {
    const wanted = i === 0 ? allPerms : allPerms.filter((p: any) => (i === 1 ? ['projects', 'hr', 'analytics'].includes(p.module) : ['crm', 'sales', 'finance'].includes(p.module)));
    await knex('role_permissions').insert(wanted.map((p: any) => ({ role_id: roleIds[i], permission_id: p.id })));
  }
  await knex('users').where({ id: peopleIds.priya }).update({ custom_role_id: roleIds[1] });
  await knex('users').where({ id: peopleIds.emma }).update({ custom_role_id: roleIds[2] });

  // ── Tenant module activation ─────────────────────────────────────────────
  await knex('tenants').where({ id: tenantId }).update({
    industry: 'professional_services',
    enabled_modules: JSON.stringify([
      'dashboard', 'analytics', 'crm', 'sales', 'finance', 'inventory', 'hr',
      'projects', 'booking', 'documents', 'communication', 'workflows', 'roles',
      'branches', 'website', 'ai',
    ]),
    settings: JSON.stringify({ terminologyOverrides: {}, weeklyDigest: true, currency: 'USD' }),
  });

  console.log('✅ Seeded demo operations data:');
  console.log(`   • ${newPeople.length + existing.length} people across 5 departments and 3 branches`);
  console.log(`   • ${projectSeeds.length} projects with milestones, tasks and comments`);
  console.log(`   • ${invoiceIds.length} invoices, ${employeeIds.length * 30} attendance records`);
  console.log(`   • inventory, sales orders, accounting journals, HR, documents, bookings and messaging`);
}
