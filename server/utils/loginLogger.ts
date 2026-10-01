import crypto from 'crypto';
import { loginHistoryCol } from '../config/db.ts';
import { parseUserAgent } from './deviceDetector.ts';

export async function recordLoginHistory(params: {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  tenantId?: string | null;
  tenantName?: string | null;
  status: 'SUCCESS' | 'FAILED';
  failureReason?: string | null;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string;
}) {
  try {
    const uaParsed = parseUserAgent(params.userAgent);
    const id = `login-hist-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const logDoc = {
      id,
      userId: params.userId,
      userName: params.userName,
      userEmail: params.userEmail,
      userRole: params.userRole,
      tenantId: params.tenantId || null,
      tenantName: params.tenantName || null,
      status: params.status,
      failureReason: params.failureReason || null,
      ipAddress: params.ipAddress || '127.0.0.1',
      userAgent: params.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      device: uaParsed.device,
      os: uaParsed.os,
      browser: uaParsed.browser,
      createdAt: params.createdAt || new Date().toISOString(),
    };
    await loginHistoryCol.insertOne(logDoc);
    return logDoc;
  } catch (err: any) {
    console.error('Failed to record login history:', err.message);
  }
}
