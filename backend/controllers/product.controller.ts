import { Request, Response } from 'express';
import { z } from 'zod';
import { productsCol } from '../config/db.ts';
import { recordActivityLog } from '../utils/activityLogger.ts';

export const ProductSchema = z.object({
  name: z.string().min(2, 'Nama produk minimal 2 karakter'),
  sku: z.string().min(2, 'Kode SKU / Barcode minimal 2 karakter'),
  category: z.string().min(2, 'Kategori wajib dipilih'),
  price: z.number().positive('Harga jual harus lebih dari 0'),
  costPrice: z.number().nonnegative('Harga modal tidak boleh negatif'),
  stock: z.number().int().nonnegative('Stok tidak boleh negatif'),
  unit: z.string().min(1, 'Satuan produk wajib diisi (e.g. pcs, kg, bks)'),
  minStock: z.number().int().nonnegative('Batas stok minimal tidak boleh negatif').default(5),
});

const escapeSearchRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stripDescription = (p: any) => {
  if (!p) return p;
  const { description, ...rest } = p;
  return rest;
};

export async function searchProducts(req: any, res: Response) {
  try {
    const tenantId = req.query.tenantId || req.user.tenantId;
    if (!tenantId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Tenant ID diperlukan' });
    }

    const q = (req.query.q as string || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit as string || '10', 10), 1), 50);

    const query: any = {};
    if (req.user.role !== 'ADMIN' || tenantId) {
      query.tenantId = tenantId;
    }

    if (q) {
      const safeQ = escapeSearchRegex(q);
      query.$or = [
        { name: { $regex: safeQ, $options: 'i' } },
        { sku: { $regex: safeQ, $options: 'i' } },
        { category: { $regex: safeQ, $options: 'i' } },
      ];
    }

    const products = await productsCol
      .find(query)
      .sort({ isPopular: -1, name: 1 })
      .limit(limit)
      .toArray();

    res.json({
      success: true,
      query: q,
      count: products.length,
      products: products.map(stripDescription),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal mencari produk: ' + err.message });
  }
}

export async function getProducts(req: any, res: Response) {
  try {
    const tenantId = req.query.tenantId || req.user.tenantId;
    if (!tenantId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Tenant ID diperlukan' });
    }

    const query: any = {};
    if (req.user.role !== 'ADMIN' || tenantId) {
      query.tenantId = tenantId;
    }

    const category = req.query.category as string;
    if (category && category !== 'Semua' && category !== 'Semua Produk') {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    const q = (req.query.q as string || '').trim();
    if (q) {
      const safeQ = escapeSearchRegex(q);
      query.$or = [
        { name: { $regex: safeQ, $options: 'i' } },
        { sku: { $regex: safeQ, $options: 'i' } },
        { category: { $regex: safeQ, $options: 'i' } },
      ];
    }

    const stockStatus = req.query.stockStatus as string;
    if (stockStatus === 'low') {
      query.$expr = { $lte: ['$stock', '$minStock'] };
    }

    const products = await productsCol.find(query).sort({ isPopular: -1, name: 1 }).toArray();

    res.json({
      success: true,
      count: products.length,
      products: products.map(stripDescription),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createProduct(req: any, res: Response) {
  try {
    const parsed = ProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Data produk tidak valid',
        errors: parsed.error.issues,
      });
    }

    const tenantId = req.user.tenantId;
    const { name, sku, category, price, costPrice, stock, unit, minStock } = parsed.data;

    const existingSku = await productsCol.findOne({
      tenantId,
      sku: sku.toUpperCase(),
    });
    if (existingSku) {
      return res.status(400).json({ success: false, message: `SKU / Barcode "${sku}" sudah terdaftar pada produk "${existingSku.name}"` });
    }

    const id = `prod-${Date.now()}`;
    const newProduct = {
      id,
      tenantId,
      name,
      sku: sku.toUpperCase(),
      category,
      price,
      costPrice,
      stock,
      unit,
      minStock,
      imageUrl: req.body.imageUrl || `https://picsum.photos/seed/${sku}/300/300`,
      isPopular: false,
      createdAt: new Date().toISOString(),
    };

    await productsCol.insertOne(newProduct);

    await recordActivityLog({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      module: 'PRODUCT',
      action: 'CREATE_PRODUCT',
      description: `Menambahkan produk baru "${name}" (SKU: ${sku.toUpperCase()}, Kategori: ${category}, Stok: ${stock} ${unit}, Rp ${price.toLocaleString('id-ID')})`,
      details: { productId: newProduct.id, name, sku: sku.toUpperCase(), category, price, costPrice, stock, unit },
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
    });

    res.status(201).json({
      success: true,
      message: `Produk "${name}" berhasil disimpan di MongoDB!`,
      product: newProduct,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal menambah produk: ' + err.message });
  }
}

export async function updateProduct(req: any, res: Response) {
  try {
    const product = await productsCol.findOne({ id: req.params.id });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    }

    if (product.tenantId !== req.user.tenantId) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Produk ini bukan milik warung Anda.' });
    }

    const parsed = ProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Data produk tidak valid',
        errors: parsed.error.issues,
      });
    }

    const { name, sku, category, price, costPrice, stock, unit, minStock } = parsed.data;

    const updateData: any = {
      name,
      sku: sku.toUpperCase(),
      category,
      price,
      costPrice,
      stock,
      unit,
      minStock,
    };
    if (req.body.imageUrl) updateData.imageUrl = req.body.imageUrl;

    await productsCol.updateOne({ id: req.params.id }, { $set: updateData, $unset: { description: '' } });

    // Clean up description if present
    const updatedProduct = { ...product, ...updateData };
    delete (updatedProduct as any).description;

    await recordActivityLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      module: 'PRODUCT',
      action: 'UPDATE_PRODUCT',
      description: `Memperbarui data produk "${name}" (SKU: ${sku.toUpperCase()}, Kategori: ${category}, Stok: ${stock} ${unit}, Rp ${price.toLocaleString('id-ID')})`,
      details: { productId: req.params.id, name, sku: sku.toUpperCase(), category, price, costPrice, stock, unit, oldData: { name: product.name, price: product.price, stock: product.stock, category: product.category } },
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
    });

    res.json({
      success: true,
      message: `Data produk "${name}" berhasil diperbarui di MongoDB!`,
      product: updatedProduct,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui produk: ' + err.message });
  }
}

