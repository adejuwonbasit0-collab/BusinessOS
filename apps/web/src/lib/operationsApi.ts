import { api } from './api';

export const documentsApi = {
  list: (params?: any) => api.get('/documents', { params }),
  create: (data: any) => api.post('/documents', data),
  get: (id: string) => api.get(`/documents/${id}`),
  requestSignature: (id: string, data: any) => api.post(`/documents/${id}/request-signature`, data),
  listApprovals: (params?: any) => api.get('/documents/approvals/list', { params }),
  requestApproval: (data: any) => api.post('/documents/approvals', data),
  decideApproval: (id: string, decision: string, comments?: string) => api.post(`/documents/approvals/${id}/decide`, { decision, comments }),
  stats: () => api.get('/documents/stats'),
};

export const communicationApi = {
  listThreads: () => api.get('/communication/threads'),
  createThread: (data: any) => api.post('/communication/threads', data),
  listMessages: (threadId: string) => api.get(`/communication/threads/${threadId}/messages`),
  sendMessage: (threadId: string, body: string) => api.post(`/communication/threads/${threadId}/messages`, { body }),
  listLogs: (params?: any) => api.get('/communication/logs', { params }),
  sendEmail: (data: any) => api.post('/communication/send-email', data),
  listNotifications: () => api.get('/communication/notifications'),
  markRead: (id: string) => api.post(`/communication/notifications/${id}/read`),
  markAllRead: () => api.post('/communication/notifications/mark-all-read'),
  stats: () => api.get('/communication/stats'),
};

export const accountingApi = {
  listAccounts: () => api.get('/accounting/accounts'),
  createAccount: (data: any) => api.post('/accounting/accounts', data),
  listJournalEntries: () => api.get('/accounting/journal-entries'),
  createJournalEntry: (data: any) => api.post('/accounting/journal-entries', data),
  generalLedger: (params?: any) => api.get('/accounting/general-ledger', { params }),
  listBudgets: (params?: any) => api.get('/accounting/budgets', { params }),
  createBudget: (data: any) => api.post('/accounting/budgets', data),
  listTaxRates: () => api.get('/accounting/tax-rates'),
  cashFlow: () => api.get('/accounting/cash-flow'),
  profitAndLoss: (params?: any) => api.get('/accounting/profit-and-loss', { params }),
};
