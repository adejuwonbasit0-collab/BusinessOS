import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── message_threads (internal messaging / team chat) ──────────────────────
  await knex.schema.createTable('message_threads', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.enu('type', ['direct', 'group', 'channel']).defaultTo('direct');
    t.string('name'); // for group/channel
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });

  await knex.schema.createTable('message_thread_participants', (t) => {
    t.uuid('thread_id').notNullable().references('id').inTable('message_threads').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('last_read_at');
    t.timestamp('joined_at').defaultTo(knex.fn.now());
    t.primary(['thread_id', 'user_id']);
  });

  await knex.schema.createTable('messages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('thread_id').notNullable().references('id').inTable('message_threads').onDelete('CASCADE');
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('sender_id').references('id').inTable('users').onDelete('SET NULL');
    t.text('body').notNullable();
    t.jsonb('attachments').defaultTo('[]');
    t.timestamp('edited_at');
    t.timestamp('deleted_at');
    t.timestamps(true, true);

    t.index(['thread_id']);
    t.index(['tenant_id']);
  });

  // ── communication_logs (outbound email/SMS/WhatsApp audit trail) ─────────
  await knex.schema.createTable('communication_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('contact_id').references('id').inTable('contacts').onDelete('SET NULL');
    t.uuid('sent_by').references('id').inTable('users').onDelete('SET NULL');
    t.enu('channel', ['email', 'sms', 'whatsapp', 'push']).notNullable();
    t.string('recipient').notNullable(); // email or phone
    t.string('subject');
    t.text('body');
    t.enu('status', ['queued', 'sent', 'delivered', 'failed', 'opened', 'clicked']).defaultTo('queued');
    t.text('error_message');
    t.timestamp('sent_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['channel']);
    t.index(['contact_id']);
  });

  // ── notifications (in-app push notifications) ─────────────────────────────
  await knex.schema.createTable('notifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title').notNullable();
    t.text('message');
    t.string('type'); // 'info', 'success', 'warning', 'error'
    t.string('link');
    t.boolean('is_read').defaultTo(false);
    t.timestamp('read_at');
    t.timestamp('created_at').defaultTo(knex.fn.now());

    t.index(['tenant_id']);
    t.index(['user_id']);
    t.index(['is_read']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('communication_logs');
  await knex.schema.dropTableIfExists('messages');
  await knex.schema.dropTableIfExists('message_thread_participants');
  await knex.schema.dropTableIfExists('message_threads');
}
