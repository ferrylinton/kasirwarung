import React, { useState } from 'react';
import {
  Bookmark,
  X,
  Clock,
  ShoppingCart,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  Search,
  CheckCircle2,
  Edit2,
  Check,
} from 'lucide-react';
import { SavedOrder } from '../../types';

interface SavedOrdersListModalProps {
  isOpen: boolean;
  savedOrders: SavedOrder[];
  hasActiveCartItems: boolean;
  onClose: () => void;
  onLoadOrder: (id: string) => void;
  onDeleteOrder: (id: string) => void;
  onUpdateNote: (id: string, newNote: string) => void;
}

export const SavedOrdersListModal: React.FC<SavedOrdersListModalProps> = ({
  isOpen,
  savedOrders,
  hasActiveCartItems,
  onClose,
  onLoadOrder,
  onDeleteOrder,
  onUpdateNote,
}) => {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderToLoad, setOrderToLoad] = useState<SavedOrder | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<SavedOrder | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Editing note inline
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');

  if (!isOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  };

  const handleStartEditNote = (order: SavedOrder) => {
    setEditingOrderId(order.id);
    setEditNoteText(order.note);
  };

  const handleSaveEditNote = (id: string) => {
    if (editNoteText.trim()) {
      onUpdateNote(id, editNoteText.trim());
    }
    setEditingOrderId(null);
  };

  const handleConfirmLoad = (order: SavedOrder) => {
    if (hasActiveCartItems) {
      setOrderToLoad(order);
    } else {
      onLoadOrder(order.id);
      onClose();
    }
  };

  const filteredOrders = savedOrders.filter((o) => {
    const q = searchFilter.toLowerCase().trim();
    if (!q) return true;
    return (
      o.note.toLowerCase().includes(q) ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.cashierName.toLowerCase().includes(q) ||
      o.items.some((it) => it.product.name.toLowerCase().includes(q))
    );
  });

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} menit yang lalu`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} jam yang lalu`;
      return new Date(isoString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg">
                  Daftar Pesanan Tersimpan
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                  {savedOrders.length} Pesanan
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih pesanan yang ditahan untuk melanjutkan pembayaran
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar if more than 2 orders */}
        {savedOrders.length > 2 && (
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Cari berdasarkan keterangan, nomor tiket, atau barang..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>
        )}

        {/* Orders List Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 divide-y divide-slate-100 dark:divide-slate-800">
          {savedOrders.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
                <Bookmark className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Tidak Ada Pesanan Tersimpan
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Saat pelanggan meminta waktu tambahan atau antrean padat, gunakan tombol{' '}
                <span className="font-semibold text-amber-600">Simpan Pesanan</span> di kasir untuk menahan transaksi sementara.
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              Tidak ada pesanan tersimpan yang cocok dengan pencarian &quot;{searchFilter}&quot;.
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              const isEditing = editingOrderId === order.id;
              const totalItemsCount = order.items.reduce((sum, it) => sum + it.qty, 0);

              return (
                <div
                  key={order.id}
                  className="pt-3.5 first:pt-0 bg-white dark:bg-slate-900 rounded-xl transition-all"
                >
                  <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700 transition-all bg-slate-50/50 dark:bg-slate-850/40 shadow-xs">
                    {/* Top row: Order Number, Relative Time, Cashier */}
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs sm:text-sm font-bold px-2 py-0.5 rounded-lg bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          {order.orderNumber}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatRelativeTime(order.createdAt)}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Kasir: <span className="font-semibold text-slate-700 dark:text-slate-300">{order.cashierName}</span>
                      </div>
                    </div>

                    {/* Keterangan Pesanan (Prominent Box) */}
                    <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-200/60 dark:border-amber-900/40">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 block mb-0.5">
                              Keterangan Pesanan:
                            </span>
                            {isEditing ? (
                              <div className="flex items-center gap-2 mt-1">
                                <input
                                  type="text"
                                  value={editNoteText}
                                  onChange={(e) => setEditNoteText(e.target.value)}
                                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-amber-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEditNote(order.id);
                                    if (e.key === 'Escape') setEditingOrderId(null);
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditNote(order.id)}
                                  className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                                  title="Simpan perubahan keterangan"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 break-words">
                                &ldquo;{order.note}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>

                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => handleStartEditNote(order)}
                            className="p-1 rounded-md text-amber-600 hover:text-amber-700 hover:bg-amber-200/40 dark:hover:bg-amber-950/60 transition-colors shrink-0"
                            title="Ubah Keterangan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Summary row & Action Buttons */}
                    <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-base sm:text-lg font-extrabold text-emerald-700 dark:text-emerald-400">
                          Rp {order.total.toLocaleString('id-ID')}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          ({order.items.length} macam • {totalItemsCount} item)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Toggle Items Breakdown */}
                        <button
                          type="button"
                          onClick={() => toggleExpand(order.id)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>{isExpanded ? 'Tutup Rincian' : 'Lihat Rincian'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Delete Order Button */}
                        <button
                          type="button"
                          onClick={() => setOrderToDelete(order)}
                          className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Hapus Pesanan Tersimpan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Load Order / Checkout Button */}
                        <button
                          type="button"
                          onClick={() => handleConfirmLoad(order)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Muat ke Kasir</span>
                        </button>
                      </div>
                    </div>

                    {/* Expandable Breakdown of Items */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5 animate-in fade-in duration-150">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                          Daftar Barang Belanja:
                        </span>
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                          {order.items.map((it) => (
                            <div
                              key={it.product.id}
                              className="py-1 first:pt-0 last:pb-0 flex items-center justify-between text-xs"
                            >
                              <div className="truncate pr-2">
                                <span className="font-semibold text-slate-800 dark:text-slate-100">
                                  {it.product.name}
                                </span>
                                <span className="text-slate-400 text-[11px] ml-1.5 font-mono">
                                  (@ Rp {it.product.price.toLocaleString('id-ID')})
                                </span>
                              </div>
                              <div className="font-mono text-slate-700 dark:text-slate-300 font-bold shrink-0">
                                {it.qty} {it.product.unit || 'pcs'} = Rp {it.subtotal.toLocaleString('id-ID')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 flex items-center justify-between text-xs text-slate-500">
          <span>Tekan F9 di kasir untuk membuka daftar ini kapan saja.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Confirmation to Overwrite Current Cart Modal */}
      {orderToLoad && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl p-5 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-center text-slate-900 dark:text-slate-100">
              Timpa Keranjang Aktif?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1.5 mb-4">
              Keranjang kasir saat ini sedang berisi barang. Jika Anda memuat pesanan{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                &ldquo;{orderToLoad.note}&rdquo; ({orderToLoad.orderNumber})
              </span>
              , barang di keranjang kasir saat ini akan digantikan.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setOrderToLoad(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onLoadOrder(orderToLoad.id);
                  setOrderToLoad(null);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs"
              >
                Ya, Muat Pesanan Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation to Delete Saved Order Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl p-5 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-center text-slate-900 dark:text-slate-100">
              Hapus Pesanan Tersimpan?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1.5 mb-4">
              Apakah Anda yakin ingin menghapus pesanan{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                &ldquo;{orderToDelete.note}&rdquo; ({orderToDelete.orderNumber})
              </span>
              ? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteOrder(orderToDelete.id);
                  setOrderToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
              >
                Ya, Hapus Pesanan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
