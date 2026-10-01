import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Product } from '../../types';
import { X, Package, Tag, AlertCircle, ShieldAlert } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { useAuthStore } from '../../stores/authStore';

const ProductFormSchema = z.object({
  name: z.string().min(2, 'Nama produk minimal 2 karakter'),
  sku: z.string().min(2, 'Kode SKU / Barcode minimal 2 karakter'),
  category: z.string().min(1, 'Pilih salah satu kategori'),
  price: z.number({ error: 'Harga ecer harus berupa angka' }).positive('Harga jual harus lebih besar dari 0'),
  costPrice: z.number({ error: 'Harga modal harus berupa angka' }).nonnegative('Harga modal tidak boleh negatif'),
  stock: z.number({ error: 'Stok harus berupa angka' }).int('Stok harus bilangan bulat').nonnegative('Stok tidak boleh negatif'),
  unit: z.string().min(1, 'Satuan wajib diisi (contoh: kg, bks, botol, karung)'),
  minStock: z.number({ error: 'Batas minimal harus angka' }).int().nonnegative('Batas minimal tidak boleh negatif'),
  description: z.string().default(''),
});

const CATEGORIES = [
  'Beras & Gandum',
  'Minyak & Margarin',
  'Bumbu Dapur',
  'Mie & Makanan Instan',
  'Minuman & Kopi',
  'Sembako Segar',
  'Kebersihan',
  'Camilan & Snack',
  'Perlengkapan Warung',
];

interface ProductModalProps {
  isOpen: boolean;
  product?: Product | null;
  onClose: () => void;
  onSave: (productData: any) => Promise<void>;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  product,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isEditing = Boolean(product);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Beras & Gandum',
    price: '',
    costPrice: '',
    stock: '',
    unit: 'bks',
    minStock: '5',
    description: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmUpdate, setShowConfirmUpdate] = useState(false);
  const [validatedData, setValidatedData] = useState<any>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku,
        category: product.category,
        price: product.price.toString(),
        costPrice: product.costPrice.toString(),
        stock: product.stock.toString(),
        unit: product.unit,
        minStock: product.minStock.toString(),
        description: product.description || '',
      });
    } else {
      setFormData({
        name: '',
        sku: `PRD-${Math.floor(100 + Math.random() * 900)}`,
        category: 'Beras & Gandum',
        price: '',
        costPrice: '',
        stock: '10',
        unit: 'bks',
        minStock: '5',
        description: '',
      });
    }
    setErrors({});
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedValues = {
      name: formData.name.trim(),
      sku: formData.sku.trim().toUpperCase(),
      category: formData.category,
      price: Number(formData.price),
      costPrice: Number(formData.costPrice || '0'),
      stock: Number(formData.stock),
      unit: formData.unit.trim(),
      minStock: Number(formData.minStock || '5'),
      description: formData.description.trim(),
    };

    const result = ProductFormSchema.safeParse(parsedValues);
    if (!result.success) {
      const fieldErrors: { [key: string]: string } = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setValidatedData(result.data);

    // If editing, require confirmation modal as requested by user prompt
    if (isEditing) {
      setShowConfirmUpdate(true);
    } else {
      executeSave(result.data);
    }
  };

  const executeSave = async (dataToSave: any) => {
    try {
      setIsSubmitting(true);
      await onSave(dataToSave);
      setShowConfirmUpdate(false);
      onClose();
    } catch (err: any) {
      console.error('Error saving product:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-100 my-8">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isEditing ? 'Ubah Data Produk' : 'Tambah Produk Baru'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isEditing ? `Perbarui informasi untuk ${product?.name}` : 'Masukkan rincian sembako atau produk warung'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Produk <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Beras Pandan Wangi 5kg"
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-slate-50/50 focus:bg-white focus:outline-hidden transition-all ${
                    errors.name ? 'border-rose-400 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:border-emerald-500'
                  }`}
                />
                {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
              </div>

              {/* SKU / Barcode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Kode SKU / Barcode <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="BRS-PW05"
                  className={`w-full px-3.5 py-2 text-sm font-mono rounded-xl border bg-slate-50/50 focus:bg-white focus:outline-hidden transition-all ${
                    errors.sku ? 'border-rose-400 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:border-emerald-500'
                  }`}
                />
                {errors.sku && <p className="text-xs text-rose-500 mt-1">{errors.sku}</p>}
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Kategori Produk <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-500 focus:outline-hidden transition-all"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errors.category && <p className="text-xs text-rose-500 mt-1">{errors.category}</p>}
              </div>

              {/* Selling Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Harga Ecer / Jual (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="74000"
                  className={`w-full px-3.5 py-2 text-sm font-mono rounded-xl border bg-slate-50/50 focus:bg-white focus:outline-hidden transition-all ${
                    errors.price ? 'border-rose-400 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:border-emerald-500'
                  }`}
                />
                {errors.price && <p className="text-xs text-rose-500 mt-1">{errors.price}</p>}
              </div>

              {/* Cost Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Harga Beli / Modal (Rp)
                </label>
                <input
                  type="number"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  placeholder="68000"
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-500 focus:outline-hidden transition-all"
                />
              </div>

              {/* Stock */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Jumlah Stok Saat Ini <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="24"
                  className={`w-full px-3.5 py-2 text-sm font-mono rounded-xl border bg-slate-50/50 focus:bg-white focus:outline-hidden transition-all ${
                    errors.stock ? 'border-rose-400 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:border-emerald-500'
                  }`}
                />
                {errors.stock && <p className="text-xs text-rose-500 mt-1">{errors.stock}</p>}
              </div>

              {/* Unit */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Satuan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="karung, bks, kg, pouch, botol"
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-slate-50/50 focus:bg-white focus:outline-hidden transition-all ${
                    errors.unit ? 'border-rose-400 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:border-emerald-500'
                  }`}
                />
                {errors.unit && <p className="text-xs text-rose-500 mt-1">{errors.unit}</p>}
              </div>

              {/* Min Stock */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Batas Peringatan Stok Menipis
                </label>
                <input
                  type="number"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  placeholder="5"
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-500 focus:outline-hidden transition-all"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Keterangan / Deskripsi Ringkas
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Catatan kemasan, kualitas atau info grosir..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-500 focus:outline-hidden transition-all"
                />
              </div>
            </div>

            {isAdmin && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{t('modals.productForm.adminDisabledNote', 'Tombol dinonaktifkan: Role ADMIN dilarang menambah atau mengubah data produk.')}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                {t('common.cancel', 'Batal')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isAdmin}
                className="px-6 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t('common.saving', 'Menyimpan...') : isEditing ? t('modals.productForm.submitEdit', 'Simpan Perubahan') : t('modals.productForm.submitAdd', 'Tambah Produk')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modal for Edit / Ubah Data */}
      <ConfirmationModal
        isOpen={showConfirmUpdate}
        type="UPDATE"
        title={t('modals.saveProductTitle', 'Simpan Perubahan Produk')}
        description={t('modals.saveProductDesc', { name: product?.name || '' })}
        confirmText={t('modals.saveProductConfirm', 'Ya, Simpan')}
        cancelText={t('common.cancel', 'Batal')}
        onConfirm={() => executeSave(validatedData)}
        onCancel={() => setShowConfirmUpdate(false)}
      />
    </>
  );
};
