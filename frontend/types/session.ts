import { Role } from './user';

export type SessionStatus = 'ACTIVE' | 'REVOKED' | 'LOGGED_OUT';

export interface ActiveSessionItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: Role;
  tenantId: string | null;
  tenantName: string | null;
  accessJti: string;
  ipAddress: string;
  userAgent: string;
  device?: string;
  browser?: string;
  loginTime: string;
  lastActive: string;
  expiresAt?: string;
  status: SessionStatus;
  revokedAt?: string;
  revokedBy?: string;
  revokeReason?: string;
  createdAt: string;
}

export interface SessionMetrics {
  totalActive: number;
  totalRevoked: number;
  uniqueUsersActive: number;
  tenantsActive: number;
  totalSessions: number;
}

export interface ActiveSessionsResponse {
  success: boolean;
  metrics: SessionMetrics;
  tenants: Array<{ id: string; name: string }>;
  sessions: ActiveSessionItem[];
  message?: string;
}

export interface RevokeSessionResponse {
  success: boolean;
  message: string;
  sessionId?: string;
  accessJti?: string;
  revokedCount?: number;
}
