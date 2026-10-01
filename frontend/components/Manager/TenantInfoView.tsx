import React, { useState, useEffect } from 'react';
import {
  Building2,
  Store,
  MapPin,
  Phone,
  Calendar,
  ShieldCheck,
  Package,
  Users2,
  Receipt,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  Ban,
  UserCheck,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { ConfirmationModal } from '../Modals/ConfirmationModal';
import { Tenant, TenantDeactivationRequest } from '../../types';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt?: string;
}

export const TenantInfoView: React.FC = () => {
  const { token, user } = useAuthStore();
  const { addToast } = useToastStore();

  const [tenantData, setTenantData] = useState<Tenant | null>(null);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Request Deactivation Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [deactivationNotes, setDeactivationNotes] = useState('');
  const [confirmAgreement, setConfirmAgreement] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Cancel Request Confirmation Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingRequest, setCancellingRequest] = useState(false);

  const fetchTenantInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tenant/my', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setTenantData(data.tenant);
        setStaffUsers(data.users || []);
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Gagal memuat data tenant');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Gagal Memuat Profil Warung',
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantInfo();
  }, [token]);

  const handleSubmitDeactivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deactivationReason.trim()) {
      addToast({
        type: 'warning',
        title: 'Alasan Wajib Diisi',
        message: 'Mohon tuliskan alasan penonaktifan akun tenant Anda.',
      });
      return;
    }
    if (!confirmAgreement) {
      addToast({
        type: 'warning',
        title: 'Konfirmasi Diperlukan',
        message: 'Mohon centang persetujuan konsekuensi penonaktifan akun.',
      });
      return;
    }

    try {
      setSubmittingRequest(true);
      const res = await fetch('/api/tenant/deactivation-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: deactivationReason.trim(),
          notes: deactivationNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      addToast({
        type: 'success',
        title: 'Permohonan Terkirim',
        message: data.message,
      });

      setShowRequestModal(false);
      setDeactivationReason('');
      setDeactivationNotes('');
      setConfirmAgreement(false);
      fetchTenantInfo();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Gagal Mengajukan Penonaktifan',
        message: err.message,
      });
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleCancelDeactivation = async () => {
    try {
      setCancellingRequest(true);
      const res = await fetch('/api/tenant/deactivation-request/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      addToast({
        type: 'success',
        title: 'Permohonan Dibatalkan',
        message: data.message,
      });

      setShowCancelModal(false);
      fetchTenantInfo();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Gagal Membatalkan Permohonan',
        message: err.message,
      });
    } finally {
      setCancellingRequest(false);
    }
  };

  const pendingRequest = tenantData?.deactivationRequest?.status === 'PENDING' ? tenantData.deactivationRequest : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-emerald-700 tracking-wider uppercase mb-1 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5" />
            <span>Hak Akses Manajer Toko (Role MANAGER)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Informasi & Akun Tenant Toko
          </h1>
        </div>

        <button
          onClick={fetchTenantInfo}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Pending Deactivation Alert Banner (if pending) */}
      {pendingRequest && (
        <div className="p-4 sm:p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-5 h-5 text-amber-700 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-amber-950">
                    Permohonan Penonaktifan Akun Sedang Dievaluasi Admin Global
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-amber-200 text-amber-900">
                    Menunggu Evaluasi
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Anda telah mengajukan penonaktifan akun untuk toko <strong className="font-semibold">{tenantData?.name}</strong>. Permohonan ini sedang ditinjau oleh Administrator Platform. Sebelum dievaluasi oleh Admin, Anda dapat membatalkan permohonan ini kapan saja.
                </p>

                <div className="mt-2.5 pt-2.5 border-t border-amber-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-amber-900">
                  <div>
                    <span className="text-amber-700 font-semibold">Alasan Diajukan:</span>{' '}
                    <span>{pendingRequest.reason}</span>
                  </div>
                  {pendingRequest.notes && (
                    <div>
                      <span className="text-amber-700 font-semibold">Catatan:</span>{' '}
                      <span>{pendingRequest.notes}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-amber-700 font-semibold">Diajukan Oleh:</span>{' '}
                    <span>{pendingRequest.requestedBy} ({pendingRequest.requestedByEmail})</span>
                  </div>
                  <div>
                    <span className="text-amber-700 font-semibold">Waktu Pengajuan:</span>{' '}
                    <span>{new Date(pendingRequest.requestedAt).toLocaleString('id-ID')} WIB</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-colors shrink-0 shadow-2xs cursor-pointer flex items-center gap-1.5 self-start sm:self-center"
            >
              <XCircle className="w-4 h-4 text-amber-700" />
              <span>Batalkan Permohonan</span>
            </button>
          </div>
        </div>
      )}

      {/* Rejected Deactivation Notice (if previous request was rejected) */}
      {tenantData?.deactivationRequest?.status === 'REJECTED' && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3 text-xs text-slate-700">
          <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900">
              Permohonan penonaktifan sebelumnya ditolak oleh Admin:
            </span>{' '}
            <span>{tenantData.deactivationRequest.rejectionReason}</span>{' '}
            <span className="text-slate-400">
              ({new Date(tenantData.deactivationRequest.evaluatedAt || '').toLocaleDateString('id-ID')})
            </span>
          </div>
        </div>
      )}

      {/* Main Tenant Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-2xl shadow-xs shrink-0">
              <Store className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">
                  {tenantData?.name || 'Toko Berkah Jaya'}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    tenantData?.status === 'ACTIVE'
                      ? pendingRequest
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  {tenantData?.status === 'ACTIVE' ? (
                    pendingRequest ? (
                      <>
                        <Clock className="w-3 h-3 text-amber-600" />
                        Menunggu Evaluasi
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Aktif Beroperasi
                      </>
                    )
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 text-rose-600" />
                      Dinonaktifkan
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Tenant Slug: <span className="font-semibold text-slate-700">{tenantData?.slug || 'berkah-jaya'}</span> • ID: <span className="font-semibold text-slate-700">{tenantData?.id}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Alamat Toko / Warung
              </div>
              <div className="font-semibold text-slate-800 mt-0.5 leading-snug">
                {tenantData?.address || 'Jl. Merdeka No. 42, RT 02/05 Pasar Anyar'}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Nomor Telepon Toko
              </div>
              <div className="font-semibold text-slate-800 font-mono mt-0.5">
                {tenantData?.phone || '0812-3456-7890'}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Tanggal Terdaftar
              </div>
              <div className="font-semibold text-slate-800 mt-0.5">
                {tenantData?.createdAt
                  ? new Date(tenantData.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '1 Januari 2024'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Financial & Operational Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Produk
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {tenantData?.productCount ?? 0}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Item sembako di katalog warung</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Akun Pengguna
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {tenantData?.userCount ?? staffUsers.length}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Staf kasir & manajer terdaftar</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Transaksi
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {tenantData?.orderCount ?? 0}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Nota transaksi kasir berhasil</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Akumulasi Omzet
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700 font-mono truncate">
            Rp {(tenantData?.totalRevenue ?? 0).toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Total pendapatan bersih toko</p>
        </div>
      </div>

      {/* Registered Staff Accounts */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Daftar Staf & Pengguna Tenant ({staffUsers.length} Akun)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Seluruh pengguna yang bernaung di bawah tenant ini akan terpengaruh jika akun tenant dinonaktifkan
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {staffUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Tidak ada data staf kasir yang terdaftar.
            </div>
          ) : (
            staffUsers.map((staf) => (
              <div key={staf.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {staf.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{staf.name}</span>
                      {staf.id === user?.id && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md">
                          Anda
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">{staf.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      staf.role === 'MANAGER'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {staf.role}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    Terverifikasi
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Danger Zone: Request Tenant Deactivation */}
      <div className="bg-white rounded-2xl border-2 border-rose-150 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-rose-100 bg-rose-50/50 flex items-center gap-2">
          <Ban className="w-4 h-4 text-rose-600" />
          <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
            Manajemen Operasional & Penonaktifan Akun Tenant
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <h4 className="text-sm font-bold text-slate-900">
                Ajukan Permohonan Menonaktifkan Akun Tenant Ini
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Jika warung Anda menghentikan kegiatan operasional atau ingin menonaktifkan akun warung dari platform, Anda dapat mengirimkan permohonan penonaktifan kepada <strong>Admin Global</strong>.
              </p>
              <div className="p-3 bg-rose-50/80 border border-rose-200/80 rounded-xl text-[11px] text-rose-900 space-y-1 mt-2">
                <div className="font-bold flex items-center gap-1.5 text-rose-950">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  Konsekuensi jika disetujui Admin:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-rose-800 pl-1">
                  <li>Seluruh staf kasir dan manajer pada toko ini tidak akan dapat login kembali ke aplikasi.</li>
                  <li>Sesi aktif yang sedang berjalan akan otomatis dihentikan dan dikeluarkan dari sistem.</li>
                  <li>Sebelum Admin mengevaluasi, Anda dapat membatalkan permohonan ini sewaktu-waktu.</li>
                </ul>
              </div>
            </div>

            <div className="shrink-0 self-start md:self-center">
              {pendingRequest ? (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Batalkan Permohonan</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRequestModal(true)}
                  disabled={tenantData?.status !== 'ACTIVE'}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Ban className="w-4 h-4" />
                  <span>Ajukan Penonaktifan Akun</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Request Deactivation Form */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
              <div className="flex items-center gap-2 text-rose-800">
                <Ban className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold">
                  Formulir Pengajuan Penonaktifan Akun Tenant
                </h3>
              </div>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDeactivation} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <p className="font-semibold text-amber-950">
                  Perhatian Sebelum Mengajukan:
                </p>
                <p className="text-[11px] text-amber-800">
                  Permohonan ini akan dievaluasi oleh Administrator. Apabila disetujui, semua user di warung ini (<strong className="font-semibold">{tenantData?.name}</strong>) tidak akan dapat login lagi.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Penonaktifan Akun <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={deactivationReason}
                  onChange={(e) => setDeactivationReason(e.target.value)}
                  placeholder="Contoh: Toko tutup operasional permanen / berpindah sistem / restrukturisasi usaha..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Tambahan untuk Admin (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={deactivationNotes}
                  onChange={(e) => setDeactivationNotes(e.target.value)}
                  placeholder="Informasi kontak darurat atau catatan serah terima inventaris..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmAgreement}
                    onChange={(e) => setConfirmAgreement(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-xs text-slate-600 leading-snug">
                    Saya mengonfirmasi bahwa saya bertindak sebagai Manajer Toko dan memahami bahwa jika permohonan disetujui Admin, seluruh akses staf kasir dan manajer pada warung ini akan dinonaktifkan permanen.
                  </span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest || !confirmAgreement || !deactivationReason.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingRequest ? 'Mengirim...' : 'Kirim Permohonan ke Admin'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Cancel Deactivation Request */}
      <ConfirmationModal
        isOpen={showCancelModal}
        type="DELETE"
        title="Batalkan Permohonan Penonaktifan?"
        description="Apakah Anda yakin ingin membatalkan pengajuan penonaktifan akun tenant ini? Akun toko Anda akan tetap beroperasi normal dan staf dapat tetap login seperti biasa."
        confirmText="Ya, Batalkan Permohonan"
        cancelText="Kembali"
        isDestructive={false}
        onConfirm={handleCancelDeactivation}
        onCancel={() => setShowCancelModal(false)}
      />
    </div>
  );
};
