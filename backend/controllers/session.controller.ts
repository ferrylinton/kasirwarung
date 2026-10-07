import { Request, Response } from 'express';
import { activeSessionsCol, activityLogsCol } from '../config/db.ts';
import { tokenStore } from '../tokenStore.ts';
import { ACCESS_TOKEN_TTL_SEC } from '../config/env.ts';

export async function getActiveSessions(req: Request, res: Response) {
  try {
    const { status, tenantId, role, search } = req.query as {
      status?: string;
      tenantId?: string;
      role?: string;
      search?: string;
    };

    const allSessions = await activeSessionsCol.find({}).toArray();

    // Calculate metrics
    const totalActive = allSessions.filter((s: any) => s.status === 'ACTIVE').length;
    const totalRevoked = allSessions.filter((s: any) => s.status === 'REVOKED').length;
    const uniqueUsersActive = new Set(
      allSessions.filter((s: any) => s.status === 'ACTIVE').map((s: any) => s.userId)
    ).size;
    const tenantsActive = new Set(
      allSessions
        .filter((s: any) => s.status === 'ACTIVE' && s.tenantId)
        .map((s: any) => s.tenantId)
    ).size;

    // Distinct tenants for filter dropdown
    const tenantsMap = new Map<string, string>();
    allSessions.forEach((s: any) => {
      if (s.tenantId && s.tenantName) {
        tenantsMap.set(s.tenantId, s.tenantName);
      }
    });
    const tenantsList = Array.from(tenantsMap.entries()).map(([id, name]) => ({ id, name }));

    // Apply filtering
    let filtered = allSessions.filter((s: any) => {
      // Status filter
      if (status && status !== 'ALL') {
        if (s.status !== status) return false;
      }

      // Tenant filter
      if (tenantId && tenantId !== 'ALL') {
        if (s.tenantId !== tenantId) return false;
      }

      // Role filter
      if (role && role !== 'ALL') {
        if (s.userRole !== role) return false;
      }

      // Search keyword filter
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = (s.userName || '').toLowerCase().includes(q);
        const matchEmail = (s.userEmail || '').toLowerCase().includes(q);
        const matchTenant = (s.tenantName || '').toLowerCase().includes(q);
        const matchIp = (s.ipAddress || '').toLowerCase().includes(q);
        const matchJti = (s.accessJti || '').toLowerCase().includes(q);
        const matchDevice = (s.device || '').toLowerCase().includes(q);
        const matchBrowser = (s.browser || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchTenant && !matchIp && !matchJti && !matchDevice && !matchBrowser) {
          return false;
        }
      }

      return true;
    });

    // Sort: ACTIVE first, then newest login time
    filtered.sort((a: any, b: any) => {
      if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
      if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
      return new Date(b.loginTime || b.createdAt).getTime() - new Date(a.loginTime || a.createdAt).getTime();
    });

    res.json({
      success: true,
      metrics: {
        totalActive,
        totalRevoked,
        uniqueUsersActive,
        tenantsActive,
        totalSessions: allSessions.length,
      },
      tenants: tenantsList,
      sessions: filtered,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat daftar sesi token aktif: ' + err.message });
  }
}

export async function revokeSession(req: any, res: Response) {
  try {
    const { sessionId, accessJti, reason } = req.body;

    if (!sessionId && !accessJti) {
      return res.status(400).json({ success: false, message: 'ID Sesi atau JTI token wajib disertakan.' });
    }

    const query = sessionId ? { id: sessionId } : { accessJti };
    const session = await activeSessionsCol.findOne(query);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Data sesi token tidak ditemukan.' });
    }

    if (session.status === 'REVOKED') {
      return res.status(400).json({ success: false, message: 'Token sesi ini sudah dalam status dinonaktifkan sebelumnya.' });
    }

    // Calculate remaining TTL
    let ttlSeconds = ACCESS_TOKEN_TTL_SEC;
    if (session.expiresAt) {
      const remaining = Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000);
      if (remaining > 0) ttlSeconds = remaining;
    }

    // Add JTI to Denylist
    if (session.accessJti) {
      await tokenStore.addToDenylist(session.accessJti, ttlSeconds);
    }

    // Remove user status cache
    if (session.userId) {
      await tokenStore.removeLoggedUserStatus(session.userId);
    }

    const nowIso = new Date().toISOString();
    const adminUser = req.user?.email || req.user?.name || 'Administrator';
    const revokeReasonText = reason?.trim() || 'Dinonaktifkan oleh Administrator';

    // Update in session store
    await activeSessionsCol.updateOne(
      { id: session.id },
      {
        $set: {
          status: 'REVOKED',
          revokedAt: nowIso,
          revokedBy: adminUser,
          revokeReason: revokeReasonText,
          updatedAt: nowIso,
        },
      }
    );

    // Audit Log
    await activityLogsCol.insertOne({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId: session.tenantId || 'system',
      userId: req.user?.id || 'admin',
      userName: req.user?.name || 'Administrator',
      userEmail: req.user?.email || 'admin@kasirwarung.com',
      action: 'REVOKE_USER_TOKEN',
      module: 'SECURITY',
      description: `Admin menonaktifkan token sesi aktif pengguna "${session.userName}" (${session.userEmail}) di warung "${session.tenantName || 'Semua Warung'}". Alasan: ${revokeReasonText}`,
      metadata: {
        targetUserId: session.userId,
        targetEmail: session.userEmail,
        targetJti: session.accessJti,
        targetTenantId: session.tenantId,
        reason: revokeReasonText,
      },
      createdAt: nowIso,
    });

    res.json({
      success: true,
      message: `Token sesi untuk pengguna "${session.userName}" (${session.userEmail}) berhasil dinonaktifkan! Pengguna akan langsung dikeluarkan saat mencoba mengakses sistem.`,
      sessionId: session.id,
      accessJti: session.accessJti,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal menonaktifkan token sesi: ' + err.message });
  }
}

export async function revokeUserSessions(req: any, res: Response) {
  try {
    const { userId, reason } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'ID pengguna wajib disertakan.' });
    }

    const activeSessions = await activeSessionsCol.find({ userId, status: 'ACTIVE' }).toArray();
    if (activeSessions.length === 0) {
      return res.status(404).json({ success: false, message: 'Tidak ada token sesi aktif yang ditemukan untuk pengguna ini.' });
    }

    const nowIso = new Date().toISOString();
    const adminUser = req.user?.email || req.user?.name || 'Administrator';
    const revokeReasonText = reason?.trim() || 'Seluruh sesi dinonaktifkan oleh Administrator';

    for (const sess of activeSessions) {
      if (sess.accessJti) {
        await tokenStore.addToDenylist(sess.accessJti, ACCESS_TOKEN_TTL_SEC);
      }
      await activeSessionsCol.updateOne(
        { id: sess.id },
        {
          $set: {
            status: 'REVOKED',
            revokedAt: nowIso,
            revokedBy: adminUser,
            revokeReason: revokeReasonText,
            updatedAt: nowIso,
          },
        }
      );
    }

    await tokenStore.removeLoggedUserStatus(userId);

    const userName = activeSessions[0]?.userName || userId;
    await activityLogsCol.insertOne({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId: activeSessions[0]?.tenantId || 'system',
      userId: req.user?.id || 'admin',
      userName: req.user?.name || 'Administrator',
      userEmail: req.user?.email || 'admin@kasirwarung.com',
      action: 'REVOKE_ALL_USER_TOKENS',
      module: 'SECURITY',
      description: `Admin menonaktifkan seluruh ${activeSessions.length} token sesi aktif untuk pengguna "${userName}". Alasan: ${revokeReasonText}`,
      createdAt: nowIso,
    });

    res.json({
      success: true,
      message: `Berhasil menonaktifkan ${activeSessions.length} token sesi aktif untuk pengguna "${userName}".`,
      revokedCount: activeSessions.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal menonaktifkan sesi pengguna: ' + err.message });
  }
}

