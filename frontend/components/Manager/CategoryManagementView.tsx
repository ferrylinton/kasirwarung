import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Boxes,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Product } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { ConfirmationModal } from '../Modals/ConfirmationModal';
import { PageSizeSelect } from './PageSizeSelect';

interface CategoryItem {
  name: string;
  count: number;
}

interface CategoryManagementViewProps {
  products: Product[];
  onRefreshProducts: () => void;
  onNavigateToProducts: () => void;
}

export const CategoryManagementView: React.FC<CategoryManagementViewProps> = ({
  products,
  onRefreshProducts,
  onNavigateToProducts,
}) => {
  const { t } = useTranslation();
  const { user, token } = useAuthStore();
  const { addToast } = useToastStore();

  const isManager = user?.role === 'MANAGER';

  // Search & Sorting
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'name' | 'count'>('count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Categories Data
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<CategoryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories from backend API
  const fetchCategories = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/categories', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [token, products]);

  // Filtered & Sorted Categories
  const filteredCategories = useMemo(() => {
    return categories
      .filter((cat) => cat.name.toLowerCase().includes(search.toLowerCase()))
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
  }, [categories, search, sortField, sortOrder]);

  // Total pages and sliced data
  const totalPages = Math.ceil(filteredCategories.length / pageSize) || 1;
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCategories.slice(start, start + pageSize);
  }, [filteredCategories, currentPage, pageSize]);

  // Handle Sort Toggle
  const handleSort = (field: 'name' | 'count') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'count' ? 'desc' : 'asc');
    }
  };

  // Add Category Handler
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      addToast({
        type: 'warning',
        title: 'Nama Kategori Kosong',
        message: 'Masukkan nama kategori yang valid.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menambah kategori');
      }

      addToast({
        type: 'success',
        title: 'Kategori Berhasil Dibuat',
        message: data.message || `Kategori "${trimmed}" siap digunakan.`,
      });

      setNewCategoryName('');
      setIsAddModalOpen(false);
      fetchCategories();
      onRefreshProducts();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Gagal Menambah Kategori',
        message: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rename Category Handler
  const handleRenameCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const trimmed = editCategoryName.trim();
    if (!trimmed || trimmed === editingCategory.name) {
      setEditingCategory(null);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/categories/rename', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldCategory: editingCategory.name,
          newCategory: trimmed,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengubah kategori');
      }

      addToast({
        type: 'success',
        title: 'Kategori Diperbarui',
        message: data.message || `Kategori "${editingCategory.name}" diubah menjadi "${trimmed}".`,
      });

      setEditingCategory(null);
      setEditCategoryName('');
      fetchCategories();
      onRefreshProducts();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Gagal Mengubah Kategori',
        message: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Category Handler
  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    if (deletingCategory.count > 0) {
      addToast({
        type: 'error',
        title: 'Kategori Tidak Dapat Dihapus',
        message: `Kategori "${deletingCategory.name}" masih memuat ${deletingCategory.count} produk. Harap pindahkan produk terlebih dahulu.`,
      });
      setDeletingCategory(null);
      return;
    }

    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(deletingCategory.name)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menghapus kategori');
      }

      addToast({
        type: 'success',
        title: 'Kategori Dihapus',
        message: data.message || `Kategori "${deletingCategory.name}" berhasil dihapus.`,
      });

      setDeletingCategory(null);
      fetchCategories();
      onRefreshProducts();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Gagal Menghapus Kategori',
        message: err.message,
      });
    }
  };

  // Total products across all categories
  const totalCategoryCount = categories.length;
  const totalItemCount = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-purple-100 text-purple-800">
            <Layers className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Manajemen Kategori
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToProducts}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-xs"
          >
            <Package className="w-4 h-4 text-emerald-600" />
            <span>Manajemen Produk</span>
          </button>

          {isManager && (
            <button
              onClick={() => {
                setNewCategoryName('');
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-all shadow-md shadow-emerald-200"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kategori Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Total Kategori Aktif</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">{totalCategoryCount} Kategori</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Total Produk Terkategori</div>
            <div className="text-2xl font-black text-emerald-700 mt-0.5 font-mono">{totalItemCount} Produk</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Rata-rata Produk/Kategori</div>
            <div className="text-2xl font-black text-slate-800 mt-0.5 font-mono">
              {totalCategoryCount > 0 ? (totalItemCount / totalCategoryCount).toFixed(1) : 0} Item
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Page Size Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari kategori sembako..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-slate-500 dark:text-slate-400">Baris per halaman:</span>
          <PageSizeSelect
            value={pageSize}
            onChange={(val) => {
              setPageSize(val);
              setCurrentPage(1);
            }}
            options={[5, 10, 20, 50]}
          />
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
                    <span>Nama Kategori</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('count')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Jumlah Produk</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Persentase Katalog</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCategories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <Layers className="w-10 h-10 mx-auto stroke-1 mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">Tidak ada kategori yang cocok</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Coba ganti kata kunci pencarian atau tambah kategori baru.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedCategories.map((c, idx) => {
                  const percentage = totalItemCount > 0 ? ((c.count / totalItemCount) * 100).toFixed(1) : '0';
                  const isEven = idx % 2 === 1;

                  return (
                    <tr
                      key={c.name}
                      className={`hover:bg-purple-50/40 transition-colors ${
                        isEven ? 'bg-slate-50/70' : 'bg-white'
                      }`}
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                        </div>
                      </td>

                      {/* Count */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-800 text-xs px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200">
                          {c.count} Produk
                        </span>
                      </td>

                      {/* Percentage & Progress bar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3 max-w-xs">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-linear-to-r from-emerald-500 to-teal-500 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(5, Number(percentage)))}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono font-semibold text-slate-500 w-12 text-right">
                            {percentage}%
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isManager ? (
                            <>
                              <button
                                onClick={() => {
                                  setEditingCategory(c);
                                  setEditCategoryName(c.name);
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors"
                                title="Ubah Nama Kategori"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingCategory(c)}
                                disabled={c.count > 0}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  c.count > 0
                                    ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                                    : 'border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-600'
                                }`}
                                title={c.count > 0 ? 'Pindahkan produk terlebih dahulu untuk menghapus kategori ini' : 'Hapus Kategori'}
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
            Menampilkan <span className="font-bold text-slate-800">{paginatedCategories.length}</span> dari{' '}
            <span className="font-bold text-slate-800">{filteredCategories.length}</span> Kategori • Halaman{' '}
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

      {/* Modal: Tambah Kategori Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Tambah Kategori Baru</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kategori Sembako <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Contoh: Susu & Olahan Keju, Makanan Ringan"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500">
                💡 Setelah kategori dibuat, Anda dapat langsung memilihnya saat menambah atau mengubah produk sembako di menu Manajemen Produk.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 rounded-xl transition-all shadow-sm"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ubah Nama Kategori */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-600" />
                <span>Ubah Nama Kategori</span>
              </h3>
              <button
                onClick={() => setEditingCategory(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameCategory} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kategori Baru <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                ⚠️ Mengubah nama kategori akan secara otomatis memperbarui kategori pada seluruh ({editingCategory.count}) produk sembako yang terkait.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 rounded-xl transition-all shadow-sm"
                >
                  {isSubmitting ? 'Memperbarui...' : 'Perbarui Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Kategori */}
      <ConfirmationModal
        isOpen={Boolean(deletingCategory)}
        type="DELETE"
        title="Hapus Kategori Sembako"
        description={`Apakah Anda yakin ingin menghapus kategori "${deletingCategory?.name}"?`}
        confirmText="Ya, Hapus Kategori"
        cancelText="Batal"
        onConfirm={handleDeleteCategory}
        onCancel={() => setDeletingCategory(null)}
      />
    </div>
  );
};
