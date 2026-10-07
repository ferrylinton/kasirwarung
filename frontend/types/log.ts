import { Role } from './user.ts';

export type ActivityModule = 'PRODUCT' | 'CATEGORY' | 'CASHIER' | 'TENANT' | 'USER';

export type ActivityAction =
  | 'CREATE_PRODUCT'
  | 'UPDATE_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'CREATE_CATEGORY'
  | 'UPDATE_CATEGORY'
  | 'DELETE_CATEGORY'
  | 'CREATE_CASHIER'
  | 'DELETE_CASHIER'
  | 'UPDATE_TENANT'
  | 'UPDATE_TENANT_STATUS'
  | 'REQUEST_DEACTIVATION'
  | 'CANCEL_DEACTIVATION_REQUEST'
  | 'APPROVE_DEACTIVATION'
  | 'REJECT_DEACTIVATION'
  | 'ACTIVATE_USER'
  | 'DEACTIVATE_USER'
  | 'ADMIN_CHANGE_PASSWORD'
  | string;

export interface ActivityLog {
  id: string;
  tenantId: string;
  tenantName?: string;
  userId: string;
  userName: string;
  userRole: Role;
  module: ActivityModule;
  action: ActivityAction;
  description: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

export type ActivityLogItem = ActivityLog;

export interface ActivityLogResponse {
  success: boolean;
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  logs: ActivityLog[];
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
  userAgent?: string;
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
