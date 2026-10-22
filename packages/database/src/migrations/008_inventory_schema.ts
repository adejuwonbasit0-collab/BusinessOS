import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── product_categories ─────────────────────────────────────────────────────
  await knex.schema.createTable('product_categories', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('parent_id');
    t.string('name').notNullable();
    t.string('slug');
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });
  await knex.schema.alterTable('product_categories', (t) => {
    t.foreign('parent_id').references('id').inTable('product_categories').onDelete('SET NULL');
  });

  // Add category + variant support to existing products table
  await knex.schema.alterTable('products', (t) => {
    t.uuid('category_id').references('id').inTable('product_categories').onDelete('SET NULL');
    t.boolean('has_variants').defaultTo(false);
    t.string('barcode');
    t.decimal('reorder_point', 12, 2).defaultTo(0);
    t.decimal('reorder_quantity', 12, 2).defaultTo(0);
  });

  // ── product_variants ───────────────────────────────────────────────────────
  await knex.schema.createTable('product_variants', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.string('name').notNullable(); // e.g. "Red / Large"
    t.string('sku');
    t.string('barcode');
    t.jsonb('attributes').defaultTo('{}'); // { color: 'Red', size: 'Large' }
    t.decimal('price', 14, 2);
    t.decimal('cost', 14, 2);
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['product_id']);
  });

  // ── warehouses ─────────────────────────────────────────────────────────────
  await knex.schema.createTable('warehouses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('branch_id').references('id').inTable('branches').onDelete('SET NULL');
    t.string('name').notNullable();
    t.string('code');
    t.jsonb('address').defaultTo('{}');
    t.boolean('is_active').defaultTo(true);
    t.boolean('is_default').defaultTo(false);
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });

  // ── stock_levels (current quantity per product/variant per warehouse) ────
  await knex.schema.createTable('stock_levels', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('warehouse_id').notNullable().references('id').inTable('warehouses').onDelete('CASCADE');
    t.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.uuid('variant_id').references('id').inTable('product_variants').onDelete('CASCADE');
    t.decimal('quantity_on_hand', 14, 3).notNullable().defaultTo(0);
    t.decimal('quantity_reserved', 14, 3).notNullable().defaultTo(0);
    t.decimal('quantity_available', 14, 3).notNullable().defaultTo(0);
    t.timestamps(true, true);

    t.unique(['warehouse_id', 'product_id', 'variant_id']);
    t.index(['tenant_id']);
  });

  // ── stock_movements (audit trail of every inventory change) ──────────────
  await knex.schema.createTable('stock_movements', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('warehouse_id').notNullable().references('id').inTable('warehouses').onDelete('CASCADE');
    t.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.uuid('variant_id').references('id').inTable('product_variants').onDelete('CASCADE');
    t.enu('movement_type', ['purchase', 'sale', 'transfer_in', 'transfer_out', 'adjustment', 'return', 'damaged']).notNullable();
    t.decimal('quantity', 14, 3).notNullable(); // positive = in, negative = out
    t.string('reference_type'); // 'purchase_order', 'sales_order', 'transfer', etc.
    t.string('reference_id');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.text('notes');
    t.timestamp('created_at').defaultTo(knex.fn.now());

    t.index(['tenant_id']);
    t.index(['product_id']);
    t.index(['movement_type']);
  });

  // ── inventory_transfers (between warehouses) ──────────────────────────────
  await knex.schema.createTable('inventory_transfers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('from_warehouse_id').notNullable().references('id').inTable('warehouses').onDelete('CASCADE');
    t.uuid('to_warehouse_id').notNullable().references('id').inTable('warehouses').onDelete('CASCADE');
    t.string('transfer_number').notNullable();
    t.enu('status', ['pending', 'in_transit', 'completed', 'cancelled']).defaultTo('pending');
    t.uuid('requested_by').references('id').inTable('users').onDelete('SET NULL');
    t.text('notes');
    t.timestamp('completed_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });

  await knex.schema.createTable('inventory_transfer_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('transfer_id').notNullable().references('id').inTable('inventory_transfers').onDelete('CASCADE');
    t.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.uuid('variant_id').references('id').inTable('product_variants').onDelete('CASCADE');
    t.decimal('quantity', 14, 3).notNullable();
  });

  // ── suppliers ──────────────────────────────────────────────────────────────
  await knex.schema.createTable('suppliers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('contact_name');
    t.string('email');
    t.string('phone');
    t.jsonb('address').defaultTo('{}');
    t.string('payment_terms');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });

  // ── purchase_orders ────────────────────────────────────────────────────────
  await knex.schema.createTable('purchase_orders', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('supplier_id').references('id').inTable('suppliers').onDelete('SET NULL');
    t.uuid('warehouse_id').references('id').inTable('warehouses').onDelete('SET NULL');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.string('po_number').notNullable();
    t.enu('status', ['draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled']).defaultTo('draft');
    t.decimal('subtotal', 14, 2).defaultTo(0);
    t.decimal('tax_amount', 14, 2).defaultTo(0);
    t.decimal('total', 14, 2).defaultTo(0);
    t.string('currency').defaultTo('USD');
    t.date('order_date').notNullable();
    t.date('expected_date');
    t.timestamp('received_at');
    t.text('notes');
    t.timestamps(true, true);

    t.unique(['tenant_id', 'po_number']);
    t.index(['tenant_id']);
    t.index(['status']);
  });

  await knex.schema.createTable('purchase_order_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('purchase_order_id').notNullable().references('id').inTable('purchase_orders').onDelete('CASCADE');
    t.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.uuid('variant_id').references('id').inTable('product_variants').onDelete('CASCADE');
    t.decimal('quantity_ordered', 14, 3).notNullable();
    t.decimal('quantity_received', 14, 3).defaultTo(0);
    t.decimal('unit_cost', 14, 2).notNullable();
    t.decimal('total', 14, 2).notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('purchase_order_items');
  await knex.schema.dropTableIfExists('purchase_orders');
  await knex.schema.dropTableIfExists('suppliers');
  await knex.schema.dropTableIfExists('inventory_transfer_items');
  await knex.schema.dropTableIfExists('inventory_transfers');
  await knex.schema.dropTableIfExists('stock_movements');
  await knex.schema.dropTableIfExists('stock_levels');
  await knex.schema.dropTableIfExists('warehouses');
  await knex.schema.dropTableIfExists('product_variants');
  await knex.schema.alterTable('products', (t) => {
    t.dropColumn('category_id'); t.dropColumn('has_variants'); t.dropColumn('barcode');
    t.dropColumn('reorder_point'); t.dropColumn('reorder_quantity');
  });
  await knex.schema.dropTableIfExists('product_categories');
}
