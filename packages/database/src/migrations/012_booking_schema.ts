import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── bookable_resources (rooms, tables, equipment, staff slots — generic) ─
  await knex.schema.createTable('bookable_resources', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('branch_id').references('id').inTable('branches').onDelete('SET NULL');
    t.string('name').notNullable(); // "Room 204", "Table 5", "Dr. Smith"
    t.enu('type', ['room', 'table', 'equipment', 'staff', 'vehicle', 'other']).defaultTo('other');
    t.integer('capacity');
    t.jsonb('metadata').defaultTo('{}');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });

  // ── availability_rules (recurring weekly schedule per resource) ──────────
  await knex.schema.createTable('availability_rules', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('resource_id').notNullable().references('id').inTable('bookable_resources').onDelete('CASCADE');
    t.integer('day_of_week').notNullable(); // 0=Sunday
    t.time('start_time').notNullable();
    t.time('end_time').notNullable();
    t.timestamps(true, true);
  });

  // ── bookings (reservations / appointments) ────────────────────────────────
  await knex.schema.createTable('bookings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('resource_id').references('id').inTable('bookable_resources').onDelete('SET NULL');
    t.uuid('contact_id').references('id').inTable('contacts').onDelete('SET NULL');
    t.uuid('assigned_to').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.string('title').notNullable();
    t.text('notes');
    t.timestamp('start_at').notNullable();
    t.timestamp('end_at').notNullable();
    t.enu('status', ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show']).defaultTo('pending');
    t.integer('party_size');
    t.decimal('price', 14, 2);
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['resource_id']);
    t.index(['start_at']);
    t.index(['status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('bookings');
  await knex.schema.dropTableIfExists('availability_rules');
  await knex.schema.dropTableIfExists('bookable_resources');
}
