import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('projects', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('client_contact_id').references('id').inTable('contacts').onDelete('SET NULL');
    t.uuid('owner_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('name').notNullable();
    t.text('description');
    t.enu('status', ['planning', 'active', 'on_hold', 'completed', 'cancelled']).defaultTo('planning');
    t.date('start_date');
    t.date('end_date');
    t.decimal('budget', 14, 2);
    t.integer('progress_percent').defaultTo(0);
    t.timestamp('deleted_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['status']);
  });

  await knex.schema.createTable('project_members', (t) => {
    t.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('role_on_project');
    t.primary(['project_id', 'user_id']);
  });

  await knex.schema.createTable('milestones', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('name').notNullable();
    t.date('due_date');
    t.enu('status', ['pending', 'completed', 'overdue']).defaultTo('pending');
    t.integer('sort_order').defaultTo(0);
    t.timestamps(true, true);

    t.index(['project_id']);
  });

  await knex.schema.createTable('tasks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    t.uuid('milestone_id').references('id').inTable('milestones').onDelete('SET NULL');
    t.uuid('assignee_id').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('parent_task_id');
    t.string('title').notNullable();
    t.text('description');
    t.enu('status', ['todo', 'in_progress', 'in_review', 'done', 'blocked']).defaultTo('todo');
    t.enu('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
    t.date('due_date');
    t.decimal('estimated_hours', 6, 2);
    t.decimal('actual_hours', 6, 2);
    t.integer('sort_order').defaultTo(0);
    t.timestamp('completed_at');
    t.timestamp('deleted_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['project_id']);
    t.index(['assignee_id']);
    t.index(['status']);
  });
  await knex.schema.alterTable('tasks', (t) => {
    t.foreign('parent_task_id').references('id').inTable('tasks').onDelete('CASCADE');
  });

  await knex.schema.createTable('task_comments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('task_id').notNullable().references('id').inTable('tasks').onDelete('CASCADE');
    t.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.text('body').notNullable();
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('task_comments');
  await knex.schema.alterTable('tasks', (t) => t.dropForeign(['parent_task_id']));
  await knex.schema.dropTableIfExists('tasks');
  await knex.schema.dropTableIfExists('milestones');
  await knex.schema.dropTableIfExists('project_members');
  await knex.schema.dropTableIfExists('projects');
}
