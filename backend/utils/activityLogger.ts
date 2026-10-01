import crypto from 'crypto';
import { activityLogsCol } from '../config/db.ts';

export async function recordActivityLog(params: {
  tenantId: string;
  userId: string;
  userName: string;
  userRole: string;
  module: 'PRODUCT' | 'CATEGORY' | 'CASHIER' | 'TENANT';
  action: string;
  description: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt?: string;
}) {
  try {
    const id = `act-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const logDoc = {
      id,
      tenantId: params.tenantId,
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      module: params.module,
      action: params.action,
      description: params.description,
      details: params.details || {},
      ipAddress: params.ipAddress || '127.0.0.1',
      createdAt: params.createdAt || new Date().toISOString(),
    };
    await activityLogsCol.insertOne(logDoc);
    return logDoc;
  } catch (err: any) {
    console.error('Failed to record activity log:', err.message);
  }
}
