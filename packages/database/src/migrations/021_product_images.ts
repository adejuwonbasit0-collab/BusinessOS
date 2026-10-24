import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasColumn('products', 'image_url');
  if (!exists) {
    await knex.schema.alterTable('products', (table) => {
      table.text('image_url');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasColumn('products', 'image_url');
  if (exists) {
    await knex.schema.alterTable('products', (table) => table.dropColumn('image_url'));
  }
}
