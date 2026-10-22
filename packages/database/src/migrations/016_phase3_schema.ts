import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── portals (customer / staff / vendor apps) ──────────────────────────────
  await knex.schema.createTable('portals', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.string('name').notNullable();
    t.string('slug').notNullable();
    t.enu('type', ['customer', 'staff', 'vendor', 'internal']).defaultTo('customer');
    t.boolean('is_published').defaultTo(false);
    t.string('custom_domain');
    t.jsonb('theme').defaultTo('{}');
    t.jsonb('settings').defaultTo('{}');
    t.text('description');
    t.timestamp('deleted_at');
    t.timestamps(true, true);

    t.unique(['tenant_id', 'slug']);
    t.index(['tenant_id']);
  });

  // ── portal_pages ───────────────────────────────────────────────────────────
  await knex.schema.createTable('portal_pages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('portal_id').notNullable().references('id').inTable('portals').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('slug').notNullable();
    t.boolean('is_home').defaultTo(false);
    t.jsonb('components').defaultTo('[]');
    t.jsonb('layout').defaultTo('{}');
    t.boolean('requires_auth').defaultTo(true);
    t.integer('sort_order').defaultTo(0);
    t.timestamps(true, true);

    t.unique(['portal_id', 'slug']);
  });

  // ── form_definitions (drag-and-drop form builder) ─────────────────────────
  await knex.schema.createTable('form_definitions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.string('name').notNullable();
    t.text('description');
    t.jsonb('fields').defaultTo('[]');
    t.jsonb('settings').defaultTo('{}');  // submit button text, success message, redirect
    t.string('webhook_url');
    t.boolean('is_published').defaultTo(false);
    t.integer('submission_count').defaultTo(0);
    t.timestamp('deleted_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });

  // ── form_submissions ───────────────────────────────────────────────────────
  await knex.schema.createTable('form_submissions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('form_id').notNullable().references('id').inTable('form_definitions').onDelete('CASCADE');
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.jsonb('data').defaultTo('{}');
    t.string('submitter_email');
    t.string('ip_address');
    t.string('user_agent');
    t.timestamp('created_at').defaultTo(knex.fn.now());

    t.index(['form_id']);
    t.index(['tenant_id']);
  });

  // ── custom_tables (no-code database builder) ───────────────────────────────
  await knex.schema.createTable('custom_tables', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.string('name').notNullable();
    t.string('label').notNullable();
    t.jsonb('fields').defaultTo('[]');  // field definitions
    t.jsonb('views').defaultTo('[]');   // saved views (filters, sorts)
    t.boolean('is_public').defaultTo(false);
    t.timestamp('deleted_at');
    t.timestamps(true, true);

    t.unique(['tenant_id', 'name']);
    t.index(['tenant_id']);
  });

  // ── custom_records (rows in custom tables) ─────────────────────────────────
  await knex.schema.createTable('custom_records', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('table_id').notNullable().references('id').inTable('custom_tables').onDelete('CASCADE');
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.jsonb('data').defaultTo('{}');
    t.timestamp('deleted_at');
    t.timestamps(true, true);

    t.index(['table_id']);
    t.index(['tenant_id']);
  });

  // ── integrations (connections to 3rd party services) ─────────────────────
  // Note: integrations table already exists from 004_workflows_schema
  // We extend it here with additional columns for richer provider info

  // ── marketplace_listings ───────────────────────────────────────────────────
  await knex.schema.createTable('marketplace_listings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.text('description');
    t.text('long_description');
    t.enu('type', ['template', 'theme', 'plugin', 'integration', 'ai_agent']).notNullable();
    t.string('category');
    t.string('author_name');
    t.string('author_email');
    t.decimal('price', 10, 2).defaultTo(0);
    t.string('currency').defaultTo('USD');
    t.boolean('is_free').defaultTo(true);
    t.string('thumbnail_url');
    t.specificType('screenshots', 'text[]').defaultTo('{}');
    t.string('version').defaultTo('1.0.0');
    t.string('repository_url');
    t.jsonb('metadata').defaultTo('{}');
    t.integer('install_count').defaultTo(0);
    t.decimal('rating', 3, 2).defaultTo(0);
    t.integer('review_count').defaultTo(0);
    t.enu('status', ['pending', 'approved', 'rejected', 'archived']).defaultTo('pending');
    t.boolean('is_official').defaultTo(false);
    t.timestamps(true, true);

    t.index(['type']);
    t.index(['status']);
  });

  // ── tenant_installed_apps ─────────────────────────────────────────────────
  await knex.schema.createTable('tenant_installed_apps', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('listing_id').notNullable().references('id').inTable('marketplace_listings').onDelete('CASCADE');
    t.uuid('installed_by').references('id').inTable('users').onDelete('SET NULL');
    t.string('installed_version');
    t.boolean('is_active').defaultTo(true);
    t.jsonb('config').defaultTo('{}');
    t.timestamp('installed_at').defaultTo(knex.fn.now());

    t.unique(['tenant_id', 'listing_id']);
  });

  // ── white_label_configs ───────────────────────────────────────────────────
  await knex.schema.createTable('white_label_configs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE').unique();
    t.string('brand_name').notNullable();
    t.string('brand_logo_url');
    t.string('brand_favicon_url');
    t.string('primary_color').defaultTo('#4f8ef7');
    t.string('secondary_color').defaultTo('#8b5cf6');
    t.string('custom_domain');
    t.string('support_email');
    t.string('support_phone');
    t.string('terms_url');
    t.string('privacy_url');
    t.jsonb('email_settings').defaultTo('{}');
    t.jsonb('smtp_settings').defaultTo('{}');
    t.boolean('hide_powered_by').defaultTo(false);
    t.jsonb('custom_css').defaultTo('{}');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('white_label_configs');
  await knex.schema.dropTableIfExists('tenant_installed_apps');
  await knex.schema.dropTableIfExists('marketplace_listings');
  await knex.schema.dropTableIfExists('custom_records');
  await knex.schema.dropTableIfExists('custom_tables');
  await knex.schema.dropTableIfExists('form_submissions');
  await knex.schema.dropTableIfExists('form_definitions');
  await knex.schema.dropTableIfExists('portal_pages');
  await knex.schema.dropTableIfExists('portals');
}
