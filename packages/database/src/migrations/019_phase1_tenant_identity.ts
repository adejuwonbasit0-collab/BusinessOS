import type { Knex } from 'knex';

/**
 * Phase 1 — Tenant identity, branding, onboarding and the industry catalogue.
 *
 * Everything in this migration is *additive*: no column is dropped, renamed or
 * retyped, so it can be applied to a populated database without data loss.
 * The `down` only removes what this migration added.
 */
export async function up(knex: Knex): Promise<void> {
  // ── tenants: business identity ────────────────────────────────────────────
  // `name` already exists and stays the workspace's display name; the columns
  // below capture the rest of the business identity required by Part 2.1 of the
  // upgrade brief (legal name, trading name, country, registration number …).
  await knex.schema.alterTable('tenants', (t) => {
    t.string('legal_name').nullable();
    t.string('trading_name').nullable();
    t.text('description').nullable();
    t.string('business_email').nullable();
    t.string('country').nullable();
    t.string('registration_number').nullable();
    t.string('contact_email').nullable();
    t.string('business_hours').nullable();
    t.jsonb('social_links').nullable().defaultTo(knex.raw("'{}'::jsonb"));
  });

  // ── tenants: branding assets ──────────────────────────────────────────────
  await knex.schema.alterTable('tenants', (t) => {
    t.string('logo_light_url').nullable();
    t.string('logo_dark_url').nullable();
    t.string('favicon_url').nullable();
    t.string('favicon_apple_touch_url').nullable();
    t.string('brand_font').nullable();
    t.string('date_format').nullable().defaultTo('MMM d, yyyy');
    t.string('number_format').nullable().defaultTo('en-US');
  });

  // ── tenants: onboarding ───────────────────────────────────────────────────
  // `onboarding_completed` / `onboarding_step` already exist (migration 001)
  // but nothing ever wrote them. `onboarding_data` holds the wizard answers so
  // an interrupted onboarding can be resumed exactly where it stopped.
  await knex.schema.alterTable('tenants', (t) => {
    t.jsonb('onboarding_data').nullable().defaultTo(knex.raw("'{}'::jsonb"));
    t.string('dashboard_preset_key').nullable();
  });

  await knex.raw('CREATE INDEX IF NOT EXISTS tenants_onboarding_completed_idx ON tenants (onboarding_completed)');

  // ── industry catalogue: categories ────────────────────────────────────────
  // The nine top-level groupings of the business catalogue. Super Admin can
  // add, rename, reorder and deactivate them without touching application
  // source code.
  await knex.schema.createTable('industry_categories', (t) => {
    t.string('key').primary();
    t.string('name').notNullable();
    t.text('description');
    t.string('icon');
    t.integer('sort_order').defaultTo(0);
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  // ── industry_presets: make the catalogue editable ─────────────────────────
  await knex.schema.alterTable('industry_presets', (t) => {
    t.string('category').nullable();
    t.string('parent_key').nullable();
    t.integer('sort_order').defaultTo(0);
    t.boolean('is_active').defaultTo(true);
    t.specificType('search_keywords', 'text[]').defaultTo('{}');
    t.specificType('aliases', 'text[]').defaultTo('{}');
    t.string('dashboard_preset_key').nullable();
  });

  await knex.raw('CREATE INDEX IF NOT EXISTS industry_presets_category_idx ON industry_presets (category)');

  // ── custom_industries: a description for "Other — describe my business" ─
  await knex.schema.alterTable('custom_industries', (t) => {
    t.text('description').nullable();
  });

  // ── module_registry: expose real availability ────────────────────────────
  // `status` lets the catalogue distinguish modules that are genuinely
  // implemented from the ones that are still being built, so no tenant is ever
  // offered a module whose API does not exist yet.
  await knex.schema.alterTable('module_registry', (t) => {
    t.enu('status', ['available', 'beta', 'planned']).defaultTo('available');
    t.text('summary');
    t.string('route');
    t.integer('sort_order').defaultTo(0);
    t.boolean('is_active').defaultTo(true);
  });

  // ── dashboard_presets: industry-specific dashboard layouts ────────────────
  await knex.schema.createTable('dashboard_presets', (t) => {
    t.string('key').primary();
    t.string('name').notNullable();
    t.text('description');
    t.string('industry_key').nullable();
    t.jsonb('layout').defaultTo('{}');
    t.jsonb('navigation').defaultTo('[]');
    t.boolean('is_default').defaultTo(false);
    t.boolean('is_active').defaultTo(true);
    t.integer('sort_order').defaultTo(0);
    t.timestamps(true, true);
  });

  // ── tenant_domains: real domain mapping ──────────────────────────────────
  // A tenant may own several hostnames (platform subdomain + independent
  // domains). Ownership is proven with a DNS TXT token before the hostname is
  // allowed to serve traffic.
  await knex.schema.createTable('tenant_domains', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('hostname').notNullable().unique();
    t.enu('type', ['subdomain', 'custom']).defaultTo('custom');
    t.boolean('is_primary').defaultTo(false);
    t.string('verification_token');
    t.boolean('is_verified').defaultTo(false);
    t.enu('status', ['pending', 'active', 'failed']).defaultTo('pending');
    t.string('ssl_status').defaultTo('pending');
    t.timestamp('verified_at');
    t.timestamp('last_checked_at');
    t.timestamp('deleted_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['hostname']);
  });

  // The subdomain of every tenant is a hostname too — keep the two tables in
  // step so hostname resolution has a single source of truth.
  await knex.raw(`
    INSERT INTO tenant_domains (tenant_id, hostname, type, is_primary, is_verified, status, created_at, updated_at)
    SELECT id, subdomain, 'subdomain', TRUE, TRUE, 'active', NOW(), NOW()
    FROM tenants
    WHERE subdomain IS NOT NULL AND subdomain <> ''
    ON CONFLICT (hostname) DO NOTHING
  `);

  // ── platform_settings: Super Admin controlled platform configuration ─────
  await knex.schema.createTable('platform_settings', (t) => {
    t.string('key').primary();
    t.jsonb('value').defaultTo('{}');
    t.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('platform_settings');
  await knex.schema.dropTableIfExists('tenant_domains');
  await knex.schema.dropTableIfExists('dashboard_presets');

  await knex.schema.alterTable('module_registry', (t) => {
    t.dropColumn('status');
    t.dropColumn('summary');
    t.dropColumn('route');
    t.dropColumn('sort_order');
    t.dropColumn('is_active');
  });

  await knex.schema.alterTable('industry_presets', (t) => {
    t.dropColumn('category');
    t.dropColumn('parent_key');
    t.dropColumn('sort_order');
    t.dropColumn('is_active');
    t.dropColumn('search_keywords');
    t.dropColumn('aliases');
    t.dropColumn('dashboard_preset_key');
  });

  await knex.schema.alterTable('custom_industries', (t) => {
    t.dropColumn('description');
  });

  await knex.schema.alterTable('tenants', (t) => {
    t.dropColumn('legal_name');
    t.dropColumn('trading_name');
    t.dropColumn('description');
    t.dropColumn('business_email');
    t.dropColumn('country');
    t.dropColumn('registration_number');
    t.dropColumn('contact_email');
    t.dropColumn('business_hours');
    t.dropColumn('social_links');
    t.dropColumn('logo_light_url');
    t.dropColumn('logo_dark_url');
    t.dropColumn('favicon_url');
    t.dropColumn('favicon_apple_touch_url');
    t.dropColumn('brand_font');
    t.dropColumn('date_format');
    t.dropColumn('number_format');
    t.dropColumn('onboarding_data');
    t.dropColumn('dashboard_preset_key');
  });

  await knex.schema.dropTableIfExists('industry_categories');
}
