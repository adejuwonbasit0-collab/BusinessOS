import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── products ───────────────────────────────────────────────────────────────
  await knex.schema.createTable('products', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('name').notNullable();
    t.text('description');
    t.string('sku');
    t.enu('type', ['product', 'service', 'subscription']).defaultTo('product');
    t.decimal('price', 14, 2).notNullable().defaultTo(0);
    t.decimal('cost', 14, 2).defaultTo(0);
    t.enu('billing_period', ['one_time', 'monthly', 'yearly']).defaultTo('one_time');
    t.string('unit').defaultTo('unit');
    t.decimal('tax_rate', 5, 2).defaultTo(0);
    t.boolean('track_inventory').defaultTo(false);
    t.boolean('is_active').defaultTo(true);
    t.timestamp('deleted_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });

  // ── invoices ───────────────────────────────────────────────────────────────
  await knex.schema.createTable('invoices', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('contact_id').references('id').inTable('contacts').onDelete('SET NULL');
    t.uuid('deal_id').references('id').inTable('deals').onDelete('SET NULL');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.string('invoice_number').notNullable();
    t.enu('status', ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'refunded']).defaultTo('draft');
    t.decimal('subtotal', 14, 2).notNullable().defaultTo(0);
    t.decimal('discount_amount', 14, 2).defaultTo(0);
    t.enu('discount_type', ['percentage', 'fixed']);
    t.decimal('discount_value', 14, 2).defaultTo(0);
    t.decimal('tax_amount', 14, 2).defaultTo(0);
    t.decimal('total', 14, 2).notNullable().defaultTo(0);
    t.decimal('amount_paid', 14, 2).defaultTo(0);
    t.decimal('amount_due', 14, 2).defaultTo(0);
    t.string('currency').defaultTo('USD');
    t.text('notes');
    t.text('terms');
    t.text('footer');
    t.string('payment_method');
    t.date('issue_date').notNullable();
    t.date('due_date').notNullable();
    t.timestamp('sent_at');
    t.timestamp('paid_at');
    t.boolean('is_recurring').defaultTo(false);
    t.string('recurring_interval'); // weekly, monthly, yearly
    t.date('recurring_next_date');
    t.timestamp('deleted_at');
    t.timestamps(true, true);

    t.unique(['tenant_id', 'invoice_number']);
    t.index(['tenant_id']);
    t.index(['status']);
  });

  await knex.schema.createTable('invoice_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('invoice_id').notNullable().references('id').inTable('invoices').onDelete('CASCADE');
    t.uuid('product_id').references('id').inTable('products').onDelete('SET NULL');
    t.string('name').notNullable();
    t.text('description');
    t.decimal('quantity', 12, 3).notNullable().defaultTo(1);
    t.string('unit').defaultTo('unit');
    t.decimal('unit_price', 14, 2).notNullable().defaultTo(0);
    t.decimal('discount_amount', 14, 2).defaultTo(0);
    t.decimal('tax_rate', 5, 2).defaultTo(0);
    t.decimal('tax_amount', 14, 2).defaultTo(0);
    t.decimal('total', 14, 2).notNullable().defaultTo(0);
    t.integer('sort_order').defaultTo(0);
    t.timestamps(true, true);
  });

  // ── payments ───────────────────────────────────────────────────────────────
  await knex.schema.createTable('payments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('invoice_id').references('id').inTable('invoices').onDelete('SET NULL');
    t.uuid('contact_id').references('id').inTable('contacts').onDelete('SET NULL');
    t.decimal('amount', 14, 2).notNullable();
    t.string('currency').defaultTo('USD');
    t.enu('method', ['cash', 'card', 'bank_transfer', 'check', 'stripe', 'paypal', 'manual', 'other']).defaultTo('manual');
    t.enu('status', ['pending', 'completed', 'failed', 'refunded']).defaultTo('completed');
    t.string('reference');
    t.string('stripe_payment_intent_id');
    t.text('notes');
    t.timestamp('paid_at').defaultTo(knex.fn.now());
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['invoice_id']);
  });

  // ── expenses ───────────────────────────────────────────────────────────────
  await knex.schema.createTable('expenses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('branch_id');
    t.string('category').notNullable();
    t.string('vendor');
    t.text('description');
    t.decimal('amount', 14, 2).notNullable();
    t.string('currency').defaultTo('USD');
    t.date('expense_date').notNullable();
    t.enu('status', ['pending', 'approved', 'rejected', 'reimbursed']).defaultTo('pending');
    t.uuid('approved_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('approved_at');
    t.string('receipt_url');
    t.boolean('is_recurring').defaultTo(false);
    t.string('recurring_interval');
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['category']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('expenses');
  await knex.schema.dropTableIfExists('payments');
  await knex.schema.dropTableIfExists('invoice_items');
  await knex.schema.dropTableIfExists('invoices');
  await knex.schema.dropTableIfExists('products');
}
