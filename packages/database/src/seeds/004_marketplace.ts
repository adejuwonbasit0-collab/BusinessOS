import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  await knex('marketplace_listings').del();

  const listings = [
    // ── Templates ────────────────────────────────────────────────────────────
    {
      id: uuidv4(), name: 'Hotel & Hospitality Pack', type: 'template', category: 'Hospitality',
      description: 'Pre-configured workflows, dashboards, and SOPs for hotels and resorts.',
      long_description: 'Complete hotel management setup including guest check-in workflows, housekeeping SOPs, room booking automation, revenue dashboards, and staff scheduling templates.',
      author_name: 'NexOS', author_email: 'marketplace@nexos.app', price: 0, is_free: true,
      version: '1.2.0', install_count: 1284, rating: 4.8, review_count: 86, status: 'approved', is_official: true,
      metadata: JSON.stringify({ modules: ['booking', 'crm', 'hr', 'finance'], industry: 'hotel' }),
    },
    {
      id: uuidv4(), name: 'E-Commerce Starter Pack', type: 'template', category: 'Retail',
      description: 'Complete setup for online stores — inventory, orders, and customer management.',
      long_description: 'Everything a retail business needs to launch: product catalog setup, inventory workflows, order fulfillment automation, customer loyalty workflows, and financial reporting dashboards.',
      author_name: 'NexOS', author_email: 'marketplace@nexos.app', price: 0, is_free: true,
      version: '2.0.0', install_count: 2341, rating: 4.7, review_count: 154, status: 'approved', is_official: true,
      metadata: JSON.stringify({ modules: ['sales', 'inventory', 'crm', 'finance'], industry: 'retail' }),
    },
    {
      id: uuidv4(), name: 'Healthcare Clinic Pack', type: 'template', category: 'Healthcare',
      description: 'Patient management, appointments, staff scheduling, and billing for clinics.',
      long_description: 'Designed for medical practices and clinics: patient intake forms, appointment booking, prescription tracking, doctor scheduling, and insurance billing workflows.',
      author_name: 'NexOS', author_email: 'marketplace@nexos.app', price: 0, is_free: true,
      version: '1.1.0', install_count: 876, rating: 4.9, review_count: 62, status: 'approved', is_official: true,
      metadata: JSON.stringify({ modules: ['booking', 'crm', 'hr', 'documents', 'finance'], industry: 'hospital' }),
    },
    {
      id: uuidv4(), name: 'Restaurant & Food Service Pack', type: 'template', category: 'Food & Beverage',
      description: 'Table reservations, POS workflows, inventory, and supplier management.',
      long_description: 'From table booking to kitchen to billing — complete restaurant automation with reservation management, menu inventory tracking, supplier PO automation, staff scheduling, and daily sales reports.',
      author_name: 'NexOS', author_email: 'marketplace@nexos.app', price: 0, is_free: true,
      version: '1.3.0', install_count: 1102, rating: 4.6, review_count: 78, status: 'approved', is_official: true,
      metadata: JSON.stringify({ modules: ['booking', 'sales', 'inventory', 'hr', 'finance'], industry: 'restaurant' }),
    },
    {
      id: uuidv4(), name: 'Construction Site Manager', type: 'template', category: 'Construction',
      description: 'Job sites, crews, equipment tracking, subcontractors, and safety documentation.',
      long_description: 'Purpose-built for construction companies: site project tracking, crew attendance, equipment inventory, subcontractor management, safety inspection checklists, and client invoicing workflows.',
      author_name: 'BuildTech Solutions', author_email: 'support@buildtech.io', price: 19.99, is_free: false,
      version: '1.0.0', install_count: 412, rating: 4.7, review_count: 34, status: 'approved', is_official: false,
      metadata: JSON.stringify({ modules: ['projects', 'hr', 'inventory', 'finance', 'documents'], industry: 'construction' }),
    },
    {
      id: uuidv4(), name: 'Professional Services Pack', type: 'template', category: 'Services',
      description: 'Client engagements, billable time, proposals, and project delivery for agencies.',
      long_description: 'For consulting firms, agencies, and law practices: client onboarding workflows, time tracking, proposal-to-invoice automation, project milestones, and profitability dashboards.',
      author_name: 'NexOS', author_email: 'marketplace@nexos.app', price: 0, is_free: true,
      version: '1.5.0', install_count: 987, rating: 4.8, review_count: 71, status: 'approved', is_official: true,
      metadata: JSON.stringify({ modules: ['crm', 'projects', 'finance', 'documents', 'ai'], industry: 'professional_services' }),
    },
    {
      id: uuidv4(), name: 'School & Education Pack', type: 'template', category: 'Education',
      description: 'Student records, enrollment, attendance, staff, and fee management.',
      long_description: 'Complete school management: student enrollment workflow, class scheduling, attendance tracking, parent communication, fee billing, and staff payroll automation.',
      author_name: 'NexOS', author_email: 'marketplace@nexos.app', price: 0, is_free: true,
      version: '1.0.0', install_count: 1103, rating: 4.8, review_count: 89, status: 'approved', is_official: true,
      metadata: JSON.stringify({ modules: ['crm', 'booking', 'hr', 'finance', 'communication'], industry: 'school' }),
    },
    // ── Themes ────────────────────────────────────────────────────────────────
    {
      id: uuidv4(), name: 'Dark Mode Pro', type: 'theme', category: 'Themes',
      description: 'Sleek dark theme with customisable accent colors and high-contrast UI.',
      long_description: 'A professionally designed dark theme with deep blacks, carefully chosen contrast ratios, and customisable accent colors. Includes dark variants for all charts and data visualisations.',
      author_name: 'DesignForge', author_email: 'hello@designforge.co', price: 9.99, is_free: false,
      version: '2.1.0', install_count: 645, rating: 4.9, review_count: 48, status: 'approved', is_official: false,
      metadata: JSON.stringify({ primaryColor: '#0a0b0d', accentColor: '#4f8ef7' }),
    },
    {
      id: uuidv4(), name: 'Minimal White', type: 'theme', category: 'Themes',
      description: 'Clean, minimal light theme inspired by Linear and Vercel design systems.',
      long_description: 'A crisp, minimal white theme with subtle shadows and clean typography. Perfect for businesses that want a professional, understated look.',
      author_name: 'StudioNull', author_email: 'hi@studionull.com', price: 7.99, is_free: false,
      version: '1.0.0', install_count: 334, rating: 4.7, review_count: 22, status: 'approved', is_official: false,
      metadata: JSON.stringify({ primaryColor: '#ffffff', accentColor: '#000000' }),
    },
    // ── Plugins ───────────────────────────────────────────────────────────────
    {
      id: uuidv4(), name: 'WhatsApp Auto-Reply Bot', type: 'plugin', category: 'Communication',
      description: 'Auto-reply to WhatsApp messages, qualify leads, and book appointments.',
      long_description: 'Connect your WhatsApp Business account and automatically respond to customer enquiries, collect lead information, answer FAQs, and route bookings directly into your NexOS calendar.',
      author_name: 'ChatFlow Labs', author_email: 'dev@chatflow.io', price: 14.99, is_free: false,
      version: '1.2.0', install_count: 887, rating: 4.4, review_count: 56, status: 'approved', is_official: false,
      metadata: JSON.stringify({ requires: ['communication', 'crm'] }),
    },
    {
      id: uuidv4(), name: 'Advanced Reporting Suite', type: 'plugin', category: 'Analytics',
      description: 'Export pixel-perfect PDF and Excel reports from any NexOS data view.',
      long_description: 'Generate branded PDF reports for invoices, P&L statements, HR reports, and project summaries. Includes scheduled report delivery via email and custom Excel exports with pivot tables.',
      author_name: 'ReportMagic', author_email: 'support@reportmagic.dev', price: 12.99, is_free: false,
      version: '3.0.1', install_count: 1241, rating: 4.6, review_count: 103, status: 'approved', is_official: false,
      metadata: JSON.stringify({ requires: ['analytics', 'finance'] }),
    },
    {
      id: uuidv4(), name: 'QR Code Generator', type: 'plugin', category: 'Utilities',
      description: 'Generate QR codes for products, bookings, invoices, and contact cards.',
      long_description: 'Add QR codes to any NexOS entity — print them on invoices, booking confirmations, product labels, or business cards. Supports vCard, URL, WiFi, and custom payload types.',
      author_name: 'PixelUtils', author_email: 'tools@pixelutils.com', price: 0, is_free: true,
      version: '1.0.0', install_count: 2156, rating: 4.5, review_count: 134, status: 'approved', is_official: false,
      metadata: JSON.stringify({ requires: [] }),
    },
    // ── Integrations ──────────────────────────────────────────────────────────
    {
      id: uuidv4(), name: 'Paystack Checkout', type: 'integration', category: 'Payments',
      description: 'One-click Paystack payment integration with automatic invoice reconciliation.',
      long_description: 'Accept Paystack payments directly from NexOS invoices. Payments automatically update invoice status, log payment records, and trigger your workflow automations.',
      author_name: 'NexOS', author_email: 'marketplace@nexos.app', price: 0, is_free: true,
      version: '1.0.0', install_count: 1876, rating: 4.5, review_count: 112, status: 'approved', is_official: true,
      metadata: JSON.stringify({ provider: 'paystack' }),
    },
    {
      id: uuidv4(), name: 'Flutterwave Gateway', type: 'integration', category: 'Payments',
      description: 'Pan-African payment processing with 150+ currencies and 30+ payment methods.',
      long_description: 'Full Flutterwave integration supporting cards, mobile money, bank transfers, USSD, and QR payments across Africa. Automatic reconciliation with NexOS Finance.',
      author_name: 'NexOS', author_email: 'marketplace@nexos.app', price: 0, is_free: true,
      version: '1.0.0', install_count: 1432, rating: 4.6, review_count: 89, status: 'approved', is_official: true,
      metadata: JSON.stringify({ provider: 'flutterwave' }),
    },
    // ── AI Agents ─────────────────────────────────────────────────────────────
    {
      id: uuidv4(), name: 'AI Lead Scorer', type: 'ai_agent', category: 'Sales',
      description: 'Automatically score and prioritize leads using Claude AI and your CRM data.',
      long_description: 'This AI agent analyses every new contact against your historical conversion data, website behaviour, company size, and engagement signals to assign a 0-100 lead score with reasoning and suggested next actions.',
      author_name: 'NexOS', author_email: 'marketplace@nexos.app', price: 0, is_free: true,
      version: '1.0.0', install_count: 2341, rating: 4.6, review_count: 178, status: 'approved', is_official: true,
      metadata: JSON.stringify({ requires: ['crm', 'ai'] }),
    },
    {
      id: uuidv4(), name: 'AI Invoice Extractor', type: 'ai_agent', category: 'Finance',
      description: 'Upload supplier invoices and AI automatically extracts and logs the data.',
      long_description: 'Drop any supplier invoice PDF into NexOS and this agent uses Claude to extract vendor name, line items, amounts, VAT, and due dates — then creates the expense record and purchase order automatically.',
      author_name: 'NexOS', author_email: 'marketplace@nexos.app', price: 0, is_free: true,
      version: '1.0.0', install_count: 1567, rating: 4.8, review_count: 96, status: 'approved', is_official: true,
      metadata: JSON.stringify({ requires: ['finance', 'inventory', 'ai'] }),
    },
    {
      id: uuidv4(), name: 'AI Customer Support Agent', type: 'ai_agent', category: 'Communication',
      description: 'Answer customer questions 24/7 using your business data and knowledge base.',
      long_description: 'Train this agent on your products, policies, and FAQs. It handles incoming customer messages via the portal, email, or WhatsApp — escalating to a human when needed. Logs all conversations in CRM.',
      author_name: 'NexOS', author_email: 'marketplace@nexos.app', price: 0, is_free: true,
      version: '1.0.0', install_count: 1892, rating: 4.7, review_count: 143, status: 'approved', is_official: true,
      metadata: JSON.stringify({ requires: ['communication', 'crm', 'ai'] }),
    },
  ];

  await knex('marketplace_listings').insert(listings);
  console.log(`✅ Seeded ${listings.length} marketplace listings.`);
}
