import { Request, Response } from 'express';
import { tenantsCol, productsCol, usersCol, ordersCol } from '../config/db.ts';
import { recordActivityLog } from '../utils/activityLogger.ts';

// 1. Get all tenants with aggregated metrics (ADMIN only)
export async function getTenants(req: Request, res: Response) {
  try {
    const tenantsList = await tenantsCol.find().toArray();
    const enriched = await Promise.all(
      tenantsList.map(async (t: any) => {
        const productCount = await productsCol.countDocuments({ tenantId: t.id });
        const userCount = await usersCol.countDocuments({ tenantId: t.id });
        const orderCount = await ordersCol.countDocuments({ tenantId: t.id });
        const orders = await ordersCol.find({ tenantId: t.id }).toArray();
        const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);

        return {
          ...t,
          productCount,
          userCount,
          orderCount,
          totalRevenue,
        };
      })
    );

    res.json({ success: true, count: enriched.length, tenants: enriched });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 2. Update tenant status (ADMIN only)
export async function updateTenantStatus(req: Request, res: Response) {
  try {
    const tenant = await tenantsCol.findOne({ id: req.params.id });
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant tidak ditemukan' });
    }

    const { status } = req.body;
    if (status && ['ACTIVE', 'SUSPENDED', 'INACTIVE'].includes(status)) {
      const updateDoc: any = { status };
      if (status === 'ACTIVE' && tenant.deactivationRequest?.status === 'APPROVED') {
        updateDoc.deactivationRequest = null;
      }
      await tenantsCol.updateOne({ id: req.params.id }, { $set: updateDoc });
      tenant.status = status;
    }

    res.json({
      success: true,
      message: `Status tenant "${tenant.name}" berhasil diubah menjadi ${tenant.status}!`,
      tenant,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 3. Get my tenant details and staff for MANAGER
export async function getMyTenant(req: any, res: Response) {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID tidak ditemukan pada sesi pengguna' });
    }

    const tenant = await tenantsCol.findOne({ id: tenantId });
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Data tenant tidak ditemukan' });
    }

    const productCount = await productsCol.countDocuments({ tenantId });
    const userCount = await usersCol.countDocuments({ tenantId });
    const orderCount = await ordersCol.countDocuments({ tenantId });
    const orders = await ordersCol.find({ tenantId }).toArray();
    const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
    const staffUsers = await usersCol
      .find({ tenantId })
      .project({ passwordHash: 0 })
      .toArray();

    res.json({
      success: true,
      tenant: {
        ...tenant,
        productCount,
        userCount,
        orderCount,
        totalRevenue,
      },
      users: staffUsers,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 4. Request tenant deactivation (MANAGER only)
export async function requestTenantDeactivation(req: any, res: Response) {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID tidak ditemukan' });
    }

    const tenant = await tenantsCol.findOne({ id: tenantId });
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant tidak ditemukan' });
    }

    if (tenant.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Hanya tenant dengan status Aktif yang dapat mengajukan penonaktifan akun.',
      });
    }

    if (tenant.deactivationRequest && tenant.deactivationRequest.status === 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Pengajuan penonaktifan akun warung sebelumnya masih menunggu evaluasi oleh Admin.',
      });
    }

    const { reason, notes } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Alasan pengajuan penonaktifan akun wajib diisi.',
      });
    }

    const deactivationRequest = {
      id: `deact-${Date.now()}`,
      requestedBy: req.user.name,
      requestedByEmail: req.user.email,
      requestedAt: new Date().toISOString(),
      reason: reason.trim(),
      notes: (notes || '').trim(),
      status: 'PENDING',
    };

    await tenantsCol.updateOne(
      { id: tenantId },
      { $set: { deactivationRequest } }
    );

    await recordActivityLog({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      module: 'TENANT',
      action: 'REQUEST_DEACTIVATION',
      description: `Manajer ${req.user.name} mengajukan permohonan penonaktifan akun tenant "${tenant.name}". Alasan: ${reason.trim()}`,
      details: { reason: reason.trim(), notes },
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json({
      success: true,
      message: 'Permohonan penonaktifan akun berhasil diajukan! Menunggu evaluasi dan persetujuan oleh Admin Global.',
      deactivationRequest,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 5. Cancel tenant deactivation request (MANAGER only)
export async function cancelTenantDeactivation(req: any, res: Response) {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID tidak ditemukan' });
    }

    const tenant = await tenantsCol.findOne({ id: tenantId });
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant tidak ditemukan' });
    }

    if (!tenant.deactivationRequest || tenant.deactivationRequest.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada pengajuan penonaktifan yang berstatus menunggu evaluasi.',
      });
    }

    await tenantsCol.updateOne(
      { id: tenantId },
      { $unset: { deactivationRequest: '' } }
    );

    await recordActivityLog({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      module: 'TENANT',
      action: 'CANCEL_DEACTIVATION_REQUEST',
      description: `Manajer ${req.user.name} membatalkan pengajuan penonaktifan akun tenant "${tenant.name}".`,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json({
      success: true,
      message: 'Permohonan penonaktifan berhasil dibatalkan. Akun tenant tetap beroperasi aktif dan normal.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 6. Evaluate tenant deactivation request (ADMIN only: APPROVE or REJECT)
export async function evaluateTenantDeactivation(req: any, res: Response) {
  try {
    const tenant = await tenantsCol.findOne({ id: req.params.id });
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant tidak ditemukan' });
    }

    if (!tenant.deactivationRequest || tenant.deactivationRequest.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Tenant ini tidak memiliki permohonan penonaktifan yang menunggu evaluasi.',
      });
    }

    const { decision, rejectionReason } = req.body;
    if (!['APPROVE', 'REJECT'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Keputusan evaluasi tidak valid (harus APPROVE atau REJECT).',
      });
    }

    if (decision === 'APPROVE') {
      const updatedRequest = {
        ...tenant.deactivationRequest,
        status: 'APPROVED',
        evaluatedAt: new Date().toISOString(),
        evaluatedBy: req.user.name,
      };

      await tenantsCol.updateOne(
        { id: req.params.id },
        {
          $set: {
            status: 'INACTIVE',
            deactivationRequest: updatedRequest,
          },
        }
      );

      await recordActivityLog({
        tenantId: tenant.id,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        module: 'TENANT',
        action: 'APPROVE_DEACTIVATION',
        description: `Admin ${req.user.name} menyetujui permohonan penonaktifan tenant "${tenant.name}". Akun tenant dinonaktifkan (INACTIVE) dan akses seluruh pengguna ditutup.`,
        details: { evaluatedAt: updatedRequest.evaluatedAt, evaluatedBy: req.user.name },
        ipAddress: req.ip || '127.0.0.1',
      });

      res.json({
        success: true,
        message: `Permohonan penonaktifan tenant "${tenant.name}" disetujui. Akun telah dinonaktifkan dan seluruh kasir/manajer tidak dapat login lagi.`,
        tenantStatus: 'INACTIVE',
        deactivationRequest: updatedRequest,
      });
    } else {
      const updatedRequest = {
        ...tenant.deactivationRequest,
        status: 'REJECTED',
        evaluatedAt: new Date().toISOString(),
        evaluatedBy: req.user.name,
        rejectionReason: (rejectionReason || 'Ditolak berdasarkan pertimbangan Administrator Platform').trim(),
      };

      await tenantsCol.updateOne(
        { id: req.params.id },
        {
          $set: {
            deactivationRequest: updatedRequest,
          },
        }
      );

      await recordActivityLog({
        tenantId: tenant.id,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        module: 'TENANT',
        action: 'REJECT_DEACTIVATION',
        description: `Admin ${req.user.name} menolak permohonan penonaktifan tenant "${tenant.name}". Catatan: ${updatedRequest.rejectionReason}`,
        details: { rejectionReason: updatedRequest.rejectionReason },
        ipAddress: req.ip || '127.0.0.1',
      });

      res.json({
        success: true,
        message: `Permohonan penonaktifan tenant "${tenant.name}" ditolak. Akun tenant tetap beroperasi aktif.`,
        tenantStatus: tenant.status,
        deactivationRequest: updatedRequest,
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
