import React, { useState } from 'react';
import {
  Package,
  Layers,
  AlertTriangle,
  Search,
  Plus,
  ArrowUpDown,
  LayoutGrid,
  List,
  MoreVertical,
  Edit2,
  Trash2,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Product } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useToastStore } from '../../store/toastStore';
import { ProductModal } from '../Modals/ProductModal';
import { ConfirmationModal } from '../Modals/ConfirmationModal';

interface ProductCatalogViewProps {
  products: Product[];
  onRefreshProducts: () => void;
  onNavigateToPOS: () => void;
}

export const ProductCatalogView: React.FC<ProductCatalogViewProps> = ({
  products,
  onRefreshProducts,
  onNavigateToPOS,
}) => {
  const { t, i18n } = useTranslation();
  const { user, tenant, token } = useAuthStore();
  const { addItem } = useCartStore();
  const { addToast } = useToastStore();

  const isManager = user?.role === 'MANAGER';

  // Filters & State
  const [selectedCategory, setSelectedCategory] = useState('Semua Produk');
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState<'terlaris' | 'harga-asc' | 'harga-desc' | 'stok-low'>('terlaris');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Categories list with dynamic counts
  const categoriesMap: { [cat: string]: number } = {};
  products.forEach((p) => {
    categoriesMap[p.category] = (categoriesMap[p.category] || 0) + 1;
  });

  const categoryPills = [
    { name: 'Semua Produk', count: products.length },
    ...Object.keys(categoriesMap).map((cat) => ({
      name: cat,
      count: categoriesMap[cat],
    })),
  ];

  // Stats calculation
  const totalActive = products.length;
  const totalCategoriesCount = Object.keys(categoriesMap).length;
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  // Filtered & Sorted products
  let filtered = products.filter((p) => {
    const matchCategory =
      selectedCategory === 'Semua Produk' || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Sort
  if (sortOption === 'harga-asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortOption === 'harga-desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortOption === 'stok-low') {
    filtered.sort((a, b) => a.stock - b.stock);
  } else {
    // terlaris
    filtered.sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0));
  }

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const displayedProducts = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleAddToCart = (p: Product) => {
    if (p.stock <= 0) {
      addToast({
        type: 'warning',
        title: 'Stok Kosong',
        message: `${p.name} habis, perlu restock.`,
      });
      return;
    }
    const success = addItem(p, 1);
    if (success) {
      addToast({
        type: 'success',
        title: 'Ditambah ke Kasir',
        message: `${p.name} dimasukkan ke keranjang kasir.`,
        duration: 2000,
      });
    } else {
      addToast({
        type: 'warning',
        title: 'Stok Terbatas',
        message: `Maksimal stok tercapai (${p.stock} ${p.unit}).`,
      });
    }
  };

  const handleSaveProduct = async (data: any) => {
    if (user?.role === 'ADMIN') {
      addToast({
        type: 'error',
        title: 'Akses Ditolak',
        message: 'Role ADMIN tidak bisa menambah, mengubah, atau menghapus data produk dan kategori. Hak akses ini khusus role MANAGER.',
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
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || 'Gagal menyimpan produk');
      }

      addToast({
        type: 'success',
        title: editingProduct ? 'Produk Diperbarui' : 'Produk Ditambahkan',
        message: resData.message,
      });

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

    if (user?.role === 'ADMIN') {
      addToast({
        type: 'error',
        title: 'Akses Ditolak',
        message: 'Role ADMIN tidak bisa menambah, mengubah, atau menghapus data produk dan kategori. Hak akses ini khusus role MANAGER.',
      });
      return;
    }

    try {
      const res = await fetch(`/api/products/${deletingProduct.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || 'Gagal menghapus produk');
      }

      addToast({
        type: 'success',
        title: 'Produk Dihapus',
        message: resData.message,
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Admin Notice Banner */}
      {user?.role === 'ADMIN' && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-amber-900 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-bold text-amber-950">{t('catalog.adminRestrictionTitle', 'Akses Baca-Saja untuk Role ADMIN')}:</span>{' '}
            {t('catalog.adminRestrictionDesc', 'Role ADMIN hanya berwenang memantau katalog. Role ADMIN dilarang menambah, mengubah, atau menghapus data produk maupun kategori. Pengelolaan produk dilakukan oleh Manajer Toko.')}
          </div>
        </div>
      )}

      {/* Top Header & Stat Cards matching Image 3 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-emerald-700 tracking-wider uppercase mb-1 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" />
            <span>KasirWarung POS</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('catalog.title', 'Katalog & Etalase Produk')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            {t('catalog.subtitle', 'Kelola ratusan varian sembako, harga modal, harga jual, dan stok realtime.')}
          </p>
        </div>

        {/* 3 Stat Badges */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
          <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-xs min-w-[130px]">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase">{t('common.all', 'Total Produk')}</div>
              <div className="text-sm font-black text-slate-900 font-mono">{totalActive} {t('common.active', 'Aktif')}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-xs min-w-[130px]">
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase">{t('common.category', 'Kategori')}</div>
              <div className="text-sm font-black text-slate-900 font-mono">{totalCategoriesCount}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white border border-rose-100 bg-rose-50/30 rounded-2xl shadow-xs min-w-[130px]">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-rose-500 uppercase">{t('catalog.lowStockOnly', 'Perlu Restock')}</div>
              <div className="text-sm font-black text-rose-700 font-mono">{lowStockCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categoryPills.map((cat) => {
          const isActive = selectedCategory === cat.name;
          const displayName = cat.name === 'Semua Produk' ? t('catalog.allProducts', 'Semua Produk') : cat.name;
          return (
            <button
              key={cat.name}
              onClick={() => {
                setSelectedCategory(cat.name);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{displayName}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-emerald-700/80 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search, Sort, View Toggle, and Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={t('catalog.searchPlaceholder', 'Cari nama barang, barcode, atau SKU...')}
            className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:border-emerald-500 focus:outline-hidden shadow-xs transition-all"
          />
        </div>

        {/* Sort & Action controls */}
        <div className="flex items-center gap-2">
          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="pl-3 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:outline-hidden appearance-none cursor-pointer shadow-xs"
            >
              <option value="terlaris">{t('catalog.sortBestSeller', 'Terlaris (Fast Moving)')}</option>
              <option value="harga-asc">{t('catalog.sortPriceLow', 'Harga Terendah')}</option>
              <option value="harga-desc">{t('catalog.sortPriceHigh', 'Harga Tertinggi')}</option>
              <option value="stok-low">{t('catalog.sortStockLow', 'Stok Menipis Terlebih Dahulu')}</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Grid / List toggle */}
          <div className="hidden sm:flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Add Product Button (Role MANAGER only) */}
          {isManager && (
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsProductModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t('catalog.addProduct', 'Tambah Produk')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Product Cards Grid matching Image 3 */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedProducts.map((p) => {
            const isLowStock = p.stock <= p.minStock && p.stock > 0;
            const isOutOfStock = p.stock <= 0;

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-500/80 transition-all flex flex-col justify-between p-3.5 relative group"
              >
                {/* Card Top: Category Pill & 3-Dots Action Menu */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {p.category}
                  </span>

                  {isManager && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === p.id ? null : p.id);
                        }}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === p.id && (
                        <div
                          className="absolute right-0 top-6 w-36 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setEditingProduct(p);
                              setIsProductModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                            <span>Ubah Data</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setDeletingProduct(p);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus Produk</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Product Photo */}
                <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-50 mb-3 border border-slate-100">
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>

                {/* SKU and Stock Indicator */}
                <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                  <span className="text-slate-400">SKU: {p.sku}</span>
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      isOutOfStock
                        ? 'text-rose-600'
                        : isLowStock
                        ? 'text-rose-600 font-bold'
                        : 'text-slate-600'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOutOfStock ? 'bg-rose-600' : isLowStock ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'
                      }`}
                    ></span>
                    {isOutOfStock
                      ? 'Habis!'
                      : isLowStock
                      ? `Stok: ${p.stock} ${p.unit} (Menipis!)`
                      : `Stok: ${p.stock} ${p.unit}`}
                  </span>
                </div>

                {/* Name & Description */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 mb-3">
                    {p.description || `Kemasan per ${p.unit} segar`}
                  </p>
                </div>

                {/* Bottom: Harga Ecer & + Kasir Button */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-auto">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Harga Ecer</span>
                    <span className="text-sm font-black text-slate-900 font-mono">
                      Rp {p.price.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <button
                    onClick={() => handleAddToCart(p)}
                    disabled={isOutOfStock}
                    className="flex items-center gap-1 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-40"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>+ Kasir</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Produk</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Stok</th>
                <th className="py-3 px-4">Harga Ecer</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 flex items-center gap-3">
                    <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                    <div>
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{p.description}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{p.category}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">{p.sku}</td>
                  <td className="py-3 px-4">
                    <span className={p.stock <= p.minStock ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                      {p.stock} {p.unit}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold font-mono text-slate-900">
                    Rp {p.price.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleAddToCart(p)}
                      className="px-3 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white rounded-lg font-bold transition-colors inline-flex items-center gap-1"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>+ Kasir</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer matching Image 3 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <div className="text-xs text-slate-500">
          Menampilkan <span className="font-bold text-slate-800">{displayedProducts.length}</span> dari{' '}
          <span className="font-bold text-slate-800">{filtered.length}</span> Produk • Halaman{' '}
          <span className="font-bold text-slate-800">{currentPage}</span> dari {totalPages}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
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
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          {totalPages > 5 && <span className="text-slate-400 px-1">...</span>}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal: Tambah & Ubah Produk */}
      <ProductModal
        isOpen={isProductModalOpen}
        product={editingProduct}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
      />

      {/* Modal: Konfirmasi Hapus Produk */}
      <ConfirmationModal
        isOpen={Boolean(deletingProduct)}
        type="DELETE"
        title={t('modals.deleteProductTitle', 'Hapus Produk Sembako')}
        description={t('modals.deleteProductDesc', { name: deletingProduct?.name || '' })}
        confirmText={t('modals.deleteProductConfirm', 'Ya, Hapus Produk')}
        cancelText={t('common.cancel', 'Batal')}
        onConfirm={handleDeleteProduct}
        onCancel={() => setDeletingProduct(null)}
      />
    </div>
  );
};
