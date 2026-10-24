import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_VERSION = '/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}${API_VERSION}`,
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (r?: any) => void }> = [];
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('nexos-auth');
      if (stored) {
        const { state } = JSON.parse(stored);
        // An explicitly supplied Authorization header wins — the
        // impersonation hand-off needs to call `/auth/me` with a token that
        // is not (yet) the one held in the session store.
        if (state?.accessToken && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${state.accessToken}`;
        }
      }
    } catch {}
  }
  config.headers['X-Request-ID'] = crypto.randomUUID();
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // A visitor opening a public tenant website has no session by design.
    // Do not turn its harmless `/auth/me` 401 into a refresh attempt and a
    // forced redirect to the platform login page.
    const hasStoredAccessToken = (() => {
      if (typeof window === 'undefined') return false;
      try { return Boolean(JSON.parse(sessionStorage.getItem('nexos-auth') || '{}')?.state?.accessToken); } catch { return false; }
    })();
    if (error.response?.status === 401 && hasStoredAccessToken && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh') && !originalRequest.url?.includes('/auth/login')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then((token) => { originalRequest.headers.Authorization = `Bearer ${token}`; return api(originalRequest); })
          .catch((err) => Promise.reject(err));
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const response = await axios.post(`${API_URL}${API_VERSION}/auth/refresh`, {}, { withCredentials: true });
        const newToken = (response.data as any).data?.tokens?.accessToken;
        if (newToken) {
          try {
            const stored = sessionStorage.getItem('nexos-auth');
            if (stored) { const parsed = JSON.parse(stored); parsed.state.accessToken = newToken; sessionStorage.setItem('nexos-auth', JSON.stringify(parsed)); }
          } catch {}
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          return api(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('nexos-auth');
          // Never bounce to the login page when we are already on it. The
          // redirect used to build `/login?redirect=/login` from the current
          // path and reload it, so an expired session on the login page
          // turned into an endless reload loop: load -> 401 -> redirect ->
          // load -> 401 -> ... Every reload also fired another `/auth/me` and
          // `/auth/refresh` pair, which is what flooded the API and tripped
          // the rate limiter.
          const path = window.location.pathname;
          if (path !== '/login' && path !== '/register') {
            window.location.href = `/login?redirect=${encodeURIComponent(path)}`;
          }
        }
        return Promise.reject(refreshError);
      } finally { isRefreshing = false; }
    }

    const errorData = (error.response?.data as any)?.error;
    return Promise.reject({
      message: errorData?.message || error.message || 'Something went wrong',
      code: errorData?.code || 'UNKNOWN_ERROR',
      status: error.response?.status || 0,
      details: errorData?.details,
    });
  }
);

// ── Typed API methods ──────────────────────────────────────────────────────────
export const authApi = {
  login: (data: { email: string; password: string; rememberMe?: boolean }) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; password: string }) => api.post('/auth/reset-password', data),
  sendMagicLink: (email: string) => api.post('/auth/magic-link', { email }),
  verify2FA: (data: { tempToken: string; code: string }) => api.post('/auth/2fa/verify', data),
  setup2FA: () => api.post('/auth/2fa/setup'),
  verifySetup2FA: (token: string) => api.post('/auth/2fa/verify-setup', { token }),
  getSessions: () => api.get('/auth/sessions'),
  revokeSession: (sessionId: string) => api.delete(`/auth/sessions/${sessionId}`),
};

export const contactsApi = {
  list: (params?: any) => api.get('/contacts', { params }),
  get: (id: string) => api.get(`/contacts/${id}`),
  create: (data: any) => api.post('/contacts', data),
  update: (id: string, data: any) => api.patch(`/contacts/${id}`, data),
  delete: (id: string) => api.delete(`/contacts/${id}`),
  stats: () => api.get('/contacts/stats'),
};

export const invoicesApi = {
  list: (params?: any) => api.get('/invoices', { params }),
  get: (id: string) => api.get(`/invoices/${id}`),
  downloadPdf: (id: string) => `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')}/api/v1/invoices/${id}/pdf`,
  create: (data: any) => api.post('/invoices', data),
  send: (id: string) => api.post(`/invoices/${id}/send`),
  markPaid: (id: string, data?: any) => api.post(`/invoices/${id}/mark-paid`, data),
  stats: (params?: any) => api.get('/invoices/stats/summary', { params }),
};

export const analyticsApi = {
  dashboard: (params?: any) => api.get('/analytics/dashboard', { params }),
  revenue: (params?: any) => api.get('/analytics/revenue', { params }),
};

export const billingApi = {
  plans: () => api.get('/billing/plans'),
  subscription: () => api.get('/billing/subscription'),
  createCheckout: (planSlug: string, period: 'monthly' | 'yearly') => api.post('/billing/checkout', { planSlug, billingPeriod: period }),
  portal: () => api.post('/billing/portal'),
};

export default api;