export async function revokeTenantSessions(req: any, res: Response) {
  try {
    const { tenantId, reason } = req.body;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'ID tenant warung wajib disertakan.' });
    }

    const activeSessions = await activeSessionsCol.find({ tenantId, status: 'ACTIVE' }).toArray();
    if (activeSessions.length === 0) {
      return res.status(404).json({ success: false, message: 'Tidak ada token sesi aktif yang ditemukan untuk tenant ini.' });
    }

    const nowIso = new Date().toISOString();
    const adminUser = req.user?.email || req.user?.name || 'Administrator';
    const revokeReasonText = reason?.trim() || `Seluruh sesi tenant ${tenantId} dinonaktifkan oleh Administrator`;

    for (const sess of activeSessions) {
      if (sess.accessJti) {
        await tokenStore.addToDenylist(sess.accessJti, ACCESS_TOKEN_TTL_SEC);
      }
      if (sess.userId) {
        await tokenStore.removeLoggedUserStatus(sess.userId);
      }
      await activeSessionsCol.updateOne(
        { id: sess.id },
        {
          $set: {
            status: 'REVOKED',
            revokedAt: nowIso,
            revokedBy: adminUser,
            revokeReason: revokeReasonText,
            updatedAt: nowIso,
          },
        }
      );
    }

    const tenantName = activeSessions[0]?.tenantName || tenantId;
    await activityLogsCol.insertOne({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      userId: req.user?.id || 'admin',
      userName: req.user?.name || 'Administrator',
      userEmail: req.user?.email || 'admin@kasirwarung.com',
      action: 'REVOKE_TENANT_TOKENS',
      module: 'SECURITY',
      description: `Admin menonaktifkan seluruh ${activeSessions.length} token sesi aktif pada warung "${tenantName}". Alasan: ${revokeReasonText}`,
      createdAt: nowIso,
    });

    res.json({
      success: true,
      message: `Berhasil menonaktifkan ${activeSessions.length} token sesi aktif untuk warung "${tenantName}".`,
      revokedCount: activeSessions.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal menonaktifkan sesi tenant: ' + err.message });
  }
}

