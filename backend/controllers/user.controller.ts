import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { usersCol } from '../config/db.ts';
import { recordActivityLog } from '../utils/activityLogger.ts';

export const CashierUserSchema = z.object({
  name: z.string().min(2, 'Nama kasir minimal 2 karakter'),
  email: z.string().email('Format email kasir tidak valid'),
  password: z.string().min(6, 'Kata sandi kasir minimal 6 karakter'),
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
