import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── teams (groups within a department, used by HR + Project Management) ──
  await knex.schema.createTable('teams', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('department_id').references('id').inTable('departments').onDelete('SET NULL');
    t.uuid('lead_user_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('name').notNullable();
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });

  await knex.schema.createTable('team_members', (t) => {
    t.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('joined_at').defaultTo(knex.fn.now());
    t.primary(['team_id', 'user_id']);
  });

  // ── attendance ─────────────────────────────────────────────────────────────
  await knex.schema.createTable('attendance_records', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('branch_id').references('id').inTable('branches').onDelete('SET NULL');
    t.date('date').notNullable();
    t.timestamp('check_in_at');
    t.timestamp('check_out_at');
    t.enu('status', ['present', 'absent', 'late', 'half_day', 'on_leave', 'holiday']).defaultTo('present');
    t.decimal('hours_worked', 5, 2);
    t.text('notes');
    t.timestamps(true, true);

    t.unique(['user_id', 'date']);
    t.index(['tenant_id']);
    t.index(['date']);
  });

  // ── leave management ───────────────────────────────────────────────────────
  await knex.schema.createTable('leave_types', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('name').notNullable(); // Annual, Sick, Maternity, Unpaid, ...
    t.integer('default_days_per_year').defaultTo(0);
    t.boolean('requires_approval').defaultTo(true);
    t.boolean('is_paid').defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('leave_balances', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('leave_type_id').notNullable().references('id').inTable('leave_types').onDelete('CASCADE');
    t.integer('year').notNullable();
    t.decimal('allocated_days', 5, 1).defaultTo(0);
    t.decimal('used_days', 5, 1).defaultTo(0);
    t.timestamps(true, true);

    t.unique(['user_id', 'leave_type_id', 'year']);
  });

  await knex.schema.createTable('leave_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('leave_type_id').notNullable().references('id').inTable('leave_types').onDelete('CASCADE');
    t.date('start_date').notNullable();
    t.date('end_date').notNullable();
    t.decimal('total_days', 5, 1).notNullable();
    t.text('reason');
    t.enu('status', ['pending', 'approved', 'rejected', 'cancelled']).defaultTo('pending');
    t.uuid('approved_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('approved_at');
    t.text('rejection_reason');
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['user_id']);
    t.index(['status']);
  });

  // ── payroll ────────────────────────────────────────────────────────────────
  await knex.schema.createTable('payroll_runs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('period_label').notNullable(); // e.g. "January 2026"
    t.date('period_start').notNullable();
    t.date('period_end').notNullable();
    t.enu('status', ['draft', 'processing', 'completed', 'cancelled']).defaultTo('draft');
    t.decimal('total_gross', 14, 2).defaultTo(0);
    t.decimal('total_deductions', 14, 2).defaultTo(0);
    t.decimal('total_net', 14, 2).defaultTo(0);
    t.uuid('processed_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('processed_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });

  await knex.schema.createTable('payslips', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('payroll_run_id').notNullable().references('id').inTable('payroll_runs').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.decimal('base_salary', 14, 2).notNullable().defaultTo(0);
    t.decimal('bonuses', 14, 2).defaultTo(0);
    t.decimal('overtime_pay', 14, 2).defaultTo(0);
    t.decimal('deductions', 14, 2).defaultTo(0);
    t.decimal('tax_amount', 14, 2).defaultTo(0);
    t.decimal('net_pay', 14, 2).notNullable().defaultTo(0);
    t.jsonb('breakdown').defaultTo('{}');
    t.enu('status', ['pending', 'paid']).defaultTo('pending');
    t.timestamp('paid_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['user_id']);
  });

  await knex.schema.createTable('compensation_records', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.decimal('base_salary', 14, 2).notNullable();
    t.string('currency').defaultTo('USD');
    t.enu('pay_frequency', ['weekly', 'biweekly', 'monthly', 'annually']).defaultTo('monthly');
    t.date('effective_date').notNullable();
    t.timestamps(true, true);
  });

  // ── recruitment ────────────────────────────────────────────────────────────
  await knex.schema.createTable('job_openings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('department_id').references('id').inTable('departments').onDelete('SET NULL');
    t.uuid('branch_id').references('id').inTable('branches').onDelete('SET NULL');
    t.string('title').notNullable();
    t.text('description');
    t.enu('employment_type', ['full_time', 'part_time', 'contract', 'internship']).defaultTo('full_time');
    t.enu('status', ['open', 'on_hold', 'closed', 'filled']).defaultTo('open');
    t.integer('openings_count').defaultTo(1);
    t.decimal('salary_min', 14, 2);
    t.decimal('salary_max', 14, 2);
    t.uuid('hiring_manager_id').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['status']);
  });

  await knex.schema.createTable('job_candidates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('job_opening_id').notNullable().references('id').inTable('job_openings').onDelete('CASCADE');
    t.string('first_name').notNullable();
    t.string('last_name').notNullable();
    t.string('email');
    t.string('phone');
    t.string('resume_url');
    t.enu('stage', ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected']).defaultTo('applied');
    t.integer('rating'); // 1-5
    t.text('notes');
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['job_opening_id']);
    t.index(['stage']);
  });

  // ── performance reviews ────────────────────────────────────────────────────
  await knex.schema.createTable('performance_reviews', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('reviewer_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('review_period').notNullable(); // e.g. "Q1 2026"
    t.enu('status', ['draft', 'in_progress', 'completed']).defaultTo('draft');
    t.integer('overall_rating'); // 1-5
    t.jsonb('competency_scores').defaultTo('{}');
    t.text('strengths');
    t.text('areas_for_improvement');
    t.text('goals_next_period');
    t.text('employee_comments');
    t.timestamp('completed_at');
    t.timestamps(true, true);

    t.index(['tenant_id']);
    t.index(['user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('performance_reviews');
  await knex.schema.dropTableIfExists('job_candidates');
  await knex.schema.dropTableIfExists('job_openings');
  await knex.schema.dropTableIfExists('compensation_records');
  await knex.schema.dropTableIfExists('payslips');
  await knex.schema.dropTableIfExists('payroll_runs');
  await knex.schema.dropTableIfExists('leave_requests');
  await knex.schema.dropTableIfExists('leave_balances');
  await knex.schema.dropTableIfExists('leave_types');
  await knex.schema.dropTableIfExists('attendance_records');
  await knex.schema.dropTableIfExists('team_members');
  await knex.schema.dropTableIfExists('teams');
}
