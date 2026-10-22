import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('marketplace_listings', (table) => {
    table.text('rejection_reason').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('marketplace_listings', (table) => {
    table.dropColumn('rejection_reason');
  });
}
