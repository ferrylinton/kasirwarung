import { Role } from './user.ts';

export interface ActivityLogItem {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  userRole: string;
  module: 'PRODUCT' | 'CATEGORY' | 'CASHIER' | 'TENANT';
  action: string;
  description: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

export interface LoginHistoryItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: Role;
  tenantId: string | null;
  tenantName: string | null;
  status: 'SUCCESS' | 'FAILED';
  failureReason?: string;
  ipAddress: string;
  device: string;
  browser: string;
  os: string;
  createdAt: string;
}

export interface LoginHistoryStats {
  total: number;
  successCount: number;
  failedCount: number;
  uniqueUsers: number;
}

export interface LoginHistoryResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats?: LoginHistoryStats;
  history: LoginHistoryItem[];
}
