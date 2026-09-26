import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ScanBarcode,
  Filter,
  Calculator,
  Plus,
  Minus,
  X,
  CreditCard,
  QrCode,
  Banknote,
  BookOpen,
  Printer,
  User,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { Product, PaymentMethod } from '../../types';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { CustomerModal } from '../Modals/CustomerModal';
import { ReceiptModal } from '../Modals/ReceiptModal';
import { ConfirmationModal } from '../Modals/ConfirmationModal';

interface CashierViewProps {
  products: Product[];
  onRefreshProducts: () => void;
}

const CATEGORY_TABS = [
  'Semua',
  'Beras & Gandum',
  'Minyak & Margarin',
  'Mie & Makanan Instan',
  'Minuman & Kopi',
  'Sembako Segar',
  'Kebersihan',
  'Camilan & Snack',
  'Bumbu Dapur',
];

export const CashierView: React.FC<CashierViewProps> = ({ products, onRefreshProducts }) => {
  const { user, tenant, token } = useAuthStore();
  const { addToast } = useToastStore();
  const {
    items,
    customerName,
    customerNote,
    discount,
    paymentMethod,
    tenderAmount,
    addItem,
    updateQty,
    removeItem,
    clearCart,
    setPaymentMethod,
    setTenderAmount,
    setDiscount,
    applyQuickTender,
    getSubtotal,
    getTotal,
    getChange,
    getItemCount,
  } = useCartStore();

  const [activeCategory, setActiveCategory] = useState('Semua');
  const [search, setSearch] = useState('');
  const [filterStockOnly, setFilterStockOnly] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard Shortcuts: [F2] Scan, [F4] Pelanggan, [F8] Uang Pas, [Space] Cetak Nota
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        addToast({
          type: 'info',
          title: 'Mode Barcode Scanner',
          message: 'Arahkan scanner barcode atau ketik SKU produk.',
        });
      } else if (e.key === 'F4') {
        e.preventDefault();
        setIsCustomerModalOpen(true);
      } else if (e.key === 'F8') {
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

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchCategory =
      activeCategory === 'Semua' || p.category.toLowerCase().includes(activeCategory.toLowerCase());
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchStock = filterStockOnly ? p.stock > 0 : true;
    return matchCategory && matchSearch && matchStock;
  });

  const subtotal = getSubtotal();
  const total = getTotal();
  const change = getChange();
  const itemCount = getItemCount();

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      addToast({
        type: 'warning',
        title: 'Stok Habis',
        message: `Produk "${product.name}" sedang kosong dan perlu restock.`,
      });
      return;
    }
    const success = addItem(product, 1);
    if (!success) {
      addToast({
        type: 'warning',
        title: 'Batas Stok Tercapai',
        message: `Tidak dapat menambahkan lagi, stok tersisa hanya ${product.stock} ${product.unit}.`,
      });
    } else {
      addToast({
        type: 'success',
        title: 'Ditambahkan ke Nota',
        message: `${product.name} dimasukkan ke keranjang kasir.`,
        duration: 1800,
      });
    }
  };

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
          customerName: customerName || 'Umum (Pelanggan Lepas)',
          customerNote: customerNote || '',
          discount,
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
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-4rem)] bg-slate-100">
      {/* LEFT SECTION: Catalog & Quick POS Grid */}
      <div className="flex-1 flex flex-col p-3 sm:p-5 overflow-y-auto">
        {/* Top Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari sembako, ketik nama atau tekan tombol scan..."
              className="w-full pl-9 pr-24 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:border-emerald-500 focus:outline-hidden shadow-xs transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
              <ScanBarcode className="w-3.5 h-3.5" />
              <span>Scan (F2)</span>
            </div>
          </div>

          <button
            onClick={() => setFilterStockOnly(!filterStockOnly)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
              filterStockOnly
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Stok</span>
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
          {CATEGORY_TABS.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Section Heading matching Image 9 */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-500 text-base">🔥</span>
            <h2 className="text-sm font-bold text-slate-900">Produk Terlaris Harian</h2>
          </div>
          <span className="text-xs text-slate-400">Klik kartu untuk menambah ke nota</span>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.map((p) => {
            const isLowStock = p.stock <= p.minStock && p.stock > 0;
            const isOutOfStock = p.stock <= 0;

            return (
              <div
                key={p.id}
                onClick={() => handleAddToCart(p)}
                className={`group bg-white rounded-2xl border p-3 flex flex-col justify-between hover:shadow-md hover:border-emerald-500 transition-all cursor-pointer relative overflow-hidden ${
                  isOutOfStock ? 'opacity-60 border-slate-200 bg-slate-50/50' : 'border-slate-200'
                }`}
              >
                {/* Image & Stock Badge */}
                <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-100 mb-2">
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-1.5 left-1.5 bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                    {p.category.split(' ')[0]}
                  </div>
                  <div
                    className={`absolute bottom-1.5 right-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs ${
                      isOutOfStock
                        ? 'bg-rose-600 text-white'
                        : isLowStock
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-white/95 text-slate-800'
                    }`}
                  >
                    Stok {p.stock} {p.unit}
                  </div>
                </div>

                {/* Details */}
                <div>
                  <h3 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {p.description || `Satuan: ${p.unit}`}
                  </p>
                </div>

                {/* Price & Add Button */}
                <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100">
                  <span className="text-xs font-extrabold text-slate-900 font-mono">
                    Rp {p.price.toLocaleString('id-ID')}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(p);
                    }}
                    disabled={isOutOfStock}
                    className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white flex items-center justify-center transition-colors shadow-xs"
                    title="Tambah ke Keranjang"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Keyboard Shortcuts Reference Bar at bottom */}
        <div className="mt-auto pt-6 pb-2 text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            ⌨️ Shortcut Keyboard:
          </span>
          <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold text-slate-800">
            [F2] Scan
          </span>
          <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold text-slate-800">
            [F4] Pelanggan
          </span>
          <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold text-slate-800">
            [F8] Uang Pas
          </span>
          <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold text-slate-800">
            [Space] Selesaikan Transaksi
          </span>
        </div>
      </div>

      {/* RIGHT SECTION: Cart / POS Checkout Order Panel */}
      <div className="w-full lg:w-96 xl:w-[420px] bg-white border-l border-slate-200 flex flex-col justify-between shadow-xs">
        {/* Order Header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-900">
                Nota #TRX-2024-0891
              </span>
            </div>
            {items.length > 0 && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Batal
              </button>
            )}
          </div>
          <div className="text-[11px] text-slate-500">
            Kasir: <span className="font-semibold text-slate-700">{user?.name || 'Bu Siti'}</span>
          </div>

          {/* Customer Selection Card */}
          <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-900 truncate">{customerName}</div>
                <div className="text-[10px] text-slate-500 truncate">
                  {customerNote || 'Warga Sekitar'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100/70 rounded-lg transition-colors shrink-0"
            >
              Ganti
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100">
          {items.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400">
              <Calculator className="w-10 h-10 stroke-1 text-slate-300 mb-2" />
              <p className="text-xs font-medium">Keranjang transaksi masih kosong</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Pilih sembako di katalog untuk menambahkan
              </p>
            </div>
          ) : (
            items.map((it) => (
              <div key={it.product.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {it.product.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    @ Rp {it.product.price.toLocaleString('id-ID')}
                  </div>
                </div>

                {/* Quantity adjusters */}
                <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-0.5">
                  <button
                    onClick={() => updateQty(it.product.id, it.qty - 1)}
                    className="w-5 h-5 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold font-mono px-1 min-w-[20px] text-center">
                    {it.qty}
                  </span>
                  <button
                    onClick={() => updateQty(it.product.id, it.qty + 1)}
                    className="w-5 h-5 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Subtotal & Delete */}
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900 font-mono">
                    Rp {it.subtotal.toLocaleString('id-ID')}
                  </div>
                  <button
                    onClick={() => removeItem(it.product.id)}
                    className="text-slate-400 hover:text-rose-500 text-[10px] transition-colors"
                    title="Hapus Baris"
                  >
                    <X className="w-3.5 h-3.5 inline" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Calculation & Payment Area */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
          {/* Subtotal & Diskon */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal ({itemCount} item)</span>
              <span className="font-mono">Rp {subtotal.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Diskon / Promo Warung</span>
              <span className="font-mono text-emerald-600">
                {discount > 0 ? `- Rp ${discount.toLocaleString('id-ID')}` : 'Rp 0'}
              </span>
            </div>
          </div>

          {/* Big Total Display */}
          <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
            <div>
              <span className="text-xs font-semibold text-slate-600">Total Bayar</span>
            </div>
            <div className="text-2xl font-black text-emerald-700 font-mono">
              Rp {total.toLocaleString('id-ID')}
            </div>
          </div>

          {/* Nominal Cepat (Tender Tunai) */}
          {paymentMethod === 'TUNAI' && (
            <div className="space-y-2 pt-2 border-t border-dashed border-slate-200">
              <span className="text-[11px] font-semibold text-slate-600">Nominal Cepat (Tender Tunai):</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => applyQuickTender('UANG_PAS')}
                  className="py-1 px-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 text-slate-800 transition-colors"
                >
                  Uang Pas
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickTender(200000)}
                  className="py-1 px-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 text-slate-800 transition-colors font-mono"
                >
                  Rp 200.000
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickTender(250000)}
                  className="py-1 px-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 text-slate-800 transition-colors font-mono"
                >
                  Rp 250.000
                </button>
              </div>

              {/* Diterima & Kembalian */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    Diterima (Rp)
                  </label>
                  <input
                    type="number"
                    value={tenderAmount || ''}
                    onChange={(e) => setTenderAmount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    Kembalian
                  </label>
                  <div className="px-2.5 py-1.5 text-xs font-mono font-extrabold text-emerald-700 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                    Rp {change.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">
              Metode Pembayaran:
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'TUNAI', label: 'Tunai', icon: Banknote },
                  { id: 'QRIS', label: 'QRIS', icon: QrCode },
                  { id: 'TRANSFER', label: 'Transfer', icon: CreditCard },
                  { id: 'KASBON', label: 'Kasbon', icon: BookOpen },
                ] as const
              ).map((method) => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[11px] font-bold transition-all ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span>{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Big Action Submit Button */}
          <button
            type="button"
            disabled={items.length === 0 || isProcessingOrder}
            onClick={handleCheckout}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isProcessingOrder ? 'Memproses Transaksi...' : 'Selesaikan & Cetak Nota'}</span>
          </button>

          {/* Thermal Printer Ready Status */}
          <div className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Printer Thermal Siap • Format 58mm / 80mm</span>
          </div>
        </div>
      </div>

      {/* Customer Selection Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
      />

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
        title="Batalkan Transaksi Ini?"
        description="Keranjang transaksi kasir akan dikosongkan. Rincian barang yang telah dimasukkan tidak akan tersimpan."
        confirmText="Ya, Batalkan Nota"
        cancelText="Kembali Kasir"
        onConfirm={() => {
          clearCart();
          setShowCancelConfirm(false);
          addToast({
            type: 'info',
            title: 'Nota Dibatalkan',
            message: 'Keranjang belanja kasir telah dikosongkan.',
          });
        }}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
};
