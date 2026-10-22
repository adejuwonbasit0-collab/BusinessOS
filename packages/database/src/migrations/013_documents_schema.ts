import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('documents', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('media_file_id').references('id').inTable('media_files').onDelete('SET NULL');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.string('title').notNullable();
    t.enu('type', ['contract', 'policy', 'invoice', 'report', 'other']).defaultTo('other');
    t.enu('status', ['draft', 'pending_review', 'pending_signature', 'signed', 'archived', 'expired']).defaultTo('draft');
    t.uuid('related_contact_id').references('id').inTable('contacts').onDelete('SET NULL');
    t.date('effective_date');
    t.date('expiry_date');
    t.specificType('tags', 'text[]').defaultTo('{}');
    t.timestamp('deleted_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['type']);
    t.index(['status']);
  });

  // ── approval workflows ─────────────────────────────────────────────────────
  await knex.schema.createTable('approval_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('resource_type').notNullable(); // 'document', 'expense', 'leave_request', 'purchase_order', etc.
    t.string('resource_id').notNullable();
    t.uuid('requested_by').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('approver_id').references('id').inTable('users').onDelete('SET NULL');
    t.enu('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
    t.text('comments');
    t.timestamp('decided_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['resource_type', 'resource_id']);
    t.index(['status']);
  });

  // ── e-signatures ───────────────────────────────────────────────────────────
  await knex.schema.createTable('document_signatures', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE');
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('signer_name').notNullable();
    t.string('signer_email').notNullable();
    t.uuid('signer_user_id').references('id').inTable('users').onDelete('SET NULL');
    t.enu('status', ['pending', 'signed', 'declined']).defaultTo('pending');
    t.string('signature_image_url');
    t.string('ip_address');
    t.timestamp('signed_at');
    t.timestamps(true, true);

    t.index(['document_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('document_signatures');
  await knex.schema.dropTableIfExists('approval_requests');
  await knex.schema.dropTableIfExists('documents');
}
