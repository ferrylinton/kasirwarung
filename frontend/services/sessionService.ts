import api from './api.ts';
import { ActiveSessionsResponse, RevokeSessionResponse } from '../types/session.ts';

export interface ActiveSessionsFilterParams {
  status?: string;
  tenantId?: string;
  role?: string;
  search?: string;
}

export const sessionService = {
  getActiveSessions: async (params?: ActiveSessionsFilterParams): Promise<ActiveSessionsResponse> => {
    return await api.get<ActiveSessionsResponse>('/admin/sessions', {
      params: {
        status: params?.status,
        tenantId: params?.tenantId,
        role: params?.role,
        search: params?.search,
      },
    });
  },

  revokeSession: async (sessionId: string, reason?: string): Promise<RevokeSessionResponse> => {
    return await api.post<RevokeSessionResponse>('/admin/sessions/revoke', {
      sessionId,
      reason,
    });
  },

  revokeUserSessions: async (userId: string, reason?: string): Promise<RevokeSessionResponse> => {
    return await api.post<RevokeSessionResponse>('/admin/sessions/revoke-user', {
      userId,
      reason,
    });
  },

  revokeTenantSessions: async (tenantId: string, reason?: string): Promise<RevokeSessionResponse> => {
    return await api.post<RevokeSessionResponse>('/admin/sessions/revoke-tenant', {
      tenantId,
      reason,
    });
  },

  revokeAllActiveSessions: async (
    excludeCurrentAdmin: boolean = true,
    reason?: string
  ): Promise<RevokeSessionResponse> => {
    return await api.post<RevokeSessionResponse>('/admin/sessions/revoke-all', {
      excludeCurrentAdmin,
      reason,
    });
  },
};

export default sessionService;
