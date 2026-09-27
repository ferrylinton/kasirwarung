import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Boxes,
  Barcode,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Product } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { ProductModal } from '../Modals/ProductModal';
import { ConfirmationModal } from '../Modals/ConfirmationModal';

interface ProductManagementViewProps {
  products: Product[];
  onRefreshProducts: () => void;
  onNavigateToCategories: () => void;
}

export const ProductManagementView: React.FC<ProductManagementViewProps> = ({
  products,
  onRefreshProducts,
  onNavigateToCategories,
}) => {
  const { t } = useTranslation();
  const { user, token } = useAuthStore();
  const { addToast } = useToastStore();

  const isManager = user?.role === 'MANAGER';

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'empty' | 'available'>('all');
  const [sortField, setSortField] = useState<'name' | 'price' | 'stock' | 'sku'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Distinct categories from products
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase()) ||
          p.category.toLowerCase().includes(search.toLowerCase());

        const matchesCategory =
          selectedCategory === 'Semua' ||
          p.category.toLowerCase() === selectedCategory.toLowerCase();

        let matchesStock = true;
        if (stockFilter === 'low') {
          matchesStock = p.stock <= p.minStock && p.stock > 0;
        } else if (stockFilter === 'empty') {
          matchesStock = p.stock <= 0;
        } else if (stockFilter === 'available') {
          matchesStock = p.stock > p.minStock;
        }

        return matchesSearch && matchesCategory && matchesStock;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [products, search, selectedCategory, stockFilter, sortField, sortOrder]);

  // Total pages and sliced data
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Handle Sort Toggle
  const handleSort = (field: 'name' | 'price' | 'stock' | 'sku') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // CRUD Operations
  const handleSaveProduct = async (productData: any) => {
    if (!isManager) {
      addToast({
        type: 'error',
        title: 'Akses Ditolak',
        message: 'Hanya role MANAGER yang berhak mengelola data produk.',
      });
      return;
    }

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan produk');
      }

      addToast({
        type: 'success',
        title: editingProduct ? 'Produk Diperbarui' : 'Produk Ditambahkan',
        message: data.message || `Produk "${productData.name}" berhasil disimpan.`,
      });

      setIsModalOpen(false);
      setEditingProduct(null);
      onRefreshProducts();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Gagal Menyimpan',
        message: err.message,
      });
      throw err;
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    if (!isManager) {
      addToast({
        type: 'error',
        title: 'Akses Ditolak',
        message: 'Hanya role MANAGER yang berhak menghapus produk.',
      });
      setDeletingProduct(null);
      return;
    }

    try {
      const res = await fetch(`/api/products/${deletingProduct.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menghapus produk');
      }

      addToast({
        type: 'success',
        title: 'Produk Dihapus',
        message: data.message || `Produk "${deletingProduct.name}" berhasil dihapus.`,
      });

      setDeletingProduct(null);
      onRefreshProducts();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Gagal Menghapus',
        message: err.message,
      });
    }
  };

  // Stats calculation
  const totalCount = products.length;
  const lowStockCount = products.filter((p) => p.stock <= p.minStock && p.stock > 0).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Package className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Manajemen Produk
              </h1>
              <p className="text-xs text-slate-500">
                Kelola data katalog sembako, SKU barcode, harga jual & modal, serta batas minimum stok.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToCategories}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-xs"
          >
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Manajemen Kategori</span>
          </button>

          {isManager && (
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-all shadow-md shadow-emerald-200"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Total Katalog Produk</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">{totalCount} Item</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-amber-700">Stok Menipis (Perlu Restock)</div>
            <div className="text-2xl font-black text-amber-600 mt-0.5 font-mono">{lowStockCount} Item</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-rose-700">Stok Habis (Kosong)</div>
            <div className="text-2xl font-black text-rose-600 mt-0.5 font-mono">{outOfStockCount} Item</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search, Filter Bar, and Page Size */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari berdasarkan nama sembako, kode SKU, atau kategori..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 focus:border-emerald-500 focus:outline-hidden"
            >
              <option value="Semua">Semua Kategori ({products.length})</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Stock Filter */}
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 focus:border-emerald-500 focus:outline-hidden"
            >
              <option value="all">Semua Status Stok</option>
              <option value="available">Stok Aman</option>
              <option value="low">Menipis (≤ Batas Minimal)</option>
              <option value="empty">Habis (0)</option>
            </select>

            {/* Page Size */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 focus:border-emerald-500 focus:outline-hidden"
            >
              <option value="5">5 baris</option>
              <option value="10">10 baris</option>
              <option value="20">20 baris</option>
              <option value="50">50 baris</option>
            </select>
          </div>
        </div>
      </div>

      {/* Zebra-Striped Responsive Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Produk</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('sku')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>SKU / Barcode</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Kategori</th>
                <th
                  onClick={() => handleSort('price')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Harga Jual</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Harga Modal</th>
                <th
                  onClick={() => handleSort('stock')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Stok / Batas</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto stroke-1 mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">Tidak ada produk yang cocok</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Coba ganti kata kunci pencarian atau sesuaikan filter Anda.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p, idx) => {
                  const isOutOfStock = p.stock <= 0;
                  const isLowStock = p.stock <= p.minStock && p.stock > 0;
                  const margin = p.price - (p.costPrice || 0);

                  // Zebra-striping: even rows gets light slate-50/70 background
                  const isEven = idx % 2 === 1;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-emerald-50/40 transition-colors ${
                        isEven ? 'bg-slate-50/70' : 'bg-white'
                      }`}
                    >
                      {/* Name & Photo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-slate-100 shrink-0"
                            loading="lazy"
                          />
                          <div className="truncate max-w-[200px] sm:max-w-xs">
                            <div className="font-bold text-slate-900 truncate">{p.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {p.description || `Satuan: ${p.unit}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU / Barcode */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[11px]">
                          {p.sku}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-semibold text-[11px]">
                          {p.category}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        Rp {p.price.toLocaleString('id-ID')}
                      </td>

                      {/* Cost Price */}
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        Rp {(p.costPrice || 0).toLocaleString('id-ID')}
                        {margin > 0 && (
                          <div className="text-[10px] text-emerald-600 font-semibold">
                            +Rp {margin.toLocaleString('id-ID')}
                          </div>
                        )}
                      </td>

                      {/* Stock / Min Stock */}
                      <td className="py-3.5 px-4 font-mono">
                        <span
                          className={`font-bold ${
                            isOutOfStock
                              ? 'text-rose-600'
                              : isLowStock
                              ? 'text-amber-600'
                              : 'text-slate-800'
                          }`}
                        >
                          {p.stock} {p.unit}
                        </span>
                        <div className="text-[10px] text-slate-400">Min: {p.minStock} {p.unit}</div>
                      </td>

                      {/* Status Pill */}
                      <td className="py-3.5 px-4">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            Habis
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                            Menipis
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Tersedia
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isManager ? (
                            <>
                              <button
                                onClick={() => {
                                  setEditingProduct(p);
                                  setIsModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors"
                                title="Ubah Produk"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingProduct(p)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors"
                                title="Hapus Produk"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Khusus Manager</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 border-t border-slate-200 text-xs">
          <div className="text-slate-500">
            Menampilkan <span className="font-bold text-slate-800">{paginatedProducts.length}</span> dari{' '}
            <span className="font-bold text-slate-800">{filteredProducts.length}</span> Produk • Halaman{' '}
            <span className="font-bold text-slate-800">{currentPage}</span> dari {totalPages}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pageNum = i + 1;
              const isCurrent = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {totalPages > 5 && <span className="text-slate-400 px-1 text-xs">...</span>}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Tambah & Edit Produk */}
      <ProductModal
        isOpen={isModalOpen}
        product={editingProduct}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
      />

      {/* Modal: Konfirmasi Hapus Produk */}
      <ConfirmationModal
        isOpen={Boolean(deletingProduct)}
        type="DELETE"
        title="Hapus Produk Sembako"
        description={`Apakah Anda yakin ingin menghapus "${deletingProduct?.name}" (SKU: ${deletingProduct?.sku})? Data transaksi riwayat lama tetap tersimpan di arsip.`}
        confirmText="Ya, Hapus Produk"
        cancelText="Batal"
        onConfirm={handleDeleteProduct}
        onCancel={() => setDeletingProduct(null)}
      />
    </div>
  );
};