export async function deleteProduct(req: any, res: Response) {
  try {
    const product = await productsCol.findOne({ id: req.params.id });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    }

    if (product.tenantId !== req.user.tenantId) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Produk ini bukan milik warung Anda.' });
    }

    await productsCol.deleteOne({ id: req.params.id });

    await recordActivityLog({
      tenantId: product.tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      module: 'PRODUCT',
      action: 'DELETE_PRODUCT',
      description: `Menghapus produk "${product.name}" (SKU: ${product.sku}, Kategori: ${product.category})`,
      details: { productId: product.id, name: product.name, sku: product.sku, category: product.category, price: product.price },
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
    });

    res.json({ success: true, message: `Produk "${product.name}" berhasil dihapus dari MongoDB.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getCategories(req: any, res: Response) {
  try {
    const tenantId = req.query.tenantId || req.user.tenantId;
    const categories = await productsCol.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray();

    const categoryList = categories.map((c: any) => ({
      name: c._id,
      count: c.count,
    }));

    res.json({
      success: true,
      totalCategories: categoryList.length,
      categories: categoryList,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function createCategory(req: any, res: Response) {
  try {
    const name = (req.body.name || '').trim();
    if (!name || name.length < 2) {
      return res.status(400).json({ success: false, message: 'Nama kategori minimal 2 karakter' });
    }
    const tenantId = req.user.tenantId;

    const existing = await productsCol.findOne({ tenantId, category: name });
    if (existing) {
      return res.status(400).json({ success: false, message: `Kategori "${name}" sudah ada dalam sistem warung Anda.` });
    }

    await recordActivityLog({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      module: 'CATEGORY',
      action: 'CREATE_CATEGORY',
      description: `Membuat kategori produk baru "${name}"`,
      details: { categoryName: name },
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
    });

    res.status(201).json({
      success: true,
      message: `Kategori "${name}" siap digunakan untuk produk sembako!`,
      category: { name, count: 0 },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function renameCategory(req: any, res: Response) {
  try {
    const { oldCategory, newCategory } = req.body;
    if (!oldCategory || !newCategory) {
      return res.status(400).json({ success: false, message: 'Kategori lama dan baru wajib diisi' });
    }
    const tenantId = req.user.tenantId;
    await productsCol.updateMany(
      { tenantId, category: oldCategory },
      { $set: { category: newCategory } }
    );

    await recordActivityLog({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      module: 'CATEGORY',
      action: 'UPDATE_CATEGORY',
      description: `Mengubah nama kategori "${oldCategory}" menjadi "${newCategory}"`,
      details: { oldCategory, newCategory },
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
    });

    res.json({ success: true, message: `Kategori "${oldCategory}" berhasil diubah menjadi "${newCategory}".` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteCategory(req: any, res: Response) {
  try {
    const categoryName = decodeURIComponent(req.params.name);
    const tenantId = req.user.tenantId;
    const count = await productsCol.countDocuments({ tenantId, category: categoryName });
    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: `Kategori "${categoryName}" tidak dapat dihapus karena masih digunakan oleh ${count} produk. Silakan ubah kategori produk terlebih dahulu.`,
      });
    }
    await recordActivityLog({
      tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      module: 'CATEGORY',
      action: 'DELETE_CATEGORY',
      description: `Menghapus kategori produk "${categoryName}"`,
      details: { categoryName },
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
    });

    res.json({ success: true, message: `Kategori "${categoryName}" berhasil dihapus.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
