export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
}

export function formatCurrency(amount: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

export const ROLES = { SUPER_ADMIN: 'super_admin', OWNER: 'owner', ADMIN: 'admin', MANAGER: 'manager', STAFF: 'staff', CUSTOMER: 'customer', VENDOR: 'vendor' } as const;
export const CONTACT_TYPES = { LEAD: 'lead', PROSPECT: 'prospect', CUSTOMER: 'customer', CHURNED: 'churned', VENDOR: 'vendor' } as const;
export const INVOICE_STATUSES = { DRAFT: 'draft', SENT: 'sent', PAID: 'paid', OVERDUE: 'overdue', CANCELLED: 'cancelled' } as const;
export const PLAN_SLUGS = { STARTER: 'starter', PRO: 'pro', ENTERPRISE: 'enterprise' } as const;

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
];
