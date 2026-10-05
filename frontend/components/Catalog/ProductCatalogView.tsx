import React, { useState, useEffect } from 'react';
import * as Select from '@radix-ui/react-select';
import * as Tooltip from '@radix-ui/react-tooltip';
import {
  Package,
  Layers,
  AlertTriangle,
  Search,
  Plus,
  ArrowUpDown,
  LayoutGrid,
  List,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  ShieldAlert,
  SearchX,
  RotateCcw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Product } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { useToastStore } from '../../stores/toastStore';
import { ProductModal } from '../Modals/ProductModal';
import { ConfirmationModal } from '../Modals/ConfirmationModal';
import { CategorySelect } from './CategorySelect';

interface ProductCatalogViewProps {
  products: Product[];
  onRefreshProducts: () => void;
  onNavigateToPOS: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export const ProductCatalogView: React.FC<ProductCatalogViewProps> = ({
  products,
  onRefreshProducts,
  onNavigateToPOS,
  searchQuery,
  onSearchChange,
}) => {
  const { t, i18n } = useTranslation();
  const { user, tenant, token } = useAuthStore();
  const { addItem, items } = useCartStore();
  const { addToast } = useToastStore();

  const isManager = user?.role === 'MANAGER';

  const translateUnit = (unit: string) => {
    if (!unit) return '';
    return t(`catalog.units.${unit.trim().toLowerCase()}`, unit);
  };

  const translateCategory = (cat: string) => {
    if (!cat) return '';
    if (cat === 'Semua Produk' || cat === 'Semua') {
      return t('catalog.allCategories', 'Semua Kategori Produk');
    }
    return t(`catalog.categoryNames.${cat}`, cat);
  };

  // Map of product ID -> quantity currently in active cart
  const cartQtyMap = React.useMemo(() => {
    const map: { [id: string]: number } = {};
    items.forEach((it) => {
      map[it.product.id] = (map[it.product.id] || 0) + it.qty;
    });
    return map;
  }, [items]);

  // Filters & State
  const [selectedCategory, setSelectedCategory] = useState('Semua Produk');
  const [search, setSearch] = useState(searchQuery || '');
  const [sortOption, setSortOption] = useState<'terlaris' | 'harga-asc' | 'harga-desc' | 'stok-low'>('terlaris');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Keep search state in sync with external searchQuery prop from Navbar
  useEffect(() => {
    if (searchQuery !== undefined && searchQuery !== search) {
      setSearch(searchQuery);
    }
  }, [searchQuery]);

  const handleSearchInputChange = (val: string) => {
    setSearch(val);
    // Pencarian di ProductCatalogView bersifat lokal di halaman ini,
    // tidak mengaktifkan Live Auto-suggest Dropdown di Search Bar Navbar.
  };

  // Reset to page 1 on filter, category, search, or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, search, sortOption]);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

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
    const inCart = cartQtyMap[p.id] || 0;
    const remaining = p.stock - inCart;
    const unitLabel = translateUnit(p.unit);

    if (remaining <= 0) {
      addToast({
        type: 'warning',
        title: t('catalog.toastOutOfStockTitle', 'Stok Habis di Kasir'),
        message: t(
          'catalog.toastOutOfStockMsg',
          'Maksimal stok tercapai. Seluruh {{stock}} {{unit}} "{{name}}" sudah ada di keranjang kasir.',
          { stock: p.stock, unit: unitLabel, name: p.name }
        ),
      });
      return;
    }

    const success = addItem(p, 1);
    if (success) {
      const newRemaining = remaining - 1;
      addToast({
        type: 'success',
        title: t('catalog.toastAddedTitle', 'Ditambah ke Kasir'),
        message:
          newRemaining === 0
            ? t(
                'catalog.toastAddedAllMsg',
                '"{{name}}" dimasukkan ke kasir. Seluruh stok ({{stock}} {{unit}}) kini telah di keranjang.',
                { name: p.name, stock: p.stock, unit: unitLabel }
              )
            : t(
                'catalog.toastAddedRemainingMsg',
                '"{{name}}" dimasukkan ke kasir (Sisa stok: {{remaining}} {{unit}}).',
                { name: p.name, remaining: newRemaining, unit: unitLabel }
              ),
        duration: 2000,
      });
    } else {
      addToast({
        type: 'warning',
        title: t('catalog.toastLimitedStockTitle', 'Stok Terbatas'),
        message: t('catalog.toastLimitedStockMsg', 'Maksimal stok tercapai ({{stock}} {{unit}}).', {
          stock: p.stock,
          unit: unitLabel,
        }),
      });
    }
  };

