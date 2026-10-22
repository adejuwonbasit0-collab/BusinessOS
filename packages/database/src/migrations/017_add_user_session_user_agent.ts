import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_sessions', (table) => {
    table.string('user_agent');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_sessions', (table) => {
    table.dropColumn('user_agent');
  });
}
