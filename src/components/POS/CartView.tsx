import React, { useState, useEffect } from 'react';
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
}

export const CartView: React.FC<CartViewProps> = ({ products, onRefreshProducts }) => {
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
  } = useCartStore();

  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

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
