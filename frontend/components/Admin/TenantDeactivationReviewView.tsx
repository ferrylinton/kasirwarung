import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  Store,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  RotateCcw,
  Check,
  X,
  User,
  Mail,
  Calendar,
  DollarSign,
  Package,
  Users2,
  Receipt,
  FileText,
  Ban,
  MessageSquare,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { tenantService } from '../../services/tenantService';
import { TenantDeactivationRequestItem } from '../../types/tenant';
import { formatDateTime, formatRelativeTime } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';

export const TenantDeactivationReviewView: React.FC = () => {
  const { t } = useTranslation();
  const { token, user } = useAuthStore();
  const { addToast } = useToastStore();

  const [requests, setRequests] = useState<TenantDeactivationRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusTab, setStatusTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');

  // Evaluation Modal State
  const [evaluatingItem, setEvaluatingItem] = useState<TenantDeactivationRequestItem | null>(null);
  const [evalDecision, setEvalDecision] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingEval, setIsSubmittingEval] = useState(false);

  const fetchRequests = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const res = await tenantService.getDeactivationRequests();
      setRequests(res.requests || []);
    } catch (err: any) {
      console.error('Failed to load deactivation requests:', err);
      addToast({
        type: 'error',
        title: 'Gagal Memuat Permohonan',
        message: err.message || 'Terjadi kesalahan sistem saat memuat data',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      // Status filter
      if (statusTab !== 'ALL' && item.request?.status !== statusTab) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTenant = item.tenantName.toLowerCase().includes(q);
        const matchesRequester = (item.request?.requestedBy || '').toLowerCase().includes(q);
        const matchesEmail = (item.request?.requestedByEmail || '').toLowerCase().includes(q);
        const matchesReason = (item.request?.reason || '').toLowerCase().includes(q);
        const matchesNotes = (item.request?.notes || '').toLowerCase().includes(q);
        if (!matchesTenant && !matchesRequester && !matchesEmail && !matchesReason && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [requests, statusTab, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.request?.status === 'PENDING').length;
    const approved = requests.filter((r) => r.request?.status === 'APPROVED').length;
    const rejected = requests.filter((r) => r.request?.status === 'REJECTED').length;
    return { total, pending, approved, rejected };
  }, [requests]);

  // Execute Evaluation (Approve or Reject)
  const handleExecuteEvaluation = async () => {
    if (!evaluatingItem || !evalDecision) return;

    if (evalDecision === 'REJECT' && !rejectionReason.trim()) {
      addToast({
        type: 'warning',
        title: 'Alasan Penolakan Wajib Diisi',
        message: 'Mohon berikan penjelasan mengapa permohonan penonaktifan ini ditolak.',
      });
      return;
    }

    try {
      setIsSubmittingEval(true);
      const res = await tenantService.evaluateDeactivation(
        evaluatingItem.tenantId,
        evalDecision,
        rejectionReason.trim()
      );

      if (evalDecision === 'APPROVE') {
        addToast({
          type: 'success',
          title: 'Penonaktifan Disetujui',
          message: res.message || `Akun tenant "${evaluatingItem.tenantName}" telah dinonaktifkan.`,
        });
      } else {
        addToast({
          type: 'info',
          title: 'Permohonan Ditolak',
          message: res.message || `Permohonan penonaktifan tenant "${evaluatingItem.tenantName}" telah ditolak.`,
        });
      }

      setEvaluatingItem(null);
      setEvalDecision(null);
      setRejectionReason('');
      fetchRequests(true);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Gagal Memproses Evaluasi',
        message: err.message || 'Terjadi kesalahan sistem saat mengevaluasi permohonan',
      });
    } finally {
      setIsSubmittingEval(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>Menunggu Review</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
            <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Disetujui (Nonaktif)</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <XCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Ditolak (Tetap Aktif)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Review Penonaktifan Tenan
              </h1>
              {stats.pending > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                  {stats.pending} perlu review
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Evaluasi pengajuan penutupan akun warung dari Manajer Toko secara resmi dan aman
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchRequests(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Menyinkronkan...' : 'Segarkan Data'}</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Pending Card */}
        <div
          onClick={() => setStatusTab('PENDING')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            statusTab === 'PENDING'
              ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Menunggu Review</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {stats.pending}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            Perlu tindakan evaluasi Admin
          </span>
        </div>

        {/* Approved Card */}
        <div
          onClick={() => setStatusTab('APPROVED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            statusTab === 'APPROVED'
              ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Disetujui (Nonaktif)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {stats.approved}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            Akses warung telah ditutup
          </span>
        </div>

        {/* Rejected Card */}
        <div
          onClick={() => setStatusTab('REJECTED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            statusTab === 'REJECTED'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Ditolak (Tetap Aktif)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {stats.rejected}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            Warung beroperasi normal
          </span>
        </div>

        {/* Total Card */}
        <div
          onClick={() => setStatusTab('ALL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            statusTab === 'ALL'
              ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 ring-2 ring-slate-400/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Total Permohonan</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {stats.total}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            Seluruh riwayat pengajuan
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Segmented Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusTab('PENDING')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                statusTab === 'PENDING'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>Menunggu Review</span>
              {stats.pending > 0 && (
                <span className="px-1.5 py-0.2 rounded-md bg-amber-500 text-white text-[10px] font-bold">
                  {stats.pending}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('APPROVED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                statusTab === 'APPROVED'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>Disetujui ({stats.approved})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('REJECTED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                statusTab === 'REJECTED'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>Ditolak ({stats.rejected})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                statusTab === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>Semua Permohonan ({stats.total})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama warung, manajer, alasan..."
              className="w-full pl-9.5 pr-8 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {searchQuery && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Menampilkan {filteredRequests.length} dari {requests.length} permohonan
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-purple-600 dark:text-purple-400 hover:underline font-medium cursor-pointer"
            >
              Hapus Pencarian
            </button>
          </div>
        )}
      </div>

      {/* Main Request Cards List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="inline-block w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Memuat permohonan penonaktifan tenan...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {statusTab === 'PENDING'
                ? 'Tidak ada permohonan yang perlu direview'
                : 'Tidak ada permohonan yang sesuai filter'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {statusTab === 'PENDING'
                ? 'Seluruh permohonan penonaktifan akun warung telah dievaluasi atau belum ada manajer yang mengajukan permohonan baru.'
                : 'Coba ubah kata kunci pencarian atau tab status permohonan.'}
            </p>
          </div>
        ) : (
          filteredRequests.map((item) => {
            const req = item.request;
            const isPending = req?.status === 'PENDING';
            const isApproved = req?.status === 'APPROVED';
            const isRejected = req?.status === 'REJECTED';

            return (
              <div
                key={item.tenantId}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 shadow-xs transition-all space-y-4 ${
                  isPending
                    ? 'border-amber-200 dark:border-amber-900/40 hover:border-amber-300'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Header Row: Tenant Title + Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                          {item.tenantName}
                        </h2>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {item.tenantSlug}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.tenantAddress} · Telp: {item.tenantPhone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:self-start">
                    {getStatusBadge(req?.status || 'PENDING')}
                  </div>
                </div>

                {/* Main Content Grid: Left Submission Details, Right Tenant Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Left 2 Cols: Requester & Reason */}
                  <div className="lg:col-span-2 space-y-3.5">
                    {/* Requester meta */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-400">Diajukan oleh:</span>
                        <strong className="text-slate-900 dark:text-slate-100">{req?.requestedBy}</strong>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{req?.requestedByEmail}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDateTime(req?.requestedAt)}</span>
                        <span className="text-slate-400">({formatRelativeTime(req?.requestedAt)})</span>
                      </div>
                    </div>

                    {/* Alasan Utama */}
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                        <span>Alasan Pengajuan Penonaktifan:</span>
                      </span>
                      <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        {req?.reason}
                      </div>
                    </div>

                    {/* Catatan Tambahan (jika ada) */}
                    {req?.notes && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Catatan Tambahan dari Manajer:
                        </span>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {req.notes}
                        </div>
                      </div>
                    )}

                    {/* Evaluated History (Approved or Rejected) */}
                    {(isApproved || isRejected) && (
                      <div
                        className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                          isApproved
                            ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30'
                            : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span className={isApproved ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}>
                            {isApproved ? 'Status: Permohonan Telah Disetujui' : 'Status: Permohonan Telah Ditolak'}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                            {req?.evaluatedAt ? formatDateTime(req.evaluatedAt) : '-'}
                          </span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-300">
                          Dievaluasi oleh: <strong>{req?.evaluatedBy || 'Administrator'}</strong>
                        </div>
                        {req?.rejectionReason && (
                          <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200">
                            <strong>Alasan Penolakan:</strong> {req.rejectionReason}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right 1 Col: Warung Metrics Snapshot */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2.5">
                        Ringkasan Data Warung
                      </span>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                            <span>Total Produk:</span>
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.productCount} SKU
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Users2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Staf / Pengguna:</span>
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.userCount} akun
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-slate-400" />
                            <span>Total Pesanan:</span>
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.orderCount} transaksi
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Total Omzet:</span>
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(item.totalRevenue)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pending Action Buttons */}
                    {isPending ? (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEvaluatingItem(item);
                            setEvalDecision('APPROVE');
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-2xs cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Setujui Penonaktifan</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEvaluatingItem(item);
                            setEvalDecision('REJECT');
                            setRejectionReason('');
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Tolak Permohonan</span>
                        </button>
                      </div>
                    ) : (
                      <div className="pt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
                        Permohonan telah dievaluasi
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* EVALUATION MODAL: APPROVE OR REJECT */}
      {evaluatingItem && evalDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => !isSubmittingEval && setEvaluatingItem(null)}
          />

          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 overflow-hidden z-10 animate-in fade-in-90 zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    evalDecision === 'APPROVE'
                      ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400'
                      : 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400'
                  }`}
                >
                  {evalDecision === 'APPROVE' ? <Ban className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {evalDecision === 'APPROVE'
                      ? 'Konfirmasi Persetujuan Penonaktifan'
                      : 'Konfirmasi Penolakan Permohonan'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tenant: {evaluatingItem.tenantName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isSubmittingEval && setEvaluatingItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content for APPROVE */}
            {evalDecision === 'APPROVE' ? (
              <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 space-y-1.5 text-xs">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Dampak Penonaktifan Akun Warung:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                    <li>Status tenant akan diubah menjadi <strong>INACTIVE (Dinonaktifkan)</strong>.</li>
                    <li>Seluruh akses kasir dan manajer toko untuk warung ini akan <strong>otomatis ditutup</strong> dan sesi login aktif akan diakhiri.</li>
                    <li>Katalog produk tidak dapat ditransaksikan di mesin kasir POS.</li>
                  </ul>
                </div>

                <p>
                  Apakah Anda yakin menyetujui permohonan dari <strong>{evaluatingItem.request?.requestedBy}</strong> dengan alasan:
                </p>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs italic text-slate-700 dark:text-slate-300">
                  "{evaluatingItem.request?.reason}"
                </div>
              </div>
            ) : (
              /* Content for REJECT */
              <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  Permohonan penonaktifan warung <strong>{evaluatingItem.tenantName}</strong> akan ditolak. Akun warung akan tetap berstatus <strong>ACTIVE</strong> dan beroperasi secara normal.
                </p>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Alasan / Catatan Penolakan untuk Manajer <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Contoh: Masih terdapat tagihan atau pesanan tertunda, mohon selesaikan terlebih dahulu sebelum mengajukan kembali."
                    className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEvaluatingItem(null)}
                disabled={isSubmittingEval}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteEvaluation}
                disabled={isSubmittingEval}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2 ${
                  evalDecision === 'APPROVE'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isSubmittingEval ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>
                    {evalDecision === 'APPROVE'
                      ? 'Ya, Setujui Penonaktifan'
                      : 'Kirim Penolakan'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantDeactivationReviewView;
