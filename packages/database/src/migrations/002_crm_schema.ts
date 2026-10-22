import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── contact_lists ──────────────────────────────────────────────────────────
  await knex.schema.createTable('contact_lists', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('name').notNullable();
    t.text('description');
    t.boolean('is_dynamic').defaultTo(false);
    t.jsonb('filter_rules').defaultTo('{}');
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });

  // ── contacts ───────────────────────────────────────────────────────────────
  await knex.schema.createTable('contacts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('owner_id').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('branch_id');
    t.string('first_name').notNullable();
    t.string('last_name');
    t.string('email');
    t.string('phone');
    t.string('mobile');
    t.string('job_title');
    t.string('company_name');
    t.string('company_size');
    t.string('industry');
    t.string('website');
    t.string('linkedin_url');
    t.string('twitter_handle');
    t.string('avatar_url');
    t.enu('type', ['lead', 'prospect', 'customer', 'churned', 'vendor']).defaultTo('lead');
    t.enu('status', ['active', 'inactive']).defaultTo('active');
    t.string('lead_source');
    t.integer('lead_score').defaultTo(0);
    t.text('notes');
    t.specificType('tags', 'text[]').defaultTo('{}');
    t.jsonb('custom_fields').defaultTo('{}');
    t.boolean('email_subscribed').defaultTo(true);
    t.boolean('do_not_contact').defaultTo(false);
    t.string('address_line1');
    t.string('city');
    t.string('state');
    t.string('postal_code');
    t.string('country');
    t.timestamp('last_contacted_at');
    t.timestamp('deleted_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['tenant_id', 'email']);
    t.index(['type']);
    t.index(['owner_id']);
  });

  await knex.schema.createTable('contact_list_members', (t) => {
    t.uuid('contact_id').notNullable().references('id').inTable('contacts').onDelete('CASCADE');
    t.uuid('list_id').notNullable().references('id').inTable('contact_lists').onDelete('CASCADE');
    t.timestamp('added_at').defaultTo(knex.fn.now());
    t.primary(['contact_id', 'list_id']);
  });

  // ── pipelines & stages ─────────────────────────────────────────────────────
  await knex.schema.createTable('pipelines', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('name').notNullable();
    t.boolean('is_default').defaultTo(false);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('pipeline_stages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('pipeline_id').notNullable().references('id').inTable('pipelines').onDelete('CASCADE');
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('color').defaultTo('#4f8ef7');
    t.integer('sort_order').defaultTo(0);
    t.integer('probability').defaultTo(0);
    t.enu('stage_type', ['open', 'won', 'lost']).defaultTo('open');
    t.timestamps(true, true);
  });

  // ── deals ──────────────────────────────────────────────────────────────────
  await knex.schema.createTable('deals', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('contact_id').references('id').inTable('contacts').onDelete('SET NULL');
    t.uuid('owner_id').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('pipeline_id').references('id').inTable('pipelines').onDelete('SET NULL');
    t.uuid('stage_id').references('id').inTable('pipeline_stages').onDelete('SET NULL');
    t.string('name').notNullable();
    t.decimal('amount', 14, 2).defaultTo(0);
    t.string('currency').defaultTo('USD');
    t.enu('status', ['open', 'won', 'lost']).defaultTo('open');
    t.integer('probability').defaultTo(0);
    t.date('close_date');
    t.text('lost_reason');
    t.timestamp('won_at');
    t.timestamp('lost_at');
    t.jsonb('custom_fields').defaultTo('{}');
    t.timestamp('deleted_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['status']);
    t.index(['stage_id']);
  });

  // ── activities (calls, emails, meetings, notes, tasks) ────────────────────
  await knex.schema.createTable('activities', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('contact_id').references('id').inTable('contacts').onDelete('CASCADE');
    t.uuid('deal_id').references('id').inTable('deals').onDelete('CASCADE');
    t.enu('type', ['call', 'email', 'meeting', 'note', 'task', 'sms', 'demo']).notNullable();
    t.string('subject');
    t.text('body');
    t.enu('status', ['pending', 'completed', 'cancelled']).defaultTo('pending');
    t.timestamp('scheduled_at');
    t.timestamp('completed_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['contact_id']);
    t.index(['type']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('activities');
  await knex.schema.dropTableIfExists('deals');
  await knex.schema.dropTableIfExists('pipeline_stages');
  await knex.schema.dropTableIfExists('pipelines');
  await knex.schema.dropTableIfExists('contact_list_members');
  await knex.schema.dropTableIfExists('contacts');
  await knex.schema.dropTableIfExists('contact_lists');
}
