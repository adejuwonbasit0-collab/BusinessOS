import { api } from './api';

export const inventoryApi = {
  listProducts: (params?: any) => api.get('/inventory/products', { params }),
  createProduct: (data: any) => api.post('/inventory/products', data),
  listCategories: () => api.get('/inventory/categories'),
  createCategory: (data: any) => api.post('/inventory/categories', data),
  listWarehouses: () => api.get('/inventory/warehouses'),
  createWarehouse: (data: any) => api.post('/inventory/warehouses', data),
  listStock: (params?: any) => api.get('/inventory/stock', { params }),
  adjustStock: (data: any) => api.post('/inventory/stock/adjust', data),
  listTransfers: () => api.get('/inventory/transfers'),
  listSuppliers: () => api.get('/inventory/suppliers'),
  createSupplier: (data: any) => api.post('/inventory/suppliers', data),
  listPurchaseOrders: () => api.get('/inventory/purchase-orders'),
  createPurchaseOrder: (data: any) => api.post('/inventory/purchase-orders', data),
  receivePurchaseOrder: (id: string) => api.post(`/inventory/purchase-orders/${id}/receive`),
  stats: () => api.get('/inventory/stats'),
};
