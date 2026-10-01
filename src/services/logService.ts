import api from './api.ts';
import { ActivityLogItem, LoginHistoryResponse } from '../types/log.ts';

export const logService = {
  getActivityLogs: async (params?: {
    tenantId?: string;
    module?: string;
    action?: string;
    q?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    return api.get<{
      success: boolean;
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      logs: ActivityLogItem[];
    }>('/activity-logs', { params });
  },

  getLoginHistory: async (params?: {
    scope?: string;
    onlyMe?: boolean;
    tenantId?: string;
    userId?: string;
    status?: string;
    role?: string;
    q?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    return api.get<LoginHistoryResponse>('/login-history', { params });
  },
};

export default logService;
