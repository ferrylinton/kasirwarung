import { Request, Response } from 'express';
import { ordersCol, productsCol, tenantsCol, ensureSeedOrdersForAdmin } from '../config/db.ts';

export async function getTenantDashboardStats(req: any, res: Response) {
  try {
    const tenantId = req.query.tenantId || req.user.tenantId;
    const orders = await ordersCol.find({ tenantId }).toArray();
    const products = await productsCol.find({ tenantId }).toArray();

    let totalOmzet = 0;
    let kasTunai = 0;
    let qrisTransfer = 0;
    let kasbon = 0;
    let kasbonPendingCount = 0;

    orders.forEach((o: any) => {
      totalOmzet += o.total;
      if (o.paymentMethod === 'TUNAI') {
        kasTunai += o.total;
      } else if (o.paymentMethod === 'QRIS' || o.paymentMethod === 'TRANSFER') {
        qrisTransfer += o.total;
      }
    });

    const lowStockCount = products.filter((p: any) => p.stock <= p.minStock).length;
    const totalCategories = new Set(products.map((p: any) => p.category)).size;

    const productSalesMap: { [key: string]: { name: string; count: number; revenue: number } } = {};
    orders.forEach((o: any) => {
      o.items.forEach((it: any) => {
        if (!productSalesMap[it.productId]) {
          productSalesMap[it.productId] = { name: it.name, count: 0, revenue: 0 };
        }
        productSalesMap[it.productId].count += it.qty;
        productSalesMap[it.productId].revenue += it.subtotal;
      });
    });

    const fastMoving = Object.values(productSalesMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      success: true,
      stats: {
        totalOmzet,
        kasTunai,
        qrisTransfer,
        kasbon,
        kasbonPendingCount,
        completedOrders: orders.length,
        totalProducts: products.length,
        totalCategories,
        lowStockCount,
        fastMoving,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAdminDashboardStats(req: any, res: Response) {
  try {
    await ensureSeedOrdersForAdmin();

    const { startDate, endDate, tenantId, preset } = req.query;

    const tenantsList = await tenantsCol.find().toArray();
    const tenantMap = new Map<string, string>();
    tenantsList.forEach((t: any) => tenantMap.set(t.id, t.name));

    let allOrders = await ordersCol.find().toArray();

    // Filter by tenantId if provided and not ALL
    if (tenantId && tenantId !== 'ALL') {
      allOrders = allOrders.filter((o: any) => o.tenantId === tenantId);
    }

    // Filter by Date Range
    if (startDate || endDate) {
      let start = 0;
      let end = Number.MAX_SAFE_INTEGER;

      if (startDate) {
        const s = new Date(startDate as string);
        if (!isNaN(s.getTime())) {
          start = s.getTime();
        }
      }

      if (endDate) {
        const e = new Date(endDate as string);
        if (!isNaN(e.getTime())) {
          if (typeof endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(endDate.trim())) {
            e.setHours(23, 59, 59, 999);
          }
          end = e.getTime();
        }
      }

      allOrders = allOrders.filter((o: any) => {
        const t = new Date(o.createdAt).getTime();
        return !isNaN(t) && t >= start && t <= end;
      });
    }

    // 1. Overall Stats
    const totalRevenue = allOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
    const totalOrders = allOrders.length;
    let totalProductsSold = 0;
    allOrders.forEach((o: any) => {
      (o.items || []).forEach((it: any) => {
        totalProductsSold += Number(it.qty) || 0;
      });
    });

    const uniqueActiveTenants = new Set(allOrders.map((o: any) => o.tenantId));
    const activeTenantsCount = uniqueActiveTenants.size;
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // 2. Omzet di Setiap Tenant
    const tenantsOmzet = tenantsList.map((t: any) => {
      const tenantOrders = allOrders.filter((o: any) => o.tenantId === t.id);
      const tRevenue = tenantOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
      let tItemsSold = 0;
      const pMap: { [key: string]: { name: string; qty: number; revenue: number } } = {};

      tenantOrders.forEach((o: any) => {
        (o.items || []).forEach((it: any) => {
          const qty = Number(it.qty) || 0;
          const subtotal = Number(it.subtotal) || 0;
          tItemsSold += qty;
          if (!pMap[it.productId]) {
            pMap[it.productId] = { name: it.name, qty: 0, revenue: 0 };
          }
          pMap[it.productId].qty += qty;
          pMap[it.productId].revenue += subtotal;
        });
      });

      const topProductList = Object.values(pMap).sort((a, b) => b.qty - a.qty);
      const topProduct = topProductList.length > 0 ? topProductList[0] : null;
      const revenuePercentage = totalRevenue > 0 ? Number(((tRevenue / totalRevenue) * 100).toFixed(1)) : 0;

      return {
        tenantId: t.id,
        tenantName: t.name,
        address: t.address,
        phone: t.phone,
        status: t.status,
        orderCount: tenantOrders.length,
        totalRevenue: tRevenue,
        itemsSold: tItemsSold,
        revenuePercentage,
        topProduct,
      };
    }).sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);

    // 3. 10 Produk Terlaris (Top 10 Best-Selling Products)
    const globalProductMap: {
      [key: string]: {
        productId: string;
        name: string;
        category: string;
        totalQty: number;
        totalRevenue: number;
        tenantId: string;
        tenantName: string;
      };
    } = {};

    allOrders.forEach((o: any) => {
      const orderTenantName = tenantMap.get(o.tenantId) || 'Warung';
      (o.items || []).forEach((it: any) => {
        const qty = Number(it.qty) || 0;
        const subtotal = Number(it.subtotal) || 0;
        const key = it.productId || it.name;

        if (!globalProductMap[key]) {
          globalProductMap[key] = {
            productId: it.productId || key,
            name: it.name,
            category: it.category || 'Sembako & Kebutuhan',
            totalQty: 0,
            totalRevenue: 0,
            tenantId: o.tenantId,
            tenantName: orderTenantName,
          };
        }
        globalProductMap[key].totalQty += qty;
        globalProductMap[key].totalRevenue += subtotal;
      });
    });

    const top10Products = Object.values(globalProductMap)
      .sort((a, b) => b.totalQty - a.totalQty || b.totalRevenue - a.totalRevenue)
      .slice(0, 10)
      .map((p) => ({
        productId: p.productId,
        name: p.name,
        category: p.category,
        totalQty: p.totalQty,
        totalRevenue: p.totalRevenue,
        averagePrice: p.totalQty > 0 ? Math.round(p.totalRevenue / p.totalQty) : 0,
        tenantName: p.tenantName,
      }));

    res.json({
      success: true,
      period: {
        startDate: startDate ? String(startDate) : '',
        endDate: endDate ? String(endDate) : '',
        preset: preset ? String(preset) : 'today',
      },
      stats: {
        totalRevenue,
        totalOrders,
        totalProductsSold,
        activeTenantsCount,
        totalTenants: tenantsList.length,
        averageOrderValue,
      },
      tenantsOmzet,
      top10Products,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
