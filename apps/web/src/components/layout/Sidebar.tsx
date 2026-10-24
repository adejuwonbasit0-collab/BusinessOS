'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { useBranding } from '@/components/providers/TenantBrandingProvider';
import {
  type LucideIcon,
  LayoutDashboard, Users2, CreditCard, BarChart3, Settings, LogOut, PanelLeft,
  Building2, Shield, Package, ShoppingCart, Briefcase, Kanban, Calendar,
  FileText, Calculator, MessageSquare, Sparkles, Zap, Layout, Globe,
  Link as LinkIcon, Store, Palette, Code2, Boxes, Truck,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  module: string;
}

/**
 * The full navigation of the product, with the module each entry belongs to.
 *
 * The API sends the tenant's own navigation — the same list filtered down to
 * the modules the workspace actually has. This list is the fallback for the
 * moment before that request returns, and it is filtered the same way.
 */
const NAV_SECTIONS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',   href: '/dashboard',     icon: LayoutDashboard, module: 'dashboard' },
      { label: 'Analytics',   href: '/analytics',     icon: BarChart3,       module: 'analytics' },
      { label: 'AI Assistant',href: '/ai',            icon: Sparkles,        module: 'ai' },
      { label: 'Billing',     href: '/billing',       icon: CreditCard,      module: 'dashboard' },
    ],
  },
  {
    label: 'Sales & CRM',
    items: [
      { label: 'CRM',         href: '/crm/contacts',  icon: Users2,         module: 'crm' },
      { label: 'Sales & POS', href: '/sales',         icon: ShoppingCart,   module: 'sales' },
      { label: 'Finance',     href: '/finance',       icon: CreditCard,     module: 'finance' },
      { label: 'Accounting',  href: '/accounting',    icon: Calculator,     module: 'accounting' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'ERP',        href: '/erp',           icon: Boxes,          module: 'erp' },
      { label: 'Inventory',  href: '/inventory',      icon: Package,        module: 'inventory' },
      { label: 'Purchases',  href: '/inventory',      icon: Truck,          module: 'inventory' },
      { label: 'HR',         href: '/hr',             icon: Briefcase,      module: 'hr' },
      { label: 'Projects',   href: '/projects',       icon: Kanban,         module: 'projects' },
      { label: 'Bookings',   href: '/bookings',       icon: Calendar,       module: 'booking' },
      { label: 'Documents',  href: '/documents',      icon: FileText,       module: 'documents' },
      { label: 'Messages',   href: '/communication',  icon: MessageSquare,  module: 'communication' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Automation',   href: '/automation',     icon: Zap,           module: 'workflows' },
      { label: 'App Builder',  href: '/app-builder',    icon: Layout,        module: 'portals' },
      { label: 'Marketplace',  href: '/marketplace',    icon: Store,         module: 'marketplace' },
      { label: 'Integrations', href: '/integrations',   icon: LinkIcon,      module: 'integrations' },
      { label: 'White Label',  href: '/white-label',    icon: Palette,       module: 'white_label' },
      { label: 'Website',      href: '/website',        icon: Globe,         module: 'website' },
      { label: 'CMS',          href: '/cms',            icon: Globe,         module: 'cms' },
      { label: 'Dev Toolkit',  href: '/dev-toolkit',    icon: Code2,         module: 'dev_toolkit' },
    ],
  },
  {
    label: 'Organization',
    items: [
      { label: 'Branches',    href: '/branches',       icon: Building2,     module: 'branches' },
      { label: 'Roles',       href: '/roles',          icon: Shield,        module: 'roles' },
      { label: 'Settings',    href: '/settings',       icon: Settings,      module: 'dashboard' },
    ],
  },
];

/** The icon names the API sends, mapped onto the icon set. */
const REMOTE_ICONS: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  'bar-chart-3': BarChart3,
  sparkles: Sparkles,
  'users-2': Users2,
  'shopping-cart': ShoppingCart,
  'credit-card': CreditCard,
  calculator: Calculator,
  boxes: Boxes,
  package: Package,
  kanban: Kanban,
  calendar: Calendar,
  briefcase: Briefcase,
  'file-text': FileText,
  'message-square': MessageSquare,
  zap: Zap,
  layout: Layout,
  store: Store,
  link: LinkIcon,
  globe: Globe,
  'building-2': Building2,
  shield: Shield,
  settings: Settings,
};

