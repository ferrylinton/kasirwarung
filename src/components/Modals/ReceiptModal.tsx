import React from 'react';
import { Order, Tenant } from '../../types';
import { Printer, MessageSquare, X, CheckCircle2 } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';

interface ReceiptModalProps {
  isOpen: boolean;
  order: Order | null;
  tenant?: Tenant | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  order,
  tenant,
  onClose,
}) => {
  const { addToast } = useToastStore();

  if (!isOpen || !order) return null;

  const storeName = tenant?.name || 'TOKO BERKAH JAYA';
  const storeAddress = tenant?.address || 'Jl. Merdeka No. 42, RT 02/05 Pasar Anyar';
  const storePhone = tenant?.phone || 'Telp: 0812-3456-7890';

  const handlePrint = () => {
    addToast({
      type: 'info',
      title: 'Mencetak Struk',
      message: `Mengirim perintah cetak thermal ke nota ${order.orderNumber}...`,
    });
    window.print();
  };

  const handleSendWA = () => {
    const text = encodeURIComponent(
      `*STRUK PEMBELIAN ${storeName.toUpperCase()}*\n` +
      `No. Nota: ${order.orderNumber}\n` +
      `Waktu: ${new Date(order.createdAt).toLocaleString('id-ID')}\n` +
      `Kasir: ${order.cashierName}\n` +
      `--------------------------------\n` +
      order.items.map(it => `${it.name}\n${it.qty} x Rp ${it.price.toLocaleString('id-ID')} = Rp ${it.subtotal.toLocaleString('id-ID')}`).join('\n') +
      `\n--------------------------------\n` +
      `*Total: Rp ${order.total.toLocaleString('id-ID')}*\n` +
      `Metode: ${order.paymentMethod === 'TUNAI' ? 'Uang Tunai' : order.paymentMethod}\n` +
      (order.paymentMethod === 'TUNAI' ? `Bayar: Rp ${order.tenderAmount.toLocaleString('id-ID')}\nKembalian: Rp ${order.changeAmount.toLocaleString('id-ID')}\n` : '') +
      `Terima kasih sudah berbelanja di warung kami!`
    );
    const a = document.createElement('a');
    a.href = `https://wa.me/?text=${text}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addToast({
      type: 'success',
      title: 'WhatsApp Disiapkan',
      message: 'Membuka WhatsApp untuk mengirimkan rincian struk pembelian.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200 my-auto print:shadow-none print:border-none print:max-w-none">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Pratinjau Struk Kasir
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Paper Thermal Receipt Container */}
        <div className="p-6 font-mono text-xs text-slate-800 bg-white">
          {/* Store Info */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <h2 className="text-base font-bold text-emerald-800 tracking-wider uppercase font-sans">
              {storeName}
            </h2>
            <p className="text-[11px] text-slate-600 mt-0.5">{storeAddress}</p>
            <p className="text-[11px] text-slate-600">{storePhone}</p>
          </div>

          {/* Meta Details */}
          <div className="py-2.5 space-y-1 text-[11px] border-b border-dashed border-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">No. Transaksi</span>
              <span className="font-semibold text-slate-900">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Waktu</span>
              <span className="text-slate-800">
                {new Date(order.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                •{' '}
                {new Date(order.createdAt).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                WIB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kasir</span>
              <span className="text-slate-800">{order.cashierName}</span>
            </div>
          </div>

          {/* Items */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-2">
            {order.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="font-semibold text-slate-900 leading-snug">{item.name}</div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>
                    {item.qty} x Rp {item.price.toLocaleString('id-ID')}
                  </span>
                  <span className="font-medium text-slate-900">
                    Rp {item.subtotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="py-2.5 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Total Belanja</span>
              <span className="text-base text-emerald-700 font-sans">
                Rp {order.total.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="pt-2 text-[11px] space-y-1 border-t border-dashed border-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Metode Pembayaran</span>
                <span className="font-semibold text-slate-800">
                  {order.paymentMethod === 'TUNAI' ? 'Uang Tunai' : order.paymentMethod}
                </span>
              </div>
              {order.paymentMethod === 'TUNAI' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bayar Tunai</span>
                    <span>Rp {order.tenderAmount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-500">Kembalian</span>
                    <span className="text-emerald-700">
                      Rp {order.changeAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-3 mt-1 border-t border-dashed border-slate-300 text-[10px] text-slate-500 space-y-0.5">
            <p>Terima kasih atas kunjungan Anda!</p>
            <p>Barang yang sudah dibeli tidak dapat ditukar kecuali perjanjian.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            Cetak Thermal
          </button>
          <button
            onClick={handleSendWA}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            Kirim WA
          </button>
        </div>
      </div>
    </div>
  );
};
