import { api } from './api';

// ── Portals / App Builder ─────────────────────────────────────────────────
export const portalsApi = {
  list: () => api.get('/portals'),
  create: (data: any) => api.post('/portals', data),
  generate: (portalType: string, description: string) => api.post('/portals/generate', { portalType, description }),
  get: (id: string) => api.get(`/portals/${id}`),
  update: (id: string, data: any) => api.patch(`/portals/${id}`, data),
  delete: (id: string) => api.delete(`/portals/${id}`),
  addPage: (portalId: string, data: any) => api.post(`/portals/${portalId}/pages`, data),
  savePage: (portalId: string, pageId: string, data: any) => api.patch(`/portals/${portalId}/pages/${pageId}`, data),
};

// ── Forms ─────────────────────────────────────────────────────────────────
export const formsApi = {
  list: () => api.get('/forms'),
  create: (data: any) => api.post('/forms', data),
  generate: (purpose: string) => api.post('/forms/generate', { purpose }),
  update: (id: string, data: any) => api.patch(`/forms/${id}`, data),
  delete: (id: string) => api.delete(`/forms/${id}`),
  submit: (id: string, data: any) => api.post(`/forms/${id}/submit`, data),
  getSubmissions: (id: string) => api.get(`/forms/${id}/submissions`),
};

// ── Custom Tables ─────────────────────────────────────────────────────────
export const tablesApi = {
  list: () => api.get('/tables'),
  create: (data: any) => api.post('/tables', data),
  update: (id: string, data: any) => api.patch(`/tables/${id}`, data),
  delete: (id: string) => api.delete(`/tables/${id}`),
  listRecords: (tableId: string, params?: any) => api.get(`/tables/${tableId}/records`, { params }),
  createRecord: (tableId: string, data: any) => api.post(`/tables/${tableId}/records`, data),
  updateRecord: (tableId: string, recordId: string, data: any) => api.patch(`/tables/${tableId}/records/${recordId}`, data),
  deleteRecord: (tableId: string, recordId: string) => api.delete(`/tables/${tableId}/records/${recordId}`),
};

// ── Marketplace ────────────────────────────────────────────────────────────
export const marketplaceApi = {
  list: (params?: any) => api.get('/marketplace', { params }),
  featured: () => api.get('/marketplace/featured'),
  categories: () => api.get('/marketplace/categories'),
  installed: () => api.get('/marketplace/installed'),
  get: (id: string) => api.get(`/marketplace/${id}`),
  install: (id: string, config?: any) => api.post(`/marketplace/${id}/install`, { config }),
  uninstall: (id: string) => api.delete(`/marketplace/${id}/install`),
  submit: (data: any) => api.post('/marketplace/submit', data),
};

// ── Integrations ───────────────────────────────────────────────────────────
export const integrationsApi = {
  catalog: () => api.get('/integrations/catalog'),
  list: () => api.get('/integrations'),
  connect: (provider: string, config: any) => api.post('/integrations/connect', { provider, config }),
  disconnect: (provider: string) => api.delete(`/integrations/${provider}`),
  test: (provider: string) => api.post(`/integrations/${provider}/test`),
  webhookUrl: (provider: string) => api.get(`/integrations/${provider}/webhook-url`),
};

// ── White Label ────────────────────────────────────────────────────────────
export const whiteLabelApi = {
  getConfig: () => api.get('/white-label'),
  save: (data: any) => api.post('/white-label', data),
  preview: () => api.get('/white-label/preview'),
  listResellers: () => api.get('/white-label/resellers'),
  createReseller: (data: any) => api.post('/white-label/resellers', data),
};
