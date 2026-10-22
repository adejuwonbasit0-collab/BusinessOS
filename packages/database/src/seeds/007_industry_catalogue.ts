import type { Knex } from 'knex';

/**
 * Phase 1 — the business catalogue.
 *
 * Contains the nine industry categories, the 70+ industry presets required by
 * the upgrade brief, the module registry (with the real availability of every
 * module) and the dashboard presets that drive the adaptive navigation.
 *
 * The seed is idempotent: presets are upserted on their primary key, so
 * running it again never duplicates a row and never removes a preset that a
 * Super Admin has edited.
 */

// ── Module registry ─────────────────────────────────────────────────────────
// `status` distinguishes modules that are genuinely implemented from the ones
// that are still being built. A tenant is never offered a module whose API
// does not exist yet.
const MODULES = [
  { key: 'dashboard', name: 'Executive Dashboard', category: 'core', icon: 'layout-dashboard', is_core: true, depends_on: [] as string[], status: 'available', route: '/dashboard', summary: 'Live operational overview built from your own records.', sort_order: 10 },
  { key: 'analytics', name: 'Analytics & Reports', category: 'core', icon: 'bar-chart-3', is_core: true, depends_on: [] as string[], status: 'available', route: '/analytics', summary: 'Revenue, inventory, customer and staff reporting with drill-down.', sort_order: 20 },
  { key: 'communication', name: 'Communication Center', category: 'core', icon: 'message-square', is_core: true, depends_on: [] as string[], status: 'available', route: '/communication', summary: 'Internal messaging, e-mail and notifications.', sort_order: 30 },
  { key: 'roles', name: 'Roles & Permissions', category: 'core', icon: 'shield', is_core: true, depends_on: [] as string[], status: 'available', route: '/roles', summary: 'Custom roles, granular permissions and record scopes.', sort_order: 40 },
  { key: 'crm', name: 'CRM & Contacts', category: 'sales', icon: 'users-2', is_core: false, depends_on: [] as string[], status: 'available', route: '/crm/contacts', summary: 'Leads, prospects, customers, pipelines and contact history.', sort_order: 50 },
  { key: 'sales', name: 'Sales & Orders', category: 'sales', icon: 'shopping-cart', is_core: false, depends_on: ['finance'], status: 'available', route: '/sales', summary: 'Quotations, sales orders, payments and refunds.', sort_order: 60 },
  { key: 'finance', name: 'Finance & Invoicing', category: 'operations', icon: 'credit-card', is_core: false, depends_on: [] as string[], status: 'available', route: '/finance', summary: 'Invoices, payment status and financial reporting.', sort_order: 70 },
  { key: 'accounting', name: 'Accounting & Ledger', category: 'operations', icon: 'calculator', is_core: false, depends_on: ['finance'], status: 'available', route: '/accounting', summary: 'Chart of accounts, journal entries, general ledger, budgets and tax.', sort_order: 80 },
  { key: 'inventory', name: 'Inventory & Stock', category: 'operations', icon: 'package', is_core: false, depends_on: [] as string[], status: 'available', route: '/inventory', summary: 'Products, warehouses, stock levels, transfers, suppliers and purchase orders.', sort_order: 90 },
  { key: 'projects', name: 'Project Management', category: 'operations', icon: 'kanban', is_core: false, depends_on: [] as string[], status: 'available', route: '/projects', summary: 'Projects, milestones, tasks and dependencies.', sort_order: 100 },
  { key: 'documents', name: 'Documents & Approvals', category: 'operations', icon: 'file-text', is_core: false, depends_on: [] as string[], status: 'available', route: '/documents', summary: 'Documents, signatures and approval workflows.', sort_order: 110 },
  { key: 'branches', name: 'Branches & Locations', category: 'organization', icon: 'building-2', is_core: false, depends_on: [] as string[], status: 'available', route: '/branches', summary: 'Multiple locations, regional reporting and department structure.', sort_order: 120 },
  { key: 'hr', name: 'Human Resources', category: 'people', icon: 'briefcase', is_core: false, depends_on: [] as string[], status: 'available', route: '/hr', summary: 'Staff records, attendance, leave, payroll, recruitment and reviews.', sort_order: 130 },
  { key: 'booking', name: 'Booking & Reservations', category: 'industry-specific', icon: 'calendar', is_core: false, depends_on: [] as string[], status: 'available', route: '/bookings', summary: 'Bookable resources, availability, bookings and cancellations.', sort_order: 140 },
  { key: 'workflows', name: 'Workflow Automation', category: 'operations', icon: 'zap', is_core: false, depends_on: [] as string[], status: 'available', route: '/automation', summary: 'Trigger/condition workflows with execution logs and retries.', sort_order: 150 },
  { key: 'ai', name: 'AI Assistant', category: 'core', icon: 'sparkles', is_core: false, depends_on: [] as string[], status: 'available', route: '/ai', summary: 'Ask questions about your records and generate drafts.', sort_order: 160 },
  { key: 'portals', name: 'Customer Portals', category: 'customer', icon: 'layout', is_core: false, depends_on: [] as string[], status: 'available', route: '/app-builder', summary: 'Customer, staff and vendor portals with their own pages.', sort_order: 170 },
  { key: 'forms', name: 'Forms & Applications', category: 'customer', icon: 'notebook-pen', is_core: false, depends_on: [] as string[], status: 'available', route: '/app-builder', summary: 'Form builder with submissions stored against your records.', sort_order: 180 },
  { key: 'tables', name: 'Custom Data Tables', category: 'customer', icon: 'database', is_core: false, depends_on: [] as string[], status: 'available', route: '/app-builder', summary: 'Model bespoke business data without a code change.', sort_order: 190 },
  { key: 'marketplace', name: 'Module Marketplace', category: 'platform', icon: 'store', is_core: false, depends_on: [] as string[], status: 'available', route: '/marketplace', summary: 'Discover and install modules, templates and integrations.', sort_order: 200 },
  { key: 'integrations', name: 'Integrations', category: 'platform', icon: 'link', is_core: false, depends_on: [] as string[], status: 'available', route: '/integrations', summary: 'Connect e-mail, messaging, storage and payment providers.', sort_order: 210 },
  { key: 'website', name: 'Website Builder', category: 'customer', icon: 'globe', is_core: false, depends_on: [] as string[], status: 'beta', route: '/website', summary: 'Create a branded public site for your business.', sort_order: 220 },
];

// ── Industry categories ─────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'education', name: 'Education and training', icon: '🎓', description: 'Schools, universities, vocational training and learning platforms.', sort_order: 10 },
  { key: 'hospitality', name: 'Hospitality, travel and events', icon: '🏨', description: 'Hotels, restaurants, travel agencies, venues and aviation services.', sort_order: 20 },
  { key: 'health', name: 'Health and personal care', icon: '🏥', description: 'Hospitals, clinics, pharmacies, laboratories, fitness and beauty.', sort_order: 30 },
  { key: 'retail', name: 'Retail and commerce', icon: '🛍️', description: 'Stores, supermarkets, e-commerce, wholesale and dealerships.', sort_order: 40 },
  { key: 'professional', name: 'Professional and digital services', icon: '💼', description: 'Freelancers, agencies, firms and consultancies.', sort_order: 50 },
  { key: 'construction', name: 'Construction, property and manufacturing', icon: '🏗️', description: 'Builders, property, engineering, factories and rental fleets.', sort_order: 60 },
  { key: 'transport', name: 'Transport and logistics', icon: '🚚', description: 'Freight, fleet, warehousing, shipping and transit operators.', sort_order: 70 },
  { key: 'public_interest', name: 'Agriculture, finance and public-interest organizations', icon: '🌾', description: 'Farms, lenders, insurers, charities, faith and government bodies.', sort_order: 80 },
  { key: 'media', name: 'Media, entertainment and other organizations', icon: '🎬', description: 'Creators, publishers, studios, clubs and member organisations.', sort_order: 90 },
];