  const handleSaveProduct = async (data: any) => {
    if (user?.role === 'ADMIN') {
      addToast({
        type: 'error',
        title: t('catalog.toastAccessDeniedTitle', 'Akses Ditolak'),
        message: t(
          'catalog.toastAccessDeniedMsg',
          'Role ADMIN tidak bisa menambah, mengubah, atau menghapus data produk dan kategori. Hak akses ini khusus role MANAGER.'
        ),
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
        throw new Error(resData.message || t('catalog.toastSaveFailedDefault', 'Gagal menyimpan produk'));
      }

      addToast({
        type: 'success',
        title: editingProduct
          ? t('catalog.toastProductUpdatedTitle', 'Produk Diperbarui')
          : t('catalog.toastProductAddedTitle', 'Produk Ditambahkan'),
        message: resData.message,
      });

      onRefreshProducts();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: t('catalog.toastSaveFailedTitle', 'Gagal Menyimpan'),
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
        title: t('catalog.toastAccessDeniedTitle', 'Akses Ditolak'),
        message: t(
          'catalog.toastAccessDeniedMsg',
          'Role ADMIN tidak bisa menambah, mengubah, atau menghapus data produk dan kategori. Hak akses ini khusus role MANAGER.'
        ),
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
        throw new Error(resData.message || t('catalog.toastDeleteFailedDefault', 'Gagal menghapus produk'));
      }

      addToast({
        type: 'success',
        title: t('catalog.toastProductDeletedTitle', 'Produk Dihapus'),
        message: resData.message,
      });

      setDeletingProduct(null);
      onRefreshProducts();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: t('catalog.toastDeleteFailedTitle', 'Gagal Menghapus'),
        message: err.message,
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 relative">
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

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-emerald-700 tracking-wider uppercase mb-1 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" />
            <span>{t('catalog.brandBadge', 'KasirWarung POS')}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('catalog.title', 'Katalog & Etalase Produk')}
          </h1>
        </div>
      </div>

      {/* Category Select Navigation (Radix UI Select) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          <Layers className="w-4 h-4 text-theme-primary shrink-0" />
          <span>{t('catalog.tableCategory', 'Kategori')}:</span>
        </div>

        <CategorySelect
          selectedCategory={selectedCategory}
          onSelectCategory={(val) => {
            setSelectedCategory(val);
            setCurrentPage(1);
          }}
          categories={categoryPills}
          totalCount={products.length}
        />

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {t('catalog.showingCount', 'Menampilkan {{count}} produk', { count: filtered.length })}
        </div>
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
              handleSearchInputChange(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={t('catalog.searchPlaceholder', 'Cari nama barang, barcode, atau SKU...')}
            className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-theme-primary focus:outline-hidden shadow-xs transition-all"
          />
        </div>

        {/* Sort & Action controls */}
        <div className="flex items-center gap-2">
          {/* Radix UI Select for Sort */}
          <Select.Root
            value={sortOption}
            onValueChange={(val) => setSortOption(val as any)}
          >
            <Select.Trigger
              className="inline-flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 focus:outline-hidden focus:ring-2 focus:ring-theme-primary/20 shadow-xs cursor-pointer transition-all"
              aria-label={t('catalog.sortBy', 'Urutkan')}
            >
              <div className="flex items-center gap-1.5 truncate">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <Select.Value>
                  <span className="truncate">
                    {sortOption === 'terlaris' && t('catalog.sortBestSeller', 'Terlaris (Fast Moving)')}
                    {sortOption === 'harga-asc' && t('catalog.sortPriceLow', 'Harga Terendah')}
                    {sortOption === 'harga-desc' && t('catalog.sortPriceHigh', 'Harga Tertinggi')}
                    {sortOption === 'stok-low' && t('catalog.sortStockLow', 'Stok Menipis Terlebih Dahulu')}
                  </span>
                </Select.Value>
              </div>
              <Select.Icon className="text-slate-400 dark:text-slate-500 shrink-0">
                <ChevronDown className="w-3.5 h-3.5" />
              </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
              <Select.Content
                className="z-50 min-w-[220px] overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 animate-in fade-in-80 zoom-in-95"
                position="popper"
                sideOffset={6}
              >
                <Select.Viewport className="p-1">
                  <Select.Item
                    value="terlaris"
                    className="flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-theme-light hover:text-theme-text data-[highlighted]:bg-theme-light data-[highlighted]:text-theme-text transition-colors"
                  >
                    <Select.ItemText>
                      {t('catalog.sortBestSeller', 'Terlaris (Fast Moving)')}
                    </Select.ItemText>
                    <Select.ItemIndicator className="text-theme-primary pl-2">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </Select.ItemIndicator>
                  </Select.Item>

                  <Select.Item
                    value="harga-asc"
                    className="flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-theme-light hover:text-theme-text data-[highlighted]:bg-theme-light data-[highlighted]:text-theme-text transition-colors"
                  >
                    <Select.ItemText>
                      {t('catalog.sortPriceLow', 'Harga Terendah')}
                    </Select.ItemText>
                    <Select.ItemIndicator className="text-theme-primary pl-2">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </Select.ItemIndicator>
                  </Select.Item>

                  <Select.Item
                    value="harga-desc"
                    className="flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-theme-light hover:text-theme-text data-[highlighted]:bg-theme-light data-[highlighted]:text-theme-text transition-colors"
                  >
                    <Select.ItemText>
                      {t('catalog.sortPriceHigh', 'Harga Tertinggi')}
                    </Select.ItemText>
                    <Select.ItemIndicator className="text-theme-primary pl-2">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </Select.ItemIndicator>
                  </Select.Item>

                  <Select.Item
                    value="stok-low"
                    className="flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-theme-light hover:text-theme-text data-[highlighted]:bg-theme-light data-[highlighted]:text-theme-text transition-colors"
                  >
                    <Select.ItemText>
                      {t('catalog.sortStockLow', 'Stok Menipis Terlebih Dahulu')}
                    </Select.ItemText>
                    <Select.ItemIndicator className="text-theme-primary pl-2">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </Select.ItemIndicator>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>

          {/* Grid / List toggle with Radix UI Tooltip */}
          <Tooltip.Provider delayDuration={150}>
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 shadow-xs">
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                    aria-label={t('catalog.gridView', 'Tampilan Kisi (Grid)')}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="z-50 px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 dark:bg-slate-800 rounded-lg shadow-xl border border-slate-800 dark:border-slate-700 select-none animate-in fade-in-50 zoom-in-95"
                    sideOffset={6}
                  >
                    <span>{t('catalog.gridView', 'Tampilan Kisi (Grid)')}</span>
                    <Tooltip.Arrow className="fill-slate-900 dark:fill-slate-800" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>

              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                      viewMode === 'list'
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                    aria-label={t('catalog.listView', 'Tampilan Daftar (List)')}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="z-50 px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 dark:bg-slate-800 rounded-lg shadow-xl border border-slate-800 dark:border-slate-700 select-none animate-in fade-in-50 zoom-in-95"
                    sideOffset={6}
                  >
                    <span>{t('catalog.listView', 'Tampilan Daftar (List)')}</span>
                    <Tooltip.Arrow className="fill-slate-900 dark:fill-slate-800" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
          </Tooltip.Provider>
        </div>
      </div>

      {/* Product Cards Grid matching Image 3 */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center shadow-xs flex flex-col items-center justify-center animate-in fade-in-50">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50 flex items-center justify-center mb-4 shadow-xs">
            <SearchX className="w-8 h-8" />
          </div>

          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            {search.trim()
              ? t('catalog.productNotFound', 'Produk Tidak Ditemukan')
              : selectedCategory !== 'Semua Produk'
              ? t('catalog.categoryEmpty', 'Kategori Ini Belum Memiliki Produk')
              : t('catalog.noProductsYet', 'Belum Ada Produk Tersedia')}
          </h3>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            {search.trim() ? (
              <>
                {t('catalog.searchNoMatchPrefix', 'Tidak ada produk sembako yang cocok dengan kata kunci')}{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200 underline decoration-amber-400 underline-offset-2">
                  &quot;{search}&quot;
                </span>
                {selectedCategory !== 'Semua Produk' && (
                  <>
                    {' '}
                    {t('catalog.searchNoMatchCategory', 'pada kategori')}{' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      &quot;{translateCategory(selectedCategory)}&quot;
                    </span>
                  </>
                )}
                . {t('catalog.searchNoMatchSuffix', 'Periksa ejaan nama produk, kode SKU, atau gunakan kata kunci lain.')}
              </>
            ) : selectedCategory !== 'Semua Produk' ? (
              <>
                {t('catalog.categoryEmptyDescPrefix', 'Tidak ada produk terdaftar dalam kategori')}{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200">&quot;{translateCategory(selectedCategory)}&quot;</span>.{' '}
                {t('catalog.categoryEmptyDescSuffix', 'Silakan pilih kategori lain atau tambahkan produk baru.')}
              </>
            ) : (
              t('catalog.emptyCatalogDesc', 'Katalog produk warung Anda saat ini masih kosong. Silakan tambahkan produk baru untuk memulai transaksi kasir.')
            )}
          </p>

          {/* Quick suggestions / keywords if search yielded no results */}
          {search.trim() && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 max-w-sm">
              <span className="text-[11px] text-slate-400">{t('catalog.tryKeywords', 'Coba kata kunci:')}</span>
              {['Beras', 'Minyak', 'Gula', 'Telur', 'Kopi', 'Tepung'].map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => {
                    handleSearchInputChange(keyword);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-0.5 text-[11px] font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {t(`catalog.keywords.${keyword.toLowerCase()}`, keyword)}
                </button>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6">
            {search.trim() && (
              <button
                type="button"
                onClick={() => {
                  handleSearchInputChange('');
                  setCurrentPage(1);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('catalog.resetSearchBtn', 'Reset Pencarian')}</span>
              </button>
            )}

            {selectedCategory !== 'Semua Produk' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Semua Produk');
                  setCurrentPage(1);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{t('catalog.showAllCategoriesBtn', 'Tampilkan Semua Kategori')}</span>
              </button>
            )}

            {isManager && (
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{t('catalog.addNewProductBtn', 'Tambah Produk Baru')}</span>
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedProducts.map((p, idx) => {
            const inCartQty = cartQtyMap[p.id] || 0;
            const availableStock = Math.max(0, p.stock - inCartQty);
            const isLowStock = availableStock <= p.minStock && availableStock > 0;
            const isOutOfStock = availableStock <= 0;
            const isEven = idx % 2 === 1;

            return (
              <div
                key={p.id}
                className={`rounded-2xl border transition-all flex flex-col justify-between p-3.5 relative group shadow-xs hover:shadow-md hover:border-theme-primary ${
                  isEven
                    ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/90 dark:border-slate-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800'
                }`}
              >
                {/* Product Photo */}
                <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/80 mb-3 border border-slate-100 dark:border-slate-800">
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {inCartQty > 0 && (
                    <div className="absolute top-2 right-2 bg-theme-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-white/40">
                      <span>{t('catalog.inCartBadge', '{{count}} di kasir', { count: inCartQty })}</span>
                    </div>
                  )}
                </div>

                {/* SKU and Stock Indicator */}
                <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                  <span className="text-slate-400 dark:text-slate-500">
                    {t('catalog.skuPrefix', 'SKU: {{sku}}', { sku: p.sku })}
                  </span>
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      isOutOfStock
                        ? 'text-rose-600 dark:text-rose-400 font-bold'
                        : isLowStock
                        ? 'text-amber-600 dark:text-amber-400 font-bold'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOutOfStock ? 'bg-rose-600' : isLowStock ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'
                      }`}
                    ></span>
                    {isOutOfStock
                      ? inCartQty > 0
                        ? t('catalog.outOfStockInCart', 'Habis (di keranjang)')
                        : t('catalog.outOfStockBang', 'Habis!')
                      : isLowStock
                      ? t('catalog.remainingStockLow', 'Sisa: {{count}} {{unit}} (Menipis!)', {
                          count: availableStock,
                          unit: translateUnit(p.unit),
                        })
                      : t('catalog.remainingStock', 'Sisa: {{count}} {{unit}}', {
                          count: availableStock,
                          unit: translateUnit(p.unit),
                        })}
                  </span>
                </div>

                {/* Name & Unit */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-theme-primary transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 mb-3">
                    {t('catalog.unitPrefix', 'Satuan: {{unit}}', { unit: translateUnit(p.unit) })}
                  </p>
                </div>

                {/* Bottom: Harga & Tombol Tambah ke Keranjang */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800 mt-auto gap-2">
                  <div className="flex flex-col justify-center min-w-0">
                    <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight truncate">
                      Rp {p.price.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isOutOfStock) handleAddToCart(p);
                    }}
                    disabled={isOutOfStock}
                    aria-disabled={isOutOfStock}
                    title={
                      isOutOfStock
                        ? inCartQty > 0
                          ? t(
                              'catalog.allInCartTooltip',
                              'Semua stok {{name}} ({{stock}} {{unit}}) sudah ada di keranjang kasir',
                              { name: p.name, stock: p.stock, unit: translateUnit(p.unit) }
                            )
                          : t('catalog.outOfStockTooltip', 'Stok produk habis (tidak dapat ditambah)')
                        : t('catalog.addToCartTooltip', 'Tambah {{name}} ke keranjang kasir', { name: p.name })
                    }
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      isOutOfStock
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed pointer-events-none select-none shadow-none'
                        : 'btn-theme-primary text-white shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                    }`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                    <span>{isOutOfStock ? t('catalog.outOfStock', 'Habis') : '+'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View with alternating odd/even theme-aware backgrounds */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">{t('catalog.tableProduct', 'Produk')}</th>
                <th className="py-3 px-4">{t('catalog.tableCategory', 'Kategori')}</th>
                <th className="py-3 px-4">{t('catalog.tableBarcode', 'SKU')}</th>
                <th className="py-3 px-4">{t('catalog.tableStock', 'Stok')}</th>
                <th className="py-3 px-4">{t('catalog.tableSellingPrice', 'Harga Ecer')}</th>
                <th className="py-3 px-4 text-right">{t('catalog.tableActions', 'Aksi')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayedProducts.map((p, idx) => {
                const inCartQty = cartQtyMap[p.id] || 0;
                const availableStock = Math.max(0, p.stock - inCartQty);
                const isEven = idx % 2 === 1;
                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      isEven
                        ? 'bg-slate-50/70 dark:bg-slate-800/40 hover:bg-theme-light/40 dark:hover:bg-theme-light/20'
                        : 'bg-white dark:bg-slate-900 hover:bg-theme-light/40 dark:hover:bg-theme-light/20'
                    }`}
                  >
                    <td className="py-3 px-4 flex items-center gap-3">
                      <div className="relative shrink-0">
                        <img
                          src={p.imageUrl}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700"
                        />
                        {inCartQty > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-theme-primary text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                            {inCartQty}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{p.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {t('catalog.unitPrefix', 'Satuan: {{unit}}', { unit: translateUnit(p.unit) })}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-theme-light text-theme-text border border-theme-border">
                        {translateCategory(p.category)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">{p.sku}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span
                          className={`font-semibold ${
                            availableStock <= 0
                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                              : availableStock <= p.minStock
                              ? 'text-amber-600 dark:text-amber-400 font-bold'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {availableStock <= 0 ? t('catalog.outOfStock', 'Habis') : `${availableStock} ${translateUnit(p.unit)}`}
                        </span>
                        {inCartQty > 0 && (
                          <span className="text-[10px] text-theme-primary font-bold">
                            {t('catalog.inCartParen', '({{count}} di kasir)', { count: inCartQty })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold font-mono text-slate-900 dark:text-slate-100">
                      Rp {p.price.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (availableStock > 0) handleAddToCart(p);
                        }}
                        disabled={availableStock <= 0}
                        aria-disabled={availableStock <= 0}
                        title={
                          availableStock <= 0
                            ? inCartQty > 0
                              ? t(
                                  'catalog.allInCartShortTooltip',
                                  'Semua stok ({{stock}} {{unit}}) sudah di keranjang',
                                  { stock: p.stock, unit: translateUnit(p.unit) }
                                )
                              : t('catalog.outOfStockShortTooltip', 'Stok produk habis')
                            : t('catalog.addToCartTooltip', 'Tambah {{name}} ke keranjang kasir', { name: p.name })
                        }
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all inline-flex items-center gap-1.5 shrink-0 ${
                          availableStock <= 0
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed pointer-events-none select-none shadow-none'
                            : 'bg-theme-light hover:btn-theme-primary text-theme-text hover:text-white border border-theme-border shadow-2xs cursor-pointer'
                        }`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>
                          {availableStock <= 0
                            ? t('catalog.outOfStock', 'Habis')
                            : inCartQty > 0
                            ? t('catalog.addToCartWithCount', '+ ({{count}})', { count: inCartQty })
                            : t('catalog.addToCartShort', '+ Kasir')}
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer matching Image 3 */}
      {filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {t('catalog.paginationShowing', 'Menampilkan')}{' '}
            <span className="font-bold text-slate-800 dark:text-slate-200">{displayedProducts.length}</span>{' '}
            {t('catalog.paginationOf', 'dari')}{' '}
            <span className="font-bold text-slate-800 dark:text-slate-200">{filtered.length}</span>{' '}
            {t('catalog.paginationProducts', 'Produk')} • {t('catalog.paginationPage', 'Halaman')}{' '}
            <span className="font-bold text-slate-800 dark:text-slate-200">{currentPage}</span>{' '}
            {t('catalog.paginationOf', 'dari')} {totalPages}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label={t('catalog.prevPage', 'Sebelumnya')}
              title={t('catalog.prevPage', 'Sebelumnya')}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
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
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
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
              aria-label={t('catalog.nextPage', 'Selanjutnya')}
              title={t('catalog.nextPage', 'Selanjutnya')}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
