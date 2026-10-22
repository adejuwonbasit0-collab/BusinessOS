import { api } from './api';

export const industryApi = {
  listPresets: () => api.get('/industries'),
  listModules: () => api.get('/industries/modules'),
  getCurrent: () => api.get('/industries/current'),
  select: (industryKey: string) => api.post('/industries/select', { industryKey }),
  createCustom: (data: any) => api.post('/industries/custom', data),
  toggleModule: (moduleKey: string, enabled: boolean) => api.patch('/industries/modules', { moduleKey, enabled }),
};
