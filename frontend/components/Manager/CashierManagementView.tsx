import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { Users2, UserPlus, Trash2, KeyRound, Shield, CheckCircle2, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { ConfirmationModal } from '../Modals/ConfirmationModal';

const CashierSchema = z.object({
  name: z.string().min(2, 'Nama kasir minimal 2 karakter'),
  email: z.string().email('Format email kasir tidak valid'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
});

interface CashierUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

export const CashierManagementView: React.FC = () => {
  const { tenant, token } = useAuthStore();
  const { addToast } = useToastStore();

  const [cashiers, setCashiers] = useState<CashierUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<CashierUser | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCashiers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users/cashiers', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCashiers(data.cashiers || []);
      }
    } catch (err) {
      console.error('Failed to load cashiers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashiers();
  }, [token]);

  const handleAddCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = CashierSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: { [key: string]: string } = {};
      result.error.issues.forEach((iss) => {
        if (iss.path[0]) fieldErrors[iss.path[0].toString()] = iss.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/users/cashier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      addToast({
        type: 'success',
        title: 'Kasir Ditambahkan',
        message: data.message,
      });

      setFormData({ name: '', email: '', password: '' });
      setErrors({});
      setIsModalOpen(false);
      fetchCashiers();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Gagal Menambah Kasir',
        message: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCashier = async () => {
    if (!deletingUser) return;
    try {
      const res = await fetch(`/api/users/cashiers/${deletingUser.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      addToast({
        type: 'success',
        title: 'Akun Kasir Dihapus',
        message: data.message,
      });

      setDeletingUser(null);
      fetchCashiers();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Gagal Menghapus Akun',
        message: err.message,
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-emerald-700 tracking-wider uppercase mb-1 flex items-center gap-1.5">
            <Users2 className="w-3.5 h-3.5" />
            <span>Manajemen Staf Toko (Role Manager)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Kelola Staf Kasir: {tenant?.name || 'Berkah Jaya'}
          </h1>
        </div>

        <button
          onClick={() => {
            setFormData({ name: '', email: '', password: '' });
            setErrors({});
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Kasir Baru</span>
        </button>
      </div>

      {/* Permissions Guide Card */}
      <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 mt-0.5 sm:mt-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm text-emerald-900">Hak Akses Role CASHIER</div>
            <p className="text-emerald-800/90 text-xs mt-0.5">
              Akun kasir memiliki izin untuk membuka POS, membuat transaksi penjualan, mencetak struk, dan melihat katalog sembako. Kasir tidak dapat mengubah data harga produk atau menghapus data inventaris.
            </p>
          </div>
        </div>
      </div>

      {/* Cashiers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3.5 px-4">Nama Kasir</th>
              <th className="py-3.5 px-4">Email Login</th>
              <th className="py-3.5 px-4">Role</th>
              <th className="py-3.5 px-4">Status Akun</th>
              <th className="py-3.5 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cashiers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400">
                  Belum ada akun staf kasir tambahan. Klik tombol Tambah Kasir Baru di atas.
                </td>
              </tr>
            ) : (
              cashiers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span>{c.name}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{c.email}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-md text-[11px]">
                      {c.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Aktif
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setDeletingUser(c)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus Kasir"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Cashier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Tambah Akun Kasir Baru</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCashier} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Kasir <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Rina Anggraini"
                  className={`w-full px-3 py-2 text-xs rounded-xl border bg-slate-50 focus:bg-white focus:outline-hidden ${
                    errors.name ? 'border-rose-400' : 'border-slate-200 focus:border-emerald-500'
                  }`}
                />
                {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Login Kasir <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="kasir.rina@berkahjaya.com"
                  className={`w-full px-3 py-2 text-xs rounded-xl border bg-slate-50 focus:bg-white focus:outline-hidden ${
                    errors.email ? 'border-rose-400' : 'border-slate-200 focus:border-emerald-500'
                  }`}
                />
                {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi Sementara <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimal 6 karakter"
                  className={`w-full px-3 py-2 text-xs rounded-xl border bg-slate-50 focus:bg-white focus:outline-hidden ${
                    errors.password ? 'border-rose-400' : 'border-slate-200 focus:border-emerald-500'
                  }`}
                />
                {errors.password && <p className="text-xs text-rose-500 mt-1">{errors.password}</p>}
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Daftarkan Kasir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Cashier */}
      <ConfirmationModal
        isOpen={Boolean(deletingUser)}
        type="DELETE"
        title="Hapus Akun Kasir?"
        description={`Apakah Anda yakin ingin menonaktifkan dan menghapus akun staf kasir "${deletingUser?.name}" (${deletingUser?.email})? Kasir ini tidak akan dapat login lagi.`}
        confirmText="Ya, Hapus Akun"
        cancelText="Batal"
        onConfirm={handleDeleteCashier}
        onCancel={() => setDeletingUser(null)}
      />
    </div>
  );
};