// ── Module bundles used by the industry presets ────────────────────────────
const CORE = ['dashboard', 'analytics', 'communication', 'roles'];
const CRM = ['crm'];
const SALES = ['sales'];
const FINANCE = ['finance'];
const ACCOUNTING = ['accounting'];
const INVENTORY = ['inventory'];
const PROJECTS = ['projects'];
const DOCS = ['documents'];
const BRANCHES = ['branches'];
const HR = ['hr'];
const BOOKING = ['booking'];
const WORKFLOWS = ['workflows'];
const AI = ['ai'];
const PORTALS = ['portals'];
const FORMS = ['forms'];
const TABLES = ['tables'];
const WEBSITE = ['website'];

interface PresetSeed {
  key: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  default_modules: string[];
  terminology_overrides: Record<string, string>;
  search_keywords: string[];
  aliases: string[];
  dashboard_preset_key: string | null;
}

// ── Industry presets (72 entries) ───────────────────────────────────────────
const PRESETS: PresetSeed[] = [
  // ── Education and training ───────────────────────────────────────────────
  {
    key: 'school', name: 'Primary and secondary schools', icon: '🎓', category: 'education',
    description: 'Student enrolment, attendance, classes, fees, results and parent communication.',
    default_modules: [...CORE, ...CRM, ...HR, ...BOOKING, ...FINANCE, ...DOCS, ...WORKFLOWS, ...BRANCHES, ...PORTALS],
    terminology_overrides: { contacts: 'Students', deals: 'Enrollments', bookings: 'Classes', branches: 'Campuses' },
    search_keywords: ['school', 'primary', 'secondary', 'high school', 'academy', 'pupil', 'student'],
    aliases: ['schools', 'K-12', 'secondary school'], dashboard_preset_key: 'school',
  },
  {
    key: 'university', name: 'Universities', icon: '🎓', category: 'education',
    description: 'Faculties, departments, course registration, examinations, fees and research projects.',
    default_modules: [...CORE, ...CRM, ...HR, ...BOOKING, ...FINANCE, ...ACCOUNTING, ...DOCS, ...PROJECTS, ...WORKFLOWS, ...BRANCHES],
    terminology_overrides: { contacts: 'Students', deals: 'Admissions', bookings: 'Lectures', branches: 'Faculties', projects: 'Research Projects' },
    search_keywords: ['university', 'college', 'faculty', 'undergraduate', 'postgraduate', 'campus'],
    aliases: ['higher education'], dashboard_preset_key: 'university',
  },
  {
    key: 'college', name: 'Polytechnics and colleges', icon: '🏫', category: 'education',
    description: 'Course administration, student records, timetables and fee collection.',
    default_modules: [...CORE, ...CRM, ...HR, ...BOOKING, ...FINANCE, ...DOCS, ...WORKFLOWS, ...BRANCHES],
    terminology_overrides: { contacts: 'Students', bookings: 'Classes' },
    search_keywords: ['polytechnic', 'college', 'institute', 'technical school'],
    aliases: [], dashboard_preset_key: 'university',
  },
  {
    key: 'vocational_training', name: 'Vocational training centres', icon: '🔧', category: 'education',
    description: 'Course cohorts, practical assessments, equipment and instructor scheduling.',
    default_modules: [...CORE, ...CRM, ...HR, ...BOOKING, ...FINANCE, ...INVENTORY, ...DOCS, ...WORKFLOWS],
    terminology_overrides: { contacts: 'Trainees', bookings: 'Sessions' },
    search_keywords: ['vocational', 'training centre', 'apprentice', 'technical training', 'skills'],
    aliases: ['trade school'], dashboard_preset_key: null,
  },
  {
    key: 'tutor', name: 'Tutors and private lessons', icon: '👨‍🏫', category: 'education',
    description: 'Student roster, lesson scheduling, progress notes and invoicing.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...FINANCE, ...DOCS, ...WORKFLOWS, ...PORTALS],
    terminology_overrides: { contacts: 'Students', bookings: 'Lessons' },
    search_keywords: ['tutor', 'private lessons', 'one to one', 'homework', 'revision'],
    aliases: ['private teacher'], dashboard_preset_key: null,
  },
  {
    key: 'online_learning', name: 'Online learning platforms', icon: '💻', category: 'education',
    description: 'Course catalogue, cohort enrolments, certificates and learner progress.',
    default_modules: [...CORE, ...CRM, ...FINANCE, ...DOCS, ...WORKFLOWS, ...PORTALS, ...TABLES, ...AI],
    terminology_overrides: { contacts: 'Learners', bookings: 'Cohorts' },
    search_keywords: ['online learning', 'e-learning', 'courses', 'lms', 'webinar', 'udemy'],
    aliases: ['LMS'], dashboard_preset_key: null,
  },
  {
    key: 'nursery', name: 'Nurseries and daycare', icon: '🧸', category: 'education',
    description: 'Child enrolment, attendance, parent updates, meals and developmental notes.',
    default_modules: [...CORE, ...CRM, ...HR, ...BOOKING, ...FINANCE, ...DOCS, ...WORKFLOWS, ...PORTALS],
    terminology_overrides: { contacts: 'Children', bookings: 'Sessions', branches: 'Centres' },
    search_keywords: ['nursery', 'daycare', 'day care', 'preschool', 'creche', 'montessori'],
    aliases: ['creche', 'pre-school'], dashboard_preset_key: null,
  },
  {
    key: 'exam_center', name: 'Examination and test centres', icon: '📝', category: 'education',
    description: 'Candidate registration, seat allocation, invigilation and result publication.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...FINANCE, ...DOCS, ...WORKFLOWS],
    terminology_overrides: { contacts: 'Candidates', bookings: 'Exam Sessions' },
    search_keywords: ['exam', 'test centre', 'invigilation', 'certificate', 'assessment'],
    aliases: ['examination centre'], dashboard_preset_key: null,
  },

  // ── Hospitality, travel and events ───────────────────────────────────────
  {
    key: 'hotel', name: 'Hotels and resorts', icon: '🏨', category: 'hospitality',
    description: 'Reservations, room availability, guest management, housekeeping and front-desk operations.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...FINANCE, ...HR, ...DOCS, ...WORKFLOWS, ...BRANCHES, ...AI, ...PORTALS, ...WEBSITE],
    terminology_overrides: { contacts: 'Guests', deals: 'Reservations', bookings: 'Room Bookings', branches: 'Properties' },
    search_keywords: ['hotel', 'resort', 'hostel', 'motel', 'guest house', 'accommodation', 'hospitality'],
    aliases: ['hospitality', 'lodging'], dashboard_preset_key: 'hotel',
  },
  {
    key: 'restaurant', name: 'Restaurants and cafés', icon: '🍽️', category: 'hospitality',
    description: 'Table reservations, POS orders, kitchen stock, staff shifts and suppliers.',
    default_modules: [...CORE, ...CRM, ...SALES, ...BOOKING, ...INVENTORY, ...FINANCE, ...HR, ...WORKFLOWS, ...BRANCHES, ...TABLES],
    terminology_overrides: { contacts: 'Guests', bookings: 'Table Reservations' },
    search_keywords: ['restaurant', 'cafe', 'coffee', 'eatery', 'bistro', 'diner', 'food service'],
    aliases: ['cafe', 'food and beverage'], dashboard_preset_key: null,
  },
  {
    key: 'bar_lounge', name: 'Bars and lounges', icon: '🍸', category: 'hospitality',
    description: 'Table and booth management, drink inventory, tab billing and shift closing.',
    default_modules: [...CORE, ...CRM, ...SALES, ...BOOKING, ...INVENTORY, ...FINANCE, ...HR, ...WORKFLOWS],
    terminology_overrides: { contacts: 'Guests', bookings: 'Table Bookings' },
    search_keywords: ['bar', 'lounge', 'nightclub', 'pub', 'club', 'cocktail'],
    aliases: ['pub'], dashboard_preset_key: null,
  },
  {
    key: 'catering', name: 'Catering businesses', icon: '🍱', category: 'hospitality',
    description: 'Event catering orders, ingredient stock, delivery schedules and crew planning.',
    default_modules: [...CORE, ...CRM, ...SALES, ...INVENTORY, ...FINANCE, ...HR, ...PROJECTS, ...WORKFLOWS],
    terminology_overrides: { contacts: 'Clients', projects: 'Events' },
    search_keywords: ['catering', 'banquet', 'event food', 'canape', 'buffet'],
    aliases: ['banqueting'], dashboard_preset_key: null,
  },
  {
    key: 'travel_agency', name: 'Travel agencies', icon: '✈️', category: 'hospitality',
    description: 'Itineraries, bookings, customer documents, commissions and payments.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...FINANCE, ...DOCS, ...WORKFLOWS, ...PORTALS, ...WEBSITE],
    terminology_overrides: { contacts: 'Travellers', bookings: 'Trips' },
    search_keywords: ['travel', 'agency', 'tour operator', 'holiday', 'booking agent', 'visa'],
    aliases: ['travel agent'], dashboard_preset_key: null,
  },
  {
    key: 'tour_operator', name: 'Tour operators', icon: '🧭', category: 'hospitality',
    description: 'Tour schedules, guide allocation, ticketing, capacity and customer updates.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...FINANCE, ...DOCS, ...WORKFLOWS, ...PORTALS, ...WEBSITE],
    terminology_overrides: { contacts: 'Travellers', bookings: 'Departures' },
    search_keywords: ['tour', 'excursion', 'safari', 'guided', 'itinerary'],
    aliases: ['tour operator'], dashboard_preset_key: null,
  },
  {
    key: 'airport', name: 'Airports and aviation services', icon: '🛫', category: 'hospitality',
    description: 'Facilities, service requests, staff scheduling, maintenance and operational reporting.',
    default_modules: [...CORE, ...CRM, ...HR, ...PROJECTS, ...DOCS, ...INVENTORY, ...WORKFLOWS, ...BRANCHES],
    terminology_overrides: { contacts: 'Passengers', branches: 'Terminals', projects: 'Facilities Projects' },
    search_keywords: ['airport', 'aviation', 'terminal', 'ground handling', 'hangar', 'airline'],
    aliases: ['aviation services'], dashboard_preset_key: 'airport',
  },
  {
    key: 'event_venue', name: 'Event planners and venues', icon: '🎪', category: 'hospitality',
    description: 'Venue availability, bookings, deposits, staffing and event delivery.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...SALES, ...FINANCE, ...HR, ...PROJECTS, ...WORKFLOWS, ...WEBSITE],
    terminology_overrides: { contacts: 'Organisers', bookings: 'Event Bookings' },
    search_keywords: ['event', 'venue', 'wedding', 'conference', 'party', 'catering hall'],
    aliases: ['event planner'], dashboard_preset_key: null,
  },

  // ── Health and personal care ──────────────────────────────────────────────
  {
    key: 'hospital', name: 'Hospitals', icon: '🏥', category: 'health',
    description: 'Patient registration, appointments, practitioners, pharmacy, laboratory and billing.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...HR, ...FINANCE, ...ACCOUNTING, ...INVENTORY, ...DOCS, ...WORKFLOWS, ...BRANCHES, ...PORTALS],
    terminology_overrides: { contacts: 'Patients', deals: 'Cases', bookings: 'Appointments', branches: 'Wards' },
    search_keywords: ['hospital', 'medical', 'healthcare', 'patient', 'surgery'],
    aliases: ['medical centre'], dashboard_preset_key: 'hospital',
  },
  {
    key: 'clinic', name: 'Clinics and medical centres', icon: '🩺', category: 'health',
    description: 'Patient records, appointments, prescriptions, referrals and follow-up care.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...HR, ...FINANCE, ...DOCS, ...WORKFLOWS, ...PORTALS],
    terminology_overrides: { contacts: 'Patients', bookings: 'Appointments' },
    search_keywords: ['clinic', 'medical centre', 'gp', 'surgery', 'consultation'],
    aliases: ['medical practice'], dashboard_preset_key: 'hospital',
  },
  {
    key: 'dental', name: 'Dental practices', icon: '🦷', category: 'health',
    description: 'Patient records, treatment plans, chair-side scheduling and billing.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...FINANCE, ...DOCS, ...WORKFLOWS, ...PORTALS],
    terminology_overrides: { contacts: 'Patients', bookings: 'Chair Time' },
    search_keywords: ['dental', 'dentist', 'orthodontic', 'teeth', 'oral'],
    aliases: ['orthodontics'], dashboard_preset_key: null,
  },
  {
    key: 'pharmacy', name: 'Pharmacies', icon: '💊', category: 'health',
    description: 'Dispensing records, stock control with expiry, supplier orders and sales.',
    default_modules: [...CORE, ...CRM, ...SALES, ...INVENTORY, ...FINANCE, ...HR, ...DOCS, ...WORKFLOWS],
    terminology_overrides: { contacts: 'Patients', products: 'Medicines' },
    search_keywords: ['pharmacy', 'chemist', 'dispense', 'medicine', 'drug'],
    aliases: ['chemist'], dashboard_preset_key: null,
  },
  {
    key: 'laboratory', name: 'Diagnostic laboratories', icon: '🔬', category: 'health',
    description: 'Sample registration, test catalogue, results reporting and billing.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...FINANCE, ...INVENTORY, ...DOCS, ...WORKFLOWS],
    terminology_overrides: { contacts: 'Patients', bookings: 'Test Bookings' },
    search_keywords: ['laboratory', 'lab', 'diagnostic', 'pathology', 'testing'],
    aliases: ['pathology'], dashboard_preset_key: null,
  },
  {
    key: 'physiotherapy', name: 'Physiotherapy centres', icon: '🧘', category: 'health',
    description: 'Patient intake, treatment sessions, exercise programmes and progress notes.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...FINANCE, ...DOCS, ...WORKFLOWS, ...PORTALS],
    terminology_overrides: { contacts: 'Patients', bookings: 'Sessions' },
    search_keywords: ['physiotherapy', 'physio', 'rehabilitation', 'therapy', 'recovery'],
    aliases: ['physio clinic'], dashboard_preset_key: null,
  },
  {
    key: 'fitness_wellness', name: 'Fitness and wellness centres', icon: '💪', category: 'health',
    description: 'Memberships, class schedules, trainers, retail sales and access control.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...SALES, ...INVENTORY, ...FINANCE, ...HR, ...WORKFLOWS, ...PORTALS, ...WEBSITE],
    terminology_overrides: { contacts: 'Members', bookings: 'Classes' },
    search_keywords: ['fitness', 'gym', 'wellness', 'spa', 'yoga', 'crossfit', 'personal training'],
    aliases: ['gym'], dashboard_preset_key: null,
  },
  {
    key: 'beauty_salon', name: 'Salons, spas and barbershops', icon: '💈', category: 'health',
    description: 'Appointments, walk-ins, services, stylist schedules, product sales and commissions.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...SALES, ...INVENTORY, ...FINANCE, ...HR, ...WORKFLOWS, ...PORTALS, ...TABLES],
    terminology_overrides: { contacts: 'Customers', bookings: 'Appointments' },
    search_keywords: ['salon', 'barber', 'spa', 'beauty', 'hair', 'nails', 'grooming'],
    aliases: ['barbershop', 'hair salon'], dashboard_preset_key: 'beauty_salon',
  },

  // ── Retail and commerce ───────────────────────────────────────────────────
  {
    key: 'retail', name: 'Retail stores', icon: '🛍️', category: 'retail',
    description: 'Point of sale, stock levels, suppliers, customer loyalty and pricing.',
    default_modules: [...CORE, ...CRM, ...SALES, ...INVENTORY, ...FINANCE, ...HR, ...WORKFLOWS, ...BRANCHES, ...WEBSITE],
    terminology_overrides: {},
    search_keywords: ['retail', 'store', 'shop', 'boutique', 'outlet', 'merchandise'],
    aliases: ['shop'], dashboard_preset_key: null,
  },
  {
    key: 'supermarket', name: 'Supermarkets', icon: '🏪', category: 'retail',
    description: 'High-volume POS, perishable stock, expiry control, supplier orders and promotions.',
    default_modules: [...CORE, ...CRM, ...SALES, ...INVENTORY, ...FINANCE, ...HR, ...WORKFLOWS, ...BRANCHES, ...TABLES],
    terminology_overrides: { products: 'Products', contacts: 'Shoppers' },
    search_keywords: ['supermarket', 'grocery', 'grocer', 'minimart', 'convenience store'],
    aliases: ['grocery store'], dashboard_preset_key: null,
  },
  {
    key: 'fashion', name: 'Fashion and clothing businesses', icon: '👗', category: 'retail',
    description: 'Seasonal collections, size and colour variants, POS, alterations and returns.',
    default_modules: [...CORE, ...CRM, ...SALES, ...INVENTORY, ...FINANCE, ...HR, ...WORKFLOWS, ...WEBSITE],
    terminology_overrides: { products: 'Collections' },
    search_keywords: ['fashion', 'clothing', 'apparel', 'boutique', 'textile', 'shoe store'],
    aliases: ['apparel'], dashboard_preset_key: null,
  },
  {
    key: 'electronics', name: 'Electronics retailers', icon: '💻', category: 'retail',
    description: 'Serial-numbered stock, warranty tracking, technical specs and POS.',
    default_modules: [...CORE, ...CRM, ...SALES, ...INVENTORY, ...FINANCE, ...HR, ...DOCS, ...WORKFLOWS, ...WEBSITE],
    terminology_overrides: { products: 'Devices' },
    search_keywords: ['electronics', 'gadget', 'mobile phone', 'computer store', 'tv shop'],
    aliases: ['tech store'], dashboard_preset_key: null,
  },
  {
    key: 'health_retail', name: 'Pharmacy and health retailers', icon: '🩹', category: 'retail',
    description: 'OTC product ranges, loyalty, stock expiry and supplier replenishment.',
    default_modules: [...CORE, ...CRM, ...SALES, ...INVENTORY, ...FINANCE, ...HR, ...WORKFLOWS],
    terminology_overrides: { products: 'Health Products' },
    search_keywords: ['pharmacy retail', 'health shop', 'wellness store', 'vitamins'],
    aliases: ['health store'], dashboard_preset_key: null,
  },
  {
    key: 'furniture', name: 'Furniture and home goods businesses', icon: '🛋️', category: 'retail',
    description: 'Bulky stock, variants, delivery scheduling and showroom orders.',
    default_modules: [...CORE, ...CRM, ...SALES, ...BOOKING, ...INVENTORY, ...FINANCE, ...WORKFLOWS, ...WEBSITE],
    terminology_overrides: { contacts: 'Customers' },
    search_keywords: ['furniture', 'home goods', 'interior', 'furnishing', 'decor'],
    aliases: ['homeware'], dashboard_preset_key: null,
  },
  {
    key: 'ecommerce', name: 'Online stores', icon: '🛒', category: 'retail',
    description: 'Catalogue, orders, shipping, payments and customer self-service.',
    default_modules: [...CORE, ...CRM, ...SALES, ...INVENTORY, ...FINANCE, ...WORKFLOWS, ...PORTALS, ...WEBSITE, ...AI],
    terminology_overrides: { contacts: 'Customers' },
    search_keywords: ['ecommerce', 'e-commerce', 'online shop', 'web store', 'dropshipping'],
    aliases: ['online retail'], dashboard_preset_key: null,
  },
  {
    key: 'wholesale', name: 'Wholesale and distribution businesses', icon: '🚚', category: 'retail',
    description: 'Tiered pricing, bulk orders, supplier terms, credit limits and distribution.',
    default_modules: [...CORE, ...CRM, ...SALES, ...INVENTORY, ...ACCOUNTING, ...FINANCE, ...HR, ...WORKFLOWS, ...BRANCHES],
    terminology_overrides: { contacts: 'Trade Customers' },
    search_keywords: ['wholesale', 'distribution', 'bulk', 'b2b', 'supplier', 'distributor'],
    aliases: ['distributor'], dashboard_preset_key: null,
  },
  {
    key: 'automotive', name: 'Automotive dealerships', icon: '🚗', category: 'retail',
    description: 'Vehicle stock, test drives, service bookings, finance and parts.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...INVENTORY, ...FINANCE, ...HR, ...DOCS, ...WORKFLOWS, ...WEBSITE],
    terminology_overrides: { products: 'Vehicles', bookings: 'Test Drives' },
    search_keywords: ['automotive', 'car dealership', 'motor', 'vehicle', 'garage', 'tyre'],
    aliases: ['car dealer'], dashboard_preset_key: null,
  },

  // ── Professional and digital services ─────────────────────────────────────
  {
    key: 'professional_services', name: 'Freelancers and professionals', icon: '💼', category: 'professional',
    description: 'Portfolio, leads, clients, projects, proposals, contracts and time tracking.',
    default_modules: [...CORE, ...CRM, ...PROJECTS, ...FINANCE, ...DOCS, ...WORKFLOWS, ...BRANCHES, ...AI, ...PORTALS, ...WEBSITE],
    terminology_overrides: { contacts: 'Clients', deals: 'Engagements', projects: 'Client Projects' },
    search_keywords: ['freelance', 'consultant', 'independent', 'solo', 'contractor', 'agency'],
    aliases: ['professional services'], dashboard_preset_key: 'professional_services',
  },
  {
    key: 'software_company', name: 'Software and IT companies', icon: '💻', category: 'professional',
    description: 'Sprint delivery, support tickets, licences, renewals and infrastructure records.',
    default_modules: [...CORE, ...CRM, ...PROJECTS, ...FINANCE, ...DOCS, ...HR, ...WORKFLOWS, ...TABLES, ...AI, ...PORTALS],
    terminology_overrides: { contacts: 'Clients', projects: 'Products' },
    search_keywords: ['software', 'it company', 'saas', 'developer', 'systems', 'engineering'],
    aliases: ['IT services'], dashboard_preset_key: null,
  },
  {
    key: 'graphic_design', name: 'Graphic design agencies', icon: '🎨', category: 'professional',
    description: 'Creative briefs, revisions, project delivery, licensing and invoicing.',
    default_modules: [...CORE, ...CRM, ...PROJECTS, ...FINANCE, ...DOCS, ...WORKFLOWS, ...PORTALS, ...WEBSITE],
    terminology_overrides: { contacts: 'Clients', projects: 'Campaigns' },
    search_keywords: ['graphic design', 'branding', 'creative', 'agency', 'illustration'],
    aliases: ['design studio'], dashboard_preset_key: null,
  },
  {
    key: 'marketing_agency', name: 'Marketing agencies', icon: '📣', category: 'professional',
    description: 'Campaigns, client reporting, deliverables, budgets and retainer billing.',
    default_modules: [...CORE, ...CRM, ...PROJECTS, ...FINANCE, ...DOCS, ...WORKFLOWS, ...PORTALS, ...WEBSITE],
    terminology_overrides: { contacts: 'Clients', projects: 'Campaigns' },
    search_keywords: ['marketing', 'advertising', 'seo', 'pr', 'digital agency', 'media buying'],
    aliases: ['ad agency'], dashboard_preset_key: null,
  },
  {
    key: 'accounting_firm', name: 'Accounting firms', icon: '🧾', category: 'professional',
    description: 'Client ledgers, tax periods, filings, payroll runs and document collection.',
    default_modules: [...CORE, ...CRM, ...ACCOUNTING, ...FINANCE, ...DOCS, ...HR, ...WORKFLOWS, ...PORTALS],
    terminology_overrides: { contacts: 'Clients' },
    search_keywords: ['accounting', 'bookkeeping', 'tax', 'audit', 'payroll bureau'],
    aliases: ['bookkeeper'], dashboard_preset_key: null,
  },
  {
    key: 'law_firm', name: 'Law firms', icon: '⚖️', category: 'professional',
    description: 'Matter management, deadlines, document bundles, time recording and billing.',
    default_modules: [...CORE, ...CRM, ...PROJECTS, ...FINANCE, ...DOCS, ...WORKFLOWS, ...BRANCHES, ...PORTALS],
    terminology_overrides: { contacts: 'Clients', projects: 'Matters', bookings: 'Hearings' },
    search_keywords: ['law', 'legal', 'attorney', 'solicitor', 'barrister', 'litigation'],
    aliases: ['solicitors'], dashboard_preset_key: null,
  },
  {
    key: 'consulting', name: 'Consulting businesses', icon: '📊', category: 'professional',
    description: 'Engagements, deliverables, knowledge assets, proposals and utilisation.',
    default_modules: [...CORE, ...CRM, ...PROJECTS, ...FINANCE, ...DOCS, ...WORKFLOWS, ...AI, ...PORTALS],
    terminology_overrides: { contacts: 'Clients', projects: 'Engagements' },
    search_keywords: ['consulting', 'advisory', 'strategy', 'management consulting'],
    aliases: ['advisory'], dashboard_preset_key: null,
  },
  {
    key: 'recruitment_agency', name: 'Recruitment agencies', icon: '🧑‍💼', category: 'professional',
    description: 'Vacancies, applicant pipelines, interviews, offers and placement reporting.',
    default_modules: [...CORE, ...CRM, ...HR, ...FINANCE, ...DOCS, ...WORKFLOWS, ...PORTALS, ...WEBSITE],
    terminology_overrides: { contacts: 'Candidates', bookings: 'Interviews' },
    search_keywords: ['recruitment', 'staffing', 'headhunting', 'job agency', 'talent'],
    aliases: ['staffing agency'], dashboard_preset_key: null,
  },

  // ── Construction, property and manufacturing ──────────────────────────────
  {
    key: 'construction', name: 'Construction companies', icon: '🏗️', category: 'construction',
    description: 'Job sites, crews, equipment, procurement, contracts and progress reporting.',
    default_modules: [...CORE, ...CRM, ...PROJECTS, ...INVENTORY, ...HR, ...FINANCE, ...DOCS, ...WORKFLOWS, ...BRANCHES],
    terminology_overrides: { projects: 'Job Sites', branches: 'Sites', contacts: 'Clients' },
    search_keywords: ['construction', 'builder', 'contractor', 'civil engineering', 'site work'],
    aliases: ['contractor'], dashboard_preset_key: null,
  },
  {
    key: 'real_estate', name: 'Real estate agencies', icon: '🏢', category: 'construction',
    description: 'Listings, viewings, offers, commission tracking and tenant records.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...DOCS, ...FINANCE, ...WORKFLOWS, ...BRANCHES, ...PORTALS, ...WEBSITE],
    terminology_overrides: { contacts: 'Clients', deals: 'Listings', bookings: 'Viewings' },
    search_keywords: ['real estate', 'property', 'estate agent', 'realtor', 're letting'],
    aliases: ['estate agency'], dashboard_preset_key: null,
  },
  {
    key: 'property_management', name: 'Property management', icon: '🔑', category: 'construction',
    description: 'Units, tenants, rent schedules, maintenance requests and owner reporting.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...INVENTORY, ...FINANCE, ...ACCOUNTING, ...HR, ...DOCS, ...WORKFLOWS],
    terminology_overrides: { contacts: 'Tenants', bookings: 'Unit Bookings' },
    search_keywords: ['property management', 'rentals', 'landlord', 'rental units', 'housing'],
    aliases: ['landlord'], dashboard_preset_key: null,
  },
  {
    key: 'architecture_engineering', name: 'Architecture and engineering', icon: '📐', category: 'construction',
    description: 'Project pipelines, drawing registers, site inspections and change orders.',
    default_modules: [...CORE, ...CRM, ...PROJECTS, ...DOCS, ...FINANCE, ...HR, ...WORKFLOWS, ...PORTALS],
    terminology_overrides: { projects: 'Commissions', contacts: 'Clients' },
    search_keywords: ['architecture', 'engineering', 'design studio', 'structural', 'survey'],
    aliases: ['architect'], dashboard_preset_key: null,
  },
  {
    key: 'manufacturing', name: 'Manufacturing companies', icon: '🏭', category: 'construction',
    description: 'Bill of materials, production output, raw material stock and downtime.',
    default_modules: [...CORE, ...INVENTORY, ...ACCOUNTING, ...FINANCE, ...HR, ...PROJECTS, ...DOCS, ...WORKFLOWS, ...BRANCHES, ...TABLES],
    terminology_overrides: { products: 'SKUs', warehouses: 'Plants', branches: 'Plants' },
    search_keywords: ['manufacturing', 'factory', 'production', 'fabrication', 'assembly', 'plant'],
    aliases: ['factory'], dashboard_preset_key: null,
  },
  {
    key: 'factory', name: 'Factories and production businesses', icon: '⚙️', category: 'construction',
    description: 'Production runs, machine scheduling, quality checks and shift hand-over.',
    default_modules: [...CORE, ...INVENTORY, ...HR, ...PROJECTS, ...DOCS, ...WORKFLOWS, ...TABLES],
    terminology_overrides: { products: 'Finished Goods', warehouses: 'Stores' },
    search_keywords: ['factory', 'production floor', 'machine', 'output', 'batch'],
    aliases: ['production'], dashboard_preset_key: null,
  },
  {
    key: 'equipment_rental', name: 'Equipment rental businesses', icon: '🚜', category: 'construction',
    description: 'Fleet availability, rental reservations, damage reports and billing.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...INVENTORY, ...FINANCE, ...HR, ...DOCS, ...WORKFLOWS, ...WEBSITE],
    terminology_overrides: { products: 'Fleet', bookings: 'Rentals', contacts: 'Hire Customers' },
    search_keywords: ['equipment rental', 'hire', 'plant hire', 'machinery rental', 'drone rental'],
    aliases: ['plant hire'], dashboard_preset_key: null,
  },
  {
    key: 'repair_maintenance', name: 'Repair and maintenance services', icon: '🔧', category: 'construction',
    description: 'Work orders, technician schedules, parts usage and service history.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...INVENTORY, ...FINANCE, ...HR, ...WORKFLOWS],
    terminology_overrides: { bookings: 'Job Bookings', products: 'Parts' },
    search_keywords: ['repair', 'maintenance', 'garage', 'servicing', 'technician', 'field service'],
    aliases: ['field service'], dashboard_preset_key: null,
  },

  // ── Transport and logistics ───────────────────────────────────────────────
  {
    key: 'logistics', name: 'Logistics companies', icon: '🚚', category: 'transport',
    description: 'Shipments, fleet, warehousing, routes and delivery performance.',
    default_modules: [...CORE, ...CRM, ...INVENTORY, ...BOOKING, ...FINANCE, ...HR, ...DOCS, ...WORKFLOWS, ...BRANCHES, ...TABLES],
    terminology_overrides: { bookings: 'Shipments', contacts: 'Shippers', branches: 'Depots' },
    search_keywords: ['logistics', 'freight', 'transport', 'supply chain', '3pl', 'courier company'],
    aliases: ['3pl'], dashboard_preset_key: null,
  },
  {
    key: 'trucking', name: 'Trucking and haulage', icon: '🚛', category: 'transport',
    description: 'Loads, drivers, routes, fuel costs, proof of delivery and invoices.',
    default_modules: [...CORE, ...CRM, ...INVENTORY, ...FINANCE, ...HR, ...DOCS, ...WORKFLOWS],
    terminology_overrides: { bookings: 'Loads', contacts: 'Brokers' },
    search_keywords: ['trucking', 'haulage', 'lorry', 'truck', 'carrier', 'fleet owner'],
    aliases: ['haulier'], dashboard_preset_key: null,
  },
  {
    key: 'courier', name: 'Courier and delivery businesses', icon: '📦', category: 'transport',
    description: 'Same-day delivery, driver allocation, tracking and proof of delivery.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...FINANCE, ...HR, ...WORKFLOWS, ...PORTALS],
    terminology_overrides: { bookings: 'Deliveries' },
    search_keywords: ['courier', 'delivery', 'parcel', 'last mile', 'dispatch'],
    aliases: ['parcel service'], dashboard_preset_key: null,
  },
  {
    key: 'public_transport', name: 'Public transportation', icon: '🚌', category: 'transport',
    description: 'Routes, schedules, ticketing, vehicle inspections and passenger feedback.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...INVENTORY, ...FINANCE, ...HR, ...DOCS, ...WORKFLOWS, ...BRANCHES],
    terminology_overrides: { bookings: 'Trips', branches: 'Depots' },
    search_keywords: ['public transport', 'bus', 'transit', 'coach', 'minibus', 'ferry'],
    aliases: ['transit'], dashboard_preset_key: null,
  },
  {
    key: 'fleet_management', name: 'Fleet management', icon: '🚙', category: 'transport',
    description: 'Vehicle registers, servicing schedules, fuel, drivers and cost per kilometre.',
    default_modules: [...CORE, ...INVENTORY, ...HR, ...FINANCE, ...DOCS, ...WORKFLOWS],
    terminology_overrides: { products: 'Vehicles' },
    search_keywords: ['fleet', 'vehicle management', 'car fleet', 'telematics', 'motor pool'],
    aliases: ['fleet services'], dashboard_preset_key: null,
  },
  {
    key: 'warehousing', name: 'Warehousing', icon: '🏭', category: 'transport',
    description: 'Storage locations, inbound and outbound stock, picking and handling.',
    default_modules: [...CORE, ...INVENTORY, ...CRM, ...FINANCE, ...HR, ...WORKFLOWS, ...BRANCHES, ...TABLES],
    terminology_overrides: { warehouses: 'Sites', contacts: 'Tenants' },
    search_keywords: ['warehouse', 'storage', 'fulfilment', 'fulfillment', 'distribution centre', '3pl storage'],
    aliases: ['storage'], dashboard_preset_key: null,
  },
  {
    key: 'shipping_freight', name: 'Shipping and freight forwarding', icon: '🚢', category: 'transport',
    description: 'Consignments, customs documentation, carrier rates and delivery tracking.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...INVENTORY, ...FINANCE, ...DOCS, ...WORKFLOWS],
    terminology_overrides: { bookings: 'Consignments', contacts: 'Shippers' },
    search_keywords: ['shipping', 'freight forwarding', 'customs', 'ocean freight', 'air freight', 'import export'],
    aliases: ['freight forwarder'], dashboard_preset_key: null,
  },
  {
    key: 'aviation_support', name: 'Aviation support services', icon: '✈️', category: 'transport',
    description: 'Maintenance records, parts consumption, hangar scheduling and compliance.',
    default_modules: [...CORE, ...INVENTORY, ...PROJECTS, ...HR, ...DOCS, ...FINANCE, ...WORKFLOWS, ...BRANCHES],
    terminology_overrides: { products: 'Parts', bookings: 'Maintenance Slots' },
    search_keywords: ['aviation support', 'mro', 'hangar', 'aircraft maintenance', 'ground handling'],
    aliases: ['mro'], dashboard_preset_key: null,
  },

  // ── Agriculture, finance and public-interest organizations ────────────────
  {
    key: 'agriculture', name: 'Farms and agribusinesses', icon: '🌾', category: 'public_interest',
    description: 'Fields and lots, crops, harvest records, inputs, seasonal labour and sales.',
    default_modules: [...CORE, ...CRM, ...SALES, ...INVENTORY, ...FINANCE, ...HR, ...PROJECTS, ...WORKFLOWS, ...TABLES],
    terminology_overrides: { products: 'Crops', warehouses: 'Stores', branches: 'Farms' },
    search_keywords: ['agriculture', 'farm', 'crop', 'harvest', 'orchard', 'agribusiness'],
    aliases: ['farming'], dashboard_preset_key: null,
  },
  {
    key: 'livestock', name: 'Livestock and poultry businesses', icon: '🐄', category: 'public_interest',
    description: 'Herd registers, feed stock, health records, breeding and produce sales.',
    default_modules: [...CORE, ...CRM, ...SALES, ...INVENTORY, ...FINANCE, ...HR, ...DOCS, ...WORKFLOWS, ...TABLES],
    terminology_overrides: { products: 'Produce', branches: 'Units' },
    search_keywords: ['livestock', 'poultry', 'cattle', 'dairy', 'farm animals', 'hatchery'],
    aliases: ['dairy farm'], dashboard_preset_key: null,
  },
  {
    key: 'food_processing', name: 'Food processing', icon: '🥫', category: 'public_interest',
    description: 'Batch production, ingredient traceability, quality checks and batch costing.',
    default_modules: [...CORE, ...INVENTORY, ...ACCOUNTING, ...FINANCE, ...HR, ...DOCS, ...WORKFLOWS, ...TABLES],
    terminology_overrides: { products: 'Batches', warehouses: 'Silos' },
    search_keywords: ['food processing', 'factory food', 'bottling', 'packing', 'batch production'],
    aliases: ['food manufacturing'], dashboard_preset_key: null,
  },
  {
    key: 'microfinance', name: 'Microfinance and lending organizations', icon: '💰', category: 'public_interest',
    description: 'Client portfolios, loan applications, repayment schedules and portfolio health.',
    default_modules: [...CORE, ...CRM, ...FINANCE, ...ACCOUNTING, ...HR, ...DOCS, ...WORKFLOWS, ...TABLES],
    terminology_overrides: { contacts: 'Borrowers' },
    search_keywords: ['microfinance', 'lending', 'loan', 'savings group', 'cooperative', 'credit union'],
    aliases: ['lender'], dashboard_preset_key: null,
  },
  {
    key: 'insurance', name: 'Insurance agencies', icon: '🛡️', category: 'public_interest',
    description: 'Policies, premiums, renewals, claims intake and broker commissions.',
    default_modules: [...CORE, ...CRM, ...FINANCE, ...ACCOUNTING, ...HR, ...DOCS, ...WORKFLOWS, ...PORTALS],
    terminology_overrides: { contacts: 'Policyholders' },
    search_keywords: ['insurance', 'policy', 'premium', 'claim', 'broker', 'underwriting'],
    aliases: ['insurer'], dashboard_preset_key: null,
  },
  {
    key: 'ngo', name: 'NGOs and charities', icon: '🤝', category: 'public_interest',
    description: 'Donor records, programmes, grants, volunteer coordination and impact reporting.',
    default_modules: [...CORE, ...CRM, ...FINANCE, ...HR, ...PROJECTS, ...DOCS, ...WORKFLOWS, ...BRANCHES, ...PORTALS],
    terminology_overrides: { contacts: 'Donors / Volunteers', deals: 'Grants', projects: 'Programmes' },
    search_keywords: ['ngo', 'charity', 'nonprofit', 'non-profit', 'foundation', 'aid organisation'],
    aliases: ['charity'], dashboard_preset_key: null,
  },
  {
    key: 'religious_organization', name: 'Religious organizations', icon: '⛪', category: 'public_interest',
    description: 'Members, donations, events, service schedules and volunteer rosters.',
    default_modules: [...CORE, ...CRM, ...FINANCE, ...HR, ...BOOKING, ...DOCS, ...WORKFLOWS, ...BRANCHES, ...PORTALS],
    terminology_overrides: { contacts: 'Members', bookings: 'Services' },
    search_keywords: ['church', 'mosque', 'temple', 'religious', 'congregation', 'parish'],
    aliases: ['congregation'], dashboard_preset_key: null,
  },
  {
    key: 'government', name: 'Government and public services', icon: '🏛️', category: 'public_interest',
    description: 'Citizen records, applications, approvals, service requests and case reporting.',
    default_modules: [...CORE, ...CRM, ...PROJECTS, ...DOCS, ...HR, ...FINANCE, ...WORKFLOWS, ...BRANCHES, ...FORMS, ...TABLES],
    terminology_overrides: { contacts: 'Citizens / Cases', deals: 'Applications' },
    search_keywords: ['government', 'public sector', 'municipal', 'council', 'agency', 'citizen services'],
    aliases: ['public administration'], dashboard_preset_key: null,
  },

  // ── Media, entertainment and other organizations ──────────────────────────
  {
    key: 'content_creator', name: 'Content creators', icon: '🎬', category: 'media',
    description: 'Content pipeline, collaborations, sponsorship deals and audience analytics.',
    default_modules: [...CORE, ...CRM, ...FINANCE, ...DOCS, ...WORKFLOWS, ...PORTALS, ...WEBSITE, ...AI],
    terminology_overrides: { contacts: 'Collaborators' },
    search_keywords: ['creator', 'influencer', 'youtube', 'podcast', 'blogger', 'social media'],
    aliases: ['influencer'], dashboard_preset_key: null,
  },
  {
    key: 'media_publishing', name: 'Media and publishing businesses', icon: '📰', category: 'media',
    description: 'Editorial pipeline, issues, contributors, distribution and subscriber reporting.',
    default_modules: [...CORE, ...CRM, ...FINANCE, ...DOCS, ...PROJECTS, ...WORKFLOWS, ...PORTALS, ...WEBSITE],
    terminology_overrides: { contacts: 'Contributors', projects: 'Issues' },
    search_keywords: ['media', 'publishing', 'magazine', 'news', 'editorial', 'newspaper'],
    aliases: ['publisher'], dashboard_preset_key: null,
  },
  {
    key: 'photography_studio', name: 'Photography and video studios', icon: '📷', category: 'media',
    description: 'Session bookings, gear inventory, client galleries and licensing.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...SALES, ...INVENTORY, ...FINANCE, ...DOCS, ...WORKFLOWS, ...PORTALS, ...WEBSITE],
    terminology_overrides: { bookings: 'Sessions' },
    search_keywords: ['photography', 'video', 'studio', 'wedding photography', 'production house'],
    aliases: ['photo studio'], dashboard_preset_key: null,
  },
  {
    key: 'music_entertainment', name: 'Music and entertainment businesses', icon: '🎵', category: 'media',
    description: 'Releases, bookings, licensing, studio sessions and royalty tracking.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...SALES, ...FINANCE, ...DOCS, ...WORKFLOWS, ...PORTALS, ...WEBSITE],
    terminology_overrides: { bookings: 'Performances' },
    search_keywords: ['music', 'band', 'artist', 'record label', 'entertainment', 'dj'],
    aliases: ['artist management'], dashboard_preset_key: null,
  },
  {
    key: 'sports_club', name: 'Sports clubs and academies', icon: '⚽', category: 'media',
    description: 'Memberships, squads, training schedules, match fixtures and fees.',
    default_modules: [...CORE, ...CRM, ...BOOKING, ...FINANCE, ...HR, ...DOCS, ...WORKFLOWS, ...BRANCHES, ...PORTALS],
    terminology_overrides: { contacts: 'Members', bookings: 'Sessions' },
    search_keywords: ['sports club', 'football', 'gym academy', 'swimming school', 'sports academy'],
    aliases: ['sports academy'], dashboard_preset_key: null,
  },
  {
    key: 'membership_organization', name: 'Nonprofit membership organizations', icon: '🎟️', category: 'media',
    description: 'Memberships, dues, renewals, member benefits and committee records.',
    default_modules: [...CORE, ...CRM, ...FINANCE, ...ACCOUNTING, ...HR, ...DOCS, ...WORKFLOWS, ...BRANCHES, ...PORTALS],
    terminology_overrides: { contacts: 'Members' },
    search_keywords: ['membership', 'club', 'association', 'society', 'union', 'dues'],
    aliases: ['association'], dashboard_preset_key: null,
  },
];

