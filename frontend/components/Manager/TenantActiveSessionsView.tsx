import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  KeyRound,
  Search,
  RotateCcw,
  Store,
  Building2,
  Users2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  X,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Radio,
  PowerOff,
  Filter,
  ChevronDown,
  UserX,
  Sparkles,
} from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { sessionService } from '../../services/sessionService';
import { ActiveSessionItem, SessionMetrics } from '../../types/session';
import { formatDateTime, formatRelativeTime } from '../../utils/formatDate';

export interface TenantActiveSessionsViewProps {
  onNavigateBack?: () => void;
  onNavigateToCashiers?: () => void;
}

const PRESET_REASONS = [
  'Shift operasional kasir telah berakhir',
  'Pergantian petugas jaga kasir warung',
  'Staf lupa melakukan logout pada perangkat toko',
  'Indikasi aktivitas atau perangkat tidak dikenali',
];

export const TenantActiveSessionsView: React.FC<TenantActiveSessionsViewProps> = ({
  onNavigateBack,
  onNavigateToCashiers,
}) => {
  const { t, i18n } = useTranslation();
  const { user: currentUser, tenant } = useAuthStore();
  const { addToast } = useToastStore();

  const tenantName = tenant?.name || currentUser?.tenantName || 'Warung Anda';
  const tenantId = tenant?.id || currentUser?.tenantId || '';

  const [sessions, setSessions] = useState<ActiveSessionItem[]>([]);
  const [metrics, setMetrics] = useState<SessionMetrics>({
    totalActive: 0,
    totalRevoked: 0,
    uniqueUsersActive: 0,
    tenantsActive: 0,
    totalSessions: 0,
  });
  const [currentJti, setCurrentJti] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'REVOKED'>('ACTIVE');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // JTI copy state
  const [copiedJti, setCopiedJti] = useState<string | null>(null);

  // Single Revoke Modal State
  const [sessionToRevoke, setSessionToRevoke] = useState<ActiveSessionItem | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [isSubmittingRevoke, setIsSubmittingRevoke] = useState(false);

  // Bulk Revoke Tenant Sessions Modal State
  const [showRevokeTenantModal, setShowRevokeTenantModal] = useState(false);
  const [bulkRevokeReason, setBulkRevokeReason] = useState('');
  const [excludeCurrentSession, setExcludeCurrentSession] = useState(true);
  const [isSubmittingBulkRevoke, setIsSubmittingBulkRevoke] = useState(false);

  // User Revoke Modal State
  const [userToRevoke, setUserToRevoke] = useState<ActiveSessionItem | null>(null);
  const [userRevokeReason, setUserRevokeReason] = useState('');
  const [isSubmittingUserRevoke, setIsSubmittingUserRevoke] = useState(false);

  const fetchSessions = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const res = await sessionService.getActiveSessions({
        status: statusFilter,
        role: roleFilter,
        search: searchQuery,
      });

      setSessions(res.sessions || []);
      if (res.currentJti !== undefined) {
        setCurrentJti(res.currentJti);
      }
      setMetrics(
        res.metrics || {
          totalActive: 0,
          totalRevoked: 0,
          uniqueUsersActive: 0,
          tenantsActive: 0,
          totalSessions: 0,
        }
      );
    } catch (err: any) {
      console.error('Failed to load tenant active sessions:', err);
      addToast({
        type: 'error',
        title: t('activeSessions.toasts.loadErrorTitle', 'Gagal Memuat Sesi Warung'),
        message: err.message || t('activeSessions.toasts.loadErrorMsg', 'Terjadi kesalahan saat memuat daftar sesi aktif.'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [statusFilter, roleFilter]);

  const activeCashierCount = useMemo(() => {
    return sessions.filter((s) => s.status === 'ACTIVE' && s.userRole === 'CASHIER').length;
  }, [sessions]);

  // Handle Copy JTI to Clipboard
  const handleCopyJti = (jti: string) => {
    navigator.clipboard.writeText(jti).then(() => {
      setCopiedJti(jti);
      setTimeout(() => setCopiedJti(null), 2000);
    });
  };

  // Execute Single Token Revocation
  const handleExecuteRevoke = async () => {
    if (!sessionToRevoke) return;
    if (!revokeReason.trim()) {
      addToast({
        type: 'warning',
        title: t('common.warning', 'Peringatan'),
        message: t('activeSessions.toasts.reasonRequired', 'Mohon berikan alasan penonaktifan token terlebih dahulu.'),
      });
      return;
    }

    try {
      setIsSubmittingRevoke(true);
      const res = await sessionService.revokeSession(sessionToRevoke.id, revokeReason.trim());

      addToast({
        type: 'success',
        title: t('activeSessions.toasts.revokeSuccessTitle', 'Token Sesi Dinonaktifkan'),
        message:
          res.message ||
          `Token sesi aktif untuk "${sessionToRevoke.userName}" (${sessionToRevoke.userEmail}) telah berhasil dinonaktifkan.`,
      });

      setSessionToRevoke(null);
      setRevokeReason('');
      fetchSessions(true);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: t('activeSessions.toasts.revokeErrorTitle', 'Gagal Menonaktifkan Token'),
        message: err.message || 'Terjadi kesalahan saat memproses penonaktifan token sesi.',
      });
    } finally {
      setIsSubmittingRevoke(false);
    }
  };

  // Execute Bulk Revoke All Active Tokens in Manager's Tenant
  const handleExecuteTenantBulkRevoke = async () => {
    if (!tenantId) return;
    try {
      setIsSubmittingBulkRevoke(true);
      const res = await sessionService.revokeTenantSessions(
        tenantId,
        bulkRevokeReason.trim() || `Penonaktifan seluruh sesi staf warung ${tenantName} oleh Manajer Toko`,
        excludeCurrentSession
      );

      addToast({
        type: 'success',
        title: t('tenantSessions.revokeAllSuccessTitle', 'Sesi Warung Dinonaktifkan'),
        message: res.message || `Seluruh token sesi aktif staf di ${tenantName} telah dinonaktifkan.`,
      });

      setShowRevokeTenantModal(false);
      setBulkRevokeReason('');
      fetchSessions(true);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: t('activeSessions.toasts.revokeErrorTitle', 'Gagal Menonaktifkan Sesi'),
        message: err.message || 'Terjadi kesalahan saat menonaktifkan sesi warung.',
      });
    } finally {
      setIsSubmittingBulkRevoke(false);
    }
  };

  // Execute Revoke All Sessions for a specific user in the tenant
  const handleExecuteUserRevoke = async () => {
    if (!userToRevoke) return;

    try {
      setIsSubmittingUserRevoke(true);
      const res = await sessionService.revokeUserSessions(
        userToRevoke.userId,
        userRevokeReason.trim() || `Seluruh sesi pengguna dinonaktifkan oleh Manajer Toko ${tenantName}`
      );

      addToast({
        type: 'success',
        title: t('activeSessions.toasts.revokeSuccessTitle', 'Token Berhasil Dinonaktifkan'),
        message: res.message || `Seluruh sesi untuk ${userToRevoke.userName} telah dinonaktifkan.`,
      });

      setUserToRevoke(null);
      setUserRevokeReason('');
      fetchSessions(true);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: t('activeSessions.toasts.revokeErrorTitle', 'Gagal Menonaktifkan Sesi'),
        message: err.message || 'Terjadi kesalahan sistem.',
      });
    } finally {
      setIsSubmittingUserRevoke(false);
    }
  };

  // Client-side search filtering
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase().trim();
    return sessions.filter((s) => {
      const matchName = s.userName.toLowerCase().includes(q);
      const matchEmail = s.userEmail.toLowerCase().includes(q);
      const matchIp = (s.ipAddress || '').toLowerCase().includes(q);
      const matchJti = (s.accessJti || '').toLowerCase().includes(q);
      const matchDevice = (s.device || '').toLowerCase().includes(q);
      const matchBrowser = (s.browser || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchIp || matchJti || matchDevice || matchBrowser;
    });
  }, [sessions, searchQuery]);

  // Helper for Device Icon
  const getDeviceIcon = (device?: string) => {
    const d = (device || '').toLowerCase();
    if (d.includes('phone') || d.includes('mobile')) return <Smartphone className="w-3.5 h-3.5 text-blue-500" />;
    if (d.includes('tablet') || d.includes('ipad')) return <Tablet className="w-3.5 h-3.5 text-purple-500" />;
    return <Monitor className="w-3.5 h-3.5 text-slate-500" />;
  };

  // Helper for Role Badge
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Building2 className="w-3 h-3" />
            <span>{t('activeSessions.filters.roleManager', 'Manajer Toko')}</span>
          </span>
        );
      case 'CASHIER':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Store className="w-3 h-3" />
            <span>{t('activeSessions.filters.roleCashier', 'Kasir')}</span>
          </span>
        );
    }
  };

  // Role Access Guard (Allow MANAGER and ADMIN)
  if (currentUser && currentUser.role !== 'MANAGER' && currentUser.role !== 'ADMIN') {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 pt-16">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          {t('tenantSessions.guardTitle', 'Akses Khusus Manajer Toko')}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t(
            'tenantSessions.guardDesc',
            'Halaman Manajemen Sesi & Token Aktif Warung hanya dapat diakses oleh Manajer Toko.'
          )}
        </p>
        {onNavigateBack && (
          <button
            type="button"
            onClick={onNavigateBack}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs inline-flex items-center gap-2"
          >
            <span>{t('activeSessions.guard.backBtn', 'Kembali ke Halaman Utama')}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 relative shadow-2xs">
            <KeyRound className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Store className="w-3 h-3" />
                <span>Warung: {tenantName}</span>
              </span>
              {metrics.totalActive > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-2xs animate-pulse">
                  {t('activeSessions.activeCountBadge', {
                    defaultValue: `${metrics.totalActive} Token Aktif`,
                    count: metrics.totalActive,
                  })}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {t('tenantSessions.pageTitle', 'Sesi & Token Aktif Pengguna Warung')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {t(
                'tenantSessions.pageSubtitle',
                `Pantau dan nonaktifkan token sesi login kasir maupun staf yang sedang aktif di ${tenantName} secara instan.`
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onNavigateToCashiers && (
            <button
              type="button"
              onClick={onNavigateToCashiers}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            >
              <Users2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('nav.cashiers', 'Kelola Staf Kasir')}</span>
            </button>
          )}

          {metrics.totalActive > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowRevokeTenantModal(true);
                setBulkRevokeReason('');
                setExcludeCurrentSession(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs cursor-pointer"
            >
              <PowerOff className="w-3.5 h-3.5" />
              <span>{t('tenantSessions.revokeAllTenantBtn', 'Nonaktifkan Semua Sesi Warung')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchSessions(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>
              {refreshing
                ? t('activeSessions.syncingBtn', 'Menyinkronkan...')
                : t('activeSessions.refreshBtn', 'Segarkan Data')}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Security Info Banner for Store Manager */}
      <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5 sm:mt-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100">
              {t('tenantSessions.securityBannerTitle', 'Kontrol Keamanan Token Login Tenant (Role Manager)')}
            </div>
            <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              {t(
                'tenantSessions.securityBannerDesc',
                'Sebagai Manajer Toko, Anda dapat memutus token sesi pengguna (Kasir maupun Manajer) yang sedang login di warung Anda kapan saja. Token yang dinonaktifkan akan langsung dimasukkan ke Token Denylist dan pengguna terkait otomatis dikeluarkan dari sistem.'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Active Tokens in Tenant */}
        <div
          onClick={() => setStatusFilter('ACTIVE')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === 'ACTIVE'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {t('tenantSessions.stats.activeTokensTitle', 'Token Aktif Warung')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2 flex items-center gap-2">
            <span>{metrics.totalActive}</span>
            {metrics.totalActive > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            {t('tenantSessions.stats.activeTokensSub', `Sedang login di ${tenantName}`)}
          </span>
        </div>

        {/* Unique Active Staff Users */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
              {t('tenantSessions.stats.uniqueStaffTitle', 'Akun Staf Online')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Users2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {metrics.uniqueUsersActive}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            {t('tenantSessions.stats.uniqueStaffSub', 'Pengguna unik sedang aktif')}
          </span>
        </div>

        {/* Active Cashiers Count */}
        <div
          onClick={() => {
            setStatusFilter('ACTIVE');
            setRoleFilter((prev) => (prev === 'CASHIER' ? 'ALL' : 'CASHIER'));
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            roleFilter === 'CASHIER'
              ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {t('tenantSessions.stats.activeCashiersTitle', 'Sesi Kasir Aktif')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {activeCashierCount}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            {t('tenantSessions.stats.activeCashiersSub', 'Klik untuk filter khusus Kasir')}
          </span>
        </div>

        {/* Revoked Tokens in Tenant */}
        <div
          onClick={() => setStatusFilter('REVOKED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === 'REVOKED'
              ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
              {t('activeSessions.stats.totalRevokedTitle', 'Token Dinonaktifkan')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {metrics.totalRevoked}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            {t('tenantSessions.stats.revokedSub', 'Riwayat sesi diputus di warung ini')}
          </span>
        </div>
      </div>

      {/* 4. Filter Bar & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Filter Status */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" />
              <span>{t('activeSessions.filters.statusLabel', 'Status Token:')}</span>
            </label>
            <Select.Root
              value={statusFilter}
              onValueChange={(val: 'ALL' | 'ACTIVE' | 'REVOKED') => setStatusFilter(val)}
            >
              <Select.Trigger
                className="w-full inline-flex items-center justify-between px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-750 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer shadow-2xs gap-2"
                aria-label="Filter Status"
              >
                <div className="flex items-center gap-2 truncate">
                  {statusFilter === 'ACTIVE' && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate">
                        {t('activeSessions.filters.activeStatus', {
                          defaultValue: `Aktif (Sedang Login) (${metrics.totalActive})`,
                          count: metrics.totalActive,
                        })}
                      </span>
                    </>
                  )}
                  {statusFilter === 'REVOKED' && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span className="truncate">
                        {t('activeSessions.filters.revokedStatus', {
                          defaultValue: `Dinonaktifkan (${metrics.totalRevoked})`,
                          count: metrics.totalRevoked,
                        })}
                      </span>
                    </>
                  )}
                  {statusFilter === 'ALL' && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                      <span className="truncate">
                        {t('activeSessions.filters.allStatus', {
                          defaultValue: `Semua Status (${metrics.totalSessions})`,
                          count: metrics.totalSessions,
                        })}
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
                  className="z-50 min-w-[200px] overflow-hidden bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-1 animate-in fade-in-80 zoom-in-95"
                  position="popper"
                  sideOffset={6}
                >
                  <Select.Viewport className="p-1 space-y-0.5">
                    <Select.Item
                      value="ACTIVE"
                      className="flex items-center justify-between px-2.5 py-2 text-xs rounded-lg font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-900 dark:hover:text-emerald-200 data-[highlighted]:bg-emerald-50 dark:data-[highlighted]:bg-emerald-950/40 data-[highlighted]:text-emerald-900 dark:data-[highlighted]:text-emerald-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span>
                          {t('activeSessions.filters.activeStatus', {
                            defaultValue: `Aktif (Sedang Login) (${metrics.totalActive})`,
                            count: metrics.totalActive,
                          })}
                        </span>
                      </div>
                      <Select.ItemIndicator className="text-emerald-600 dark:text-emerald-400 pl-2">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </Select.ItemIndicator>
                    </Select.Item>

                    <Select.Item
                      value="REVOKED"
                      className="flex items-center justify-between px-2.5 py-2 text-xs rounded-lg font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-900 dark:hover:text-rose-200 data-[highlighted]:bg-rose-50 dark:data-[highlighted]:bg-rose-950/40 data-[highlighted]:text-rose-900 dark:data-[highlighted]:text-rose-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        <span>
                          {t('activeSessions.filters.revokedStatus', {
                            defaultValue: `Dinonaktifkan (${metrics.totalRevoked})`,
                            count: metrics.totalRevoked,
                          })}
                        </span>
                      </div>
                      <Select.ItemIndicator className="text-rose-600 dark:text-rose-400 pl-2">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </Select.ItemIndicator>
                    </Select.Item>

                    <Select.Item
                      value="ALL"
                      className="flex items-center justify-between px-2.5 py-2 text-xs rounded-lg font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-800 data-[highlighted]:text-slate-900 dark:data-[highlighted]:text-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                        <span>
                          {t('activeSessions.filters.allStatus', {
                            defaultValue: `Semua Status (${metrics.totalSessions})`,
                            count: metrics.totalSessions,
                          })}
                        </span>
                      </div>
                      <Select.ItemIndicator className="text-emerald-600 dark:text-emerald-400 pl-2">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>

          {/* Filter Role */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Users2 className="w-3 h-3 text-slate-400" />
              <span>{t('activeSessions.filters.roleLabel', 'Peran Pengguna Warung:')}</span>
            </label>
            <Select.Root value={roleFilter} onValueChange={(val: string) => setRoleFilter(val)}>
              <Select.Trigger
                className="w-full inline-flex items-center justify-between px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-750 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer shadow-2xs gap-2"
                aria-label="Filter Role"
              >
                <div className="truncate">
                  {roleFilter === 'ALL' && t('activeSessions.filters.allRoles', 'Semua Peran (Kasir & Manajer)')}
                  {roleFilter === 'CASHIER' && t('activeSessions.filters.roleCashier', 'Staf Kasir')}
                  {roleFilter === 'MANAGER' && t('activeSessions.filters.roleManager', 'Manajer Toko')}
                </div>
                <Select.Icon className="text-slate-400 shrink-0 ml-1">
                  <ChevronDown className="w-3.5 h-3.5" />
                </Select.Icon>
              </Select.Trigger>

              <Select.Portal>
                <Select.Content
                  className="z-50 min-w-[180px] overflow-hidden bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-1 animate-in fade-in-80 zoom-in-95"
                  position="popper"
                  sideOffset={6}
                >
                  <Select.Viewport className="p-1 space-y-0.5">
                    <Select.Item
                      value="ALL"
                      className="flex items-center justify-between px-2.5 py-2 text-xs rounded-lg font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <span>{t('activeSessions.filters.allRoles', 'Semua Peran (Kasir & Manajer)')}</span>
                      <Select.ItemIndicator className="text-emerald-600 dark:text-emerald-400 pl-2">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </Select.ItemIndicator>
                    </Select.Item>
                    <Select.Item
                      value="CASHIER"
                      className="flex items-center justify-between px-2.5 py-2 text-xs rounded-lg font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <span>{t('activeSessions.filters.roleCashier', 'Staf Kasir')}</span>
                      <Select.ItemIndicator className="text-emerald-600 dark:text-emerald-400 pl-2">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </Select.ItemIndicator>
                    </Select.Item>
                    <Select.Item
                      value="MANAGER"
                      className="flex items-center justify-between px-2.5 py-2 text-xs rounded-lg font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <span>{t('activeSessions.filters.roleManager', 'Manajer Toko')}</span>
                      <Select.ItemIndicator className="text-emerald-600 dark:text-emerald-400 pl-2">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>

          {/* Search Box */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Search className="w-3 h-3 text-slate-400" />
              <span>{t('common.search', 'Cari Sesi / Pengguna:')}</span>
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(
                  'tenantSessions.searchPlaceholder',
                  'Cari nama kasir, email, IP, perangkat, atau JTI...'
                )}
                className="w-full pl-8.5 pr-8 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {searchQuery && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {t('activeSessions.filters.showingFiltered', {
                defaultValue: `Menampilkan ${filteredSessions.length} dari ${sessions.length} sesi token di ${tenantName}`,
                filtered: filteredSessions.length,
                total: sessions.length,
              })}
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
            >
              {t('activeSessions.filters.clearSearch', 'Hapus Pencarian')}
            </button>
          </div>
        )}
      </div>

      {/* 5. Active Sessions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="inline-block w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('activeSessions.empty.loading', 'Memuat data sesi dan token aktif warung...')}
            </p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {searchQuery
                ? t('activeSessions.empty.filteredTitle', 'Tidak ada sesi yang cocok dengan pencarian')
                : t('activeSessions.empty.title', 'Tidak Ada Sesi Token')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? t('activeSessions.empty.filteredDesc', 'Coba sesuaikan kata kunci pencarian atau filter status token.')
                : t(
                    'tenantSessions.emptyDesc',
                    `Saat ini belum ada sesi pengguna pada kategori ini di warung ${tenantName}.`
                  )}
            </p>
          </div>
        ) : (
          filteredSessions.map((item) => {
            const isActive = item.status === 'ACTIVE';
            const isRevoked = item.status === 'REVOKED';
            const isMyCurrentSession = Boolean(
              item.isCurrentSession || (currentJti && item.accessJti === currentJti)
            );

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 shadow-xs transition-all space-y-4 ${
                  isActive
                    ? 'border-emerald-200/90 dark:border-emerald-900/40 hover:border-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 opacity-90'
                }`}
              >
                {/* Header Row: User Info + Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300 shrink-0 text-base">
                      {item.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {item.userName}
                        </h2>
                        {getRoleBadge(item.userRole)}
                        {isMyCurrentSession && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Sparkles className="w-3 h-3" />
                            <span>{t('tenantSessions.currentSessionBadge', 'Sesi Anda Saat Ini')}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                        {item.userEmail}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 sm:self-start">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>{t('activeSessions.card.activeBadge', 'AKTIF (Sedang Login)')}</span>
                      </span>
                    ) : isRevoked ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        <span>{t('activeSessions.card.revokedBadge', 'DINONAKTIFKAN (Revoked)')}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        <span>{item.status}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Grid: Token Details & Device Info */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                  {/* Left 2 Cols: Session Token Details */}
                  <div className="lg:col-span-2 space-y-2.5">
                    {/* JTI Identifier Box */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <KeyRound className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-slate-500 dark:text-slate-400 shrink-0">
                          {t('activeSessions.card.jtiLabel', 'Token JTI:')}
                        </span>
                        <code className="font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                          {item.accessJti}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyJti(item.accessJti)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedJti === item.accessJti ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              {t('activeSessions.card.copied', 'Tersalin!')}
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>{t('activeSessions.card.copyJti', 'Salin JTI')}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-400">{t('activeSessions.card.loginTime', 'Waktu Login:')}</span>
                        <span className="font-medium">
                          {formatDateTime(item.loginTime, i18n.language)} ({formatRelativeTime(item.loginTime, i18n.language)})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Radio className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-slate-400">{t('activeSessions.card.lastActive', 'Aktivitas Terakhir:')}</span>
                        <span className="font-medium">
                          {formatRelativeTime(item.lastActive, i18n.language)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-400">{t('activeSessions.card.ipLabel', 'Alamat IP:')}</span>
                        <code className="font-mono text-[11px]">{item.ipAddress}</code>
                      </div>

                      <div className="flex items-center gap-2">
                        {getDeviceIcon(item.device)}
                        <span className="text-slate-400">{t('activeSessions.card.deviceLabel', 'Perangkat:')}</span>
                        <span className="font-medium truncate">
                          {item.device || 'Desktop'} · {item.browser || 'Browser'}
                        </span>
                      </div>
                    </div>

                    {/* Revoked Details Banner */}
                    {isRevoked && (
                      <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 text-xs space-y-1 text-rose-800 dark:text-rose-200">
                        <div className="font-semibold flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>
                            {t('activeSessions.card.revokedInfo', {
                              defaultValue: `Dinonaktifkan pada ${formatDateTime(item.revokedAt, i18n.language)} oleh ${item.revokedBy || 'Manajer Toko'}`,
                              time: formatDateTime(item.revokedAt, i18n.language),
                              by: item.revokedBy || 'Manajer Toko',
                            })}
                          </span>
                        </div>
                        {item.revokeReason && (
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 pl-5 italic">
                            "{item.revokeReason}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right 1 Col: Actions Area */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                        {t('common.actions', 'Aksi Token & Sesi')}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {isActive
                          ? 'Menonaktifkan token akan langsung memutus sesi login pengguna ini dari warung Anda.'
                          : 'Token sesi ini sudah dinonaktifkan (berada dalam Denylist) dan tidak dapat digunakan lagi.'}
                      </p>
                    </div>

                    {/* Action buttons */}
                    {isActive ? (
                      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => {
                            setSessionToRevoke(item);
                            setRevokeReason('');
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-2xs cursor-pointer"
                        >
                          <PowerOff className="w-3.5 h-3.5" />
                          <span>{t('activeSessions.card.revokeBtn', 'Nonaktifkan Token')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setUserToRevoke(item);
                            setUserRevokeReason('');
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          <UserX className="w-3 h-3 text-slate-500" />
                          <span>{t('activeSessions.card.revokeUserBtn', 'Nonaktifkan Semua Sesi User Ini')}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-[11px] text-slate-400 dark:text-slate-500 py-1 font-medium">
                        Akses token telah dinonaktifkan
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. MODAL: SINGLE TOKEN REVOCATION */}
      {sessionToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => !isSubmittingRevoke && setSessionToRevoke(null)}
          />

          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 overflow-hidden z-10 animate-in fade-in-90 zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <PowerOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {t('activeSessions.modals.revokeTitle', 'Konfirmasi Penonaktifan Token Sesi')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {sessionToRevoke.userName} ({sessionToRevoke.userEmail})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isSubmittingRevoke && setSessionToRevoke(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 space-y-1.5 text-xs">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Dampak Penonaktifan Token:</span>
                </div>
                <p>
                  {t('activeSessions.modals.revokeDesc', {
                    defaultValue: `Sesi aktif pengguna "${sessionToRevoke.userName}" (${sessionToRevoke.userEmail}) pada warung "${tenantName}" akan segera diputus. Token otentikasi akan dimasukkan ke Token Denylist sehingga pengguna akan langsung ditolak saat melakukan transaksi atau navigasi.`,
                    name: sessionToRevoke.userName,
                    email: sessionToRevoke.userEmail,
                    tenant: tenantName,
                  })}
                </p>
              </div>

              {/* Quick Reason Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  Pilih Cepat Alasan Penonaktifan:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_REASONS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRevokeReason(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                        revokeReason === preset
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  {t('activeSessions.modals.reasonLabel', 'Alasan Penonaktifan Token')} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder={t(
                    'activeSessions.modals.reasonPlaceholder',
                    'Contoh: Shift kasir telah selesai / pergantian staf kasir / indikasi akses mencurigakan...'
                  )}
                  className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSessionToRevoke(null)}
                disabled={isSubmittingRevoke}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                {t('activeSessions.modals.cancelBtn', 'Batal')}
              </button>
              <button
                type="button"
                onClick={handleExecuteRevoke}
                disabled={isSubmittingRevoke || !revokeReason.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingRevoke ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('activeSessions.modals.processingBtn', 'Memproses...')}</span>
                  </>
                ) : (
                  <span>{t('activeSessions.modals.confirmRevokeBtn', 'Ya, Nonaktifkan Token')}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: BULK REVOKE ALL ACTIVE SESSIONS IN TENANT */}
      {showRevokeTenantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => !isSubmittingBulkRevoke && setShowRevokeTenantModal(false)}
          />

          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-rose-300 dark:border-rose-900 shadow-2xl max-w-lg w-full p-6 overflow-hidden z-10 animate-in fade-in-90 zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <PowerOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-rose-700 dark:text-rose-400">
                    {t('tenantSessions.revokeAllModalTitle', 'Nonaktifkan Semua Sesi Aktif Warung')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Warung: {tenantName} ({metrics.totalActive} token aktif)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isSubmittingBulkRevoke && setShowRevokeTenantModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 space-y-1.5 text-xs">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Peringatan Penonaktifan Sesi Warung:</span>
                </div>
                <p>
                  Tindakan ini akan memutus seluruh sesi login kasir dan staf yang sedang aktif di warung{' '}
                  <strong>{tenantName}</strong>.
                </p>
              </div>

              {/* Keep Manager Current Session Checkbox */}
              <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={excludeCurrentSession}
                  onChange={(e) => setExcludeCurrentSession(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {t('activeSessions.modals.keepAdminSession', 'Pertahankan sesi login saya saat ini (jangan keluarkan saya)')}
                </span>
              </label>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  {t('activeSessions.modals.reasonLabel', 'Alasan Penonaktifan Token')}
                </label>
                <textarea
                  rows={2}
                  value={bulkRevokeReason}
                  onChange={(e) => setBulkRevokeReason(e.target.value)}
                  placeholder="Contoh: Tutup operasional toko malam hari / pergantian shift seluruh kasir..."
                  className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowRevokeTenantModal(false)}
                disabled={isSubmittingBulkRevoke}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                {t('activeSessions.modals.cancelBtn', 'Batal')}
              </button>
              <button
                type="button"
                onClick={handleExecuteTenantBulkRevoke}
                disabled={isSubmittingBulkRevoke}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingBulkRevoke ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('activeSessions.modals.processingBtn', 'Memproses...')}</span>
                  </>
                ) : (
                  <span>Ya, Nonaktifkan Semua Sesi Warung</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: REVOKE ALL SESSIONS FOR A SPECIFIC USER */}
      {userToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => !isSubmittingUserRevoke && setUserToRevoke(null)}
          />

          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 overflow-hidden z-10 animate-in fade-in-90 zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {t('activeSessions.modals.confirmRevokeUserTitle', 'Konfirmasi Penonaktifan Seluruh Sesi Pengguna')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {userToRevoke.userName} ({userToRevoke.userEmail})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isSubmittingUserRevoke && setUserToRevoke(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                {t('activeSessions.modals.confirmRevokeUserDesc', {
                  defaultValue: `Seluruh sesi login aktif yang dimiliki oleh pengguna "${userToRevoke.userName}" (${userToRevoke.userEmail}) di warung ${tenantName} akan diputus seketika.`,
                  name: userToRevoke.userName,
                  email: userToRevoke.userEmail,
                })}
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  {t('activeSessions.modals.reasonLabel', 'Alasan Penonaktifan Token')}
                </label>
                <textarea
                  rows={2}
                  value={userRevokeReason}
                  onChange={(e) => setUserRevokeReason(e.target.value)}
                  placeholder="Contoh: Selesai jam kerja shift kasir / pergantian kata sandi..."
                  className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUserToRevoke(null)}
                disabled={isSubmittingUserRevoke}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                {t('activeSessions.modals.cancelBtn', 'Batal')}
              </button>
              <button
                type="button"
                onClick={handleExecuteUserRevoke}
                disabled={isSubmittingUserRevoke}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingUserRevoke ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('activeSessions.modals.processingBtn', 'Memproses...')}</span>
                  </>
                ) : (
                  <span>{t('activeSessions.modals.confirmRevokeUserBtn', 'Ya, Nonaktifkan Semua Sesi')}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantActiveSessionsView;
