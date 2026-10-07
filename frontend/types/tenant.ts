export type TenantStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'INACTIVE';

export interface TenantDeactivationRequest {
  id: string;
  requestedBy: string;
  requestedByEmail: string;
  requestedAt: string;
  reason: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  evaluatedAt?: string;
  evaluatedBy?: string;
  rejectionReason?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  status: TenantStatus;
  productCount?: number;
  userCount?: number;
  orderCount?: number;
  totalRevenue?: number;
  deactivationRequest?: TenantDeactivationRequest | null;
  createdAt: string;
}

export interface TenantDeactivationRequestItem {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantAddress: string;
  tenantPhone: string;
  tenantStatus: TenantStatus;
  productCount: number;
  userCount: number;
  orderCount: number;
  totalRevenue: number;
  request: TenantDeactivationRequest;
}

