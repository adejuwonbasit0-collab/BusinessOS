import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('websites', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('subdomain');
    t.string('custom_domain');
    t.jsonb('theme').defaultTo('{}');
    t.jsonb('seo').defaultTo('{}');
    t.boolean('is_published').defaultTo(false);
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });

  await knex.schema.createTable('pages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('website_id').notNullable().references('id').inTable('websites').onDelete('CASCADE');
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('title').notNullable();
    t.string('slug').notNullable();
    t.boolean('is_homepage').defaultTo(false);
    t.enu('status', ['draft', 'published', 'scheduled']).defaultTo('draft');
    t.jsonb('blocks').defaultTo('[]');
    t.jsonb('seo').defaultTo('{}');
    t.timestamp('published_at');
    t.timestamps(true, true);

    t.unique(['website_id', 'slug']);
    t.index(['tenant_id']);
  });

  await knex.schema.createTable('page_revisions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('page_id').notNullable().references('id').inTable('pages').onDelete('CASCADE');
    t.jsonb('blocks').defaultTo('[]');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('media_folders', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('parent_id');
    t.string('name').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('media_files', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('uploaded_by').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('folder_id').references('id').inTable('media_folders').onDelete('SET NULL');
    t.string('original_name').notNullable();
    t.string('file_name').notNullable();
    t.string('file_path').notNullable();
    t.string('url').notNullable();
    t.string('cdn_url');
    t.string('mime_type').notNullable();
    t.string('extension');
    t.bigInteger('size_bytes').notNullable();
    t.string('storage_driver').defaultTo('s3');
    t.string('bucket');
    t.enu('type', ['image', 'video', 'audio', 'document', 'file']).defaultTo('file');
    t.integer('image_width');
    t.integer('image_height');
    t.jsonb('metadata').defaultTo('{}');
    t.jsonb('variants').defaultTo('{}');
    t.timestamp('deleted_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['type']);
  });

  await knex.schema.createTable('templates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('category');
    t.string('thumbnail_url');
    t.jsonb('blocks').defaultTo('[]');
    t.boolean('is_public').defaultTo(true);
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('templates');
  await knex.schema.dropTableIfExists('media_files');
  await knex.schema.dropTableIfExists('media_folders');
  await knex.schema.dropTableIfExists('page_revisions');
  await knex.schema.dropTableIfExists('pages');
  await knex.schema.dropTableIfExists('websites');
}
