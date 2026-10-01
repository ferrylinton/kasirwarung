import api from './api.ts';
import { Tenant } from '../types/tenant.ts';

export const tenantService = {
  getTenants: async () => {
    const res = await api.get<{ success: boolean; count: number; tenants: Tenant[] }>('/tenants');
    return res.tenants || [];
  },

  updateTenantStatus: async (tenantId: string, status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE') => {
    return api.patch<{ success: boolean; message: string; tenant: Tenant }>(`/tenants/${tenantId}/status`, { status });
  },

  getMyTenant: async () => {
    return api.get<{ success: boolean; tenant: Tenant; users: any[] }>('/tenant/my');
  },

  requestDeactivation: async (reason: string, notes?: string) => {
    return api.post<{ success: boolean; message: string; deactivationRequest: any }>('/tenant/deactivation-request', {
      reason,
      notes,
    });
  },

  cancelDeactivation: async () => {
    return api.post<{ success: boolean; message: string }>('/tenant/deactivation-request/cancel');
  },

  evaluateDeactivation: async (tenantId: string, decision: 'APPROVE' | 'REJECT', rejectionReason?: string) => {
    return api.post<{ success: boolean; message: string; tenantStatus: string }>(`/tenants/${tenantId}/evaluate-deactivation`, {
      decision,
      rejectionReason,
    });
  },
};

export default tenantService;
