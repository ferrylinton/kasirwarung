import { Request, Response } from 'express';
import { z } from 'zod';
import { ordersCol, productsCol, savedOrdersCol } from '../config/db.ts';
import { recordActivityLog } from '../utils/activityLogger.ts';

export const OrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    price: z.number().positive(),
    qty: z.number().int().positive(),
    subtotal: z.number().positive(),
  })).min(1, 'Keranjang belanja tidak boleh kosong'),
  tenderAmount: z.number().nonnegative(),
  paymentMethod: z.enum(['TUNAI', 'QRIS', 'TRANSFER', 'KASBON']),
});

export async function createOrder(req: any, res: Response) {
  try {
    const parsed = OrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Data transaksi kasir tidak valid',
        errors: parsed.error.issues,
      });
    }

    const tenantId = req.user.tenantId;
    const { items, tenderAmount, paymentMethod } = parsed.data;

    // Validate stock in MongoDB
    let computedTotal = 0;
    for (const item of items) {
      const prod = await productsCol.findOne({ id: item.productId, tenantId });
      if (!prod) {
        return res.status(400).json({ success: false, message: `Produk ${item.name} tidak ditemukan di database warung.` });
      }
      if (prod.stock < item.qty) {
        return res.status(400).json({
          success: false,
          message: `Stok "${prod.name}" tidak mencukupi (Tersisa: ${prod.stock} ${prod.unit}, Diminta: ${item.qty}).`,
        });
      }
      computedTotal += item.price * item.qty;
    }

    const total = computedTotal;
    let changeAmount = 0;

    if (paymentMethod === 'TUNAI') {
      if (tenderAmount < total) {
        return res.status(400).json({
          success: false,
          message: `Uang tunai Rp ${tenderAmount.toLocaleString('id-ID')} kurang dari total Rp ${total.toLocaleString('id-ID')}.`,
        });
      }
      changeAmount = tenderAmount - total;
    }

    // Atomically decrement stock in MongoDB
    for (const item of items) {
      await productsCol.updateOne(
        { id: item.productId, tenantId },
        { $inc: { stock: -item.qty } }
      );
    }

    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `TR-${randomSeq}`;
    const id = `order-${Date.now()}`;

    const newOrder = {
      id,
      orderNumber,
      tenantId,
      items,
      total,
      tenderAmount,
      changeAmount,
      paymentMethod,
      cashierName: req.user.name,
      createdAt: new Date().toISOString(),
    };

    await ordersCol.insertOne(newOrder);

    res.status(201).json({
      success: true,
      message: `Transaksi ${orderNumber} berhasil disimpan di MongoDB!`,
      order: newOrder,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memproses pesanan: ' + err.message });
  }
}

export async function getOrders(req: any, res: Response) {
  try {
    const tenantId = req.query.tenantId || req.user.tenantId;
    const query: any = {};
    if (req.user.role !== 'ADMIN' || tenantId) {
      query.tenantId = tenantId;
    }

    const payment = req.query.payment as string;
    if (payment && payment !== 'Semua' && payment !== 'Semua Pembayaran') {
      query.paymentMethod = payment.toUpperCase();
    }

    const q = (req.query.q as string || '').trim();
    if (q) {
      query.$or = [
        { orderNumber: { $regex: q, $options: 'i' } },
        { cashierName: { $regex: q, $options: 'i' } },
      ];
    }

    const orders = await ordersCol.find(query).sort({ createdAt: -1 }).toArray();

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateOrderStatus(req: any, res: Response) {
  try {
    const order = await ordersCol.findOne({ id: req.params.id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }

    if (order.tenantId !== req.user.tenantId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    res.json({
      success: true,
      message: `Transaksi ${order.orderNumber} telah diperbarui!`,
      order,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Saved Orders (Simpan Pesanan Sebelum Dibayar / Hold Orders)
export async function getSavedOrders(req: any, res: Response) {
  try {
    const tenantId = req.user.tenantId;
    const query: any = {};
    if (req.user.role !== 'ADMIN' || tenantId) {
      query.tenantId = tenantId;
    }
    const savedOrders = await savedOrdersCol.find(query).sort({ createdAt: -1 }).toArray();
    res.json({
      success: true,
      count: savedOrders.length,
      savedOrders,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal mengambil pesanan tersimpan: ' + err.message });
  }
}

export async function createSavedOrder(req: any, res: Response) {
  try {
    const { note, items, paymentMethod = 'TUNAI', tenderAmount = 0 } = req.body;
    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, message: 'Keterangan pesanan wajib diisi saat menyimpan pesanan.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada barang dalam pesanan untuk disimpan.' });
    }

    const tenantId = req.user.tenantId;
    const total = items.reduce((sum: number, it: any) => sum + (it.subtotal || (it.price * it.qty) || 0), 0);
    const itemCount = items.reduce((sum: number, it: any) => sum + (it.qty || 1), 0);
    const randomSeq = Math.floor(100 + Math.random() * 900);
    const orderNumber = `HOLD-${randomSeq}`;
    const id = `saved-${Date.now()}`;

    const savedOrder = {
      id,
      orderNumber,
      tenantId,
      note: note.trim(),
      items,
      total,
      itemCount,
      paymentMethod,
      tenderAmount,
      cashierName: req.user.name,
      createdAt: new Date().toISOString(),
    };

    await savedOrdersCol.insertOne(savedOrder);

    await recordActivityLog({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      module: 'CASHIER',
      action: 'HOLD_ORDER',
      description: `Menahan pesanan ${orderNumber} (${itemCount} item, Rp ${total.toLocaleString('id-ID')}) dengan keterangan: "${note.trim()}"`,
      details: { orderNumber, total, itemCount, note: note.trim() },
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
    });

    res.status(201).json({
      success: true,
      message: `Pesanan sementara ${orderNumber} berhasil disimpan!`,
      savedOrder,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal menyimpan pesanan: ' + err.message });
  }
}

export async function updateSavedOrderNote(req: any, res: Response) {
  try {
    const { note } = req.body;
    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, message: 'Keterangan pesanan tidak boleh kosong.' });
    }
    const existing = await savedOrdersCol.findOne({ id: req.params.id });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Pesanan tersimpan tidak ditemukan.' });
    }
    if (existing.tenantId !== req.user.tenantId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    await savedOrdersCol.updateOne({ id: req.params.id }, { $set: { note: note.trim() } });
    res.json({ success: true, message: 'Keterangan pesanan tersimpan berhasil diperbarui.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteSavedOrder(req: any, res: Response) {
  try {
    const existing = await savedOrdersCol.findOne({ id: req.params.id });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Pesanan tersimpan tidak ditemukan.' });
    }
    if (existing.tenantId !== req.user.tenantId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    await savedOrdersCol.deleteOne({ id: req.params.id });
    res.json({ success: true, message: 'Pesanan tersimpan telah dihapus.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
