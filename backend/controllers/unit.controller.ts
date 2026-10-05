import { Response } from 'express';
import { unitsCol, productsCol, activityLogsCol } from '../config/db.ts';
import { DEFAULT_CASHIER_UNITS } from '../config/seed.ts';
import { UnitDoc, UnitCategory } from '../models/index.ts';

/**
 * Helper to ensure user is a MANAGER for their tenant
 */
export function verifyManagerTenant(req: any, res: Response): { tenantId: string; user: any } | null {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Otentikasi diperlukan.' });
    return null;
  }

  if (req.user.role === 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Akses ditolak: Administrator sistem tidak terikat pada satu toko/tenant spesifik. Halaman ini khusus untuk role MANAGER toko.',
    });
    return null;
  }

  if (req.user.role !== 'MANAGER') {
    res.status(403).json({
      success: false,
      message: 'Akses ditolak: Hanya role MANAGER yang berhak mengelola istilah satuan kasir toko.',
    });
    return null;
  }

  const tenantId = req.user.tenantId;
  if (!tenantId) {
    res.status(400).json({
      success: false,
      message: 'ID Toko / Tenant tidak ditemukan pada profil Manager Anda.',
    });
    return null;
  }

  return { tenantId, user: req.user };
}

/**
 * GET /api/units
 * Retrieve all cashier measurement units for the manager's tenant with product usage counts
 */
export async function getUnits(req: any, res: Response) {
  const auth = verifyManagerTenant(req, res);
  if (!auth) return;

  const { tenantId } = auth;
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';

  try {
    // 1. Check if tenant has units yet; if none, seed default standard units automatically
    const existingCount = await unitsCol.countDocuments({ tenantId });
    if (existingCount === 0) {
      const now = new Date().toISOString();
      const defaultDocs: UnitDoc[] = DEFAULT_CASHIER_UNITS.map((u, idx) => ({
        id: `unit-${tenantId}-${u.symbol}-${idx + 1}`,
        tenantId,
        name: u.name,
        symbol: u.symbol.toLowerCase(),
        category: u.category as UnitCategory,
        description: u.description,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      }));
      await unitsCol.insertMany(defaultDocs);
    }

    // 2. Query units for this tenant
    const query: any = { tenantId };
    if (category && category !== 'ALL') {
      query.category = category;
    }

    let units: UnitDoc[] = await unitsCol.find(query).toArray();

    // 3. Client search filtering if provided
    if (search) {
      units = units.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.symbol.toLowerCase().includes(search) ||
          (u.description && u.description.toLowerCase().includes(search))
      );
    }

    // 4. Calculate product usage for each unit in this tenant
    const products = await productsCol.find({ tenantId }).toArray();
    const productUsageMap: Record<string, number> = {};

    for (const p of products) {
      if (p.unit) {
        const key = p.unit.trim().toLowerCase();
        productUsageMap[key] = (productUsageMap[key] || 0) + 1;
      }
    }

    const unitsWithStats = units.map((u) => {
      const symKey = u.symbol.toLowerCase();
      const nameKey = u.name.toLowerCase();
      // Match by symbol or name
      const count = (productUsageMap[symKey] || 0) + (productUsageMap[nameKey] && symKey !== nameKey ? productUsageMap[nameKey] : 0);
      return {
        ...u,
        productCount: count,
      };
    });

    // Sort: most used first, then alphabetically by name
    unitsWithStats.sort((a, b) => {
      if (b.productCount !== a.productCount) {
        return b.productCount - a.productCount;
      }
      return a.name.localeCompare(b.name);
    });

    // Summary statistics
    const allTenantUnits: UnitDoc[] = await unitsCol.find({ tenantId }).toArray();
    const stats = {
      totalUnits: allTenantUnits.length,
      eceranCount: allTenantUnits.filter((u) => u.category === 'ECERAN').length,
      kemasanCount: allTenantUnits.filter((u) => u.category === 'KEMASAN').length,
      timbanganCount: allTenantUnits.filter((u) => u.category === 'TIMBANGAN').length,
      volumeCount: allTenantUnits.filter((u) => u.category === 'VOLUME').length,
      ikatanCount: allTenantUnits.filter((u) => u.category === 'IKATAN').length,
      lainnyaCount: allTenantUnits.filter((u) => u.category === 'LAINNYA').length,
      totalProductsTracked: products.length,
    };

    return res.json({
      success: true,
      tenantId,
      units: unitsWithStats,
      stats,
    });
  } catch (err: any) {
    console.error('getUnits error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat daftar istilah satuan kasir: ' + err.message,
    });
  }
}