// These are platform fundamentals. Every owner needs a way to manage people,
// money, records, integrations and workspace settings regardless of niche.
const UNIVERSAL_WORKSPACE_NAV = [
  { key: 'billing', label: 'Billing', href: '/billing', icon: 'credit-card', module: 'dashboard', section: 'Overview' },
  { key: 'crm', label: 'CRM', href: '/crm/contacts', icon: 'users-2', module: 'crm', section: 'Sales & CRM' },
  { key: 'sales', label: 'Sales & POS', href: '/sales', icon: 'shopping-cart', module: 'sales', section: 'Sales & CRM' },
  { key: 'finance', label: 'Finance & Invoices', href: '/finance', icon: 'credit-card', module: 'finance', section: 'Sales & CRM' },
  { key: 'accounting', label: 'Accounting', href: '/accounting', icon: 'calculator', module: 'accounting', section: 'Sales & CRM' },
  { key: 'inventory', label: 'Inventory & Purchases', href: '/inventory', icon: 'package', module: 'inventory', section: 'Operations' },
  { key: 'bookings', label: 'Bookings', href: '/bookings', icon: 'calendar', module: 'booking', section: 'Operations' },
  { key: 'roles', label: 'Users & Roles', href: '/roles', icon: 'shield', module: 'dashboard', section: 'Organization' },
  { key: 'integrations', label: 'Integrations', href: '/integrations', icon: 'link', module: 'integrations', section: 'Platform' },
  { key: 'settings', label: 'Settings & Branding', href: '/settings', icon: 'settings', module: 'dashboard', section: 'Organization' },
  { key: 'themes', label: 'Themes & Styles', href: '/themes', icon: 'palette', module: 'dashboard', section: 'Organization' },
  { key: 'invoice-templates', label: 'Invoice Templates', href: '/invoice-templates', icon: 'file-text', module: 'finance', section: 'Sales & CRM' },
  { key: 'website-templates', label: 'Website & Templates', href: '/website', icon: 'globe', module: 'website', section: 'Platform' },
];

