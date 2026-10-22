import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── workflows ──────────────────────────────────────────────────────────────
  await knex.schema.createTable('workflows', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.string('name').notNullable();
    t.text('description');
    t.enu('status', ['draft', 'active', 'paused', 'archived']).defaultTo('draft');
    t.string('trigger_type').notNullable();
    t.jsonb('trigger_config').defaultTo('{}');
    t.jsonb('steps').defaultTo('[]');
    t.jsonb('settings').defaultTo('{}');
    t.integer('run_count').defaultTo(0);
    t.integer('success_count').defaultTo(0);
    t.integer('error_count').defaultTo(0);
    t.timestamp('last_run_at');
    t.timestamp('deleted_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['status']);
    t.index(['trigger_type']);
  });

  await knex.schema.createTable('workflow_runs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('workflow_id').notNullable().references('id').inTable('workflows').onDelete('CASCADE');
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.enu('status', ['running', 'completed', 'failed']).defaultTo('running');
    t.jsonb('trigger_data').defaultTo('{}');
    t.jsonb('context').defaultTo('{}');
    t.integer('current_step').defaultTo(0);
    t.jsonb('step_results').defaultTo('[]');
    t.text('error_message');
    t.integer('duration_ms');
    t.timestamp('started_at').defaultTo(knex.fn.now());
    t.timestamp('completed_at');
    t.timestamps(true, true);

    t.index(['workflow_id']);
    t.index(['tenant_id']);
    t.index(['status']);
  });

  // ── integrations ───────────────────────────────────────────────────────────
  await knex.schema.createTable('integrations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('provider').notNullable(); // slack, stripe, sendgrid, hubspot, etc.
    t.enu('status', ['active', 'inactive', 'error']).defaultTo('active');
    t.text('access_token_encrypted');
    t.text('refresh_token_encrypted');
    t.jsonb('config').defaultTo('{}');
    t.timestamp('connected_at').defaultTo(knex.fn.now());
    t.timestamps(true, true);

    t.unique(['tenant_id', 'provider']);
  });

  // ── webhooks ───────────────────────────────────────────────────────────────
  await knex.schema.createTable('webhooks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('url').notNullable();
    t.specificType('events', 'text[]').defaultTo('{}');
    t.string('secret');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });

  await knex.schema.createTable('webhook_deliveries', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('webhook_id').references('id').inTable('webhooks').onDelete('CASCADE');
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('event').notNullable();
    t.jsonb('payload').defaultTo('{}');
    t.integer('status_code');
    t.boolean('success').defaultTo(false);
    t.integer('attempt').defaultTo(1);
    t.timestamps(true, true);
  });

  // ── api_keys ───────────────────────────────────────────────────────────────
  await knex.schema.createTable('api_keys', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.string('name').notNullable();
    t.string('key_prefix').notNullable();
    t.string('key_hash').notNullable();
    t.string('last_four').notNullable();
    t.enu('environment', ['production', 'sandbox']).defaultTo('sandbox');
    t.specificType('permissions', 'text[]').defaultTo('{}');
    t.boolean('is_active').defaultTo(true);
    t.integer('request_count').defaultTo(0);
    t.timestamp('last_used_at');
    t.timestamp('expires_at');
    t.timestamp('deleted_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['key_hash']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('api_keys');
  await knex.schema.dropTableIfExists('webhook_deliveries');
  await knex.schema.dropTableIfExists('webhooks');
  await knex.schema.dropTableIfExists('integrations');
  await knex.schema.dropTableIfExists('workflow_runs');
  await knex.schema.dropTableIfExists('workflows');
}
