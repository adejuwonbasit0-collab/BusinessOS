import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex('industry_presets').del();
  await knex('module_registry').del();

  // ── Module registry: every micro-module in the platform ──────────────────
  const modules = [
    { key: 'dashboard', name: 'Executive Dashboard', category: 'core', icon: 'layout-dashboard', is_core: true, depends_on: [] },
    { key: 'analytics', name: 'Advanced Analytics', category: 'core', icon: 'bar-chart-3', is_core: true, depends_on: [] },
    { key: 'crm', name: 'CRM', category: 'sales', icon: 'users-2', is_core: false, depends_on: [] },
    { key: 'sales', name: 'Sales & POS', category: 'sales', icon: 'shopping-cart', is_core: false, depends_on: ['finance', 'inventory'] },
    { key: 'finance', name: 'Finance & Accounting', category: 'operations', icon: 'credit-card', is_core: false, depends_on: [] },
    { key: 'inventory', name: 'Inventory', category: 'operations', icon: 'package', is_core: false, depends_on: [] },
    { key: 'hr', name: 'Human Resources', category: 'people', icon: 'briefcase', is_core: false, depends_on: [] },
    { key: 'projects', name: 'Project Management', category: 'operations', icon: 'kanban', is_core: false, depends_on: [] },
    { key: 'booking', name: 'Booking & Reservations', category: 'industry-specific', icon: 'calendar', is_core: false, depends_on: [] },
    { key: 'documents', name: 'Document Management', category: 'operations', icon: 'file-text', is_core: false, depends_on: [] },
    { key: 'communication', name: 'Communication Center', category: 'core', icon: 'message-square', is_core: true, depends_on: [] },
    { key: 'workflows', name: 'Workflow Automation', category: 'core', icon: 'zap', is_core: false, depends_on: [] },
    { key: 'roles', name: 'Role Management', category: 'core', icon: 'shield', is_core: true, depends_on: [] },
    { key: 'branches', name: 'Multi-Branch Management', category: 'core', icon: 'building-2', is_core: false, depends_on: [] },
    { key: 'website', name: 'Website Builder', category: 'sales', icon: 'globe', is_core: false, depends_on: [] },
    { key: 'ai', name: 'AI Assistant', category: 'core', icon: 'sparkles', is_core: false, depends_on: [] },
  ];
  await knex('module_registry').insert(modules);

  // ── Industry presets ───────────────────────────────────────────────────────
  const presets = [
    {
      key: 'hotel', name: 'Hotels & Hospitality', icon: '🏨',
      description: 'Room bookings, guest management, housekeeping, and front-desk operations.',
      default_modules: ['dashboard', 'analytics', 'crm', 'booking', 'finance', 'hr', 'documents', 'communication', 'workflows', 'roles', 'branches', 'ai'],
      terminology_overrides: JSON.stringify({ contacts: 'Guests', deals: 'Reservations', bookings: 'Room Bookings', branches: 'Properties' }),
    },
    {
      key: 'school', name: 'Schools & Education', icon: '🎓',
      description: 'Student records, enrollment, attendance, staff, and academic scheduling.',
      default_modules: ['dashboard', 'analytics', 'crm', 'hr', 'booking', 'finance', 'documents', 'communication', 'workflows', 'roles', 'branches'],
      terminology_overrides: JSON.stringify({ contacts: 'Students', deals: 'Enrollments', bookings: 'Classes' }),
    },
    {
      key: 'hospital', name: 'Hospitals & Healthcare', icon: '🏥',
      description: 'Patient management, appointments, staff scheduling, and billing.',
      default_modules: ['dashboard', 'analytics', 'crm', 'booking', 'hr', 'finance', 'inventory', 'documents', 'communication', 'workflows', 'roles', 'branches'],
      terminology_overrides: JSON.stringify({ contacts: 'Patients', deals: 'Cases', bookings: 'Appointments' }),
    },
    {
      key: 'restaurant', name: 'Restaurants & Food Service', icon: '🍽️',
      description: 'Table reservations, POS, inventory, staff shifts, and supplier management.',
      default_modules: ['dashboard', 'analytics', 'crm', 'sales', 'booking', 'inventory', 'finance', 'hr', 'communication', 'workflows', 'roles', 'branches'],
      terminology_overrides: JSON.stringify({ contacts: 'Customers', bookings: 'Table Reservations' }),
    },
    {
      key: 'retail', name: 'Retail', icon: '🛍️',
      description: 'Point of sale, inventory, suppliers, and customer loyalty.',
      default_modules: ['dashboard', 'analytics', 'crm', 'sales', 'inventory', 'finance', 'hr', 'communication', 'workflows', 'roles', 'branches', 'website'],
      terminology_overrides: JSON.stringify({}),
    },
    {
      key: 'manufacturing', name: 'Manufacturing', icon: '🏭',
      description: 'Production tracking, raw materials, suppliers, and warehouse logistics.',
      default_modules: ['dashboard', 'analytics', 'inventory', 'finance', 'hr', 'projects', 'documents', 'communication', 'workflows', 'roles', 'branches'],
      terminology_overrides: JSON.stringify({ products: 'SKUs', warehouses: 'Plants' }),
    },
    {
      key: 'logistics', name: 'Logistics & Transportation', icon: '🚚',
      description: 'Fleet, shipments, warehousing, and route scheduling.',
      default_modules: ['dashboard', 'analytics', 'inventory', 'booking', 'finance', 'hr', 'documents', 'communication', 'workflows', 'roles', 'branches'],
      terminology_overrides: JSON.stringify({ bookable_resources: 'Vehicles', bookings: 'Shipments' }),
    },
    {
      key: 'real_estate', name: 'Real Estate', icon: '🏢',
      description: 'Property listings, leads, contracts, and viewings.',
      default_modules: ['dashboard', 'analytics', 'crm', 'booking', 'documents', 'finance', 'communication', 'workflows', 'roles', 'branches', 'website'],
      terminology_overrides: JSON.stringify({ contacts: 'Clients', deals: 'Listings', bookings: 'Viewings' }),
    },
    {
      key: 'ngo', name: 'NGOs & Non-Profits', icon: '🤝',
      description: 'Donor management, programs, grants, and volunteer coordination.',
      default_modules: ['dashboard', 'analytics', 'crm', 'finance', 'hr', 'projects', 'documents', 'communication', 'workflows', 'roles', 'branches'],
      terminology_overrides: JSON.stringify({ contacts: 'Donors / Volunteers', deals: 'Grants', projects: 'Programs' }),
    },
    {
      key: 'government', name: 'Government Agencies', icon: '🏛️',
      description: 'Case management, public records, approvals, and inter-department workflows.',
      default_modules: ['dashboard', 'analytics', 'crm', 'documents', 'hr', 'projects', 'communication', 'workflows', 'roles', 'branches'],
      terminology_overrides: JSON.stringify({ contacts: 'Citizens / Cases', deals: 'Applications' }),
    },
    {
      key: 'construction', name: 'Construction', icon: '🏗️',
      description: 'Project sites, crews, equipment, and procurement.',
      default_modules: ['dashboard', 'analytics', 'projects', 'inventory', 'hr', 'finance', 'documents', 'communication', 'workflows', 'roles', 'branches'],
      terminology_overrides: JSON.stringify({ projects: 'Job Sites', branches: 'Sites' }),
    },
    {
      key: 'agriculture', name: 'Agriculture', icon: '🌾',
      description: 'Crop/livestock tracking, suppliers, equipment, and seasonal labor.',
      default_modules: ['dashboard', 'analytics', 'inventory', 'finance', 'hr', 'projects', 'communication', 'workflows', 'roles', 'branches'],
      terminology_overrides: JSON.stringify({ products: 'Crops / Livestock', warehouses: 'Storage Units' }),
    },
    {
      key: 'professional_services', name: 'Professional Services', icon: '💼',
      description: 'Client engagements, billable time, invoicing, and project delivery.',
      default_modules: ['dashboard', 'analytics', 'crm', 'projects', 'finance', 'documents', 'communication', 'workflows', 'roles', 'branches', 'ai'],
      terminology_overrides: JSON.stringify({ deals: 'Engagements', projects: 'Client Projects' }),
    },
  ];

  await knex('industry_presets').insert(presets);

  console.log('\n✅ Industry adaptation seed complete — 13 industry presets + 16 modules registered.\n');
}
