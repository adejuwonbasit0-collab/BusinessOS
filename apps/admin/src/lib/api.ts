import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('nexos-admin-auth');
      if (stored) {
        const { state } = JSON.parse(stored);
        if (state?.accessToken) config.headers.Authorization = `Bearer ${state.accessToken}`;
      }
    } catch {}
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      sessionStorage.removeItem('nexos-admin-auth');
      // Reloading `/login` while already on it made an expired session
      // reload the page forever. Clearing the session is enough.
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const errorData = error.response?.data?.error;
    return Promise.reject({
      message: errorData?.message || error.message || 'Something went wrong',
      code: errorData?.code || 'UNKNOWN_ERROR',
      status: error.response?.status || 0,
    });
  }
);

// ── Admin-specific API methods ──────────────────────────────────────────────
export const adminAuthApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const adminApi = {
  listTenants: (params?: any) => api.get('/admin/tenants', { params }),
  getTenant: (id: string) => api.get(`/admin/tenants/${id}`),
  updateTenant: (id: string, data: any) => api.patch(`/admin/tenants/${id}`, data),
  suspendTenant: (id: string, reason?: string) => api.post(`/admin/tenants/${id}/suspend`, { reason }),
  unsuspendTenant: (id: string) => api.post(`/admin/tenants/${id}/unsuspend`),
  deleteTenant: (id: string) => api.delete(`/admin/tenants/${id}`),
  impersonateTenant: (id: string) => api.post(`/admin/tenants/${id}/impersonate`),
  platformStats: () => api.get('/admin/stats'),
  listAllUsers: (params?: any) => api.get('/admin/users', { params }),
  auditLogs: (params?: any) => api.get('/admin/audit-logs', { params }),
  revenueOverview: () => api.get('/admin/revenue'),
};

export default api;
