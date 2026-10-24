import type { Knex } from 'knex';

/**
 * Migration 020:
 * - Notification Templates (persisted customizable multi-channel templates)
 * - School & Education Management (sessions, classes, courses, students, exams, grades, fees, attendance)
 */
export async function up(knex: Knex): Promise<void> {
  // ── 1. notification_templates ──────────────────────────────────────────────
  await knex.schema.createTable('notification_templates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').nullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('key').notNullable(); // e.g. welcome_email, invoice_issued, exam_results
    t.string('name').notNullable();
    t.enu('channel', ['email', 'sms', 'whatsapp', 'push', 'in_app']).defaultTo('email');
    t.string('subject').nullable();
    t.text('body').notNullable();
    t.jsonb('variables').defaultTo('[]');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);

    t.index(['tenant_id', 'key']);
    t.index(['channel']);
  });

  // ── 2. school_academic_sessions ────────────────────────────────────────────
  await knex.schema.createTable('school_academic_sessions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('name').notNullable(); // e.g. "2025/2026 Academic Session"
    t.date('start_date').nullable();
    t.date('end_date').nullable();
    t.boolean('is_current').defaultTo(false);
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });

  // ── 3. school_classes ──────────────────────────────────────────────────────
  await knex.schema.createTable('school_classes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('name').notNullable(); // e.g. "Grade 10 - Alpha"
    t.string('code').nullable();
    t.string('grade_level').nullable();
    t.integer('capacity').defaultTo(35);
    t.string('room_number').nullable();
    t.uuid('class_teacher_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);

    t.index(['tenant_id']);
  });

  // ── 4. school_courses ──────────────────────────────────────────────────────
  await knex.schema.createTable('school_courses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('class_id').nullable().references('id').inTable('school_classes').onDelete('SET NULL');
    t.string('name').notNullable(); // e.g. "Mathematics"
    t.string('code').nullable(); // e.g. "MTH-10"
    t.uuid('teacher_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.integer('credit_units').defaultTo(3);
    t.text('description').nullable();
    t.timestamps(true, true);

    t.index(['tenant_id', 'class_id']);
  });

  // ── 5. school_students ─────────────────────────────────────────────────────
  await knex.schema.createTable('school_students', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('admission_number').notNullable();
    t.string('first_name').notNullable();
    t.string('last_name').notNullable();
    t.string('gender').nullable();
    t.date('date_of_birth').nullable();
    t.string('email').nullable();
    t.string('phone').nullable();
    t.text('address').nullable();
    t.uuid('class_id').nullable().references('id').inTable('school_classes').onDelete('SET NULL');
    t.string('guardian_name').nullable();
    t.string('guardian_phone').nullable();
    t.string('guardian_email').nullable();
    t.string('guardian_relationship').nullable();
    t.date('enrollment_date').nullable();
    t.string('status').defaultTo('active'); // active, suspended, graduated, withdrawn
    t.timestamps(true, true);

    t.unique(['tenant_id', 'admission_number']);
    t.index(['tenant_id', 'class_id']);
    t.index(['tenant_id', 'status']);
  });

  // ── 6. school_exams ────────────────────────────────────────────────────────
  await knex.schema.createTable('school_exams', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('session_id').nullable().references('id').inTable('school_academic_sessions').onDelete('SET NULL');
    t.uuid('class_id').nullable().references('id').inTable('school_classes').onDelete('SET NULL');
    t.uuid('course_id').nullable().references('id').inTable('school_courses').onDelete('SET NULL');
    t.string('title').notNullable();
    t.date('exam_date').nullable();
    t.decimal('max_marks', 5, 2).defaultTo(100.00);
    t.decimal('passing_marks', 5, 2).defaultTo(40.00);
    t.string('status').defaultTo('scheduled'); // scheduled, ongoing, completed, cancelled
    t.timestamps(true, true);

    t.index(['tenant_id', 'course_id']);
  });

  // ── 7. school_grades ───────────────────────────────────────────────────────
  await knex.schema.createTable('school_grades', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('exam_id').notNullable().references('id').inTable('school_exams').onDelete('CASCADE');
    t.uuid('student_id').notNullable().references('id').inTable('school_students').onDelete('CASCADE');
    t.decimal('score', 5, 2).notNullable();
    t.string('letter_grade').nullable();
    t.decimal('gpa', 3, 2).nullable();
    t.string('remarks').nullable();
    t.timestamps(true, true);

    t.unique(['tenant_id', 'exam_id', 'student_id']);
    t.index(['tenant_id', 'student_id']);
  });

  // ── 8. school_fee_invoices ─────────────────────────────────────────────────
  await knex.schema.createTable('school_fee_invoices', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('student_id').notNullable().references('id').inTable('school_students').onDelete('CASCADE');
    t.uuid('session_id').nullable().references('id').inTable('school_academic_sessions').onDelete('SET NULL');
    t.string('invoice_number').notNullable();
    t.string('fee_category').notNullable(); // Tuition, Lab, Hostel, Exam, Transport
    t.decimal('amount_due', 12, 2).notNullable();
    t.decimal('amount_paid', 12, 2).defaultTo(0.00);
    t.date('due_date').nullable();
    t.string('status').defaultTo('pending'); // pending, partially_paid, paid, overdue, cancelled
    t.timestamps(true, true);

    t.unique(['tenant_id', 'invoice_number']);
    t.index(['tenant_id', 'student_id']);
    t.index(['tenant_id', 'status']);
  });

  // ── 9. school_attendance ───────────────────────────────────────────────────
  await knex.schema.createTable('school_attendance', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('class_id').notNullable().references('id').inTable('school_classes').onDelete('CASCADE');
    t.uuid('student_id').notNullable().references('id').inTable('school_students').onDelete('CASCADE');
    t.date('date').notNullable();
    t.enu('status', ['present', 'absent', 'late', 'excused']).defaultTo('present');
    t.string('remarks').nullable();
    t.timestamps(true, true);

    t.unique(['tenant_id', 'student_id', 'date']);
    t.index(['tenant_id', 'class_id', 'date']);
  });

  // ── Seed default notification templates ────────────────────────────────────
  const defaultTemplates = [
    {
      key: 'welcome_email',
      name: 'Welcome Email to New Users / Customers',
      channel: 'email',
      subject: 'Welcome to {{organization_name}}!',
      body: 'Hello {{name}},\n\nWelcome to {{organization_name}}! We are thrilled to have you with us.\nYou can log into your workspace anytime here: {{login_url}}\n\nIf you have any questions, simply reply to this email.',
      variables: JSON.stringify(['name', 'organization_name', 'login_url']),
      is_active: true,
    },
    {
      key: 'invoice_issued',
      name: 'Invoice Issued Notification',
      channel: 'email',
      subject: 'New Invoice #{{invoice_number}} from {{organization_name}}',
      body: 'Dear {{customer_name}},\n\nYour invoice #{{invoice_number}} for {{currency}} {{total_amount}} has been issued and is due on {{due_date}}.\n\nView and pay online: {{payment_link}}\n\nThank you for your business.',
      variables: JSON.stringify(['customer_name', 'invoice_number', 'currency', 'total_amount', 'due_date', 'payment_link']),
      is_active: true,
    },
    {
      key: 'payment_receipt',
      name: 'Payment Receipt Confirmation',
      channel: 'email',
      subject: 'Payment Receipt for Invoice #{{invoice_number}}',
      body: 'Dear {{customer_name}},\n\nWe have successfully received your payment of {{currency}} {{amount_paid}} for invoice #{{invoice_number}} on {{payment_date}}.\n\nReference: {{reference}}\n\nThank you for choosing {{organization_name}}!',
      variables: JSON.stringify(['customer_name', 'invoice_number', 'currency', 'amount_paid', 'payment_date', 'reference', 'organization_name']),
      is_active: true,
    },
    {
      key: 'purchase_order_sent',
      name: 'Purchase Order to Supplier',
      channel: 'email',
      subject: 'Purchase Order {{po_number}} from {{organization_name}}',
      body: 'Dear {{supplier_name}},\n\nPlease find attached Purchase Order {{po_number}} for total order amount of {{currency}} {{total_amount}}.\n\nExpected delivery date: {{expected_delivery_date}}.\nWarehouse destination: {{warehouse_name}}.\n\nPlease confirm receipt of this order.',
      variables: JSON.stringify(['supplier_name', 'po_number', 'currency', 'total_amount', 'expected_delivery_date', 'warehouse_name', 'organization_name']),
      is_active: true,
    },
    {
      key: 'whatsapp_order_update',
      name: 'WhatsApp Order & Delivery Update',
      channel: 'whatsapp',
      subject: null,
      body: 'Hello {{customer_name}}, your order #{{order_number}} with {{organization_name}} is {{order_status}}! Track updates here: {{tracking_url}}',
      variables: JSON.stringify(['customer_name', 'order_number', 'organization_name', 'order_status', 'tracking_url']),
      is_active: true,
    },
    {
      key: 'school_exam_published',
      name: 'School Exam Results Published',
      channel: 'email',
      subject: 'Examination Results Published for {{student_name}} - {{session_name}}',
      body: 'Dear {{guardian_name}},\n\nThe examination results for {{student_name}} (Admission #{{admission_number}}) for the {{session_name}} session are now available.\n\nClass: {{class_name}}\nExam: {{exam_title}}\nScore: {{score}} (Grade: {{letter_grade}})\nTeacher Remarks: {{remarks}}\n\nPlease log into the student portal to review the complete gradebook report: {{portal_url}}',
      variables: JSON.stringify(['guardian_name', 'student_name', 'admission_number', 'session_name', 'class_name', 'exam_title', 'score', 'letter_grade', 'remarks', 'portal_url']),
      is_active: true,
    },
    {
      key: 'school_fee_reminder',
      name: 'School Fee Payment Reminder',
      channel: 'email',
      subject: 'Fee Reminder for {{student_name}} - {{fee_category}}',
      body: 'Dear {{guardian_name}},\n\nThis is a friendly reminder that the {{fee_category}} fee of {{currency}} {{amount_due}} for {{student_name}} is due on {{due_date}}.\n\nInvoice: {{invoice_number}}\nAmount outstanding: {{currency}} {{balance_due}}\n\nPay securely via the parent portal: {{payment_link}}',
      variables: JSON.stringify(['guardian_name', 'student_name', 'fee_category', 'currency', 'amount_due', 'balance_due', 'due_date', 'invoice_number', 'payment_link']),
      is_active: true,
    },
  ];

  for (const tpl of defaultTemplates) {
    await knex('notification_templates').insert({
      id: knex.raw('uuid_generate_v4()'),
      tenant_id: null, // System default template
      key: tpl.key,
      name: tpl.name,
      channel: tpl.channel as any,
      subject: tpl.subject,
      body: tpl.body,
      variables: tpl.variables,
      is_active: tpl.is_active,
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('school_attendance');
  await knex.schema.dropTableIfExists('school_fee_invoices');
  await knex.schema.dropTableIfExists('school_grades');
  await knex.schema.dropTableIfExists('school_exams');
  await knex.schema.dropTableIfExists('school_students');
  await knex.schema.dropTableIfExists('school_courses');
  await knex.schema.dropTableIfExists('school_classes');
  await knex.schema.dropTableIfExists('school_academic_sessions');
  await knex.schema.dropTableIfExists('notification_templates');
}