// ── Dashboard presets (drive the adaptive navigation) ───────────────────────
interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: string;
  module: string;
  section: string;
}

function nav(key: string, label: string, href: string, icon: string, module: string, section: string): NavItem {
  return { key, label, href, icon, module, section };
}

const GENERAL_NAV: NavItem[] = [
  nav('dashboard', 'Dashboard', '/dashboard', 'layout-dashboard', 'dashboard', 'Overview'),
  nav('analytics', 'Analytics', '/analytics', 'bar-chart-3', 'analytics', 'Overview'),
  nav('ai', 'AI Assistant', '/ai', 'sparkles', 'ai', 'Overview'),
  nav('contacts', 'CRM', '/crm/contacts', 'users-2', 'crm', 'Sales & CRM'),
  nav('sales', 'Sales & Orders', '/sales', 'shopping-cart', 'sales', 'Sales & CRM'),
  nav('finance', 'Finance', '/finance', 'credit-card', 'finance', 'Sales & CRM'),
  nav('accounting', 'Accounting', '/accounting', 'calculator', 'accounting', 'Sales & CRM'),
  nav('erp', 'ERP', '/erp', 'boxes', 'inventory', 'Operations'),
  nav('inventory', 'Inventory', '/inventory', 'package', 'inventory', 'Operations'),
  nav('projects', 'Projects', '/projects', 'kanban', 'projects', 'Operations'),
  nav('bookings', 'Bookings', '/bookings', 'calendar', 'booking', 'Operations'),
  nav('hr', 'Human Resources', '/hr', 'briefcase', 'hr', 'Operations'),
  nav('documents', 'Documents', '/documents', 'file-text', 'documents', 'Operations'),
  nav('communication', 'Messages', '/communication', 'message-square', 'communication', 'Operations'),
  nav('automation', 'Automation', '/automation', 'zap', 'workflows', 'Platform'),
  nav('app_builder', 'App Builder', '/app-builder', 'layout', 'portals', 'Platform'),
  nav('marketplace', 'Marketplace', '/marketplace', 'store', 'marketplace', 'Platform'),
  nav('integrations', 'Integrations', '/integrations', 'link', 'integrations', 'Platform'),
  nav('website', 'Website', '/website', 'globe', 'website', 'Platform'),
  nav('branches', 'Branches', '/branches', 'building-2', 'branches', 'Organization'),
  nav('roles', 'Roles', '/roles', 'shield', 'roles', 'Organization'),
  nav('settings', 'Settings', '/settings', 'settings', 'dashboard', 'Organization'),
];

