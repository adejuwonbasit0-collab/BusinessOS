import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '@/lib/api';

export interface User {
  id: string; tenantId: string; email: string; firstName: string; lastName: string;
  displayName: string; avatarUrl: string | null;
  role: 'super_admin' | 'owner' | 'admin' | 'manager' | 'staff' | 'customer' | 'vendor';
  isEmailVerified: boolean; twoFactorEnabled: boolean; timezone: string; locale: string;
  preferences: Record<string, any>; createdAt: string;
}

export interface Tenant {
  id: string; name: string; slug: string; subdomain: string; customDomain: string | null;
  status: 'trial' | 'active' | 'suspended' | 'cancelled' | 'past_due';
  planName: string; planSlug: string; primaryColor: string; secondaryColor: string;
  logoUrl: string | null; timezone: string; currency: string; locale: string;
  trialEndsAt: string | null; subscriptionStatus: string; usersCount: number; storageUsedBytes: number;
  industry: string | null; enabledModules: string[];
  /** True once the workspace has been through the onboarding wizard. */
  onboardingCompleted: boolean;
  /** The wizard step the workspace was last saved at, so it can be resumed. */
  onboardingStep: string;
  dashboardPresetKey?: string;
  settings?: Record<string, any>;
  phone?: string;
  featureAi: boolean; featureCustomDomain: boolean; featureWhiteLabel: boolean; featureSso: boolean;
  featureAuditLogs: boolean; featureApiAccess: boolean; featureAdvancedAnalytics: boolean;
  maxUsers: number; maxStorageGb: number; maxWorkflows: number; maxBranches: number;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ requiresTwoFactor?: boolean; tempToken?: string }>;
  register: (data: RegisterData) => Promise<Tenant>;
  logout: () => Promise<void>;
  verify2FA: (tempToken: string, code: string) => Promise<void>;
  impersonate: (token: string) => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  updateTenant: (data: Partial<Tenant>) => void;
  initialize: () => Promise<void>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  businessName: string;
  username: string;
  plan?: string;
  industry?: string;
  customIndustry?: string;
  phone?: string;
}

/**
 * Shared in-flight `/auth/me` request.
 *
 * `initialize()` is called from several places (the root `AuthProvider`, the
 * dashboard layout and the home page). Without this, every mount fired its
 * own request for the same data.
 */
let initializeInFlight: Promise<void> | null = null;

/** Shared in-flight impersonation hand-off. */
let impersonateInFlight: Promise<void> | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null, tenant: null, accessToken: null,
      isAuthenticated: false, isLoading: false, isInitialized: false,

      initialize: async () => {
        // Already known, or a request for it is already running.
        if (get().isInitialized) return;
        if (initializeInFlight) return initializeInFlight;
        // An impersonation hand-off establishes the session itself.
        if (impersonateInFlight) return impersonateInFlight;

        // The admin console hands over an impersonation token in the query
        // string. It has to be handled *before* the regular `/auth/me` check:
        // that check runs without a session, comes back 401 and the client
        // hard-redirects to the login page, throwing the token away.
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const token = params.get('impersonation_token');
          if (token) {
            params.delete('impersonation_token');
            const query = params.toString();
            window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
            impersonateInFlight = get()
              .impersonate(token)
              .finally(() => { impersonateInFlight = null; });
            return impersonateInFlight;
          }
        }

        set({ isLoading: true });
        initializeInFlight = (async () => {
          try {
            const { data } = await api.get('/auth/me');
            set({ user: data.user, tenant: data.tenant, isAuthenticated: true, isInitialized: true, isLoading: false });
          } catch {
            set({ user: null, tenant: null, accessToken: null, isAuthenticated: false, isInitialized: true, isLoading: false });
          } finally {
            initializeInFlight = null;
          }
        })();
        return initializeInFlight;
      },

      login: async (email, password, rememberMe = false) => {
        set({ isLoading: true });
        try {
          const workspaceHost = typeof window === 'undefined' ? undefined : window.location.hostname;
          const { data } = await api.post('/auth/login', { email, password, rememberMe, workspaceHost });
          if (data.requiresTwoFactor) { set({ isLoading: false }); return { requiresTwoFactor: true, tempToken: data.tempToken }; }
          set({ user: data.user, tenant: data.tenant, accessToken: data.tokens.accessToken, isAuthenticated: true, isLoading: false });
          return {};
        } catch (err) { set({ isLoading: false }); throw err; }
      },

      register: async (formData) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', {
            firstName: formData.firstName, lastName: formData.lastName, email: formData.email,
            password: formData.password, businessName: formData.businessName, plan: formData.plan || 'starter',
            username: formData.username, industry: formData.industry, customIndustry: formData.customIndustry, phone: formData.phone,
          });
          set({ user: data.user, tenant: data.tenant, accessToken: data.tokens.accessToken, isAuthenticated: true, isLoading: false });
          return data.tenant as Tenant;
        } catch (err) { set({ isLoading: false }); throw err; }
      },

      logout: async () => {
        try { await api.post('/auth/logout'); } finally {
          set({ user: null, tenant: null, accessToken: null, isAuthenticated: false });
          useAuthStore.persist.clearStorage();
          window.location.href = '/login';
        }
      },

      /**
       * Establishes a session from an impersonation token.
       *
       * The admin console mints a short-lived JWT for the owner of the
       * workspace being inspected and hands it over as
       * `?impersonation_token=…`. `/auth/me` validates it and returns the
       * workspace it belongs to, so no password is involved.
       */
      impersonate: async (token: string) => {
        set({ isLoading: true });
        try {
          const { data } = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
          set({
            user: data.user, tenant: data.tenant, accessToken: token,
            isAuthenticated: true, isInitialized: true, isLoading: false,
          });
        } catch (err) { set({ isLoading: false, isInitialized: true }); throw err; }
      },

      verify2FA: async (tempToken, code) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/2fa/verify', { tempToken, code });
          set({ user: data.user, tenant: data.tenant, accessToken: data.tokens.accessToken, isAuthenticated: true, isLoading: false });
        } catch (err) { set({ isLoading: false }); throw err; }
      },

      updateUser: (data) => { const c = get().user; if (c) set({ user: { ...c, ...data } }); },
      updateTenant: (data) => { const c = get().tenant; if (c) set({ tenant: { ...c, ...data } }); },
    }),
    {
      name: 'nexos-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ user: state.user, tenant: state.tenant, accessToken: state.accessToken, isAuthenticated: state.isAuthenticated }),
    }
  )
);
