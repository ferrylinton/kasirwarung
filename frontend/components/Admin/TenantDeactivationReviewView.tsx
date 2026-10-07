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
  Filter,
  ChevronDown,
} from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { tenantService } from '../../services/tenantService';
import { TenantDeactivationRequestItem } from '../../types/tenant';
import { formatDateTime, formatRelativeTime } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';

export interface TenantDeactivationReviewViewProps {
  onNavigateBack?: () => void;
}

export const TenantDeactivationReviewView: React.FC<TenantDeactivationReviewViewProps> = ({
  onNavigateBack,
}) => {
  const { t, i18n } = useTranslation();
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
    if (!token) return;
    if (user && user.role !== 'ADMIN') {
      setLoading(false);
      return;
    }

    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const res = await tenantService.getDeactivationRequests();
      setRequests(res.requests || []);
    } catch (err: any) {
      console.warn('Deactivation requests fetch note:', err.message);
      if (err.status !== 403) {
        addToast({
          type: 'error',
          title: t('tenantDeactivationReview.toasts.loadErrorTitle', 'Gagal Memuat Permohonan'),
          message: err.message || t('tenantDeactivationReview.toasts.loadErrorMsg', 'Terjadi kesalahan sistem saat memuat data'),
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token && (!user || user.role === 'ADMIN')) {
      fetchRequests();
    } else {
      setLoading(false);
    }
  }, [token, user?.role]);

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
        title: t('tenantDeactivationReview.toasts.rejectionReasonRequiredTitle', 'Alasan Penolakan Wajib Diisi'),
        message: t('tenantDeactivationReview.toasts.rejectionReasonRequiredMsg', 'Mohon berikan penjelasan mengapa permohonan penonaktifan ini ditolak.'),
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
          title: t('tenantDeactivationReview.toasts.approvedTitle', 'Penonaktifan Disetujui'),
          message:
            res.message ||
            t('tenantDeactivationReview.toasts.approvedMsg', {
              defaultValue: `Akun tenant "${evaluatingItem.tenantName}" telah dinonaktifkan.`,
              name: evaluatingItem.tenantName,
            }),
        });
      } else {
        addToast({
          type: 'info',
          title: t('tenantDeactivationReview.toasts.rejectedTitle', 'Permohonan Ditolak'),
          message:
            res.message ||
            t('tenantDeactivationReview.toasts.rejectedMsg', {
              defaultValue: `Permohonan penonaktifan tenant "${evaluatingItem.tenantName}" telah ditolak.`,
              name: evaluatingItem.tenantName,
            }),
        });
      }

      setEvaluatingItem(null);
      setEvalDecision(null);
      setRejectionReason('');
      fetchRequests(true);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: t('tenantDeactivationReview.toasts.evalErrorTitle', 'Gagal Memproses Evaluasi'),
        message: err.message || t('tenantDeactivationReview.toasts.evalErrorMsg', 'Terjadi kesalahan sistem saat mengevaluasi permohonan'),
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
            <span>{t('tenantDeactivationReview.status.pending', 'Menunggu Review')}</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
            <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>{t('tenantDeactivationReview.status.approved', 'Disetujui (Nonaktif)')}</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <XCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t('tenantDeactivationReview.status.rejected', 'Ditolak (Tetap Aktif)')}</span>
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

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 pt-16">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          {t('tenantDeactivationReview.guard.title', 'Akses Khusus Administrator')}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('tenantDeactivationReview.guard.desc', 'Halaman Review Penonaktifan Tenan hanya dapat diakses oleh Administrator Global KasirWarung.')}
        </p>
        {onNavigateBack && (
          <button
            type="button"
            onClick={onNavigateBack}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs inline-flex items-center gap-2"
          >
            <span>{t('tenantDeactivationReview.guard.backBtn', 'Kembali ke Halaman Utama')}</span>
          </button>
        )}
      </div>
    );
  }

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
                {t('tenantDeactivationReview.pageTitle', 'Review Penonaktifan Tenan')}
              </h1>
              {stats.pending > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                  {t('tenantDeactivationReview.needReviewBadge', {
                    defaultValue: `${stats.pending} perlu review`,
                    count: stats.pending,
                  })}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {t('tenantDeactivationReview.pageSubtitle', 'Evaluasi pengajuan penutupan akun warung dari Manajer Toko secara resmi dan aman')}
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
            <span>
              {refreshing
                ? t('tenantDeactivationReview.syncingBtn', 'Menyinkronkan...')
                : t('tenantDeactivationReview.refreshBtn', 'Segarkan Data')}
            </span>
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
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {t('tenantDeactivationReview.stats.pendingTitle', 'Menunggu Review')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {stats.pending}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            {t('tenantDeactivationReview.stats.pendingSub', 'Perlu tindakan evaluasi Admin')}
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
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
              {t('tenantDeactivationReview.stats.approvedTitle', 'Disetujui (Nonaktif)')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {stats.approved}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            {t('tenantDeactivationReview.stats.approvedSub', 'Akses warung telah ditutup')}
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
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {t('tenantDeactivationReview.stats.rejectedTitle', 'Ditolak (Tetap Aktif)')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {stats.rejected}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            {t('tenantDeactivationReview.stats.rejectedSub', 'Warung beroperasi normal')}
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
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('tenantDeactivationReview.stats.totalTitle', 'Total Permohonan')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {stats.total}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            {t('tenantDeactivationReview.stats.totalSub', 'Seluruh riwayat pengajuan')}
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Radix UI Select for Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('tenantDeactivationReview.statusLabel', 'Status:')}</span>
            </span>

            <div className="min-w-[220px]">
              <Select.Root
                value={statusTab}
                onValueChange={(val: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED') => setStatusTab(val)}
              >
                <Select.Trigger
                  className="w-full inline-flex items-center justify-between px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-750 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer shadow-2xs gap-2"
                  aria-label={t('tenantDeactivationReview.statusLabel', 'Filter Status Permohonan')}
                >
                  <div className="flex items-center gap-2 truncate">
                    {statusTab === 'PENDING' && (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">
                          {t('tenantDeactivationReview.status.pending', 'Menunggu Review')} ({stats.pending})
                        </span>
                      </>
                    )}
                    {statusTab === 'APPROVED' && (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">
                          {t('tenantDeactivationReview.status.approved', 'Disetujui')} ({stats.approved})
                        </span>
                      </>
                    )}
                    {statusTab === 'REJECTED' && (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">
                          {t('tenantDeactivationReview.status.rejected', 'Ditolak')} ({stats.rejected})
                        </span>
                      </>
                    )}
                    {statusTab === 'ALL' && (
                      <>
                        <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">
                          {t('tenantDeactivationReview.status.all', 'Semua Permohonan')} ({stats.total})
                        </span>
                      </>
                    )}
                  </div>
                  <Select.Icon className="text-slate-400 shrink-0 ml-1">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Select.Icon>
                </Select.Trigger>

                <Select.Portal>
                  <Select.Content
                    className="z-50 min-w-[230px] overflow-hidden bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-1 animate-in fade-in-80 zoom-in-95"
                    position="popper"
                    sideOffset={6}
                  >
                    <Select.Viewport className="p-1 space-y-0.5">
                      <Select.Item
                        value="PENDING"
                        className="flex items-center justify-between px-2.5 py-2 text-xs rounded-lg font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-900 dark:hover:text-amber-200 data-[highlighted]:bg-amber-50 dark:data-[highlighted]:bg-amber-950/40 data-[highlighted]:text-amber-900 dark:data-[highlighted]:text-amber-200 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{t('tenantDeactivationReview.status.pending', 'Menunggu Review')}</span>
                          {stats.pending > 0 && (
                            <span className="px-1.5 py-0.2 rounded-md bg-amber-500 text-white text-[10px] font-bold">
                              {stats.pending}
                            </span>
                          )}
                        </div>
                        <Select.ItemIndicator className="text-amber-600 dark:text-amber-400 pl-2">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </Select.ItemIndicator>
                      </Select.Item>

                      <Select.Item
                        value="APPROVED"
                        className="flex items-center justify-between px-2.5 py-2 text-xs rounded-lg font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-900 dark:hover:text-rose-200 data-[highlighted]:bg-rose-50 dark:data-[highlighted]:bg-rose-950/40 data-[highlighted]:text-rose-900 dark:data-[highlighted]:text-rose-200 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>{t('tenantDeactivationReview.status.approved', 'Disetujui')} ({stats.approved})</span>
                        </div>
                        <Select.ItemIndicator className="text-rose-600 dark:text-rose-400 pl-2">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </Select.ItemIndicator>
                      </Select.Item>

                      <Select.Item
                        value="REJECTED"
                        className="flex items-center justify-between px-2.5 py-2 text-xs rounded-lg font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-900 dark:hover:text-emerald-200 data-[highlighted]:bg-emerald-50 dark:data-[highlighted]:bg-emerald-950/40 data-[highlighted]:text-emerald-900 dark:data-[highlighted]:text-emerald-200 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <XCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{t('tenantDeactivationReview.status.rejected', 'Ditolak')} ({stats.rejected})</span>
                        </div>
                        <Select.ItemIndicator className="text-emerald-600 dark:text-emerald-400 pl-2">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </Select.ItemIndicator>
                      </Select.Item>

                      <Select.Item
                        value="ALL"
                        className="flex items-center justify-between px-2.5 py-2 text-xs rounded-lg font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-800 data-[highlighted]:text-slate-900 dark:data-[highlighted]:text-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{t('tenantDeactivationReview.status.all', 'Semua Permohonan')} ({stats.total})</span>
                        </div>
                        <Select.ItemIndicator className="text-purple-600 dark:text-purple-400 pl-2">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('tenantDeactivationReview.searchPlaceholder', 'Cari nama warung, manajer, alasan...')}
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
              {t('tenantDeactivationReview.showingFiltered', {
                defaultValue: `Menampilkan ${filteredRequests.length} dari ${requests.length} permohonan`,
                filtered: filteredRequests.length,
                total: requests.length,
              })}
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-purple-600 dark:text-purple-400 hover:underline font-medium cursor-pointer"
            >
              {t('tenantDeactivationReview.clearSearch', 'Hapus Pencarian')}
            </button>
          </div>
        )}
      </div>

      {/* Main Request Cards List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="inline-block w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('tenantDeactivationReview.empty.loading', 'Memuat permohonan penonaktifan tenan...')}
            </p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {statusTab === 'PENDING'
                ? t('tenantDeactivationReview.empty.pendingTitle', 'Tidak ada permohonan yang perlu direview')
                : t('tenantDeactivationReview.empty.filteredTitle', 'Tidak ada permohonan yang sesuai filter')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {statusTab === 'PENDING'
                ? t('tenantDeactivationReview.empty.pendingDesc', 'Seluruh permohonan penonaktifan akun warung telah dievaluasi atau belum ada manajer yang mengajukan permohonan baru.')
                : t('tenantDeactivationReview.empty.filteredDesc', 'Coba ubah kata kunci pencarian atau status permohonan.')}
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
                        {item.tenantAddress} · {t('tenantDeactivationReview.card.phone', 'Telp:')} {item.tenantPhone}
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
                        <span className="text-slate-400">{t('tenantDeactivationReview.card.submittedBy', 'Diajukan oleh:')}</span>
                        <strong className="text-slate-900 dark:text-slate-100">{req?.requestedBy}</strong>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{req?.requestedByEmail}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDateTime(req?.requestedAt, i18n.language)}</span>
                        <span className="text-slate-400">({formatRelativeTime(req?.requestedAt, i18n.language)})</span>
                      </div>
                    </div>

                    {/* Alasan Utama */}
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                        <span>{t('tenantDeactivationReview.card.reasonTitle', 'Alasan Pengajuan Penonaktifan:')}</span>
                      </span>
                      <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        {req?.reason}
                      </div>
                    </div>

                    {/* Catatan Tambahan (jika ada) */}
                    {req?.notes && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {t('tenantDeactivationReview.card.notesTitle', 'Catatan Tambahan dari Manajer:')}
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
                            {isApproved
                              ? t('tenantDeactivationReview.card.approvedStatus', 'Status: Permohonan Telah Disetujui')
                              : t('tenantDeactivationReview.card.rejectedStatus', 'Status: Permohonan Telah Ditolak')}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                            {req?.evaluatedAt ? formatDateTime(req.evaluatedAt, i18n.language) : '-'}
                          </span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-300">
                          {t('tenantDeactivationReview.card.evaluatedBy', 'Dievaluasi oleh:')}{' '}
                          <strong>{req?.evaluatedBy || t('tenantDeactivationReview.card.adminDefault', 'Administrator')}</strong>
                        </div>
                        {req?.rejectionReason && (
                          <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200">
                            <strong>{t('tenantDeactivationReview.card.rejectionReason', 'Alasan Penolakan:')}</strong> {req.rejectionReason}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right 1 Col: Warung Metrics Snapshot */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2.5">
                        {t('tenantDeactivationReview.card.storeSummary', 'Ringkasan Data Warung')}
                      </span>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t('tenantDeactivationReview.card.totalProducts', 'Total Produk:')}</span>
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.productCount} {t('tenantDeactivationReview.card.skuUnit', 'SKU')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Users2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t('tenantDeactivationReview.card.staffUsers', 'Staf / Pengguna:')}</span>
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.userCount} {t('tenantDeactivationReview.card.accountsUnit', 'akun')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t('tenantDeactivationReview.card.totalOrders', 'Total Pesanan:')}</span>
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.orderCount} {t('tenantDeactivationReview.card.transactionsUnit', 'transaksi')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{t('tenantDeactivationReview.card.totalRevenue', 'Total Omzet:')}</span>
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
                          <span>{t('tenantDeactivationReview.card.approveBtn', 'Setujui Penonaktifan')}</span>
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
                          <span>{t('tenantDeactivationReview.card.rejectBtn', 'Tolak Permohonan')}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="pt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
                        {t('tenantDeactivationReview.card.alreadyEvaluated', 'Permohonan telah dievaluasi')}
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
                      ? t('tenantDeactivationReview.modal.approveTitle', 'Konfirmasi Persetujuan Penonaktifan')
                      : t('tenantDeactivationReview.modal.rejectTitle', 'Konfirmasi Penolakan Permohonan')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('tenantDeactivationReview.modal.tenantLabel', 'Tenant:')} {evaluatingItem.tenantName}
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
                    <span>{t('tenantDeactivationReview.modal.impactTitle', 'Dampak Penonaktifan Akun Warung:')}</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                    <li>{t('tenantDeactivationReview.modal.impactPoint1', 'Status tenant akan diubah menjadi INACTIVE (Dinonaktifkan).')}</li>
                    <li>{t('tenantDeactivationReview.modal.impactPoint2', 'Seluruh akses kasir dan manajer toko untuk warung ini akan otomatis ditutup dan sesi login aktif akan diakhiri.')}</li>
                    <li>{t('tenantDeactivationReview.modal.impactPoint3', 'Katalog produk tidak dapat ditransaksikan di mesin kasir POS.')}</li>
                  </ul>
                </div>

                <p>
                  {t('tenantDeactivationReview.modal.approvePrompt', {
                    defaultValue: `Apakah Anda yakin menyetujui permohonan dari ${evaluatingItem.request?.requestedBy} dengan alasan:`,
                    name: evaluatingItem.request?.requestedBy,
                  })}
                </p>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs italic text-slate-700 dark:text-slate-300">
                  "{evaluatingItem.request?.reason}"
                </div>
              </div>
            ) : (
              /* Content for REJECT */
              <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  {t('tenantDeactivationReview.modal.rejectPrompt', {
                    defaultValue: `Permohonan penonaktifan warung ${evaluatingItem.tenantName} akan ditolak. Akun warung akan tetap berstatus ACTIVE dan beroperasi secara normal.`,
                    name: evaluatingItem.tenantName,
                  })}
                </p>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    {t('tenantDeactivationReview.modal.rejectionReasonLabel', 'Alasan / Catatan Penolakan untuk Manajer')} <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder={t(
                      'tenantDeactivationReview.modal.rejectionReasonPlaceholder',
                      'Contoh: Masih terdapat tagihan atau pesanan tertunda, mohon selesaikan terlebih dahulu sebelum mengajukan kembali.'
                    )}
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
                {t('tenantDeactivationReview.modal.cancelBtn', 'Batal')}
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
                    <span>{t('tenantDeactivationReview.modal.processingBtn', 'Memproses...')}</span>
                  </>
                ) : (
                  <span>
                    {evalDecision === 'APPROVE'
                      ? t('tenantDeactivationReview.modal.confirmApproveBtn', 'Ya, Setujui Penonaktifan')
                      : t('tenantDeactivationReview.modal.sendRejectBtn', 'Kirim Penolakan')}
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
