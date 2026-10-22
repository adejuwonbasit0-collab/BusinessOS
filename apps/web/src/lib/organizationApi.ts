import { api } from './api';

export const branchesApi = {
  list: () => api.get('/branches'),
  get: (id: string) => api.get(`/branches/${id}`),
  create: (data: any) => api.post('/branches', data),
  update: (id: string, data: any) => api.patch(`/branches/${id}`, data),
  delete: (id: string) => api.delete(`/branches/${id}`),
  regionalReport: () => api.get('/branches/regional-report'),
};

export const rolesApi = {
  list: () => api.get('/roles'),
  permissionsCatalog: () => api.get('/roles/permissions-catalog'),
  accessMatrix: () => api.get('/roles/access-matrix'),
  create: (data: any) => api.post('/roles', data),
  update: (id: string, data: any) => api.patch(`/roles/${id}`, data),
  delete: (id: string) => api.delete(`/roles/${id}`),
  assignToUser: (id: string, userId: string) => api.post(`/roles/${id}/assign`, { userId }),
};

export const departmentsApi = {
  list: () => api.get('/departments'),
  create: (data: any) => api.post('/departments', data),
  update: (id: string, data: any) => api.patch(`/departments/${id}`, data),
  delete: (id: string) => api.delete(`/departments/${id}`),
};
