import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { adminAuthApi } from '@/lib/api';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AdminAuthState {
  user: AdminUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitialized: false,
      isLoading: false,

      initialize: async () => {
        try {
          set({ isLoading: true });
          const stored = typeof window !== 'undefined' ? sessionStorage.getItem('nexos-admin-auth') : null;
          let hasToken = false;
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed?.state?.accessToken) hasToken = true;
            } catch {}
          }
          if (!hasToken) {
            set({ user: null, accessToken: null, isAuthenticated: false, isInitialized: true, isLoading: false });
            return;
          }
          const { data } = await adminAuthApi.me();
          if (data?.user?.role !== 'super_admin') {
            throw new Error('Not authorized');
          }
          set({ user: data.user, isAuthenticated: true, isInitialized: true, isLoading: false });
        } catch {
          set({ user: null, accessToken: null, isAuthenticated: false, isInitialized: true, isLoading: false });
        }
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await adminAuthApi.login({ email, password });
          if (data.user.role !== 'super_admin') {
            throw new Error('This account does not have Super Admin access');
          }
          set({
            user: data.user,
            accessToken: data.tokens.accessToken,
            isAuthenticated: true,
            isInitialized: true,
            isLoading: false,
          });
        } catch (err) {
          set({ isLoading: false, isInitialized: true });
          throw err;
        }
      },

      logout: async () => {
        try { await adminAuthApi.logout(); } finally {
          set({ user: null, accessToken: null, isAuthenticated: false });
          useAdminAuthStore.persist.clearStorage();
          window.location.href = '/login';
        }
      },
    }),
    {
      name: 'nexos-admin-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
