import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── module_registry (catalog of every micro-module in the system) ────────
  await knex.schema.createTable('module_registry', (t) => {
    t.string('key').primary(); // 'crm', 'finance', 'inventory', 'hr', 'pos', 'booking', ...
    t.string('name').notNullable();
    t.text('description');
    t.string('category'); // 'core', 'sales', 'operations', 'people', 'industry-specific'
    t.string('icon');
    t.boolean('is_core').defaultTo(false); // core modules can't be disabled
    t.specificType('depends_on', 'text[]').defaultTo('{}'); // other module keys required
    t.timestamps(true, true);
  });

  // ── industry_presets (which modules activate per industry, out of the box) ─
  await knex.schema.createTable('industry_presets', (t) => {
    t.string('key').primary(); // 'hotel', 'school', 'hospital', 'restaurant', 'retail', ...
    t.string('name').notNullable();
    t.string('icon');
    t.text('description');
    t.specificType('default_modules', 'text[]').defaultTo('{}');
    t.jsonb('terminology_overrides').defaultTo('{}'); // e.g. { "contacts": "Guests", "deals": "Bookings" }
    t.boolean('is_custom').defaultTo(false); // false = built-in, true = tenant-defined custom industry
    t.timestamps(true, true);
  });

  // Allow tenants to define their own custom industry (extends industry_presets logically,
  // but custom ones are stored per-tenant so they don't collide across tenants)
  await knex.schema.createTable('custom_industries', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('name').notNullable();
    t.specificType('enabled_modules', 'text[]').defaultTo('{}');
    t.jsonb('terminology_overrides').defaultTo('{}');
    t.timestamps(true, true);

    t.unique(['tenant_id', 'name']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('custom_industries');
  await knex.schema.dropTableIfExists('industry_presets');
  await knex.schema.dropTableIfExists('module_registry');
}
