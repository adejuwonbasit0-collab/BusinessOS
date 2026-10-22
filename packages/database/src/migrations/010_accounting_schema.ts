import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── chart_of_accounts ──────────────────────────────────────────────────────
  await knex.schema.createTable('chart_of_accounts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('code').notNullable(); // e.g. "1000"
    t.string('name').notNullable(); // e.g. "Cash"
    t.enu('type', ['asset', 'liability', 'equity', 'revenue', 'expense']).notNullable();
    t.uuid('parent_id');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);

    t.unique(['tenant_id', 'code']);
    t.index(['tenant_id']);
  });
  await knex.schema.alterTable('chart_of_accounts', (t) => {
    t.foreign('parent_id').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
  });

  // ── general_ledger_entries (double-entry bookkeeping) ─────────────────────
  await knex.schema.createTable('journal_entries', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('entry_number').notNullable();
    t.date('entry_date').notNullable();
    t.text('description');
    t.string('reference_type'); // 'invoice', 'expense', 'payroll', 'manual'
    t.string('reference_id');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.enu('status', ['draft', 'posted', 'voided']).defaultTo('posted');
    t.timestamps(true, true);

    t.unique(['tenant_id', 'entry_number']);
    t.index(['tenant_id']);
    t.index(['entry_date']);
  });

  await knex.schema.createTable('journal_entry_lines', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('journal_entry_id').notNullable().references('id').inTable('journal_entries').onDelete('CASCADE');
    t.uuid('account_id').notNullable().references('id').inTable('chart_of_accounts').onDelete('CASCADE');
    t.decimal('debit', 14, 2).defaultTo(0);
    t.decimal('credit', 14, 2).defaultTo(0);
    t.text('memo');

    t.index(['journal_entry_id']);
    t.index(['account_id']);
  });

  // ── budgets ────────────────────────────────────────────────────────────────
  await knex.schema.createTable('budgets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('department_id').references('id').inTable('departments').onDelete('SET NULL');
    t.uuid('branch_id').references('id').inTable('branches').onDelete('SET NULL');
    t.string('name').notNullable();
    t.string('category'); // matches expenses.category
    t.integer('fiscal_year').notNullable();
    t.decimal('allocated_amount', 14, 2).notNullable().defaultTo(0);
    t.decimal('spent_amount', 14, 2).defaultTo(0);
    t.string('currency').defaultTo('USD');
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });

  // ── tax_rates ──────────────────────────────────────────────────────────────
  await knex.schema.createTable('tax_rates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('name').notNullable(); // e.g. "VAT 20%"
    t.decimal('rate', 5, 2).notNullable();
    t.string('jurisdiction'); // country/region
    t.boolean('is_default').defaultTo(false);
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });

  // ── tax_filings (simple tracking, not a full e-filing system) ────────────
  await knex.schema.createTable('tax_filings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('period_label').notNullable();
    t.date('period_start').notNullable();
    t.date('period_end').notNullable();
    t.decimal('taxable_revenue', 14, 2).defaultTo(0);
    t.decimal('tax_collected', 14, 2).defaultTo(0);
    t.decimal('tax_paid', 14, 2).defaultTo(0);
    t.enu('status', ['draft', 'filed', 'paid']).defaultTo('draft');
    t.date('due_date');
    t.timestamp('filed_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tax_filings');
  await knex.schema.dropTableIfExists('tax_rates');
  await knex.schema.dropTableIfExists('budgets');
  await knex.schema.dropTableIfExists('journal_entry_lines');
  await knex.schema.dropTableIfExists('journal_entries');
  await knex.schema.dropTableIfExists('chart_of_accounts');
}
