import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasColumn('invoices', 'template_key');
  if (!exists) await knex.schema.alterTable('invoices', (table) => table.string('template_key').defaultTo('classic'));
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasColumn('invoices', 'template_key');
  if (exists) await knex.schema.alterTable('invoices', (table) => table.dropColumn('template_key'));
}
