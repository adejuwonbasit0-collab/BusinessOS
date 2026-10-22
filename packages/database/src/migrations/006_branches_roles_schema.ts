import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── branches ───────────────────────────────────────────────────────────────
  await knex.schema.createTable('branches', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('code'); // short code e.g. "NYC-01"
    t.enu('type', ['headquarters', 'branch', 'warehouse', 'outlet', 'site']).defaultTo('branch');
    t.string('phone');
    t.string('email');
    t.jsonb('address').defaultTo('{}');
    t.string('timezone').defaultTo('UTC');
    t.uuid('manager_id'); // FK added after users exists (already exists) -> references users.id
    t.boolean('is_active').defaultTo(true);
    t.boolean('is_default').defaultTo(false);
    t.timestamp('deleted_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });

  await knex.schema.alterTable('branches', (t) => {
    t.foreign('manager_id').references('id').inTable('users').onDelete('SET NULL');
  });

  // Now that branches exists, wire up FKs on users/contacts/expenses that referenced branch_id loosely
  await knex.schema.alterTable('users', (t) => {
    t.foreign('branch_id').references('id').inTable('branches').onDelete('SET NULL');
  });
  await knex.schema.alterTable('contacts', (t) => {
    t.foreign('branch_id').references('id').inTable('branches').onDelete('SET NULL');
  });
  await knex.schema.alterTable('expenses', (t) => {
    t.foreign('branch_id').references('id').inTable('branches').onDelete('SET NULL');
  });

  // ── branch_transfers ───────────────────────────────────────────────────────
  await knex.schema.createTable('branch_transfers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('from_branch_id').notNullable().references('id').inTable('branches').onDelete('CASCADE');
    t.uuid('to_branch_id').notNullable().references('id').inTable('branches').onDelete('CASCADE');
    t.uuid('requested_by').references('id').inTable('users').onDelete('SET NULL');
    t.enu('resource_type', ['inventory', 'staff', 'asset']).notNullable();
    t.string('resource_id'); // generic ref, type-dependent
    t.enu('status', ['pending', 'approved', 'rejected', 'completed']).defaultTo('pending');
    t.text('notes');
    t.timestamp('completed_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });

  // ── role_definitions (custom roles) ──────────────────────────────────────
  await knex.schema.createTable('role_definitions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('name').notNullable();
    t.text('description');
    t.boolean('is_system').defaultTo(false); // true for built-in roles, false for custom
    t.timestamps(true, true);

    t.unique(['tenant_id', 'name']);
  });

  // ── permissions catalog (static reference data, seeded) ──────────────────
  await knex.schema.createTable('permissions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('module').notNullable(); // e.g. 'crm', 'finance', 'hr'
    t.string('action').notNullable(); // e.g. 'view', 'create', 'edit', 'delete', 'approve'
    t.string('key').notNullable().unique(); // e.g. 'crm.contacts.delete'
    t.text('description');
    t.timestamps(true, true);
  });

  // ── role_permissions (many-to-many) ───────────────────────────────────────
  await knex.schema.createTable('role_permissions', (t) => {
    t.uuid('role_id').notNullable().references('id').inTable('role_definitions').onDelete('CASCADE');
    t.uuid('permission_id').notNullable().references('id').inTable('permissions').onDelete('CASCADE');
    t.primary(['role_id', 'permission_id']);
  });

  // Now wire users.custom_role_id -> role_definitions
  await knex.schema.alterTable('users', (t) => {
    t.foreign('custom_role_id').references('id').inTable('role_definitions').onDelete('SET NULL');
  });

  // ── departments ────────────────────────────────────────────────────────────
  await knex.schema.createTable('departments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('branch_id').references('id').inTable('branches').onDelete('SET NULL');
    t.string('name').notNullable();
    t.uuid('head_user_id').references('id').inTable('users').onDelete('SET NULL');
    t.text('description');
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });

  await knex.schema.alterTable('users', (t) => {
    t.foreign('department_id').references('id').inTable('departments').onDelete('SET NULL');
  });

  // ── department_permissions / branch_permissions (scoped overrides) ───────
  await knex.schema.createTable('permission_scopes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.uuid('role_id').references('id').inTable('role_definitions').onDelete('CASCADE');
    t.enu('scope_type', ['branch', 'department']).notNullable();
    t.uuid('scope_id').notNullable(); // branch_id or department_id depending on scope_type
    t.specificType('granted_permissions', 'text[]').defaultTo('{}');
    t.specificType('denied_permissions', 'text[]').defaultTo('{}');
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('permission_scopes');
  await knex.schema.alterTable('users', (t) => t.dropForeign(['department_id']));
  await knex.schema.dropTableIfExists('departments');
  await knex.schema.alterTable('users', (t) => t.dropForeign(['custom_role_id']));
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('role_definitions');
  await knex.schema.dropTableIfExists('branch_transfers');
  await knex.schema.alterTable('expenses', (t) => t.dropForeign(['branch_id']));
  await knex.schema.alterTable('contacts', (t) => t.dropForeign(['branch_id']));
  await knex.schema.alterTable('users', (t) => t.dropForeign(['branch_id']));
  await knex.schema.dropTableIfExists('branches');
}
