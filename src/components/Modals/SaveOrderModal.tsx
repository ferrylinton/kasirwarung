import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  X,
  FileText,
  AlertCircle,
  Package,
  Sparkles,
} from 'lucide-react';
import { CartItem } from '../../types';

interface SaveOrderModalProps {
  isOpen: boolean;
  items: CartItem[];
  total: number;
  cashierName?: string;
  onClose: () => void;
  onSave: (note: string) => void;
}

const QUICK_TAGS = [
  'Ambil dompet / uang',
  'Pelanggan tambah barang',
  'Tunggu antrean sebentar',
  'Bungkus nanti sore',
  'Meja 1',
  'Meja 2',
  'Meja 3',
  'Langganan tetangga',
];

export const SaveOrderModal: React.FC<SaveOrderModalProps> = ({
  isOpen,
  items,
  total,
  cashierName = 'Kasir',
  onClose,
  onSave,
}) => {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNote('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = note.trim();
    if (!trimmed) {
      setError('Keterangan pesanan wajib diisi untuk memudahkan pencarian kembali.');
      return;
    }
    onSave(trimmed);
  };

  const handleSelectQuickTag = (tag: string) => {
    if (!note) {
      setNote(tag);
    } else {
      setNote((prev) => `${prev} - ${tag}`);
    }
    setError('');
  };

  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg">
                Simpan Pesanan Sementara
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tahan transaksi kasir dan berikan keterangan pesanan
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Order Summary Pill */}
          <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {items.length} Macam Barang ({totalQty} item)
              </span>
            </div>
            <span className="font-mono text-sm font-bold text-amber-700 dark:text-amber-400">
              Rp {total.toLocaleString('id-ID')}
            </span>
          </div>

          {/* Items Preview */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Rincian Barang yang Ditahan:
            </label>
            <div className="max-h-28 overflow-y-auto bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl p-2.5 divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((it) => (
                <div key={it.product.id} className="py-1 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                  <span className="text-slate-800 dark:text-slate-200 truncate pr-2">
                    {it.product.name}
                  </span>
                  <div className="flex items-center gap-3 shrink-0 font-mono text-slate-600 dark:text-slate-400">
                    <span>{it.qty}x</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      Rp {it.subtotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Keterangan Pesanan Input */}
          <div className="space-y-1.5">
            <label htmlFor="order-note-input" className="block text-xs font-bold text-slate-700 dark:text-slate-200">
              Keterangan / Catatan Pesanan <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-3 text-slate-400">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                id="order-note-input"
                autoFocus
                rows={3}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Tuliskan keterangan agar pesanan mudah dikenali. Contoh: Bu Siti lagi ambil uang di motor / Meja 2 / Mas Kevin bungkus..."
                className={`w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden transition-all shadow-xs ${
                  error
                    ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-100 dark:ring-rose-950/30'
                    : 'border-slate-200 dark:border-slate-700 focus:border-amber-500'
                }`}
              />
            </div>
            {error && (
              <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          {/* Quick Note Tags */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Pilihan Cepat Keterangan:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleSelectQuickTag(tag)}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 hover:bg-amber-100/70 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 font-medium transition-colors cursor-pointer border border-transparent hover:border-amber-300 dark:hover:border-amber-700/60"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            Disimpan oleh Kasir: <span className="font-semibold text-slate-600 dark:text-slate-300">{cashierName}</span>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs shadow-amber-200 dark:shadow-none flex items-center gap-1.5 cursor-pointer"
            >
              <Bookmark className="w-4 h-4" />
              <span>Simpan Pesanan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
