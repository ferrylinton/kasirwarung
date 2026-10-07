import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { usersCol } from '../config/db.ts';
import { tokenStore } from '../tokenStore.ts';
import { recordActivityLog } from '../utils/activityLogger.ts';

export const CashierUserSchema = z.object({
  name: z.string().min(2, 'Nama kasir minimal 2 karakter'),
  email: z.string().email('Format email kasir tidak valid'),
  password: z.string().min(6, 'Kata sandi kasir minimal 6 karakter'),
});

export const UpdateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const AdminChangePasswordSchema = z.object({
  newPassword: z.string().min(6, 'Kata sandi baru minimal 6 karakter'),
});

export async function createCashier(req: any, res: Response) {
  try {
    const parsed = CashierUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Data kasir tidak valid',
        errors: parsed.error.issues,
      });
    }

    const { name, email, password } = parsed.data;
    const tenantId = req.user.tenantId;
    const tenantName = req.user.tenantName;

    const existing = await usersCol.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email kasir sudah digunakan oleh akun lain.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = `user-cashier-${Date.now()}`;

    const newCashier = {
      id,
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: 'CASHIER',
      tenantId,
      tenantName,
      isVerified: true,
      createdAt: new Date().toISOString(),
    };

    await usersCol.insertOne(newCashier);

    await recordActivityLog({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      module: 'CASHIER',
      action: 'CREATE_CASHIER',
      description: `Mendaftarkan staf kasir baru "${name}" (${email.toLowerCase()})`,
      details: { cashierId: newCashier.id, name, email: email.toLowerCase() },
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
    });

    res.status(201).json({
      success: true,
      message: `Akun kasir "${name}" berhasil disimpan di MongoDB!`,
      user: {
        id: newCashier.id,
        name: newCashier.name,
        email: newCashier.email,
        role: newCashier.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal membuat akun kasir: ' + err.message });
  }
}

export async function getCashiers(req: any, res: Response) {
  try {
    const tenantId = req.user.tenantId;
    const cashiers = await usersCol
      .find({ tenantId, role: 'CASHIER' })
      .project({ passwordHash: 0 })
      .toArray();

    res.json({ success: true, count: cashiers.length, cashiers });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteCashier(req: any, res: Response) {
  try {
    const user = await usersCol.findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Akun kasir tidak ditemukan' });
    }

    if (user.tenantId !== req.user.tenantId) {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    await usersCol.deleteOne({ id: req.params.id });

    await recordActivityLog({
      tenantId: user.tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      module: 'CASHIER',
      action: 'DELETE_CASHIER',
      description: `Menghapus akun staf kasir "${user.name}" (${user.email})`,
      details: { cashierId: user.id, name: user.name, email: user.email },
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
    });

    res.json({ success: true, message: `Akun kasir "${user.name}" berhasil dihapus dari MongoDB.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Get all users across all tenants (Role: ADMIN only)
 */
export async function getAllUsers(req: any, res: Response) {
  try {
    const users = await usersCol
      .find({})
      .project({ passwordHash: 0, verificationToken: 0 })
      .sort({ createdAt: -1 })
      .toArray();

    const formatted = users.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      tenantId: u.tenantId || null,
      tenantName: u.tenantName || (u.role === 'ADMIN' ? 'Sistem Global (Admin)' : 'Tanpa Warung'),
      isActive: u.isActive !== false,
      isVerified: Boolean(u.isVerified),
      phone: u.phone || '-',
      createdAt: u.createdAt || new Date().toISOString(),
      updatedAt: u.updatedAt,
    }));

    res.json({
      success: true,
      count: formatted.length,
      users: formatted,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat daftar pengguna: ' + err.message });
  }
}

/**
 * Update user active status (deactivate or reactivate) across any tenant (Role: ADMIN only)
 */
export async function updateUserStatus(req: any, res: Response) {
  try {
    const { id } = req.params;
    const parsed = UpdateUserStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Format status pengguna tidak valid',
      });
    }

    const { isActive } = parsed.data;

    const targetUser = await usersCol.findOne({ id });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    // Protection: Admin cannot deactivate their own active account
    if (req.user.id === targetUser.id && !isActive) {
      return res.status(400).json({
        success: false,
        message: 'Tindakan ditolak: Anda tidak dapat menonaktifkan akun Admin Anda sendiri!',
      });
    }

    const nowStr = new Date().toISOString();
    await usersCol.updateOne(
      { id },
      { $set: { isActive, updatedAt: nowStr } }
    );

    // If deactivated, terminate active logged-in cache in tokenStore
    if (!isActive) {
      await tokenStore.removeLoggedUserStatus(targetUser.id);
    }

    await recordActivityLog({
      tenantId: targetUser.tenantId || 'SYSTEM',
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      module: 'USER',
      action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      description: `Administrator ${isActive ? 'mengaktifkan' : 'menonaktifkan'} akun "${targetUser.name}" (${targetUser.email}) pada ${targetUser.tenantName || 'Sistem Global'}`,
      details: {
        targetUserId: targetUser.id,
        targetEmail: targetUser.email,
        targetRole: targetUser.role,
        targetTenantId: targetUser.tenantId,
        targetTenantName: targetUser.tenantName,
        newStatus: isActive ? 'ACTIVE' : 'INACTIVE',
      },
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
    });

    res.json({
      success: true,
      message: `Status akun "${targetUser.name}" berhasil ${isActive ? 'diaktifkan' : 'dinonaktifkan'}.`,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        isActive,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal mengubah status pengguna: ' + err.message });
  }
}

/**
 * Change / reset password for any user across any tenant (Role: ADMIN only)
 */
export async function adminChangeUserPassword(req: any, res: Response) {
  try {
    const { id } = req.params;
    const parsed = AdminChangePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Kata sandi baru minimal 6 karakter',
      });
    }

    const { newPassword } = parsed.data;

    const targetUser = await usersCol.findOne({ id });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    const nowStr = new Date().toISOString();

    await usersCol.updateOne(
      { id },
      { $set: { passwordHash, updatedAt: nowStr } }
    );

    // Remove active session cache to require fresh login with new password
    await tokenStore.removeLoggedUserStatus(targetUser.id);

    await recordActivityLog({
      tenantId: targetUser.tenantId || 'SYSTEM',
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      module: 'USER',
      action: 'ADMIN_CHANGE_PASSWORD',
      description: `Administrator mengatur ulang kata sandi akun "${targetUser.name}" (${targetUser.email})`,
      details: {
        targetUserId: targetUser.id,
        targetEmail: targetUser.email,
        targetRole: targetUser.role,
        targetTenant: targetUser.tenantName || 'Global Admin',
      },
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
    });

    res.json({
      success: true,
      message: `Kata sandi untuk pengguna "${targetUser.name}" (${targetUser.email}) berhasil diperbarui.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui kata sandi: ' + err.message });
  }
}

