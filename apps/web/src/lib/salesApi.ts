import { api } from './api';

export const salesApi = {
  listOrders: (params?: any) => api.get('/sales/orders', { params }),
  createOrder: (data: any) => api.post('/sales/orders', data),
  getOrder: (id: string) => api.get(`/sales/orders/${id}`),
  confirmOrder: (id: string) => api.post(`/sales/orders/${id}/confirm`),
  recordPayment: (id: string, data: any) => api.post(`/sales/orders/${id}/payment`, data),
  listQuotations: () => api.get('/sales/quotations'),
  createQuotation: (data: any) => api.post('/sales/quotations', data),
  convertQuotation: (id: string) => api.post(`/sales/quotations/${id}/convert`),
  createRefund: (data: any) => api.post('/sales/refunds', data),
  stats: () => api.get('/sales/stats'),
};
