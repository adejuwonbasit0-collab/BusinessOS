import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export async function seed(knex: Knex): Promise<void> {
  await knex('activities').del();
  await knex('deals').del();
  await knex('contacts').del();
  await knex('pipeline_stages').del();
  await knex('pipelines').del();
  await knex('invoice_items').del();
  await knex('payments').del();
  await knex('invoices').del();
  await knex('expenses').del();
  await knex('products').del();
  await knex('workflow_runs').del();
  await knex('workflows').del();
  await knex('api_keys').del();
  await knex('webhooks').del();
  await knex('audit_logs').del();
  await knex('user_sessions').del();
  await knex('users').del();
  await knex('tenants').del();
  await knex('plans').del();

  // ── Plans ──────────────────────────────────────────────────────────────────
  const starterPlanId = uuidv4();
  const proPlanId = uuidv4();
  const enterprisePlanId = uuidv4();

  await knex('plans').insert([
    {
      id: starterPlanId, name: 'Starter', slug: 'starter',
      description: 'Perfect for small teams and freelancers getting started.',
      price_monthly: 4900, price_yearly: 47040,
      max_users: 5, max_storage_gb: 10, max_workflows: 50, max_api_keys: 2, max_websites: 1, max_branches: 1,
      feature_ai: false, feature_custom_domain: false, feature_white_label: false,
      feature_sso: false, feature_audit_logs: false, feature_api_access: false, feature_advanced_analytics: false,
      sort_order: 1, is_active: true, is_public: true,
    },
    {
      id: proPlanId, name: 'Pro', slug: 'pro',
      description: 'For growing businesses that need more power and automation.',
      price_monthly: 14900, price_yearly: 143040,
      max_users: 25, max_storage_gb: 100, max_workflows: -1, max_api_keys: 10, max_websites: 5, max_branches: 5,
      feature_ai: true, feature_custom_domain: true, feature_white_label: false,
      feature_sso: false, feature_audit_logs: true, feature_api_access: true, feature_advanced_analytics: true,
      sort_order: 2, is_active: true, is_public: true,
    },
    {
      id: enterprisePlanId, name: 'Enterprise', slug: 'enterprise',
      description: 'Unlimited everything for large organizations.',
      price_monthly: 49900, price_yearly: 479040,
      max_users: -1, max_storage_gb: 1000, max_workflows: -1, max_api_keys: -1, max_websites: -1, max_branches: -1,
      feature_ai: true, feature_custom_domain: true, feature_white_label: true,
      feature_sso: true, feature_audit_logs: true, feature_api_access: true, feature_advanced_analytics: true,
      sort_order: 3, is_active: true, is_public: true,
    },
  ]);

  // ── Platform tenant + super admin ─────────────────────────────────────────
  const platformTenantId = uuidv4();
  await knex('tenants').insert({
    id: platformTenantId, name: 'NexOS Platform', slug: 'nexos-platform', subdomain: 'platform',
    plan_id: enterprisePlanId, status: 'active', subscription_status: 'active',
    timezone: 'UTC', locale: 'en', currency: 'USD', onboarding_completed: true,
  });

  const superAdminId = uuidv4();
  const superAdminHash = await bcrypt.hash('Admin@nexos123', 12);
  await knex('users').insert({
    id: superAdminId, tenant_id: platformTenantId, email: 'admin@nexos.app',
    password_hash: superAdminHash, first_name: 'Super', last_name: 'Admin', display_name: 'Super Admin',
    role: 'super_admin', status: 'active', is_email_verified: true, email_verified_at: new Date(),
  });

  // ── Demo tenant: Acme Corp ────────────────────────────────────────────────
  const acmeTenantId = uuidv4();
  await knex('tenants').insert({
    id: acmeTenantId, name: 'Acme Corp', slug: 'acmecorp', subdomain: 'acmecorp',
    plan_id: enterprisePlanId, status: 'active', subscription_status: 'active',
    timezone: 'America/New_York', locale: 'en', currency: 'USD',
    industry: 'professional_services', company_size: '51-200', users_count: 4,
    onboarding_completed: true, onboarding_step: 'done',
    dashboard_preset_key: 'professional_services',
    enabled_modules: JSON.stringify([
      'dashboard', 'analytics', 'communication', 'roles', 'crm', 'projects',
      'finance', 'accounting', 'documents', 'hr', 'workflows', 'ai',
      'portals', 'forms', 'tables', 'marketplace', 'integrations', 'branches',
    ]),
  });

  const ownerHash = await bcrypt.hash('Demo@acme123', 12);
  const ownerId = uuidv4();
  const adminId = uuidv4();
  const managerId = uuidv4();
  const staffId = uuidv4();

  await knex('users').insert([
    { id: ownerId, tenant_id: acmeTenantId, email: 'james@acmecorp.com', password_hash: ownerHash, first_name: 'James', last_name: 'Donovan', display_name: 'James Donovan', role: 'owner', status: 'active', is_email_verified: true, email_verified_at: new Date(), last_login_at: new Date() },
    { id: adminId, tenant_id: acmeTenantId, email: 'sarah@acmecorp.com', password_hash: ownerHash, first_name: 'Sarah', last_name: 'Reynolds', display_name: 'Sarah Reynolds', role: 'admin', status: 'active', is_email_verified: true, email_verified_at: new Date() },
    { id: managerId, tenant_id: acmeTenantId, email: 'marcus@acmecorp.com', password_hash: ownerHash, first_name: 'Marcus', last_name: 'Kim', display_name: 'Marcus Kim', role: 'manager', status: 'active', is_email_verified: true, email_verified_at: new Date() },
    { id: staffId, tenant_id: acmeTenantId, email: 'linda@acmecorp.com', password_hash: ownerHash, first_name: 'Linda', last_name: 'Park', display_name: 'Linda Park', role: 'staff', status: 'active', is_email_verified: true, email_verified_at: new Date() },
  ]);

  // ── Contacts ───────────────────────────────────────────────────────────────
  const contactData = [
    { first: 'Sarah', last: 'Reynolds', email: 'sarah@techflow.com', company: 'TechFlow Inc', type: 'customer', score: 82 },
    { first: 'Marcus', last: 'Kim', email: 'm.kim@nexuslabs.co', company: 'Nexus Labs', type: 'lead', score: 74 },
    { first: 'Linda', last: 'Park', email: 'linda@buildright.com', company: 'BuildRight LLC', type: 'prospect', score: 65 },
    { first: 'Ana', last: 'Torres', email: 'ana@finpro.com', company: 'FinPro Group', type: 'lead', score: 91 },
    { first: 'David', last: 'Chen', email: 'd.chen@cloudpeak.io', company: 'CloudPeak', type: 'customer', score: 77 },
  ];

  const contactIds: string[] = [];
  for (const c of contactData) {
    const id = uuidv4();
    contactIds.push(id);
    await knex('contacts').insert({
      id, tenant_id: acmeTenantId, owner_id: ownerId, first_name: c.first, last_name: c.last,
      email: c.email, company_name: c.company, type: c.type, lead_score: c.score,
      email_subscribed: true, tags: [],
    });
  }

  // ── Pipeline + deals ───────────────────────────────────────────────────────
  const pipelineId = uuidv4();
  await knex('pipelines').insert({ id: pipelineId, tenant_id: acmeTenantId, name: 'Sales Pipeline', is_default: true });

  const stageIds = { qualified: uuidv4(), proposal: uuidv4(), closed: uuidv4() };
  await knex('pipeline_stages').insert([
    { id: stageIds.qualified, pipeline_id: pipelineId, tenant_id: acmeTenantId, name: 'Qualified', sort_order: 1, probability: 20 },
    { id: stageIds.proposal, pipeline_id: pipelineId, tenant_id: acmeTenantId, name: 'Proposal', sort_order: 2, probability: 65 },
    { id: stageIds.closed, pipeline_id: pipelineId, tenant_id: acmeTenantId, name: 'Closed Won', sort_order: 3, probability: 100, stage_type: 'won' },
  ]);

  await knex('deals').insert([
    { id: uuidv4(), tenant_id: acmeTenantId, contact_id: contactIds[0], owner_id: ownerId, pipeline_id: pipelineId, stage_id: stageIds.closed, name: 'TechFlow Annual License', amount: 12400, status: 'won', probability: 100, won_at: new Date() },
    { id: uuidv4(), tenant_id: acmeTenantId, contact_id: contactIds[1], owner_id: managerId, pipeline_id: pipelineId, stage_id: stageIds.proposal, name: 'Nexus Labs Platform Access', amount: 8200, status: 'open', probability: 65 },
  ]);

  // ── Products & Invoices ────────────────────────────────────────────────────
  const productId1 = uuidv4();
  await knex('products').insert({ id: productId1, tenant_id: acmeTenantId, name: 'NexOS Pro License', type: 'subscription', price: 149.00, billing_period: 'monthly', unit: 'seat' });

  const inv1Id = uuidv4();
  await knex('invoices').insert({
    id: inv1Id, tenant_id: acmeTenantId, contact_id: contactIds[0], created_by: ownerId,
    invoice_number: 'INV-2024-0001', status: 'paid', subtotal: 4800, total: 4800,
    amount_paid: 4800, amount_due: 0, currency: 'USD', issue_date: new Date('2024-01-01'), due_date: new Date('2024-01-15'), paid_at: new Date('2024-01-12'),
  });
  await knex('invoice_items').insert({ id: uuidv4(), invoice_id: inv1Id, product_id: productId1, name: 'Pro License — 32 seats', quantity: 32, unit_price: 150, total: 4800 });

  // ── API Keys ───────────────────────────────────────────────────────────────
  const rawKey1 = `nxos_live_${crypto.randomBytes(24).toString('hex')}`;
  await knex('api_keys').insert({
    id: uuidv4(), tenant_id: acmeTenantId, created_by: ownerId, name: 'Production Key',
    key_prefix: 'nxos_live_', key_hash: crypto.createHash('sha256').update(rawKey1).digest('hex'),
    last_four: rawKey1.slice(-4), environment: 'production', permissions: ['read', 'write'], is_active: true,
  });

  // ── Hostnames ─────────────────────────────────────────────────────────────
  // Every tenant owns at least its platform subdomain. Independent domains are
  // added later through the domain manager and only become active once their
  // ownership has been verified.
  await knex('tenant_domains').insert([
    {
      id: uuidv4(), tenant_id: platformTenantId, hostname: 'platform', type: 'subdomain',
      is_primary: true, is_verified: true, status: 'active', ssl_status: 'not_applicable',
      verified_at: new Date(),
    },
    {
      id: uuidv4(), tenant_id: acmeTenantId, hostname: 'acmecorp', type: 'subdomain',
      is_primary: true, is_verified: true, status: 'active', ssl_status: 'not_applicable',
      verified_at: new Date(),
    },
  ]);

  console.log('\n✅ Phase 1 seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Super Admin:  admin@nexos.app   / Admin@nexos123');
  console.log('Acme Owner:   james@acmecorp.com / Demo@acme123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
