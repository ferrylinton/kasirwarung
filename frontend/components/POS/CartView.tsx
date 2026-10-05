import React, { useState, useEffect, useRef } from 'react';
import {
  Calculator,
  Plus,
  Minus,
  X,
  Printer,
  Trash2,
  Search,
  ScanBarcode,
  Loader2,
  Package,
  Check,
  AlertCircle,
  ArrowRight,
  Bookmark,
  Clock,
  Banknote,
  QrCode,
  CreditCard,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Product, PaymentMethod } from '../../types';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { ReceiptModal } from '../Modals/ReceiptModal';
import { ConfirmationModal } from '../Modals/ConfirmationModal';
import { SaveOrderModal } from '../Modals/SaveOrderModal';
import { SavedOrdersListModal } from '../Modals/SavedOrdersListModal';

interface CartViewProps {
  products: Product[];
  onRefreshProducts: () => void;
  onNavigateToCatalog?: () => void;
}

export const CartView: React.FC<CartViewProps> = ({
  products,
  onRefreshProducts,
  onNavigateToCatalog,
}) => {
  const { t } = useTranslation();
  const { user, tenant, token } = useAuthStore();
  const { addToast } = useToastStore();
  const {
    items,
    paymentMethod,
    tenderAmount,
    updateQty,
    removeItem,
    clearCart,
    setPaymentMethod,
    setTenderAmount,
    applyQuickTender,
    getTotal,
    getChange,
    getItemCount,
    addItem,
    savedOrders,
    saveCurrentOrder,
    loadSavedOrder,
    deleteSavedOrder,
    updateSavedOrderNote,
    setSavedOrders,
  } = useCartStore();

  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isSaveOrderModalOpen, setIsSaveOrderModalOpen] = useState(false);
  const [isSavedOrdersListModalOpen, setIsSavedOrdersListModalOpen] = useState(false);

  // Search Bar State inside CartView
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState<number>(-1);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync saved orders with backend if token exists
  useEffect(() => {
    const fetchBackendSavedOrders = async () => {
      try {
        const res = await fetch('/api/saved-orders', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data.savedOrders && Array.isArray(data.savedOrders)) {
            setSavedOrders(data.savedOrders);
          }
        }
      } catch (err) {
        // Fallback to local storage
      }
    };

    if (token) {
      fetchBackendSavedOrders();
    }
  }, [token, setSavedOrders]);

  // Global F2 keyboard shortcut to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        setIsSearchDropdownOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced backend search query with fallback to local products list
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearchLoading(false);
      setIsSearchDropdownOpen(false);
      return;
    }

    setIsSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(trimmed)}&limit=8`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.products || []);
          setIsSearchDropdownOpen(true);
        } else {
          const localFiltered = (products || []).filter(
            (p) =>
              p.name.toLowerCase().includes(trimmed.toLowerCase()) ||
              p.sku?.toLowerCase().includes(trimmed.toLowerCase()) ||
              p.category?.toLowerCase().includes(trimmed.toLowerCase())
          ).slice(0, 8);
          setSearchResults(localFiltered);
          setIsSearchDropdownOpen(true);
        }
      } catch {
        const localFiltered = (products || []).filter(
          (p) =>
            p.name.toLowerCase().includes(trimmed.toLowerCase()) ||
            p.sku?.toLowerCase().includes(trimmed.toLowerCase()) ||
            p.category?.toLowerCase().includes(trimmed.toLowerCase())
        ).slice(0, 8);
        setSearchResults(localFiltered);
        setIsSearchDropdownOpen(true);
      } finally {
        setIsSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, token, products]);

  const handleAddToCart = (e: React.MouseEvent | null, product: Product) => {
    if (e) e.stopPropagation();
    const success = addItem(product, 1);
    if (success) {
      setAddedProductId(product.id);
      setTimeout(() => setAddedProductId(null), 1200);
      addToast({
        type: 'success',
        title: 'Ditambahkan ke Pesanan',
        message: `${product.name} (1 ${product.unit || 'pcs'}) dimasukkan ke kasir.`,
        duration: 3000,
      });
    } else {
      addToast({
        type: 'warning',
        title: 'Stok Tidak Cukup',
        message: `Stok produk ${product.name} tidak mencukupi untuk ditambahkan.`,
      });
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchDropdownOpen(false);
    searchInputRef.current?.focus();
  };

  const handleBarcodeClick = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
    setIsSearchDropdownOpen(true);
    addToast({
      type: 'info',
      title: 'Scan Barcode Aktif',
      message: 'Gunakan scanner barcode fisik atau ketik kode SKU pada kolom pencarian.',
      duration: 3500,
    });
  };

  const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchDropdownOpen || searchResults.length === 0) {
      if (e.key === 'Enter' && searchQuery.trim()) {
        const exactMatch =
          searchResults.find(
            (p) =>
              p.sku?.toLowerCase() === searchQuery.trim().toLowerCase() ||
              p.name.toLowerCase() === searchQuery.trim().toLowerCase()
          ) || searchResults[0];
        if (exactMatch) {
          handleAddToCart(null, exactMatch);
          setSearchQuery('');
          setIsSearchDropdownOpen(false);
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const targetProduct =
        searchSelectedIndex >= 0 && searchSelectedIndex < searchResults.length
          ? searchResults[searchSelectedIndex]
          : searchResults[0];
      if (targetProduct) {
        handleAddToCart(null, targetProduct);
        setSearchQuery('');
        setIsSearchDropdownOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsSearchDropdownOpen(false);
    }
  };

  // Keyboard Shortcuts: [F7] Simpan Pesanan, [F8] Uang Pas, [F9] Pesanan Tersimpan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F7') {
        e.preventDefault();
        if (items.length > 0) {
          setIsSaveOrderModalOpen(true);
        } else {
          addToast({
            type: 'warning',
            title: 'Keranjang Kosong',
            message: 'Pilih produk terlebih dahulu sebelum menyimpan pesanan.',
          });
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        applyQuickTender('UANG_PAS');
        addToast({
          type: 'info',
          title: 'Tender Uang Pas',
          message: `Nominal disetel sama dengan total belanja (Rp ${getTotal().toLocaleString('id-ID')}).`,
        });
      } else if (e.key === 'F9') {
        e.preventDefault();
        setIsSavedOrdersListModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items.length, getTotal, applyQuickTender, addToast]);

  const total = getTotal();
  const change = getChange();
  const itemCount = getItemCount();

  const handleCheckout = async () => {
    if (items.length === 0) {
      addToast({
        type: 'warning',
        title: 'Keranjang Kosong',
        message: 'Pilih produk terlebih dahulu sebelum menyelesaikan transaksi.',
      });
      return;
    }

    if (paymentMethod === 'TUNAI' && tenderAmount < total) {
      addToast({
        type: 'error',
        title: 'Uang Diterima Kurang',
        message: `Uang tunai Rp ${tenderAmount.toLocaleString('id-ID')} kurang dari total belanja Rp ${total.toLocaleString('id-ID')}.`,
      });
      return;
    }

    try {
      setIsProcessingOrder(true);
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map((it) => ({
            productId: it.product.id,
            name: it.product.name,
            price: it.product.price,
            qty: it.qty,
            subtotal: it.subtotal,
          })),
          tenderAmount: paymentMethod === 'TUNAI' ? tenderAmount : total,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan transaksi');
      }

      addToast({
        type: 'success',
        title: 'Transaksi Berhasil!',
        message: `Nota ${data.order.orderNumber} selesai diproses.`,
      });

      setCompletedOrder(data.order);
      setIsReceiptModalOpen(true);
      clearCart();
      onRefreshProducts();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Transaksi Gagal',
        message: err.message,
      });
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const handleSaveOrder = async (note: string) => {
    const saved = saveCurrentOrder(note, user?.name || 'Kasir');
    if (saved) {
      setIsSaveOrderModalOpen(false);
      addToast({
        type: 'success',
        title: 'Pesanan Berhasil Disimpan!',
        message: `Tiket ${saved.orderNumber} ("${note}") telah ditahan.`,
        duration: 4000,
      });

      if (token) {
        try {
          await fetch('/api/saved-orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              note,
              items: saved.items,
              paymentMethod: saved.paymentMethod,
              tenderAmount: saved.tenderAmount,
            }),
          });
        } catch (err) {
          console.error('Failed to sync saved order to server:', err);
        }
      }
    }
  };

  const handleLoadSavedOrder = async (id: string) => {
    const target = savedOrders.find((so) => so.id === id);
    const success = loadSavedOrder(id);
    if (success) {
      addToast({
        type: 'info',
        title: 'Pesanan Dimuat ke Kasir',
        message: target ? `Tiket ${target.orderNumber} ("${target.note}") siap untuk checkout.` : 'Pesanan telah dimuat ke kasir.',
        duration: 3500,
      });

      if (token) {
        try {
          await fetch(`/api/saved-orders/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (err) {
          console.error('Failed to delete saved order on server:', err);
        }
      }
    }
  };

  const handleDeleteSavedOrder = async (id: string) => {
    deleteSavedOrder(id);
    addToast({
      type: 'info',
      title: 'Pesanan Dihapus',
      message: 'Pesanan tersimpan telah dibatalkan.',
    });

    if (token) {
      try {
        await fetch(`/api/saved-orders/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error('Failed to delete saved order on server:', err);
      }
    }
  };

  const handleUpdateSavedNote = async (id: string, newNote: string) => {
    updateSavedOrderNote(id, newNote);
    addToast({
      type: 'success',
      title: 'Keterangan Diperbarui',
      message: `Keterangan pesanan diubah menjadi "${newNote}".`,
    });

    if (token) {
      try {
        await fetch(`/api/saved-orders/${id}/note`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ note: newNote }),
        });
      } catch (err) {
        console.error('Failed to update note on server:', err);
      }
    }
  };

  // Smart dynamic suggestions for tender cash amounts based on total
  const quickTenderSuggestions = React.useMemo(() => {
    if (total <= 0) return [50000, 100000, 200000];
    const setOfTenders = new Set<number>();

    // Nearest higher 10k
    const next10k = Math.ceil(total / 10000) * 10000;
    if (next10k > total) setOfTenders.add(next10k);

    // Nearest higher 50k
    const next50k = Math.ceil(total / 50000) * 50000;
    if (next50k > total) setOfTenders.add(next50k);

    // Common denominations
    const denominations = [20000, 50000, 100000, 200000, 500000];
    for (const d of denominations) {
      if (d > total) setOfTenders.add(d);
      if (setOfTenders.size >= 3) break;
    }

    while (setOfTenders.size < 3) {
      const highest = Math.max(total, ...Array.from(setOfTenders));
      setOfTenders.add(highest + 50000);
    }

    return Array.from(setOfTenders).sort((a, b) => a - b).slice(0, 3);
  }, [total]);

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 p-3 sm:p-5 md:p-6 transition-colors">
      <div className="max-w-4xl mx-auto w-full space-y-4">
        {/* Single-Column Unified Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors">
          {/* Order Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-9 h-9 rounded-xl bg-theme-light text-theme-primary flex items-center justify-center shrink-0 shadow-2xs">
                <Calculator className="w-4 h-4 stroke-[2.25]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    {t('pos.cartTitle', 'Keranjang Transaksi')}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                    {items.length > 0
                      ? t('pos.itemsVarietyAndCount', {
                          varieties: items.length,
                          count: itemCount,
                          defaultValue: `${items.length} macam (${itemCount} pcs)`,
                        })
                      : t('pos.emptyBadge', 'Kosong')}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {tenant?.name || 'KasirWarung'} • {t('pos.cashierLabel', 'Kasir')}: {user?.name || 'Petugas'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {savedOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsSavedOrdersListModalOpen(true)}
                  className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/80 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title={t('pos.savedOrdersTitle', 'Buka daftar pesanan yang ditahan [F9]')}
                >
                  <Bookmark className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>
                    {t('pos.savedOrdersBtn', {
                      count: savedOrders.length,
                      defaultValue: `Pesanan Tersimpan (${savedOrders.length})`,
                    })}
                  </span>
                </button>
              )}

              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50/70 hover:bg-rose-100/70 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 border border-rose-200/80 dark:border-rose-900/50 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  title={t('pos.clearCartTooltip', 'Kosongkan keranjang transaksi')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('pos.clearCart', 'Kosongkan')}</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. Live Search & Scan Barcode */}
          <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 relative" ref={searchContainerRef}>
            <div className="relative">
              {isSearchLoading ? (
                <Loader2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-primary animate-spin" />
              ) : (
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              )}

              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchSelectedIndex(-1);
                }}
                onFocus={() => {
                  if (searchQuery.trim().length > 0) {
                    setIsSearchDropdownOpen(true);
                  }
                }}
                onKeyDown={handleSearchInputKeyDown}
                placeholder={t('pos.searchPlaceholder', 'Cari sembako / scan barcode (Tekan F2)...')}
                className="w-full pl-10 pr-20 py-2.5 sm:py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-theme-primary focus:outline-hidden focus:ring-2 focus:ring-[var(--theme-ring)] transition-all shadow-2xs"
              />

              {/* Clear & Barcode Action Buttons inside Input */}
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title={t('pos.clearSearchTooltip', 'Hapus pencarian')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleBarcodeClick}
                  className="p-1.5 rounded-lg text-slate-400 dark:text-slate-400 hover:text-theme-primary hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title={t('pos.scanBarcodeTooltip', 'Tekan F2 untuk Scan Barcode')}
                >
                  <ScanBarcode className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Search Dropdown Panel */}
            {isSearchDropdownOpen && searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-4 right-4 sm:left-6 sm:right-6 mt-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-50 animate-in fade-in-80 zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {t('pos.searchResultsHeader', 'Hasil Pencarian Produk')}
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                      {searchResults.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="hidden sm:inline">
                      {t('pos.searchNavHint', 'Navigasi: ↑↓ Enter untuk tambah')}
                    </span>
                    <button
                      onClick={() => setIsSearchDropdownOpen(false)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Body: Product List or Empty state */}
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {isSearchLoading && searchResults.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 text-theme-primary animate-spin" />
                      <span>{t('pos.searchingDatabase', 'Mencari di database sembako...')}</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-6 text-center">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2.5">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {t('pos.noProductFound', 'Tidak Ada Produk Ditemukan')}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                        {t('pos.noProductFoundDesc', {
                          query: searchQuery,
                          defaultValue: `Tidak ada sembako yang cocok dengan "${searchQuery}". Periksa kembali SKU atau nama barang.`,
                        })}
                      </p>
                    </div>
                  ) : (
                    searchResults.map((product, idx) => {
                      const isSelected = searchSelectedIndex === idx;
                      const isJustAdded = addedProductId === product.id;
                      const inCartItem = items.find((it) => it.product.id === product.id);
                      const inCartQty = inCartItem?.qty || 0;
                      const availableStock = Math.max(0, product.stock - inCartQty);
                      const isOutOfStock = availableStock <= 0;
                      const isLowStock = !isOutOfStock && availableStock <= product.minStock;

                      return (
                        <div
                          key={product.id}
                          onClick={() => !isOutOfStock && handleAddToCart(null, product)}
                          className={`flex items-center justify-between p-3 gap-3 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-theme-light'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Package className="w-4 h-4 text-slate-400" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                  {product.name}
                                </span>
                                {product.category && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                    {product.category}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                                <span className="font-mono text-slate-400 dark:text-slate-500">{product.sku}</span>
                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                <span
                                  className={`font-semibold ${
                                    isOutOfStock
                                      ? 'text-rose-500'
                                      : isLowStock
                                      ? 'text-amber-500'
                                      : 'text-theme-primary'
                                  }`}
                                >
                                  {isOutOfStock
                                    ? inCartQty > 0
                                      ? t('pos.outOfStockInCart', 'Habis (di keranjang)')
                                      : t('pos.outOfStock', 'Habis')
                                    : t('pos.remainingStock', {
                                        count: availableStock,
                                        unit: product.unit || 'pcs',
                                        defaultValue: `Sisa: ${availableStock} ${product.unit || 'pcs'}`,
                                      })}
                                </span>
                                {inCartQty > 0 && availableStock > 0 && (
                                  <span className="text-[10px] text-theme-primary font-bold">
                                    {t('pos.inCartIndicator', { count: inCartQty, defaultValue: `(${inCartQty} di kasir)` })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                Rp {product.price.toLocaleString('id-ID')}
                              </span>
                            </div>

                            <button
                              type="button"
                              disabled={isOutOfStock}
                              onClick={(e) => handleAddToCart(e, product)}
                              className={`p-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                                isOutOfStock
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-50 shadow-none'
                                  : isJustAdded
                                  ? 'btn-theme-primary shadow-xs'
                                  : 'btn-theme-primary shadow-xs cursor-pointer'
                              }`}
                              title={
                                isOutOfStock
                                  ? inCartQty > 0
                                    ? t('pos.allInCartTooltip', {
                                        count: product.stock,
                                        defaultValue: `Semua stok (${product.stock}) sudah ada di keranjang`,
                                      })
                                    : t('pos.outOfStockWarning', 'Stok produk habis!')
                                  : t('pos.addToOrderTooltip', 'Tambah ke pesanan kasir')
                              }
                            >
                              {isJustAdded ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                  {/* Footer: View in Catalog action */}
                  {onNavigateToCatalog && searchResults.length > 0 && (
                    <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSearchDropdownOpen(false);
                          onNavigateToCatalog();
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>{t('pos.viewAllInCatalog', 'Buka Semua Hasil di Katalog Produk')}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          {/* 3. Cart Items List */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 min-h-[220px] max-h-[460px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-12 sm:py-16 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-theme-light border border-theme-border text-theme-primary flex items-center justify-center mb-3 shadow-2xs">
                  <Calculator className="w-7 h-7 stroke-[1.75]" />
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {t('pos.emptyCartTitle', 'Keranjang transaksi masih kosong')}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                  {t('pos.emptyCartDesc', 'Pilih sembako di katalog atau scan barcode di atas untuk menambahkan pesanan.')}
                </p>
                {onNavigateToCatalog && (
                  <button
                    type="button"
                    onClick={onNavigateToCatalog}
                    className="mt-4 px-4 py-2 rounded-xl text-xs font-bold btn-theme-primary shadow-xs flex items-center gap-1.5 transition-transform hover:scale-[1.02] cursor-pointer"
                  >
                    <span>{t('pos.openCatalogBtn', 'Buka Katalog Sembako')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {items.map((it) => (
                  <div
                    key={it.product.id}
                    className="py-3 sm:py-3.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-slate-50/60 dark:hover:bg-slate-850/40 rounded-xl px-2.5 -mx-2.5 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        {it.product.imageUrl ? (
                          <img
                            src={it.product.imageUrl}
                            alt={it.product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {it.product.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                          <span>@ Rp {it.product.price.toLocaleString('id-ID')}</span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span>/{it.product.unit || 'pcs'}</span>
                          {it.product.stock !== undefined && (
                            <>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span className="text-[11px] text-slate-400">
                                {t('pos.remainingOnShelf', {
                                  remaining: Math.max(0, it.product.stock - it.qty),
                                  total: it.product.stock,
                                  defaultValue: `Sisa di rak: ${Math.max(0, it.product.stock - it.qty)} (Total: ${it.product.stock})`,
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                      {/* Quantity adjusters */}
                      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                        <button
                          type="button"
                          onClick={() => updateQty(it.product.id, it.qty - 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shadow-2xs cursor-pointer"
                          title={t('pos.decreaseQty', 'Kurangi kuantitas')}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs sm:text-sm font-bold font-mono px-2 min-w-[32px] text-center text-slate-900 dark:text-slate-100">
                          {it.qty}
                        </span>
                        <button
                          type="button"
                          disabled={it.qty >= it.product.stock}
                          onClick={() => updateQty(it.product.id, it.qty + 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shadow-2xs cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title={it.qty >= it.product.stock ? t('pos.maxStockReached', 'Maksimal stok tercapai') : t('pos.increaseQty', 'Tambah kuantitas')}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Subtotal & Delete */}
                      <div className="flex items-center gap-2.5">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 font-mono min-w-[96px] text-right">
                          Rp {it.subtotal.toLocaleString('id-ID')}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(it.product.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title={t('pos.removeItemTooltip', 'Hapus barang dari keranjang')}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Calculation & Payment Area */}
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 bg-slate-50/50 dark:bg-slate-850/40">
            {/* Total Display Box */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 block">
                  {t('pos.totalBill', 'Total Tagihan Belanja')}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {t('pos.itemsBreakdown', {
                    count: itemCount,
                    varieties: items.length,
                    defaultValue: `${itemCount} item (${items.length} macam produk)`,
                  })}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-theme-primary font-mono text-left sm:text-right tracking-tight">
                Rp {total.toLocaleString('id-ID')}
              </div>
            </div>

            {/* Metode Pembayaran (Payment Method Selection) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { id: 'TUNAI' as PaymentMethod, label: 'Tunai (Cash)', icon: Banknote },
                  { id: 'QRIS' as PaymentMethod, label: 'QRIS (Instan)', icon: QrCode },
                  { id: 'TRANSFER' as PaymentMethod, label: 'Transfer Bank', icon: CreditCard },
                ].map((pm) => {
                  const Icon = pm.icon;
                  const isSelected = paymentMethod === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(pm.id);
                        if (pm.id !== 'TUNAI') {
                          setTenderAmount(total);
                        }
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs ${
                        isSelected
                          ? 'border-theme-primary bg-theme-light text-theme-text ring-2 ring-[var(--theme-ring)]/40'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tunai Handling: Nominal Cepat & Kembalian */}
            {paymentMethod === 'TUNAI' ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Nominal Cepat (Tender Tunai)
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      F8: Uang Pas
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => applyQuickTender('UANG_PAS')}
                      className="py-2.5 px-3 text-xs font-bold bg-slate-50 hover:bg-theme-light dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 hover:border-theme-primary rounded-xl shadow-2xs text-slate-800 dark:text-slate-100 transition-all cursor-pointer text-center"
                    >
                      Uang Pas [F8]
                    </button>
                    {quickTenderSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => applyQuickTender(suggestion)}
                        className="py-2.5 px-3 text-xs font-bold bg-slate-50 hover:bg-theme-light dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 hover:border-theme-primary rounded-xl shadow-2xs text-slate-800 dark:text-slate-100 transition-all font-mono cursor-pointer text-center"
                      >
                        Rp {suggestion.toLocaleString('id-ID')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Diterima & Kembalian */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      Uang Diterima (Rp)
                    </label>
                    <input
                      type="number"
                      value={tenderAmount || ''}
                      onChange={(e) => setTenderAmount(Number(e.target.value))}
                      placeholder="Masukkan nominal uang..."
                      className="w-full px-3.5 py-2.5 text-sm font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-850 focus:border-theme-primary focus:outline-hidden focus:ring-2 focus:ring-[var(--theme-ring)] shadow-2xs transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      Kembalian Kasir
                    </label>
                    <div className="px-3.5 py-2.5 text-sm font-mono font-black text-theme-text bg-theme-light border border-theme-border rounded-xl flex items-center justify-between shadow-2xs min-h-[42px]">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Kembali:</span>
                      <span className="text-base sm:text-lg">Rp {change.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Pembayaran Non-Tunai ({paymentMethod})
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Pelanggan membayar pas sebesar Rp {total.toLocaleString('id-ID')}. Pastikan bukti pembayaran telah terverifikasi sebelum cetak struk.
                  </span>
                </div>
              </div>
            )}

            {/* Action Submit Buttons */}
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  disabled={items.length === 0}
                  onClick={() => setIsSaveOrderModalOpen(true)}
                  className="py-2.5 px-3 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  title="Simpan pesanan sebelum dibayar [F7]"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Simpan Pesanan [F7]</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSavedOrdersListModalOpen(true)}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  title="Lihat daftar pesanan yang ditahan [F9]"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tersimpan {savedOrders.length > 0 ? `(${savedOrders.length})` : ''} [F9]</span>
                </button>
                <button
                  type="button"
                  disabled={items.length === 0}
                  onClick={() => setShowCancelConfirm(true)}
                  className="col-span-2 sm:col-span-1 py-2.5 px-3 rounded-xl border border-rose-300 dark:border-rose-800/80 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  title="Hapus semua barang pesanan di keranjang"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                  <span>Hapus Semua</span>
                </button>
              </div>

              <button
                type="button"
                disabled={items.length === 0 || isProcessingOrder}
                onClick={handleCheckout}
                className="w-full py-4 btn-theme-primary disabled:opacity-50 text-white font-bold text-sm sm:text-base rounded-2xl shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.99]"
              >
                {isProcessingOrder ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t('pos.processingPayment', 'Memproses Transaksi...')}</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-5 h-5" />
                    <span>{t('pos.payBtn', 'Selesaikan & Cetak Nota')}</span>
                  </>
                )}
              </button>

              {/* Thermal Printer Ready Status */}
              <div className="text-center text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2 pt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Printer Thermal Siap • Format Struk 58mm / 80mm</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        order={completedOrder}
        tenant={tenant}
        onClose={() => setIsReceiptModalOpen(false)}
      />

      {/* Save Order Modal (Hold Order with Note) */}
      <SaveOrderModal
        isOpen={isSaveOrderModalOpen}
        items={items}
        total={total}
        cashierName={user?.name || 'Kasir'}
        onClose={() => setIsSaveOrderModalOpen(false)}
        onSave={handleSaveOrder}
      />

      {/* Saved Orders List Modal (Held Orders List) */}
      <SavedOrdersListModal
        isOpen={isSavedOrdersListModalOpen}
        savedOrders={savedOrders}
        hasActiveCartItems={items.length > 0}
        onClose={() => setIsSavedOrdersListModalOpen(false)}
        onLoadOrder={handleLoadSavedOrder}
        onDeleteOrder={handleDeleteSavedOrder}
        onUpdateNote={handleUpdateSavedNote}
      />

      {/* Confirmation Modal for Voiding / Cancelling active cart */}
      <ConfirmationModal
        isOpen={showCancelConfirm}
        type="DELETE"
        isDestructive={true}
        title={t('pos.clearCartTitle', 'Hapus Semua Pesanan?')}
        description={`Apakah Anda yakin ingin menghapus semua barang dari keranjang transaksi? Terdapat ${items.length} macam produk (${itemCount} item) yang akan dikosongkan.`}
        confirmText="Ya, Hapus Semua Pesanan"
        cancelText="Batal (Kembali)"
        onConfirm={() => {
          clearCart();
          setShowCancelConfirm(false);
          addToast({
            type: 'info',
            title: 'Semua Pesanan Dihapus',
            message: 'Keranjang transaksi kasir telah berhasil dikosongkan.',
          });
        }}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
};
