import React, { useState, useEffect } from 'react';
import { Building2, Shield, CheckCircle2, AlertOctagon, Store, DollarSign, Package, Users } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { ConfirmationModal } from '../Modals/ConfirmationModal';

interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  productCount: number;
  userCount: number;
  orderCount: number;
  totalRevenue: number;
}

export const TenantManagementView: React.FC = () => {
  const { token } = useAuthStore();
  const { addToast } = useToastStore();

  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingTenant, setTogglingTenant] = useState<AdminTenant | null>(null);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tenants', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants || []);
      }
    } catch (err) {
      console.error('Failed to load tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [token]);

  const handleToggleStatus = async () => {
    if (!togglingTenant) return;
    const newStatus = togglingTenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

    try {
      const res = await fetch(`/api/tenants/${togglingTenant.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      addToast({
        type: 'success',
        title: 'Status Tenant Diperbarui',
        message: data.message,
      });

      setTogglingTenant(null);
      fetchTenants();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Gagal Mengubah Status',
        message: err.message,
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="text-[11px] font-bold text-purple-700 tracking-wider uppercase mb-1 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          <span>Akses Role ADMIN (Platform Super Admin)</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Manajemen Tenant & Warung Multi-Tenant
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Kelola seluruh warung kelontong terdaftar. Setiap tenant memiliki partisi data mandiri dan tidak dapat melihat data penjualan warung lain.
        </p>
      </div>

      {/* Isolation Info Banner */}
      <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl text-xs text-purple-900 flex items-start gap-3">
        <Building2 className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-sm text-purple-950">Isolasi Data Multi-Tenant Terverifikasi</div>
          <p className="text-purple-800 text-xs mt-0.5">
            Setiap permintaan data (produk, transaksi, riwayat penjualan, staf kasir) diverifikasi melalui token JWT dengan enkripsi filter <code>tenantId</code> pada tingkat middleware. Tenant A (e.g. Toko Berkah Jaya) tidak dapat mengintip stok atau keuntungan Tenant B (e.g. Warung Madura 24 Jam).
          </p>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3.5 px-4">Nama Toko / Tenant</th>
              <th className="py-3.5 px-4">Kontak & Alamat</th>
              <th className="py-3.5 px-4">Jumlah Produk</th>
              <th className="py-3.5 px-4">Staf Pengguna</th>
              <th className="py-3.5 px-4">Total Omzet</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {t.id}</div>
                </td>
                <td className="py-3.5 px-4 text-slate-600">
                  <div>{t.phone}</div>
                  <div className="text-[11px] text-slate-400 truncate max-w-xs">{t.address}</div>
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                  {t.productCount} Item
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-800">
                  {t.userCount} Akun
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                  Rp {(t.totalRevenue || 0).toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      t.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {t.status === 'ACTIVE' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        Aktif
                      </>
                    ) : (
                      <>
                        <AlertOctagon className="w-3 h-3" />
                        Suspended
                      </>
                    )}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => setTogglingTenant(t)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                      t.status === 'ACTIVE'
                        ? 'text-rose-600 hover:bg-rose-50 border border-rose-200'
                        : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-300'
                    }`}
                  >
                    {t.status === 'ACTIVE' ? 'Suspend Warung' : 'Aktifkan Kembali'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal for Suspending / Activating Tenant */}
      <ConfirmationModal
        isOpen={Boolean(togglingTenant)}
        type="UPDATE"
        title={togglingTenant?.status === 'ACTIVE' ? 'Nonaktifkan (Suspend) Tenant?' : 'Aktifkan Tenant?'}
        description={`Apakah Anda yakin ingin ${
          togglingTenant?.status === 'ACTIVE'
            ? `menonaktifkan warung "${togglingTenant?.name}"? Pengguna dan kasir pada warung ini tidak akan dapat login sementara waktu.`
            : `mengaktifkan kembali warung "${togglingTenant?.name}"?`
        }`}
        confirmText={togglingTenant?.status === 'ACTIVE' ? 'Ya, Suspend Warung' : 'Ya, Aktifkan'}
        cancelText="Batal"
        isDestructive={togglingTenant?.status === 'ACTIVE'}
        onConfirm={handleToggleStatus}
        onCancel={() => setTogglingTenant(null)}
      />
    </div>
  );
};
