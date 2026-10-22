import { api } from './api';

export const bookingApi = {
  listResources: () => api.get('/bookings/resources'),
  createResource: (data: any) => api.post('/bookings/resources', data),
  list: (params?: any) => api.get('/bookings', { params }),
  create: (data: any) => api.post('/bookings', data),
  updateStatus: (id: string, status: string) => api.patch(`/bookings/${id}/status`, { status }),
  cancel: (id: string) => api.post(`/bookings/${id}/cancel`),
  checkAvailability: (resourceId: string, date: string) => api.get('/bookings/availability', { params: { resourceId, date } }),
  stats: () => api.get('/bookings/stats'),
};