/**
 * GET /api/units/:id
 * Retrieve detail of a single unit
 */
export async function getUnitById(req: any, res: Response) {
  const auth = verifyManagerTenant(req, res);
  if (!auth) return;

  const { tenantId } = auth;
  const { id } = req.params;

  try {
    const unit = await unitsCol.findOne({ id, tenantId });
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Istilah satuan kasir tidak ditemukan.',
      });
    }

    // Find products using this unit
    const symRegex = new RegExp(`^${unit.symbol}$`, 'i');
    const products = await productsCol
      .find({
        tenantId,
        $or: [{ unit: symRegex }, { unit: new RegExp(`^${unit.name}$`, 'i') }],
      })
      .toArray();

    return res.json({
      success: true,
      unit: {
        ...unit,
        productCount: products.length,
        products: products.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.price,
          stock: p.stock,
          category: p.category,
        })),
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat detail satuan kasir: ' + err.message,
    });
  }
}

/**
 * POST /api/units
 * Create a new cashier measurement unit for the manager's tenant
 */
export async function createUnit(req: any, res: Response) {
  const auth = verifyManagerTenant(req, res);
  if (!auth) return;

  const { tenantId, user } = auth;
  const { name, symbol, category = 'ECERAN', description = '' } = req.body;

  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedSymbol = typeof symbol === 'string' ? symbol.trim().toLowerCase() : '';

  if (!trimmedName) {
    return res.status(400).json({
      success: false,
      message: 'Nama istilah satuan wajib diisi (misal: "Bungkus", "Renceng", "Pieces").',
    });
  }

  if (!trimmedSymbol) {
    return res.status(400).json({
      success: false,
      message: 'Singkatan / Simbol kasir wajib diisi (misal: "bks", "pcs", "kg").',
    });
  }

  const validCategories: UnitCategory[] = ['ECERAN', 'KEMASAN', 'TIMBANGAN', 'VOLUME', 'IKATAN', 'LAINNYA'];
  const finalCategory: UnitCategory = validCategories.includes(category) ? category : 'ECERAN';

  try {
    // Check duplicate name or symbol within this tenant
    const existing = await unitsCol.findOne({
      tenantId,
      $or: [
        { name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } },
        { symbol: trimmedSymbol },
      ],
    });

    if (existing) {
      const matchName = existing.name.toLowerCase() === trimmedName.toLowerCase();
      return res.status(400).json({
        success: false,
        message: matchName
          ? `Satuan dengan nama "${trimmedName}" sudah terdaftar untuk toko Anda.`
          : `Simbol kasir "${trimmedSymbol}" sudah digunakan oleh satuan "${existing.name}". Gunakan simbol lain.`,
      });
    }

    const now = new Date().toISOString();
    const newUnit: UnitDoc = {
      id: `unit-${tenantId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      name: trimmedName,
      symbol: trimmedSymbol,
      category: finalCategory,
      description: typeof description === 'string' ? description.trim() : '',
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    };

    await unitsCol.insertOne(newUnit);

    // Record activity log
    await activityLogsCol.insertOne({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      module: 'PRODUCT',
      action: 'CREATE_UNIT',
      description: `Manager ${user.name} menambahkan istilah satuan kasir baru: "${trimmedName}" (${trimmedSymbol})`,
      details: { unitId: newUnit.id, name: trimmedName, symbol: trimmedSymbol, category: finalCategory },
      createdAt: now,
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      message: `Satuan kasir "${trimmedName}" (${trimmedSymbol}) berhasil ditambahkan.`,
      unit: {
        ...newUnit,
        productCount: 0,
      },
    });
  } catch (err: any) {
    console.error('createUnit error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat istilah satuan kasir: ' + err.message,
    });
  }
}

/**
 * PUT /api/units/:id
 * Update an existing unit for the manager's tenant
 */
export async function updateUnit(req: any, res: Response) {
  const auth = verifyManagerTenant(req, res);
  if (!auth) return;

  const { tenantId, user } = auth;
  const { id } = req.params;
  const { name, symbol, category, description, syncProducts = true } = req.body;

  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedSymbol = typeof symbol === 'string' ? symbol.trim().toLowerCase() : '';

  if (!trimmedName || !trimmedSymbol) {
    return res.status(400).json({
      success: false,
      message: 'Nama satuan dan simbol kasir tidak boleh kosong.',
    });
  }

  const validCategories: UnitCategory[] = ['ECERAN', 'KEMASAN', 'TIMBANGAN', 'VOLUME', 'IKATAN', 'LAINNYA'];
  const finalCategory: UnitCategory = validCategories.includes(category) ? category : 'ECERAN';

  try {
    const existingUnit = await unitsCol.findOne({ id, tenantId });
    if (!existingUnit) {
      return res.status(404).json({
        success: false,
        message: 'Istilah satuan kasir tidak ditemukan.',
      });
    }

    // Check duplicate excluding self
    const duplicate = await unitsCol.findOne({
      tenantId,
      id: { $ne: id },
      $or: [
        { name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } },
        { symbol: trimmedSymbol },
      ],
    });

    if (duplicate) {
      const matchName = duplicate.name.toLowerCase() === trimmedName.toLowerCase();
      return res.status(400).json({
        success: false,
        message: matchName
          ? `Satuan dengan nama "${trimmedName}" sudah digunakan oleh entri lain.`
          : `Simbol kasir "${trimmedSymbol}" sudah digunakan oleh satuan "${duplicate.name}".`,
      });
    }

    const now = new Date().toISOString();
    const oldSymbol = existingUnit.symbol;

    await unitsCol.updateOne(
      { id, tenantId },
      {
        $set: {
          name: trimmedName,
          symbol: trimmedSymbol,
          category: finalCategory,
          description: typeof description === 'string' ? description.trim() : '',
          updatedAt: now,
        },
      }
    );

    // If symbol changed and syncProducts is true, update products that used oldSymbol
    let updatedProductsCount = 0;
    if (oldSymbol !== trimmedSymbol && syncProducts) {
      const updateResult = await productsCol.updateMany(
        {
          tenantId,
          unit: { $regex: new RegExp(`^${oldSymbol}$`, 'i') },
        },
        {
          $set: {
            unit: trimmedSymbol,
            updatedAt: now,
          },
        }
      );
      updatedProductsCount = updateResult.modifiedCount || 0;
    }

    // Record activity log
    await activityLogsCol.insertOne({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      module: 'PRODUCT',
      action: 'UPDATE_UNIT',
      description: `Manager ${user.name} memperbarui istilah satuan: "${existingUnit.name}" -> "${trimmedName}" (${trimmedSymbol})`,
      details: {
        unitId: id,
        oldSymbol,
        newSymbol: trimmedSymbol,
        updatedProductsCount,
      },
      createdAt: now,
    }).catch(() => {});

    // Recalculate usage count
    const currentUsage = await productsCol.countDocuments({
      tenantId,
      unit: { $regex: new RegExp(`^${trimmedSymbol}$`, 'i') },
    });

    return res.json({
      success: true,
      message: `Satuan kasir "${trimmedName}" berhasil diperbarui.${
        updatedProductsCount > 0 ? ` (${updatedProductsCount} produk terkait otomatis disinkronkan)` : ''
      }`,
      unit: {
        id,
        tenantId,
        name: trimmedName,
        symbol: trimmedSymbol,
        category: finalCategory,
        description: typeof description === 'string' ? description.trim() : '',
        updatedAt: now,
        productCount: currentUsage,
      },
      updatedProductsCount,
    });
  } catch (err: any) {
    console.error('updateUnit error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui istilah satuan kasir: ' + err.message,
    });
  }
}

/**
 * DELETE /api/units/:id
 * Delete a unit for the manager's tenant
 */
export async function deleteUnit(req: any, res: Response) {
  const auth = verifyManagerTenant(req, res);
  if (!auth) return;

  const { tenantId, user } = auth;
  const { id } = req.params;
  const force = req.query.force === 'true';

  try {
    const unit = await unitsCol.findOne({ id, tenantId });
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Istilah satuan kasir tidak ditemukan.',
      });
    }

    // Check if products are using this unit
    const inUseCount = await productsCol.countDocuments({
      tenantId,
      unit: { $regex: new RegExp(`^${unit.symbol}$`, 'i') },
    });

    if (inUseCount > 0 && !force) {
      return res.status(400).json({
        success: false,
        inUse: true,
        productCount: inUseCount,
        message: `Satuan "${unit.name}" (${unit.symbol}) masih digunakan oleh ${inUseCount} produk aktif. Harap ubah satuan produk tersebut terlebih dahulu atau gunakan konfirmasi hapus paksa.`,
      });
    }

    await unitsCol.deleteOne({ id, tenantId });

    // Record activity log
    await activityLogsCol.insertOne({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      module: 'PRODUCT',
      action: 'DELETE_UNIT',
      description: `Manager ${user.name} menghapus istilah satuan kasir: "${unit.name}" (${unit.symbol})`,
      details: { unitId: id, name: unit.name, symbol: unit.symbol, inUseCount },
      createdAt: new Date().toISOString(),
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Satuan kasir "${unit.name}" (${unit.symbol}) berhasil dihapus.`,
      deletedUnitId: id,
    });
  } catch (err: any) {
    console.error('deleteUnit error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus istilah satuan kasir: ' + err.message,
    });
  }
}