const DASHBOARD_PRESETS: Array<{
  key: string;
  name: string;
  description: string;
  industry_key: string | null;
  navigation: NavItem[];
  layout: { widgets: string[] };
  is_default: boolean;
  sort_order: number;
}> = [
  {
    key: 'general', name: 'General business', description: 'The default workspace: sales, operations and organisation.',
    industry_key: null, navigation: GENERAL_NAV, layout: { widgets: ['revenue', 'profit', 'orders', 'customers', 'inventory', 'staff', 'tasks', 'alerts'] },
    is_default: true, sort_order: 10,
  },
  {
    key: 'hotel', name: 'Hotel operations', description: 'Occupancy, reservations, housekeeping and room revenue.',
    industry_key: 'hotel',
    navigation: GENERAL_NAV.filter((i) => !['erp'].includes(i.key)),
    layout: { widgets: ['occupancy', 'room_availability', 'reservations', 'arrivals', 'departures', 'revenue', 'housekeeping', 'staff'] },
    is_default: false, sort_order: 20,
  },
  {
    key: 'school', name: 'School administration', description: 'Enrolment, attendance, classes, fees and academic results.',
    industry_key: 'school',
    navigation: GENERAL_NAV.filter((i) => !['erp', 'inventory'].includes(i.key)),
    layout: { widgets: ['enrolment', 'attendance', 'classes', 'fees', 'results', 'teachers', 'timetable', 'tasks'] },
    is_default: false, sort_order: 30,
  },
  {
    key: 'university', name: 'University administration', description: 'Faculties, course registration, examinations and fees.',
    industry_key: 'university',
    navigation: GENERAL_NAV.filter((i) => !['erp', 'inventory'].includes(i.key)),
    layout: { widgets: ['enrolment', 'courses', 'lecturers', 'examinations', 'fees', 'departments', 'research', 'tasks'] },
    is_default: false, sort_order: 40,
  },
  {
    key: 'hospital', name: 'Hospital operations', description: 'Patient registration, appointments, practitioners and billing.',
    industry_key: 'hospital',
    navigation: GENERAL_NAV.filter((i) => !['erp'].includes(i.key)),
    layout: { widgets: ['patients', 'appointments', 'practitioners', 'pharmacy', 'laboratory', 'billing', 'staff', 'equipment'] },
    is_default: false, sort_order: 50,
  },
  {
    key: 'beauty_salon', name: 'Salon operations', description: 'Appointments, walk-ins, stylists, retail sales and commissions.',
    industry_key: 'beauty_salon',
    navigation: GENERAL_NAV.filter((i) => !['projects', 'accounting'].includes(i.key)),
    layout: { widgets: ['appointments', 'walk_ins', 'services', 'stylists', 'inventory', 'sales', 'expenses', 'daily_performance'] },
    is_default: false, sort_order: 60,
  },
  {
    key: 'professional_services', name: 'Freelance & consultancy', description: 'Pipeline, billable time, project profitability and invoices.',
    industry_key: 'professional_services',
    navigation: GENERAL_NAV.filter((i) => !['erp', 'inventory', 'booking'].includes(i.key)),
    layout: { widgets: ['leads', 'active_projects', 'billable_hours', 'proposals', 'invoices', 'expenses', 'deliverables', 'profitability'] },
    is_default: false, sort_order: 70,
  },
  {
    key: 'airport', name: 'Airport operations', description: 'Facilities, service requests, staffing, maintenance and incidents.',
    industry_key: 'airport',
    navigation: GENERAL_NAV.filter((i) => !['erp', 'sales', 'crm'].includes(i.key)),
    layout: { widgets: ['facilities', 'service_requests', 'staff_schedule', 'maintenance', 'resource_allocation', 'incidents', 'risks', 'compliance'] },
    is_default: false, sort_order: 80,
  },
];

