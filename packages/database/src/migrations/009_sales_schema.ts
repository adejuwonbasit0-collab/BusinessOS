import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── sales_orders (covers POS + regular orders) ───────────────────────────
  await knex.schema.createTable('sales_orders', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('branch_id').references('id').inTable('branches').onDelete('SET NULL');
    t.uuid('warehouse_id').references('id').inTable('warehouses').onDelete('SET NULL');
    t.uuid('contact_id').references('id').inTable('contacts').onDelete('SET NULL');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.string('order_number').notNullable();
    t.enu('channel', ['pos', 'online', 'phone', 'manual']).defaultTo('manual');
    t.enu('status', ['draft', 'confirmed', 'fulfilled', 'cancelled', 'refunded']).defaultTo('draft');
    t.enu('payment_status', ['unpaid', 'partial', 'paid', 'refunded']).defaultTo('unpaid');
    t.decimal('subtotal', 14, 2).notNullable().defaultTo(0);
    t.decimal('discount_amount', 14, 2).defaultTo(0);
    t.decimal('tax_amount', 14, 2).defaultTo(0);
    t.decimal('total', 14, 2).notNullable().defaultTo(0);
    t.decimal('amount_paid', 14, 2).defaultTo(0);
    t.string('currency').defaultTo('USD');
    t.text('notes');
    t.timestamps(true, true);

    t.unique(['tenant_id', 'order_number']);
    t.index(['tenant_id']);
    t.index(['status']);
    t.index(['channel']);
  });

  await knex.schema.createTable('sales_order_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('order_id').notNullable().references('id').inTable('sales_orders').onDelete('CASCADE');
    t.uuid('product_id').references('id').inTable('products').onDelete('SET NULL');
    t.uuid('variant_id').references('id').inTable('product_variants').onDelete('SET NULL');
    t.string('name').notNullable();
    t.decimal('quantity', 12, 3).notNullable().defaultTo(1);
    t.decimal('unit_price', 14, 2).notNullable();
    t.decimal('discount_amount', 14, 2).defaultTo(0);
    t.decimal('tax_amount', 14, 2).defaultTo(0);
    t.decimal('total', 14, 2).notNullable();
  });

  // ── quotations / estimates ────────────────────────────────────────────────
  await knex.schema.createTable('quotations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('contact_id').references('id').inTable('contacts').onDelete('SET NULL');
    t.uuid('deal_id').references('id').inTable('deals').onDelete('SET NULL');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.string('quote_number').notNullable();
    t.enu('type', ['quotation', 'estimate']).defaultTo('quotation');
    t.enu('status', ['draft', 'sent', 'accepted', 'declined', 'expired', 'converted']).defaultTo('draft');
    t.decimal('subtotal', 14, 2).defaultTo(0);
    t.decimal('discount_amount', 14, 2).defaultTo(0);
    t.decimal('tax_amount', 14, 2).defaultTo(0);
    t.decimal('total', 14, 2).defaultTo(0);
    t.string('currency').defaultTo('USD');
    t.date('valid_until');
    t.uuid('converted_invoice_id').references('id').inTable('invoices').onDelete('SET NULL');
    t.text('notes');
    t.timestamps(true, true);

    t.unique(['tenant_id', 'quote_number']);
    t.index(['tenant_id']);
  });

  await knex.schema.createTable('quotation_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('quotation_id').notNullable().references('id').inTable('quotations').onDelete('CASCADE');
    t.uuid('product_id').references('id').inTable('products').onDelete('SET NULL');
    t.string('name').notNullable();
    t.decimal('quantity', 12, 3).notNullable().defaultTo(1);
    t.decimal('unit_price', 14, 2).notNullable();
    t.decimal('total', 14, 2).notNullable();
  });

  // ── refunds ────────────────────────────────────────────────────────────────
  await knex.schema.createTable('refunds', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('order_id').references('id').inTable('sales_orders').onDelete('SET NULL');
    t.uuid('invoice_id').references('id').inTable('invoices').onDelete('SET NULL');
    t.uuid('payment_id').references('id').inTable('payments').onDelete('SET NULL');
    t.uuid('processed_by').references('id').inTable('users').onDelete('SET NULL');
    t.decimal('amount', 14, 2).notNullable();
    t.string('currency').defaultTo('USD');
    t.text('reason');
    t.enu('status', ['pending', 'completed', 'failed']).defaultTo('completed');
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });

  // ── cash registers (POS sessions) ─────────────────────────────────────────
  await knex.schema.createTable('pos_sessions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('branch_id').references('id').inTable('branches').onDelete('SET NULL');
    t.uuid('opened_by').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('closed_by').references('id').inTable('users').onDelete('SET NULL');
    t.decimal('opening_cash', 14, 2).defaultTo(0);
    t.decimal('closing_cash', 14, 2);
    t.decimal('expected_cash', 14, 2);
    t.decimal('cash_difference', 14, 2);
    t.enu('status', ['open', 'closed']).defaultTo('open');
    t.timestamp('opened_at').defaultTo(knex.fn.now());
    t.timestamp('closed_at');

    t.index(['tenant_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('pos_sessions');
  await knex.schema.dropTableIfExists('refunds');
  await knex.schema.dropTableIfExists('quotation_items');
  await knex.schema.dropTableIfExists('quotations');
  await knex.schema.dropTableIfExists('sales_order_items');
  await knex.schema.dropTableIfExists('sales_orders');
}
