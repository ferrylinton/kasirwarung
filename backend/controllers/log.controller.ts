import { Response } from 'express';
import { activityLogsCol, loginHistoryCol } from '../config/db.ts';

// 1. Activity Logs: List, Search, Date Range Filter & Pagination (MANAGER & ADMIN only)
export async function getActivityLogs(req: any, res: Response) {
  try {
    const tenantId = req.query.tenantId || req.user.tenantId;
    if (!tenantId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Tenant ID diperlukan' });
    }

    const query: any = {};
    if (req.user.role !== 'ADMIN' || tenantId) {
      query.tenantId = tenantId;
    }

    // Filter by module (PRODUCT, CATEGORY, CASHIER)
    const moduleParam = (req.query.module as string || '').trim().toUpperCase();
    if (moduleParam && moduleParam !== 'ALL' && moduleParam !== 'SEMUA') {
      query.module = moduleParam;
    }

    // Filter by action
    const actionParam = (req.query.action as string || '').trim();
    if (actionParam && actionParam !== 'ALL' && actionParam !== 'SEMUA') {
      query.action = actionParam;
    }

    // Keyword search
    const q = (req.query.q as string || '').trim();
    if (q) {
      query.$or = [
        { description: { $regex: q, $options: 'i' } },
        { userName: { $regex: q, $options: 'i' } },
        { action: { $regex: q, $options: 'i' } },
      ];
    }

    // Date range filtering (supports ISO or YYYY-MM-DD format)
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    if (startDate || endDate) {
      const dateCondition: any = {};
      if (startDate) {
        const s = new Date(startDate);
        if (!isNaN(s.getTime())) {
          s.setHours(0, 0, 0, 0);
          dateCondition.$gte = s.toISOString();
        }
      }
      if (endDate) {
        const e = new Date(endDate);
        if (!isNaN(e.getTime())) {
          e.setHours(23, 59, 59, 999);
          dateCondition.$lte = e.toISOString();
        }
      }
      if (Object.keys(dateCondition).length > 0) {
        query.createdAt = dateCondition;
      }
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || '10', 10)));
    const skip = (page - 1) * limit;

    const total = await activityLogsCol.countDocuments(query);
    const logs = await activityLogsCol
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      logs,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data log aktivitas: ' + err.message });
  }
}

// 2. Login History: Multi-Role Audit (All Users = Own, Manager = Tenant, Admin = Global)
export async function getLoginHistory(req: any, res: Response) {
  try {
    const userRole = req.user.role;
    const currentUserId = req.user.id;
    const currentTenantId = req.user.tenantId;

    const query: any = {};

    // 1. Role-based scoping
    const scope = (req.query.scope as string || '').toUpperCase();
    const onlyMe = req.query.onlyMe === 'true' || scope === 'ME';

    if (userRole === 'CASHIER' || onlyMe) {
      query.userId = currentUserId;
    } else if (userRole === 'MANAGER') {
      if (!currentTenantId) {
        return res.status(403).json({ success: false, message: 'Tenant ID manajer tidak valid' });
      }
      query.tenantId = currentTenantId;

      if (req.query.userId) {
        query.userId = req.query.userId;
      }
    } else if (userRole === 'ADMIN') {
      if (req.query.tenantId && req.query.tenantId !== 'ALL') {
        query.tenantId = req.query.tenantId;
      }
      if (req.query.userId) {
        query.userId = req.query.userId;
      }
    }

    // 2. Filter by status (SUCCESS / FAILED / ALL)
    const statusParam = (req.query.status as string || '').trim().toUpperCase();
    if (statusParam && statusParam !== 'ALL' && ['SUCCESS', 'FAILED'].includes(statusParam)) {
      query.status = statusParam;
    }

    // 3. Filter by role (for Manager and Admin)
    const roleParam = (req.query.role as string || '').trim().toUpperCase();
    if (roleParam && roleParam !== 'ALL' && ['ADMIN', 'MANAGER', 'CASHIER'].includes(roleParam)) {
      query.userRole = roleParam;
    }

    // 4. Keyword search
    const q = (req.query.q as string || '').trim();
    if (q) {
      query.$or = [
        { userName: { $regex: q, $options: 'i' } },
        { userEmail: { $regex: q, $options: 'i' } },
        { ipAddress: { $regex: q, $options: 'i' } },
        { device: { $regex: q, $options: 'i' } },
        { browser: { $regex: q, $options: 'i' } },
        { os: { $regex: q, $options: 'i' } },
        { tenantName: { $regex: q, $options: 'i' } },
        { failureReason: { $regex: q, $options: 'i' } },
      ];
    }

    // 5. Date range filtering
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    if (startDate || endDate) {
      const dateCondition: any = {};
      if (startDate) {
        const s = new Date(startDate);
        if (!isNaN(s.getTime())) {
          s.setHours(0, 0, 0, 0);
          dateCondition.$gte = s.toISOString();
        }
      }
      if (endDate) {
        const e = new Date(endDate);
        if (!isNaN(e.getTime())) {
          e.setHours(23, 59, 59, 999);
          dateCondition.$lte = e.toISOString();
        }
      }
      if (Object.keys(dateCondition).length > 0) {
        query.createdAt = dateCondition;
      }
    }

    // 6. Pagination
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || '10', 10)));
    const skip = (page - 1) * limit;

    const total = await loginHistoryCol.countDocuments(query);
    const history = await loginHistoryCol
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Compute statistics based on current base scope
    const baseScopeQuery: any = {};
    if (userRole === 'CASHIER' || onlyMe) {
      baseScopeQuery.userId = currentUserId;
    } else if (userRole === 'MANAGER') {
      baseScopeQuery.tenantId = currentTenantId;
    } else if (userRole === 'ADMIN' && req.query.tenantId && req.query.tenantId !== 'ALL') {
      baseScopeQuery.tenantId = req.query.tenantId;
    }

    const allScopedLogs = await loginHistoryCol.find(baseScopeQuery).toArray();
    const successCount = allScopedLogs.filter((l: any) => l.status === 'SUCCESS').length;
    const failedCount = allScopedLogs.filter((l: any) => l.status === 'FAILED').length;
    const uniqueUsers = new Set(allScopedLogs.map((l: any) => l.userId)).size;

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      stats: {
        total: allScopedLogs.length,
        successCount,
        failedCount,
        uniqueUsers,
      },
      history,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data histori login: ' + err.message });
  }
}
