import { api } from './api';

export const aiApi = {
  analyze: (description: string) => api.post('/ai/analyze', { description }),
  applyAnalysis: (analysis: any) => api.post('/ai/apply-analysis', { analysis }),
  generateWorkflow: (description: string) => api.post('/ai/generate-workflow', { description }),
  generateReport: (reportType: string, period?: string) => api.post('/ai/generate-report', { reportType, period }),
  generateSOPs: (departments?: string[]) => api.post('/ai/generate-sops', { departments }),
  generatePolicies: () => api.post('/ai/generate-policies', {}),
  generateForm: (purpose: string) => api.post('/ai/generate-form', { purpose }),
  generateWebsiteContent: (description?: string) => api.post('/ai/generate-website-content', { description }),
  generateDashboard: () => api.post('/ai/generate-dashboard', {}),
  chat: (messages: { role: string; content: string }[]) => api.post('/ai/chat', { messages }),
  scoreLead: (contactId: string) => api.post('/ai/score-lead', { contactId }),
  generatePortal: (portalType: string, description: string) => api.post('/ai/generate-portal', { portalType, description }),
};

export const workflowsApi = {
  list: (params?: any) => api.get('/workflows', { params }),
  create: (data: any) => api.post('/workflows', data),
  get: (id: string) => api.get(`/workflows/${id}`),
  update: (id: string, data: any) => api.patch(`/workflows/${id}`, data),
  toggle: (id: string, active: boolean) => api.post(`/workflows/${id}/toggle`, { active }),
  delete: (id: string) => api.delete(`/workflows/${id}`),
  testRun: (id: string) => api.post(`/workflows/${id}/test-run`),
  getRuns: (id: string, params?: any) => api.get(`/workflows/${id}/runs`, { params }),
  stats: () => api.get('/workflows/stats'),
  duplicate: (id: string) => api.post(`/workflows/${id}/duplicate`),
};