export async function seed(knex: Knex): Promise<void> {
  // ── Module registry ───────────────────────────────────────────────────────
  // Upserted (not replaced) so a module that a Super Admin customised keeps
  // its configuration when the seed is re-run.
  await knex('module_registry')
    .insert(MODULES.map((m) => ({
      key: m.key, name: m.name, category: m.category, icon: m.icon,
      is_core: m.is_core, depends_on: m.depends_on, status: m.status,
      route: m.route, summary: m.summary, sort_order: m.sort_order, is_active: true,
    })))
    .onConflict('key')
    .merge(['name', 'category', 'icon', 'status', 'route', 'summary', 'sort_order']);

  // ── Industry categories ───────────────────────────────────────────────────
  await knex('industry_categories')
    .insert(CATEGORIES)
    .onConflict('key')
    .merge(['name', 'description', 'icon', 'sort_order']);

  // ── Industry presets ──────────────────────────────────────────────────────
  await knex('industry_presets')
    .insert(PRESETS.map((p) => ({
      key: p.key, name: p.name, icon: p.icon, description: p.description,
      category: p.category, default_modules: p.default_modules,
      terminology_overrides: JSON.stringify(p.terminology_overrides),
      search_keywords: p.search_keywords, aliases: p.aliases,
      dashboard_preset_key: p.dashboard_preset_key,
      is_custom: false, is_active: true, sort_order: PRESETS.indexOf(p) + 1,
    })))
    .onConflict('key')
    .merge([
      'name', 'icon', 'description', 'category', 'default_modules',
      'terminology_overrides', 'search_keywords', 'aliases', 'dashboard_preset_key', 'is_active',
    ]);

  // ── Dashboard presets ─────────────────────────────────────────────────────
  await knex('dashboard_presets')
    .insert(DASHBOARD_PRESETS.map((d) => ({
      key: d.key, name: d.name, description: d.description, industry_key: d.industry_key,
      navigation: JSON.stringify(d.navigation), layout: JSON.stringify(d.layout),
      is_default: d.is_default, is_active: true, sort_order: d.sort_order,
    })))
    .onConflict('key')
    .merge(['name', 'description', 'industry_key', 'navigation', 'layout', 'is_default', 'is_active', 'sort_order']);

  console.log(
    `\n✅ Business catalogue seed complete — ${CATEGORIES.length} categories, ` +
    `${PRESETS.length} industry presets, ${MODULES.length} modules, ${DASHBOARD_PRESETS.length} dashboard presets.\n`,
  );
}
