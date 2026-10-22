import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // ── plans ──────────────────────────────────────────────────────────────────
  await knex.schema.createTable('plans', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('slug').notNullable().unique();
    t.text('description');
    t.integer('price_monthly').notNullable().defaultTo(0); // cents
    t.integer('price_yearly').notNullable().defaultTo(0);
    t.string('stripe_monthly_price_id');
    t.string('stripe_yearly_price_id');
    t.integer('max_users').notNullable().defaultTo(5);
    t.integer('max_storage_gb').notNullable().defaultTo(10);
    t.integer('max_workflows').notNullable().defaultTo(50);
    t.integer('max_api_keys').notNullable().defaultTo(2);
    t.integer('max_websites').notNullable().defaultTo(1);
    t.integer('max_branches').notNullable().defaultTo(1);
    t.boolean('feature_ai').notNullable().defaultTo(false);
    t.boolean('feature_custom_domain').notNullable().defaultTo(false);
    t.boolean('feature_white_label').notNullable().defaultTo(false);
    t.boolean('feature_sso').notNullable().defaultTo(false);
    t.boolean('feature_audit_logs').notNullable().defaultTo(false);
    t.boolean('feature_api_access').notNullable().defaultTo(false);
    t.boolean('feature_advanced_analytics').notNullable().defaultTo(false);
    t.jsonb('features').defaultTo('{}');
    t.integer('sort_order').defaultTo(0);
    t.boolean('is_active').defaultTo(true);
    t.boolean('is_public').defaultTo(true);
    t.timestamps(true, true);
  });

  // ── tenants ────────────────────────────────────────────────────────────────
  await knex.schema.createTable('tenants', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.string('slug').notNullable().unique();
    t.string('subdomain').notNullable().unique();
    t.string('custom_domain').unique();
    t.string('domain_verification_token');
    t.boolean('domain_verified').defaultTo(false);
    t.uuid('plan_id').references('id').inTable('plans');
    t.enu('status', ['trial', 'active', 'suspended', 'cancelled', 'past_due']).defaultTo('trial');
    t.enu('subscription_status', ['trialing', 'active', 'past_due', 'cancelled', 'incomplete']).defaultTo('trialing');
    t.string('stripe_customer_id');
    t.string('stripe_subscription_id');
    t.timestamp('subscription_current_period_end');
    t.timestamp('trial_ends_at').defaultTo(knex.raw("NOW() + INTERVAL '14 days'"));
    t.string('industry'); // dynamic industry key (hotel, school, hospital, restaurant, retail, ...)
    t.string('company_size');
    t.string('primary_color').defaultTo('#4f8ef7');
    t.string('secondary_color').defaultTo('#8b5cf6');
    t.string('logo_url');
    t.string('timezone').defaultTo('UTC');
    t.string('locale').defaultTo('en');
    t.string('currency').defaultTo('USD');
    t.string('phone');
    t.jsonb('address').defaultTo('{}');
    t.integer('users_count').defaultTo(0);
    t.bigInteger('storage_used_bytes').defaultTo(0);
    t.integer('api_calls_this_month').defaultTo(0);
    t.boolean('onboarding_completed').defaultTo(false);
    t.string('onboarding_step');
    t.jsonb('enabled_modules').defaultTo('[]'); // industry-driven module activation
    t.jsonb('settings').defaultTo('{}');
    t.timestamp('deleted_at');
    t.timestamps(true, true);

    t.index(['status']);
    t.index(['industry']);
  });

  // ── users ──────────────────────────────────────────────────────────────────
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('email').notNullable();
    t.string('password_hash');
    t.string('first_name').notNullable();
    t.string('last_name').notNullable();
    t.string('display_name');
    t.string('avatar_url');
    t.string('phone');
    t.enu('role', ['super_admin', 'owner', 'admin', 'manager', 'staff', 'customer', 'vendor']).defaultTo('staff');
    t.uuid('custom_role_id'); // FK added after role_definitions table exists
    t.uuid('department_id');
    t.uuid('branch_id');
    t.enu('status', ['active', 'invited', 'suspended', 'inactive']).defaultTo('invited');
    t.boolean('is_email_verified').defaultTo(false);
    t.timestamp('email_verified_at');
    t.boolean('two_factor_enabled').defaultTo(false);
    t.string('two_factor_secret');
    t.specificType('two_factor_backup_codes', 'text[]');
    t.string('timezone').defaultTo('UTC');
    t.string('locale').defaultTo('en');
    t.jsonb('preferences').defaultTo('{}');
    t.timestamp('last_login_at');
    t.string('invite_token');
    t.timestamp('invited_at');
    t.timestamp('deleted_at');
    t.timestamps(true, true);

    t.unique(['tenant_id', 'email']);
    t.index(['tenant_id']);
    t.index(['email']);
  });

  // ── user_sessions ──────────────────────────────────────────────────────────
  await knex.schema.createTable('user_sessions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('refresh_token_hash').notNullable();
    t.string('device_type');
    t.string('browser');
    t.string('os');
    t.string('ip_address');
    t.string('location');
    t.timestamp('last_used_at').defaultTo(knex.fn.now());
    t.timestamp('expires_at').notNullable();
    t.timestamps(true, true);

    t.index(['user_id']);
  });

  // ── audit_logs ─────────────────────────────────────────────────────────────
  await knex.schema.createTable('audit_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('action').notNullable();
    t.string('resource_type');
    t.string('resource_id');
    t.string('ip_address');
    t.string('user_agent');
    t.jsonb('old_values').defaultTo('{}');
    t.jsonb('new_values').defaultTo('{}');
    t.jsonb('metadata').defaultTo('{}');
    t.enu('status', ['success', 'failure', 'warning']).defaultTo('success');
    t.text('description');
    t.timestamp('created_at').defaultTo(knex.fn.now());

    t.index(['tenant_id']);
    t.index(['user_id']);
    t.index(['action']);
    t.index(['created_at']);
  });

  // ── oauth_accounts ─────────────────────────────────────────────────────────
  await knex.schema.createTable('oauth_accounts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('provider').notNullable();
    t.string('provider_account_id').notNullable();
    t.text('access_token_encrypted');
    t.text('refresh_token_encrypted');
    t.timestamp('expires_at');
    t.timestamps(true, true);

    t.unique(['provider', 'provider_account_id']);
  });

  // ── password_reset_tokens ──────────────────────────────────────────────────
  await knex.schema.createTable('password_reset_tokens', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('token_hash').notNullable();
    t.timestamp('expires_at').notNullable();
    t.timestamp('used_at');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('password_reset_tokens');
  await knex.schema.dropTableIfExists('oauth_accounts');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('user_sessions');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('tenants');
  await knex.schema.dropTableIfExists('plans');
}