export async function revokeAllActiveSessions(req: any, res: Response) {
  try {
    const { excludeCurrentAdmin = true, reason } = req.body;

    const allActive = await activeSessionsCol.find({ status: 'ACTIVE' }).toArray();
    if (allActive.length === 0) {
      return res.json({ success: true, message: 'Tidak ada sesi aktif untuk dinonaktifkan.', revokedCount: 0 });
    }

    const currentAdminJti = req.user?.jti;
    const currentAdminId = req.user?.id;

    const toRevoke = allActive.filter((s: any) => {
      if (excludeCurrentAdmin && ((currentAdminJti && s.accessJti === currentAdminJti) || (currentAdminId && s.userId === currentAdminId))) {
        return false;
      }
      return true;
    });

    const nowIso = new Date().toISOString();
    const adminUser = req.user?.email || req.user?.name || 'Administrator';
    const revokeReasonText = reason?.trim() || 'Penonaktifan massal seluruh token aktif oleh Administrator';

    for (const sess of toRevoke) {
      if (sess.accessJti) {
        await tokenStore.addToDenylist(sess.accessJti, ACCESS_TOKEN_TTL_SEC);
      }
      if (sess.userId) {
        await tokenStore.removeLoggedUserStatus(sess.userId);
      }
      await activeSessionsCol.updateOne(
        { id: sess.id },
        {
          $set: {
            status: 'REVOKED',
            revokedAt: nowIso,
            revokedBy: adminUser,
            revokeReason: revokeReasonText,
            updatedAt: nowIso,
          },
        }
      );
    }

    await activityLogsCol.insertOne({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId: 'system',
      userId: req.user?.id || 'admin',
      userName: req.user?.name || 'Administrator',
      userEmail: req.user?.email || 'admin@kasirwarung.com',
      action: 'REVOKE_ALL_GLOBAL_TOKENS',
      module: 'SECURITY',
      description: `Admin melakukan penonaktifan darurat massal untuk ${toRevoke.length} token aktif di seluruh tenant warung. Alasan: ${revokeReasonText}`,
      createdAt: nowIso,
    });

    res.json({
      success: true,
      message: `Berhasil menonaktifkan ${toRevoke.length} token sesi aktif di semua tenant.${excludeCurrentAdmin ? ' Sesi Anda saat ini tetap aman.' : ''}`,
      revokedCount: toRevoke.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal menonaktifkan semua token sesi: ' + err.message });
  }
}
