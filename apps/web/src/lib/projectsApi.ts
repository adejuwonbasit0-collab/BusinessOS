import { api } from './api';

export const projectsApi = {
  list: (params?: any) => api.get('/projects', { params }),
  create: (data: any) => api.post('/projects', data),
  get: (id: string) => api.get(`/projects/${id}`),
  updateStatus: (id: string, data: any) => api.patch(`/projects/${id}/status`, data),
  createMilestone: (data: any) => api.post('/projects/milestones', data),
  listTasks: (params?: any) => api.get('/projects/tasks/all', { params }),
  createTask: (data: any) => api.post('/projects/tasks', data),
  updateTaskStatus: (id: string, status: string) => api.patch(`/projects/tasks/${id}/status`, { status }),
  addComment: (id: string, body: string) => api.post(`/projects/tasks/${id}/comments`, { body }),
  stats: () => api.get('/projects/stats'),
};
