import api from './api.ts';
import { DashboardStats, AdminDashboardData } from '../types/dashboard.ts';

export const dashboardService = {
  getTenantStats: async (tenantId?: string) => {
    const res = await api.get<{ success: boolean; stats: DashboardStats }>('/dashboard/stats', {
      params: { tenantId },
    });
    return res.stats;
  },

  getAdminDashboard: async (params?: { startDate?: string; endDate?: string; tenantId?: string; preset?: string }) => {
    return api.get<AdminDashboardData>('/admin/dashboard', { params });
  },
};

export default dashboardService;
