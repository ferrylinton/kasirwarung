import React, { useState, useEffect } from 'react';
import {
  Building2,
  Shield,
  CheckCircle2,
  AlertOctagon,
  Store,
  DollarSign,
  Package,
  Users,
  AlertTriangle,
  Clock,
  Ban,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { ConfirmationModal } from '../Modals/ConfirmationModal';
import { Tenant, TenantDeactivationRequest } from '../../types';

interface AdminTenant extends Tenant {
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

  // Deactivation Evaluation State
  const [evaluatingTenant, setEvaluatingTenant] = useState<AdminTenant | null>(null);
  const [evalDecision, setEvalDecision] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingEval, setIsSubmittingEval] = useState(false);

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

  const handleExecuteEvaluation = async () => {
    if (!evaluatingTenant || !evalDecision) return;

    try {
      setIsSubmittingEval(true);
      const res = await fetch(`/api/tenants/${evaluatingTenant.id}/evaluate-deactivation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision: evalDecision,
          rejectionReason: rejectionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      if (evalDecision === 'APPROVE') {
        addToast({
          type: 'success',
          title: 'Penonaktifan Tenant Disetujui',
          message: data.message,
        });
      } else {
        addToast({
          type: 'info',
          title: 'Permohonan Ditolak',
          message: data.message,
        });
      }

      setEvaluatingTenant(null);
      setEvalDecision(null);
      setRejectionReason('');
      fetchTenants();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Gagal Mengevaluasi Permohonan',
        message: err.message,
      });
    } finally {
      setIsSubmittingEval(false);
    }
  };

  const pendingRequests = tenants.filter(
    (t) => t.deactivationRequest && t.deactivationRequest.status === 'PENDING'
  );

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
      </div>

      {/* Pending Deactivation Requests Section (Evaluated by ADMIN) */}
      {pendingRequests.length > 0 && (
        <div className="p-5 bg-amber-50/90 border-2 border-amber-300 rounded-3xl shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4 text-amber-800 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  Permohonan Penonaktifan Akun Tenant ({pendingRequests.length} Memerlukan Evaluasi)
                </h3>
                <p className="text-[11px] text-amber-800">
                  Manajer toko telah mengajukan permohonan untuk menonaktifkan akun toko mereka. Tinjau alasan dan berikan keputusan evaluasi.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-amber-200 text-amber-900 shrink-0">
              Perlu Tindakan Admin
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {pendingRequests.map((t) => {
              const req = t.deactivationRequest!;
              return (
                <div
                  key={t.id}
                  className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{t.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {t.id}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 bg-amber-50/60 p-2.5 rounded-xl border border-amber-100 space-y-1">
                      <div>
                        <span className="font-semibold text-amber-900">Alasan Penonaktifan:</span>{' '}
                        <span className="text-slate-800">{req.reason}</span>
                      </div>
                      {req.notes && (
                        <div>
                          <span className="font-semibold text-amber-900">Catatan:</span>{' '}
                          <span className="text-slate-600">{req.notes}</span>
                        </div>
                      )}
                      <div className="text-[11px] text-slate-500 pt-0.5 flex flex-wrap gap-x-4">
                        <span>Diajukan: {req.requestedBy} ({req.requestedByEmail})</span>
                        <span>Waktu: {new Date(req.requestedAt).toLocaleString('id-ID')} WIB</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => {
                        setEvaluatingTenant(t);
                        setEvalDecision('APPROVE');
                      }}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Setujui Penonaktifan</span>
                    </button>
                    <button
                      onClick={() => {
                        setEvaluatingTenant(t);
                        setEvalDecision('REJECT');
                      }}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Tolak Permohonan</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Isolation Info Banner */}
      <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl text-xs text-purple-900 flex items-start gap-3">
        <Building2 className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-sm text-purple-950">Isolasi Data Multi-Tenant Terverifikasi</div>
          <p className="text-purple-800 text-xs mt-0.5">
            Setiap permintaan data diverifikasi melalui token JWT dengan enkripsi filter <code>tenantId</code>. Jika tenant dinonaktifkan oleh Admin, seluruh staf dan kasir tenant tersebut otomatis dicegah login ke aplikasi.
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
              <th className="py-3.5 px-4">Status Akun</th>
              <th className="py-3.5 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenants.map((t) => {
              const isPendingDeact = t.deactivationRequest && t.deactivationRequest.status === 'PENDING';
              return (
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
                    {t.status === 'INACTIVE' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <Ban className="w-3 h-3 text-rose-600" />
                        Dinonaktifkan
                      </span>
                    ) : isPendingDeact ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Menunggu Penonaktifan
                      </span>
                    ) : t.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <AlertOctagon className="w-3 h-3" />
                        Suspended
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {isPendingDeact ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEvaluatingTenant(t);
                            setEvalDecision('APPROVE');
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                          title="Setujui Penonaktifan"
                        >
                          Setujui
                        </button>
                        <button
                          onClick={() => {
                            setEvaluatingTenant(t);
                            setEvalDecision('REJECT');
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                          title="Tolak Permohonan"
                        >
                          Tolak
                        </button>
                      </div>
                    ) : t.status === 'INACTIVE' ? (
                      <button
                        onClick={() => setTogglingTenant(t)}
                        className="px-3 py-1 rounded-xl text-xs font-semibold transition-colors text-emerald-700 hover:bg-emerald-50 border border-emerald-300 cursor-pointer"
                      >
                        Aktifkan Kembali
                      </button>
                    ) : (
                      <button
                        onClick={() => setTogglingTenant(t)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                          t.status === 'ACTIVE'
                            ? 'text-rose-600 hover:bg-rose-50 border border-rose-200'
                            : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-300'
                        }`}
                      >
                        {t.status === 'ACTIVE' ? 'Suspend Warung' : 'Aktifkan Kembali'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal for Suspending / Activating Tenant */}
      <ConfirmationModal
        isOpen={Boolean(togglingTenant)}
        type="UPDATE"
        title={
          togglingTenant?.status === 'ACTIVE'
            ? 'Nonaktifkan (Suspend) Tenant?'
            : 'Aktifkan Tenant Kembali?'
        }
        description={`Apakah Anda yakin ingin ${
          togglingTenant?.status === 'ACTIVE'
            ? `menonaktifkan warung "${togglingTenant?.name}"? Pengguna dan kasir pada warung ini tidak akan dapat login sementara waktu.`
            : `mengaktifkan kembali warung "${togglingTenant?.name}" sehingga staf kasir dapat login normal?`
        }`}
        confirmText={togglingTenant?.status === 'ACTIVE' ? 'Ya, Suspend Warung' : 'Ya, Aktifkan Kembali'}
        cancelText="Batal"
        isDestructive={togglingTenant?.status === 'ACTIVE'}
        onConfirm={handleToggleStatus}
        onCancel={() => setTogglingTenant(null)}
      />

      {/* Modal: Evaluation for Tenant Deactivation (APPROVE or REJECT) */}
      {evaluatingTenant && evalDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between ${
              evalDecision === 'APPROVE' ? 'bg-rose-50/70 text-rose-900' : 'bg-slate-50 text-slate-900'
            }`}>
              <div className="flex items-center gap-2">
                {evalDecision === 'APPROVE' ? (
                  <Ban className="w-5 h-5 text-rose-600" />
                ) : (
                  <X className="w-5 h-5 text-slate-600" />
                )}
                <h3 className="text-sm font-bold">
                  {evalDecision === 'APPROVE'
                    ? 'Konfirmasi Persetujuan Penonaktifan Tenant'
                    : 'Tolak Permohonan Penonaktifan Tenant'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setEvaluatingTenant(null);
                  setEvalDecision(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-200">
                <div className="font-bold text-slate-900">
                  Tenant: {evaluatingTenant.name} ({evaluatingTenant.id})
                </div>
                <div>
                  <span className="text-slate-500">Diajukan Oleh:</span>{' '}
                  <span className="font-semibold text-slate-800">
                    {evaluatingTenant.deactivationRequest?.requestedBy} (
                    {evaluatingTenant.deactivationRequest?.requestedByEmail})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Alasan:</span>{' '}
                  <span className="font-medium text-slate-800">
                    "{evaluatingTenant.deactivationRequest?.reason}"
                  </span>
                </div>
              </div>

              {evalDecision === 'APPROVE' ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-950">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Peringatan Tindakan Penonaktifan:
                  </div>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    Setelah Anda menyetujui, akun tenant ini akan diubah statusnya menjadi <strong>INACTIVE (Dinonaktifkan)</strong>. <strong>Semua user (manajer dan kasir) di tenant ini tidak akan dapat login kembali</strong> ke aplikasi dan sesi aktif mereka akan diakhiri.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Alasan Penolakan (Akan disampaikan ke Manajer)
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Contoh: Terdapat kewajiban laporan keuangan yang belum diselesaikan / silakan hubungi customer support..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all placeholder:text-slate-400"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEvaluatingTenant(null);
                    setEvalDecision(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmittingEval}
                  onClick={handleExecuteEvaluation}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                    evalDecision === 'APPROVE'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-slate-800 hover:bg-slate-900'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {isSubmittingEval
                      ? 'Memproses...'
                      : evalDecision === 'APPROVE'
                      ? 'Ya, Setujui & Nonaktifkan Tenant'
                      : 'Tolak Permohonan'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
