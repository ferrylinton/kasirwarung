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
    return await api.get<ActiveSessionsResponse>('/sessions', {
      params: {
        status: params?.status,
        tenantId: params?.tenantId,
        role: params?.role,
        search: params?.search,
      },
    });
  },

  revokeSession: async (sessionId: string, reason?: string): Promise<RevokeSessionResponse> => {
    return await api.post<RevokeSessionResponse>('/sessions/revoke', {
      sessionId,
      reason,
    });
  },

  revokeUserSessions: async (userId: string, reason?: string): Promise<RevokeSessionResponse> => {
    return await api.post<RevokeSessionResponse>('/sessions/revoke-user', {
      userId,
      reason,
    });
  },

  revokeTenantSessions: async (
    tenantId: string,
    reason?: string,
    excludeCurrentSession: boolean = true
  ): Promise<RevokeSessionResponse> => {
    return await api.post<RevokeSessionResponse>('/sessions/revoke-tenant', {
      tenantId,
      reason,
      excludeCurrentSession,
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
