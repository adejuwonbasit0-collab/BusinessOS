import { api } from './api';

export const hrApi = {
  listStaff: () => api.get('/hr/staff'),
  checkIn: (userId?: string) => api.post('/hr/attendance/check-in', { userId }),
  checkOut: (userId?: string) => api.post('/hr/attendance/check-out', { userId }),
  listAttendance: (params?: any) => api.get('/hr/attendance', { params }),
  listLeaveTypes: () => api.get('/hr/leave-types'),
  createLeaveType: (data: any) => api.post('/hr/leave-types', data),
  listLeaveRequests: (params?: any) => api.get('/hr/leave-requests', { params }),
  requestLeave: (data: any) => api.post('/hr/leave-requests', data),
  decideLeaveRequest: (id: string, decision: string) => api.post(`/hr/leave-requests/${id}/decide`, { decision }),
  listPayrollRuns: () => api.get('/hr/payroll/runs'),
  createPayrollRun: (data: any) => api.post('/hr/payroll/runs', data),
  listPayslips: (params?: any) => api.get('/hr/payroll/payslips', { params }),
  listJobOpenings: () => api.get('/hr/recruitment/openings'),
  createJobOpening: (data: any) => api.post('/hr/recruitment/openings', data),
  listCandidates: (params?: any) => api.get('/hr/recruitment/candidates', { params }),
  addCandidate: (data: any) => api.post('/hr/recruitment/candidates', data),
  moveCandidateStage: (id: string, stage: string) => api.patch(`/hr/recruitment/candidates/${id}/stage`, { stage }),
  listReviews: (params?: any) => api.get('/hr/reviews', { params }),
  createReview: (data: any) => api.post('/hr/reviews', data),
  stats: () => api.get('/hr/stats'),
};
