import React, { useState, useEffect } from 'react';
import {
  X,
  Scale,
  Loader2,
  Check,
  RefreshCw,
} from 'lucide-react';
import { CashierUnit } from '../../types';

interface UnitModalProps {
  isOpen: boolean;
  unit: CashierUnit | null;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    symbol: string;
    description: string;
    syncProducts?: boolean;
  }) => Promise<void>;
}

export const UnitModal: React.FC<UnitModalProps> = ({
  isOpen,
  unit,
  onClose,
  onSubmit,
}) => {
  const isEditing = Boolean(unit);

  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [description, setDescription] = useState('');
  const [syncProducts, setSyncProducts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (unit) {
      setName(unit.name);
      setSymbol(unit.symbol);
      setDescription(unit.description || '');
      setSyncProducts(true);
    } else {
      setName('');
      setSymbol('');
      setDescription('');
      setSyncProducts(true);
    }
    setErrorMessage('');
  }, [unit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedSymbol = symbol.trim().toLowerCase();

    if (!trimmedName) {
      setErrorMessage('Nama istilah satuan kasir wajib diisi.');
      return;
    }
    if (!trimmedSymbol) {
      setErrorMessage('Singkatan / Simbol kasir wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await onSubmit({
        name: trimmedName,
        symbol: trimmedSymbol,
        description: description.trim(),
        syncProducts,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan satuan kasir.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in-50">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 transition-colors my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-theme-light text-theme-primary flex items-center justify-center shrink-0 shadow-2xs">
              <Scale className="w-5 h-5 stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {isEditing ? 'Edit Istilah Satuan Kasir' : 'Tambah Istilah Satuan Kasir Baru'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEditing
                  ? `Perbarui definisi satuan "${unit?.name}" (${unit?.symbol})`
                  : 'Daftarkan istilah dan simbol satuan barang kasir khusus toko Anda'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-xs font-semibold text-rose-700 dark:text-rose-300">
            {errorMessage}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Nama Satuan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Istilah Satuan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Bungkus, Kilogram, Renceng"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-theme-primary focus:outline-hidden focus:ring-2 focus:ring-[var(--theme-ring)] transition-all shadow-2xs"
                required
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                Nama lengkap yang mudah dipahami kasir
              </span>
            </div>

            {/* Simbol / Singkatan Kasir */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Singkatan / Simbol Kasir <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="Contoh: bks, kg, rcg, pcs"
                  className="w-full pl-3.5 pr-16 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-theme-primary focus:outline-hidden focus:ring-2 focus:ring-[var(--theme-ring)] transition-all shadow-2xs lowercase"
                  required
                />
                {symbol && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md font-mono text-[10px] font-black bg-theme-light text-theme-primary border border-theme-border">
                    {symbol.trim().toLowerCase()}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                Muncul pada struk nota & keranjang kasir
              </span>
            </div>
          </div>

          {/* Keterangan & Catatan Kasir */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Keterangan & Catatan Kasir (Opsional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Digunakan untuk kemasan mie instan, garam bungkusan, atau porsi eceran lainnya."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-theme-primary focus:outline-hidden focus:ring-2 focus:ring-[var(--theme-ring)] transition-all shadow-2xs resize-none"
            />
          </div>

          {/* Sync existing products checkbox if editing */}
          {isEditing && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-2.5">
              <input
                id="syncProducts"
                type="checkbox"
                checked={syncProducts}
                onChange={(e) => setSyncProducts(e.target.checked)}
                className="mt-0.5 rounded text-theme-primary focus:ring-theme-primary cursor-pointer"
              />
              <label htmlFor="syncProducts" className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                <span className="font-bold text-slate-800 dark:text-slate-100 block">
                  Sinkronkan produk yang memakai simbol lama
                </span>
                Otomatis perbarui satuan barang pada produk-produk yang saat ini menggunakan simbol &quot;{unit?.symbol}&quot; jika simbol diubah.
              </label>
            </div>
          )}

          {/* Live Preview Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-850/60 border border-dashed border-slate-200 dark:border-slate-750 flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">
                Pratinjau Tampilan Kasir:
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {name.trim() || 'Nama Satuan'}
                </span>
                <span className="px-2 py-0.5 rounded-md font-mono text-xs font-black bg-theme-light text-theme-primary border border-theme-border">
                  {symbol.trim().toLowerCase() || 'simbol'}
                </span>
              </div>
            </div>
            <div className="text-right text-xs font-mono text-slate-500">
              Contoh: 1 {symbol.trim().toLowerCase() || 'satuan'} = Rp 15.000
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold btn-theme-primary text-white flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{isEditing ? 'Simpan Perubahan' : 'Tambahkan Satuan'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
