import React, { useState, useEffect } from 'react';
import {
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
import { useTranslation } from 'react-i18next';
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

export const CashierView: React.FC<CashierViewProps> = ({ products, onRefreshProducts }) => {
  const { t } = useTranslation();
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

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Keyboard Shortcuts: [F4] Pelanggan, [F8] Uang Pas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
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

  const subtotal = getSubtotal();
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
    <div className="flex justify-center p-3 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)] bg-slate-100">
      {/* POS Checkout Order Panel */}
      <div className="w-full max-w-xl self-start">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
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
          <div className="max-h-80 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100">
            {items.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Calculator className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-700">{t('pos.emptyCartTitle', 'Keranjang transaksi masih kosong')}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {t('pos.emptyCartDesc', 'Pilih sembako di katalog untuk menambahkan')}
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
              <span>{isProcessingOrder ? t('pos.processingPayment', 'Memproses Transaksi...') : t('pos.payBtn', 'Selesaikan & Cetak Nota')}</span>
            </button>

            {/* Thermal Printer Ready Status */}
            <div className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Printer Thermal Siap • Format 58mm / 80mm</span>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Reference Bar at bottom */}
        <div className="pt-3 pb-2 text-[11px] text-slate-500 flex flex-wrap items-center justify-center gap-3">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            ⌨️ Shortcut Keyboard:
          </span>
          <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold text-slate-800">
            [F4] Pelanggan
          </span>
          <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold text-slate-800">
            [F8] Uang Pas
          </span>
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
