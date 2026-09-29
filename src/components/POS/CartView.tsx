import React, { useState, useEffect, useRef } from 'react';
import {
  Calculator,
  Plus,
  Minus,
  X,
  QrCode,
  Banknote,
  Printer,
  User,
  Trash2,
  CheckCircle2,
  Search,
  ScanBarcode,
  Loader2,
  Package,
  Check,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Product, PaymentMethod } from '../../types';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { ReceiptModal } from '../Modals/ReceiptModal';
import { ConfirmationModal } from '../Modals/ConfirmationModal';

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
  } = useCartStore();

  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Search Bar State inside CartView
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState<number>(-1);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Keyboard Shortcuts: [F8] Uang Pas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8') {
        e.preventDefault();
        applyQuickTender('UANG_PAS');
        addToast({
          type: 'info',
          title: 'Tender Uang Pas',
          message: `Nominal disetel sama dengan total belanja (Rp ${getTotal().toLocaleString('id-ID')}).`,
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [getTotal, applyQuickTender, addToast]);

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

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-slate-100/50 p-2 sm:p-4 lg:p-6">
      {/* POS Checkout Order Panel */}
      <div className="w-full">
        <div className="bg-white rounded-2xl shadow-sm flex flex-col lg:grid lg:grid-cols-12 overflow-hidden">
          {/* Left Column: Order Header & Cart Items List */}
          <div className="lg:col-span-7 flex flex-col">
            {/* Order Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm sm:text-base font-bold text-slate-900">
                    Nota #TRX-2024-0891
                  </span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    {items.length} Barang
                  </span>
                </div>
                {items.length > 0 && (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Batal Transaksi
                  </button>
                )}
              </div>
              <div className="text-xs text-slate-500">
                Kasir: <span className="font-semibold text-slate-700">{user?.name || 'Bu Siti'}</span>
              </div>
            </div>

            {/* Search Bar in CartView */}
            <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-850/60 relative" ref={searchContainerRef}>
              <div className="relative">
                {isSearchLoading ? (
                  <Loader2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 animate-spin" />
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
                  placeholder={t('pos.searchPlaceholder', 'Cari produk / scan barcode (Tekan F2)...')}
                  className="w-full pl-9 pr-16 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 focus:outline-hidden transition-all shadow-xs"
                />

                {/* Clear & Barcode Action Buttons inside Input */}
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Hapus pencarian"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleBarcodeClick}
                    className="p-1 rounded-md text-slate-400 dark:text-slate-400 hover:text-emerald-600 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title={t('pos.scanBarcode', 'Tekan F2 untuk Scan Barcode')}
                  >
                    <ScanBarcode className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Live Search Dropdown Panel */}
              {isSearchDropdownOpen && searchQuery.trim().length > 0 && (
                <div className="absolute top-full left-3.5 right-3.5 mt-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-50 animate-in fade-in-80 zoom-in-95">
                  {/* Header */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">Hasil Pencarian Produk</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                        {searchResults.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="hidden sm:inline">Navigasi: ↑↓ Enter untuk tambah</span>
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
                        <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                        <span>Mencari di database sembako...</span>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-6 text-center">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2.5">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Tidak Ada Produk Ditemukan</p>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                          Tidak ada sembako yang cocok dengan &quot;{searchQuery}&quot;. Periksa kembali SKU atau nama barang.
                        </p>
                      </div>
                    ) : (
                      searchResults.map((product, idx) => {
                        const isSelected = searchSelectedIndex === idx;
                        const isJustAdded = addedProductId === product.id;
                        const isOutOfStock = product.stock <= 0;
                        const isLowStock = !isOutOfStock && product.stock <= product.minStock;

                        return (
                          <div
                            key={product.id}
                            onClick={() => !isOutOfStock && handleAddToCart(null, product)}
                            className={`flex items-center justify-between p-3 gap-3 transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50 dark:bg-slate-800'
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
                                        : 'text-emerald-600 dark:text-emerald-400'
                                    }`}
                                  >
                                    {isOutOfStock ? 'Habis' : `Stok: ${product.stock} ${product.unit || 'pcs'}`}
                                  </span>
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
                                className={`p-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                                  isJustAdded
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : isOutOfStock
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
                                    : 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs'
                                }`}
                                title={isOutOfStock ? 'Stok habis' : 'Tambah ke pesanan kasir'}
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
                        <span>Buka Semua Hasil di Katalog Produk</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 min-h-[300px] max-h-[500px] lg:max-h-[calc(100vh-18rem)] overflow-y-auto p-4 sm:p-5 space-y-3 divide-y divide-slate-100">
              {items.length === 0 ? (
                <div className="h-full py-16 flex flex-col items-center justify-center text-slate-400">
                  <Calculator className="w-14 h-14 stroke-1 text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-700">{t('pos.emptyCartTitle', 'Keranjang transaksi masih kosong')}</p>
                  <p className="text-xs text-slate-400 mt-1 text-center max-w-xs">
                    {t('pos.emptyCartDesc', 'Pilih sembako di katalog untuk menambahkan pesanan pelanggan')}
                  </p>
                </div>
              ) : (
                items.map((it) => (
                  <div key={it.product.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {it.product.name}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        @ Rp {it.product.price.toLocaleString('id-ID')} / {it.product.unit || 'pcs'}
                      </div>
                    </div>

                    {/* Quantity adjusters */}
                    <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 shrink-0">
                      <button
                        onClick={() => updateQty(it.product.id, it.qty - 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-200 transition-colors shadow-xs cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs sm:text-sm font-bold font-mono px-2 min-w-[24px] text-center">
                        {it.qty}
                      </span>
                      <button
                        onClick={() => updateQty(it.product.id, it.qty + 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-200 transition-colors shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Subtotal & Delete */}
                    <div className="text-right flex items-center gap-2.5 shrink-0">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                        Rp {it.subtotal.toLocaleString('id-ID')}
                      </div>
                      <button
                        onClick={() => removeItem(it.product.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus Baris"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Calculation & Payment Area */}
          <div className="lg:col-span-5 p-4 sm:p-6 bg-slate-50/70 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Total Display */}
              <div className="flex justify-between items-baseline pt-1">
                <div>
                  <span className="text-xs sm:text-sm font-bold text-slate-600">
                    Total Belanja ({itemCount} item)
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
                  Rp {total.toLocaleString('id-ID')}
                </div>
              </div>

              {/* Nominal Cepat (Tender Tunai) */}
              {paymentMethod === 'TUNAI' && (
                <div className="space-y-2.5 pt-3 border-t border-dashed border-slate-200">
                  <span className="text-xs font-semibold text-slate-600">Nominal Cepat (Tender Tunai):</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => applyQuickTender('UANG_PAS')}
                      className="py-1.5 px-2 text-xs font-semibold bg-white rounded-xl shadow-xs hover:bg-emerald-50 text-slate-800 transition-colors cursor-pointer"
                    >
                      Uang Pas [F8]
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickTender(200000)}
                      className="py-1.5 px-2 text-xs font-semibold bg-white rounded-xl shadow-xs hover:bg-emerald-50 text-slate-800 transition-colors font-mono cursor-pointer"
                    >
                      Rp 200.000
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickTender(250000)}
                      className="py-1.5 px-2 text-xs font-semibold bg-white rounded-xl shadow-xs hover:bg-emerald-50 text-slate-800 transition-colors font-mono cursor-pointer"
                    >
                      Rp 250.000
                    </button>
                  </div>

                  {/* Diterima & Kembalian */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Diterima (Rp)
                      </label>
                      <input
                        type="number"
                        value={tenderAmount || ''}
                        onChange={(e) => setTenderAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl bg-white focus:outline-emerald-500 shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Kembalian
                      </label>
                      <div className="px-3 py-2 text-sm font-mono font-extrabold text-emerald-700 bg-emerald-50 rounded-xl">
                        Rp {change.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Method Selector */}
              <div>
                <span className="block text-xs font-semibold text-slate-600 mb-2">
                  Metode Pembayaran:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'TUNAI', label: 'Uang Tunai', icon: Banknote },
                      { id: 'QRIS', label: 'QRIS', icon: QrCode },
                    ] as const
                  ).map((method) => {
                    const Icon = method.icon;
                    const isSelected = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                        className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-slate-100 shadow-xs'
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-1" />
                        <span>{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Submit Button & Status */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={items.length === 0 || isProcessingOrder}
                onClick={handleCheckout}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm sm:text-base rounded-xl shadow-md shadow-emerald-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Printer className="w-5 h-5" />
                <span>{isProcessingOrder ? t('pos.processingPayment', 'Memproses Transaksi...') : t('pos.payBtn', 'Selesaikan & Cetak Nota')}</span>
              </button>

              {/* Thermal Printer Ready Status */}
              <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5 pt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Printer Thermal Siap • Format 58mm / 80mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Reference Bar at bottom */}
        <div className="pt-3 pb-2 text-xs text-slate-500 flex flex-wrap items-center justify-center gap-3">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            ⌨️ Shortcut Keyboard:
          </span>
          <span className="px-2 py-0.5 bg-white rounded-md font-mono font-bold text-slate-800 shadow-xs">
            [F8] Uang Pas
          </span>
        </div>
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        order={completedOrder}
        tenant={tenant}
        onClose={() => setIsReceiptModalOpen(false)}
      />

      {/* Confirmation Modal for Voiding / Cancelling active cart */}
      <ConfirmationModal
        isOpen={showCancelConfirm}
        type="DELETE"
        title={t('pos.clearCart', 'Batalkan Transaksi Ini?')}
        description={t('pos.clearCartConfirm', 'Keranjang transaksi kasir akan dikosongkan. Rincian barang yang telah dimasukkan tidak akan tersimpan.')}
        confirmText={t('pos.clearCart', 'Ya, Batalkan Nota')}
        cancelText={t('common.cancel', 'Kembali Kasir')}
        onConfirm={() => {
          clearCart();
          setShowCancelConfirm(false);
          addToast({
            type: 'info',
            title: t('pos.clearCart', 'Nota Dibatalkan'),
            message: 'Keranjang belanja kasir telah dikosongkan.',
          });
        }}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
};

export const CashierView = CartView;