/**
 * POST /api/units/seed-defaults
 * Restore or append standard Indonesian cashier units for the manager's tenant
 */
export async function seedDefaults(req: any, res: Response) {
  const auth = verifyManagerTenant(req, res);
  if (!auth) return;

  const { tenantId, user } = auth;
  const overwrite = req.body.overwrite === true;

  try {
    const now = new Date().toISOString();

    if (overwrite) {
      await unitsCol.deleteMany({ tenantId });
    }

    let addedCount = 0;
    for (let i = 0; i < DEFAULT_CASHIER_UNITS.length; i++) {
      const u = DEFAULT_CASHIER_UNITS[i];
      const existing = await unitsCol.findOne({
        tenantId,
        $or: [
          { symbol: u.symbol.toLowerCase() },
          { name: { $regex: new RegExp(`^${u.name}$`, 'i') } },
        ],
      });

      if (!existing) {
        await unitsCol.insertOne({
          id: `unit-${tenantId}-${u.symbol}-${Date.now()}-${i}`,
          tenantId,
          name: u.name,
          symbol: u.symbol.toLowerCase(),
          category: u.category as UnitCategory,
          description: u.description,
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        });
        addedCount++;
      }
    }

    await activityLogsCol.insertOne({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      module: 'PRODUCT',
      action: 'SEED_UNITS',
      description: `Manager ${user.name} memuat ${addedCount} istilah satuan standar kasir toko`,
      createdAt: now,
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Berhasil menambahkan ${addedCount} satuan standar kasir kelontong untuk toko Anda.`,
      addedCount,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat satuan standar: ' + err.message,
    });
  }
}
