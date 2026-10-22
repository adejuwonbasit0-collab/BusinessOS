import { api } from './api';

/**
 * Branding API.
 *
 * The business identity is a first-class part of the workspace: its name,
 * logo, favicon and colours are used by the dashboard, the browser tab, the
 * public site, invoices and generated documents.
 *
 * The methods unwrap the API envelope, so callers work with the payload
 * directly.
 */
export const brandingApi = {
  get: async () => (await api.get('/branding')).data as BrandingResponse,
  update: async (payload: Record<string, any>) =>
    (await api.patch('/branding', payload)).data as { branding: TenantBranding },
  preview: async (payload: Record<string, any>) =>
    (await api.post('/branding/preview', payload)).data as { branding: TenantBranding; preview: string },
  uploadAsset: async (file: File, kind: 'logo' | 'logo_light' | 'logo_dark' | 'favicon') => {
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind);
    return (await api.post('/branding/assets', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data as { branding: TenantBranding; asset: { url: string; kind: string; size: number } };
  },
};

export interface TenantBranding {
  businessName: string;
  legalName: string | null;
  tradingName: string | null;
  description: string | null;
  logoUrl: string | null;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  address: Record<string, any>;
  country: string | null;
  currency: string;
  timezone: string;
  locale: string;
  dateFormat: string;
  numberFormat: string;
  socialLinks: Record<string, string>;
  registrationNumber: string | null;
  websiteTitle: string;
  hidePoweredBy: boolean;
}

export interface NavigationItem {
  key: string;
  label: string;
  href: string;
  icon: string;
  module: string;
  section: string;
}

export interface BrandingResponse {
  branding: TenantBranding;
  navigation: NavigationItem[];
  enabledModules: string[];
  plan: {
    name: string;
    slug: string;
    features: Record<string, boolean>;
    maxUsers: number;
    maxStorageGb: number;
    maxWorkflows: number;
    maxBranches: number;
  };
  entitlements: Record<string, boolean>;
}
