import React, { useState } from 'react';
import { Users, Search, Plus, Check, X } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { useToastStore } from '../../stores/toastStore';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const REGULAR_CUSTOMERS = [
  { name: 'Pak RT Bambang', note: 'Langganan Tetap (Kav. 4B)' },
  { name: 'Bu Siti Rahma', note: 'Pelanggan Tetap (Warga RT 02)' },
  { name: 'Mas Kevin (Kost 14)', note: 'Anak Kost No. 14' },
  { name: 'Pak RT Wardi', note: 'Kasbon Pos Ronda' },
  { name: 'Mbak Dewi (Laundry)', note: 'Laundry Barokah' },
  { name: 'Pak Budi Bengkel', note: 'Bengkel Motor Sebelah' },
  { name: 'Umum (Pelanggan Lepas)', note: 'Walk-in Customer' },
];

export const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose }) => {
  const { customerName, setCustomer } = useCartStore();
  const { addToast } = useToastStore();

  const [search, setSearch] = useState('');
  const [customName, setCustomName] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);

  if (!isOpen) return null;

  const filtered = REGULAR_CUSTOMERS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.note.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (name: string, note: string) => {
    setCustomer(name, note);
    addToast({
      type: 'info',
      title: 'Pelanggan Dipilih',
      message: `Nota transaksi dialokasikan untuk ${name}.`,
    });
    onClose();
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    setCustomer(customName.trim(), customNote.trim());
    addToast({
      type: 'success',
      title: 'Pelanggan Baru',
      message: `Pelanggan "${customName}" disetel untuk transaksi ini.`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Pilih / Tambah Pelanggan</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!showAddCustom ? (
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari pelanggan langganan / RT / kost..."
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {filtered.map((c, i) => {
                const isSelected = customerName === c.name;
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(c.name, c.note)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 font-semibold'
                        : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs">{c.name}</div>
                      <div className="text-[11px] text-slate-500">{c.note}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowAddCustom(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-semibold transition-colors mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Pelanggan Baru / Warga Lain
            </button>
          </div>
        ) : (
          <form onSubmit={handleSaveCustom} className="mt-4 space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Nama Pelanggan / Warga
              </label>
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Contoh: Bu Eni (Depan Masjid)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Keterangan / Nomor Rumah / Catatan
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Contoh: Blok B3 No 7"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCustom(false)}
                className="flex-1 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
              >
                Kembali
              </button>
              <button
                type="submit"
                className="flex-1 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs"
              >
                Terapkan
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