// A workspace is not merely recoloured for its industry. These are the daily
// operating entry-points for that industry, while the universal business tools
// remain available below. They intentionally point at working records modules
// rather than empty showcase pages.
const NICHE_WORKSPACE_NAV: Record<string, Array<{ key: string; label: string; href: string; icon: string; module: string; section: string }>> = {
  school: [
    { key: 'students', label: 'Students & Guardians', href: '/crm/contacts', icon: 'users-2', module: 'crm', section: 'School operations' },
    { key: 'learning', label: 'Learning & Classes', href: '/app-builder', icon: 'layout', module: 'portals', section: 'School operations' },
    { key: 'assessments', label: 'Exams & Results', href: '/documents', icon: 'file-text', module: 'documents', section: 'School operations' },
    { key: 'school-fees', label: 'Fees & Invoices', href: '/finance', icon: 'credit-card', module: 'finance', section: 'School operations' },
  ],
  education: [
    { key: 'students', label: 'Students & Guardians', href: '/crm/contacts', icon: 'users-2', module: 'crm', section: 'School operations' },
    { key: 'learning', label: 'Learning & Classes', href: '/app-builder', icon: 'layout', module: 'portals', section: 'School operations' },
    { key: 'assessments', label: 'Exams & Results', href: '/documents', icon: 'file-text', module: 'documents', section: 'School operations' },
    { key: 'school-fees', label: 'Fees & Invoices', href: '/finance', icon: 'credit-card', module: 'finance', section: 'School operations' },
  ],
  hospital: [
    { key: 'patients', label: 'Patients & Care Cards', href: '/crm/contacts', icon: 'users-2', module: 'crm', section: 'Clinical operations' },
    { key: 'consultations', label: 'Consultations & Bookings', href: '/bookings', icon: 'calendar', module: 'booking', section: 'Clinical operations' },
    { key: 'clinical-records', label: 'Clinical Records & Scans', href: '/documents', icon: 'file-text', module: 'documents', section: 'Clinical operations' },
    { key: 'pharmacy', label: 'Pharmacy & Supplies', href: '/inventory', icon: 'package', module: 'inventory', section: 'Clinical operations' },
  ],
  healthcare: [
    { key: 'patients', label: 'Patients & Care Cards', href: '/crm/contacts', icon: 'users-2', module: 'crm', section: 'Clinical operations' },
    { key: 'consultations', label: 'Consultations & Bookings', href: '/bookings', icon: 'calendar', module: 'booking', section: 'Clinical operations' },
    { key: 'clinical-records', label: 'Clinical Records & Scans', href: '/documents', icon: 'file-text', module: 'documents', section: 'Clinical operations' },
    { key: 'pharmacy', label: 'Pharmacy & Supplies', href: '/inventory', icon: 'package', module: 'inventory', section: 'Clinical operations' },
  ],
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, tenant, logout } = useAuthStore();
  const { collapsed, toggleCollapse } = useSidebarStore();
  const { branding, navigation } = useBranding();

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  // The tenant's own navigation wins — it is already filtered down to the
  // modules this workspace has. Until it arrives, the static list is filtered
  // by the same rule so the sidebar never shows a screen that does not exist.
  // A workspace with no recorded modules (the platform tenant, or a tenant
  // created before onboarding) keeps the full menu: hiding everything would
  // make the dashboard unusable.
  const enabled = tenant?.enabledModules ?? [];
  const filterByModules = enabled.length > 0;
  // Subscription management is a core account function, not an optional
  // industry module. Older dashboard presets did not include it, which made
  // the working Billing page unreachable for some businesses.
  const industry = String((tenant as any)?.industry || '').toLowerCase();
  const nicheNavigation = NICHE_WORKSPACE_NAV[industry] || [];
  const remoteNavigation = [
    ...nicheNavigation,
    ...navigation,
    ...UNIVERSAL_WORKSPACE_NAV.filter((core) => !navigation.some((item) => item.href === core.href)),
  ];
  const sections = navigation.length > 0
    ? groupRemoteNavigation(remoteNavigation)
    : NAV_SECTIONS
        .map((section) => ({
          label: section.label,
          items: section.items.filter(
            (item) => !filterByModules || item.module === 'dashboard' || enabled.includes(item.module),
          ),
        }))
        .filter((section) => section.items.length > 0);

  const businessName = branding?.businessName || tenant?.name || 'NexOS';

  return (
    <aside className={cn(
      'flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0 relative',
      collapsed ? 'w-14' : 'w-[220px]'
    )}>
      {/* Identity */}
      <div className={cn(
        'flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border shrink-0',
        collapsed && 'justify-center px-0'
      )}>
        {branding?.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt={businessName}
            className="h-8 w-8 shrink-0 rounded-lg object-contain"
          />
        ) : (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
            {businessName.charAt(0).toUpperCase() || 'N'}
          </div>
        )}
        {!collapsed && (
          <span className="truncate text-[15px] font-bold tracking-tight" title={businessName}>
            {businessName}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {sections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                      active
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                      collapsed && 'justify-center px-0'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User area */}
      <div className="border-t border-sidebar-border p-2 space-y-1 shrink-0">
        <button
          onClick={() => logout()}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs',
            'text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && 'Sign out'}
        </button>

        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-semibold shrink-0">
              {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{user.firstName} {user.lastName}</p>
              <p className="text-[10px] text-sidebar-foreground/50 capitalize truncate">{user.role}</p>
            </div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center hover:bg-sidebar-accent z-10 transition-colors"
      >
        <PanelLeft className={cn('h-3 w-3 text-sidebar-foreground/60 transition-transform', collapsed && 'rotate-180')} />
      </button>
    </aside>
  );
}

/** Groups the flat navigation the API sends into sections, in the order given. */
function groupRemoteNavigation(navigation: Array<{ key: string; label: string; href: string; icon: string; section: string }>) {
  const sections: Array<{ label: string; items: Array<{ label: string; href: string; icon: LucideIcon; key: string }> }> = [];

  navigation.forEach((item) => {
    const sectionLabel = item.section || 'Overview';
    let section = sections.find((s) => s.label === sectionLabel);
    if (!section) {
      section = { label: sectionLabel, items: [] };
      sections.push(section);
    }
    section.items.push({
      label: item.label,
      href: item.href,
      key: item.key,
      icon: REMOTE_ICONS[item.icon] ?? LayoutDashboard,
    });
  });

  return sections;
}
