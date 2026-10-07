import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { id as idLocale, enUS as enLocale } from 'date-fns/locale';
import { format as formatFns } from 'date-fns';
import {
  ClipboardList,
  Search,
  RotateCcw,
  Boxes,
  FolderTree,
  Users2,
  PlusCircle,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Clock,
  User,
  Globe,
  SlidersHorizontal,
  Store,
  Building2,
  KeyRound,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
} from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { DatePicker, DatePickerValue } from '../Common/DatePicker';
import { PageSizeSelect } from '../Common/PageSizeSelect';
import { ActivityLog, ActivityModule, ActivityLogResponse, Tenant } from '../../types';
import { useAuthStore } from '../../stores/authStore';

export const ActivityLogView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { token, user } = useAuthStore();

  const isAdmin = user?.role === 'ADMIN';
  const isEn = i18n.language === 'en';
  const dateFnsLocale = isEn ? enLocale : idLocale;

  // Logs State
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tenants list for ADMIN filter
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('ALL');

  // Module & Action Filters
  const [selectedModule, setSelectedModule] = useState<'ALL' | ActivityModule>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<DatePickerValue>(null);
  const [endDate, setEndDate] = useState<DatePickerValue>(null);

  // Detail Modal State
  const [activeLogDetail, setActiveLogDetail] = useState<ActivityLog | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  // Fetch tenants if ADMIN
  useEffect(() => {
    if (!isAdmin || !token) return;
    fetch('/api/tenants', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.tenants) {
          setTenants(data.tenants);
        }
      })
      .catch((err) => console.warn('Failed to load tenants for filter:', err));
  }, [isAdmin, token]);

  // Fetch Logs
  const fetchLogs = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      // If ADMIN and specific tenant selected
      if (isAdmin && selectedTenantId !== 'ALL') {
        params.append('tenantId', selectedTenantId);
      }

      if (selectedModule !== 'ALL') {
        params.append('module', selectedModule);
      }

      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }

      // Handle date filtering (Tanggal Awal & Tanggal Akhir)
      if (startDate instanceof Date) {
        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');
        params.append('startDate', `${year}-${month}-${day}`);
      } else if (Array.isArray(startDate) && startDate[0] instanceof Date) {
        const s = startDate[0];
        params.append('startDate', `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`);
      }

      if (endDate instanceof Date) {
        const year = endDate.getFullYear();
        const month = String(endDate.getMonth() + 1).padStart(2, '0');
        const day = String(endDate.getDate()).padStart(2, '0');
        params.append('endDate', `${year}-${month}-${day}`);
      } else if (Array.isArray(endDate) && endDate[0] instanceof Date) {
        const e = endDate[0];
        params.append('endDate', `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`);
      }

      const res = await fetch(`/api/activity-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept-Language': isEn ? 'en' : 'id',
        },
      });

      if (!res.ok) {
        throw new Error('Gagal mengambil data log aktivitas');
      }

      const data: ActivityLogResponse = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, selectedTenantId, selectedModule, searchQuery, startDate, endDate, isAdmin, isEn]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleStartDateChange = (val: DatePickerValue) => {
    setStartDate(val);
    setPage(1);
  };

  const handleEndDateChange = (val: DatePickerValue) => {
    setEndDate(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSelectedTenantId('ALL');
    setSelectedModule('ALL');
    setSearchQuery('');
    setStartDate(null);
    setEndDate(null);
    setPage(1);
  };

  const copyLogJson = () => {
    if (!activeLogDetail) return;
    navigator.clipboard.writeText(JSON.stringify(activeLogDetail, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Helper formatting with date-fns
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return formatFns(date, 'd MMM yyyy, HH:mm:ss', { locale: dateFnsLocale });
    } catch {
      return isoString;
    }
  };

  // Module Badges
  const getModuleBadge = (module: ActivityModule) => {
    switch (module) {
      case 'TENANT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
            <Store className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{t('activityLog.moduleTenant', 'Tenant')}</span>
          </span>
        );
      case 'USER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
            <KeyRound className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>{t('activityLog.moduleUser', 'User')}</span>
          </span>
        );
      case 'PRODUCT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <Boxes className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t('activityLog.moduleProduct', 'Produk')}</span>
          </span>
        );
      case 'CATEGORY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
            <FolderTree className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>{t('activityLog.moduleCategory', 'Kategori')}</span>
          </span>
        );
      case 'CASHIER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            <Users2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{t('activityLog.moduleCashier', 'Staf Kasir')}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {module}
          </span>
        );
    }
  };

  // Action Badges with Action Type
  const getActionBadge = (action: string) => {
    // Tenant actions
    if (action === 'UPDATE_TENANT_STATUS' || action === 'UPDATE_TENANT') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60">
          <Store className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
          <span>{t(`activityLog.actions.${action}`, action === 'UPDATE_TENANT_STATUS' ? 'Ubah Status Tenan' : 'Ubah Data Tenan')}</span>
        </span>
      );
    }
    if (action === 'APPROVE_DEACTIVATION') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60">
          <ShieldAlert className="w-3 h-3 text-rose-600 dark:text-rose-400" />
          <span>{t('activityLog.actions.APPROVE_DEACTIVATION', 'Setujui Nonaktif Tenan')}</span>
        </span>
      );
    }
    if (action === 'REJECT_DEACTIVATION') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
          <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          <span>{t('activityLog.actions.REJECT_DEACTIVATION', 'Tolak Nonaktif Tenan')}</span>
        </span>
      );
    }

    // User actions
    if (action === 'ADMIN_CHANGE_PASSWORD') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
          <KeyRound className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          <span>{t('activityLog.actions.ADMIN_CHANGE_PASSWORD', 'Ubah Kata Sandi')}</span>
        </span>
      );
    }
    if (action === 'DEACTIVATE_USER') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60">
          <UserX className="w-3 h-3 text-rose-600 dark:text-rose-400" />
          <span>{t('activityLog.actions.DEACTIVATE_USER', 'Nonaktifkan Akun')}</span>
        </span>
      );
    }
    if (action === 'ACTIVATE_USER') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
          <UserCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>{t('activityLog.actions.ACTIVATE_USER', 'Aktifkan Akun')}</span>
        </span>
      );
    }

    // Standard CRUD actions
    if (action.startsWith('CREATE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
          <PlusCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>{t(`activityLog.actions.${action}`, 'Tambah')}</span>
        </span>
      );
    }
    if (action.startsWith('UPDATE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
          <Pencil className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          <span>{t(`activityLog.actions.${action}`, 'Ubah')}</span>
        </span>
      );
    }
    if (action.startsWith('DELETE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60">
          <Trash2 className="w-3 h-3 text-rose-600 dark:text-rose-400" />
          <span>{t(`activityLog.actions.${action}`, 'Hapus')}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {action}
      </span>
    );
  };

  // Role Badge Class
  const getRoleBadgeClasses = (r: string) => {
    switch (r) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800/50';
      case 'MANAGER':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50';
      case 'CASHIER':
      default:
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800/50';
    }
  };

  // Start & end calculation for pagination
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {isAdmin ? 'Log Aktivitas Multi-Tenant' : t('activityLog.title', 'Log Aktivitas Toko')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {isAdmin
                ? 'Audit lengkap riwayat aksi seluruh tenan: perubahan status warung, penonaktifan user, dan ubah kata sandi'
                : t('activityLog.subtitle', 'Audit lengkap seluruh riwayat aksi manajemen produk, kategori, dan staf kasir.')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchLogs()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Menyinkronkan...' : 'Segarkan Data'}</span>
          </button>
        </div>
      </div>

      {/* Admin Highlight Banner */}
      {isAdmin && (
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1">
            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Audit Keamanan & Aktivitas Multi-Tenant Global</span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-medium">
                Admin Privilege
              </span>
            </div>
            <p className="leading-relaxed text-slate-500 dark:text-slate-400">
              Sebagai Admin, Anda dapat memantau log aktivitas dari <strong>seluruh warung/tenan</strong>. Log mencakup modul khusus Admin seperti <strong>perubahan status tenan</strong>, <strong>penonaktifan/pengaktifan akun pengguna</strong>, serta <strong>pengaturan ulang kata sandi pengguna</strong> dari setiap tenan.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar Card */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
          {/* Keyword Search Input */}
          <div className={`sm:col-span-2 ${isAdmin ? 'lg:col-span-3' : 'lg:col-span-4'} relative`}>
            <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              {t('activityLog.searchLabel', 'Pencarian Kata Kunci')}
            </span>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari deskripsi, staf, aksi, email..."
                className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tenant Filter (ADMIN only) */}
          {isAdmin && (
            <div className="sm:col-span-1 lg:col-span-3">
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Filter Tenan / Warung
              </span>
              <Select.Root
                value={selectedTenantId}
                onValueChange={(val) => {
                  setSelectedTenantId(val);
                  setPage(1);
                }}
              >
                <Select.Trigger
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                  aria-label="Pilih Tenan"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <Select.Value placeholder="Semua Tenan">
                      {selectedTenantId === 'ALL'
                        ? 'Semua Tenan / Warung'
                        : selectedTenantId === 'SYSTEM'
                        ? 'Sistem Global (Admin)'
                        : tenants.find((t) => t.id === selectedTenantId)?.name || selectedTenantId}
                    </Select.Value>
                  </div>
                  <Select.Icon className="text-slate-400 shrink-0 ml-1">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    position="popper"
                    sideOffset={4}
                    className="z-50 min-w-[200px] max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1 animate-in fade-in-50 zoom-in-95 text-xs"
                  >
                    <Select.Viewport>
                      <Select.Item
                        value="ALL"
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer outline-hidden select-none data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                      >
                        <Select.ItemText>Semua Tenan / Warung</Select.ItemText>
                        <Select.ItemIndicator>
                          <Check className="w-3.5 h-3.5 text-purple-600" />
                        </Select.ItemIndicator>
                      </Select.Item>
                      <Select.Item
                        value="SYSTEM"
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer outline-hidden select-none data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                      >
                        <Select.ItemText>Sistem Global (Admin)</Select.ItemText>
                        <Select.ItemIndicator>
                          <Check className="w-3.5 h-3.5 text-purple-600" />
                        </Select.ItemIndicator>
                      </Select.Item>
                      {tenants.map((tOpt) => (
                        <Select.Item
                          key={tOpt.id}
                          value={tOpt.id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer outline-hidden select-none data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                        >
                          <Select.ItemText>{tOpt.name}</Select.ItemText>
                          <Select.ItemIndicator>
                            <Check className="w-3.5 h-3.5 text-purple-600" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
          )}

          {/* Module Filter using Radix UI Select */}
          <div className="sm:col-span-1 lg:col-span-2">
            <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Filter Modul
            </span>
            <Select.Root
              value={selectedModule}
              onValueChange={(val) => {
                setSelectedModule(val as any);
                setPage(1);
              }}
            >
              <Select.Trigger
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                aria-label="Pilih Modul"
              >
                <div className="flex items-center gap-2 truncate">
                  <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <Select.Value placeholder="Semua Modul">
                    {selectedModule === 'ALL' && 'Semua Modul'}
                    {selectedModule === 'TENANT' && 'Tenan (TENANT)'}
                    {selectedModule === 'USER' && 'User & Sandi (USER)'}
                    {selectedModule === 'PRODUCT' && 'Produk (PRODUCT)'}
                    {selectedModule === 'CATEGORY' && 'Kategori (CATEGORY)'}
                    {selectedModule === 'CASHIER' && 'Kasir (CASHIER)'}
                  </Select.Value>
                </div>
                <Select.Icon className="text-slate-400 shrink-0 ml-1">
                  <ChevronDown className="w-3.5 h-3.5" />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  position="popper"
                  sideOffset={4}
                  className="z-50 min-w-[170px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1 animate-in fade-in-50 zoom-in-95 text-xs"
                >
                  <Select.Viewport>
                    <Select.Item
                      value="ALL"
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer outline-hidden select-none data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                    >
                      <Select.ItemText>Semua Modul</Select.ItemText>
                      <Select.ItemIndicator>
                        <Check className="w-3.5 h-3.5 text-purple-600" />
                      </Select.ItemIndicator>
                    </Select.Item>
                    {isAdmin && (
                      <>
                        <Select.Item
                          value="TENANT"
                          className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer outline-hidden select-none data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                        >
                          <Select.ItemText>Tenan (TENANT)</Select.ItemText>
                          <Select.ItemIndicator>
                            <Check className="w-3.5 h-3.5 text-purple-600" />
                          </Select.ItemIndicator>
                        </Select.Item>
                        <Select.Item
                          value="USER"
                          className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer outline-hidden select-none data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                        >
                          <Select.ItemText>User & Sandi (USER)</Select.ItemText>
                          <Select.ItemIndicator>
                            <Check className="w-3.5 h-3.5 text-purple-600" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      </>
                    )}
                    <Select.Item
                      value="PRODUCT"
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer outline-hidden select-none data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                    >
                      <Select.ItemText>Produk (PRODUCT)</Select.ItemText>
                      <Select.ItemIndicator>
                        <Check className="w-3.5 h-3.5 text-purple-600" />
                      </Select.ItemIndicator>
                    </Select.Item>
                    <Select.Item
                      value="CATEGORY"
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer outline-hidden select-none data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                    >
                      <Select.ItemText>Kategori (CATEGORY)</Select.ItemText>
                      <Select.ItemIndicator>
                        <Check className="w-3.5 h-3.5 text-purple-600" />
                      </Select.ItemIndicator>
                    </Select.Item>
                    <Select.Item
                      value="CASHIER"
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer outline-hidden select-none data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                    >
                      <Select.ItemText>Staf Kasir (CASHIER)</Select.ItemText>
                      <Select.ItemIndicator>
                        <Check className="w-3.5 h-3.5 text-purple-600" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>

          {/* Tanggal Awal Date Picker */}
          <div className="sm:col-span-1 lg:col-span-2">
            <DatePicker
              label={t('activityLog.startDate', 'Tanggal Awal')}
              value={startDate}
              onChange={handleStartDateChange}
              maxDate={endDate instanceof Date ? endDate : undefined}
              nativeInputAriaLabel={t('activityLog.startDate', 'Tanggal Awal')}
              clearAriaLabel={t('activityLog.clearStartDateAriaLabel', isEn ? 'Clear start date' : 'Hapus tanggal awal')}
            />
          </div>

          {/* Tanggal Akhir Date Picker */}
          <div className="sm:col-span-1 lg:col-span-2">
            <DatePicker
              label={t('activityLog.endDate', 'Tanggal Akhir')}
              value={endDate}
              onChange={handleEndDateChange}
              minDate={startDate instanceof Date ? startDate : undefined}
              nativeInputAriaLabel={t('activityLog.endDate', 'Tanggal Akhir')}
              clearAriaLabel={t('activityLog.clearEndDateAriaLabel', isEn ? 'Clear end date' : 'Hapus tanggal akhir')}
            />
          </div>
        </div>

        {/* Quick Clear / Reset Filters Row */}
        {(selectedModule !== 'ALL' || selectedTenantId !== 'ALL' || searchQuery || startDate || endDate) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Filter aktif: {total} data ditemukan
            </span>
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 text-purple-600 dark:text-purple-400 hover:underline font-medium cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('activityLog.clearFilter', 'Reset Semua Filter')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area: Responsive Data Presentation */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border-b border-rose-100 dark:border-rose-900 text-xs sm:text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <RotateCcw className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
            <p className="text-xs sm:text-sm font-medium">{t('common.loading', 'Memuat log aktivitas...')}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && logs.length === 0 && (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <ClipboardList className="w-7 h-7" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
              {searchQuery || selectedModule !== 'ALL' || selectedTenantId !== 'ALL' || startDate || endDate
                ? t('activityLog.noLogsMatch', 'Tidak ada aktivitas yang sesuai dengan filter pencarian.')
                : t('activityLog.noLogs', 'Belum ada aktivitas yang tercatat.')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              {isAdmin
                ? 'Setiap penambahan, pengubahan data tenan, status user, reset sandi, produk, dan staf kasir akan terekam di sini.'
                : t('activityLog.noLogsDesc', 'Setiap penambahan, pengubahan, atau penghapusan data produk, kategori, dan staf kasir akan terekam di sini.')}
            </p>
            {(searchQuery || selectedModule !== 'ALL' || selectedTenantId !== 'ALL' || startDate || endDate) && (
              <button
                onClick={handleResetFilters}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-purple-700 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-300 hover:bg-purple-100 rounded-xl transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('activityLog.clearFilter', 'Reset Filter')}</span>
              </button>
            )}
          </div>
        )}

        {/* Desktop View: Full Data Table */}
        {!loading && logs.length > 0 && (
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 whitespace-nowrap">{t('activityLog.colTime', 'Waktu / Tanggal')}</th>
                  {isAdmin && <th className="py-3.5 px-4">Tenan / Warung</th>}
                  <th className="py-3.5 px-4">{t('activityLog.colUser', 'Pelaksana')}</th>
                  <th className="py-3.5 px-4">{t('activityLog.colModule', 'Modul')}</th>
                  <th className="py-3.5 px-4">{t('activityLog.colAction', 'Aksi')}</th>
                  <th className="py-3.5 px-4 min-w-[280px]">{t('activityLog.colDescription', 'Deskripsi Aktivitas')}</th>
                  <th className="py-3.5 px-4 text-center">{t('common.actions', 'Aksi')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {logs.map((log) => {
                  const initials = (log.userName || 'U')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0].toUpperCase())
                    .join('');

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(log.createdAt)}
                      </td>

                      {/* Tenant Column for ADMIN */}
                      {isAdmin && (
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-xs">
                            {log.tenantId === 'SYSTEM' || !log.tenantId ? (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                <span className="font-semibold text-purple-700 dark:text-purple-300">
                                  Sistem Global
                                </span>
                              </>
                            ) : (
                              <>
                                <Store className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                                  {log.tenantName || log.tenantId}
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Actor */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 dark:text-slate-100 truncate text-xs">
                              {log.userName}
                            </div>
                            <span
                              className={`inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded border ${getRoleBadgeClasses(
                                log.userRole
                              )}`}
                            >
                              {log.userRole}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Module */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getModuleBadge(log.module)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">
                        <p className="line-clamp-2">{log.description}</p>
                      </td>

                      {/* Details Trigger */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setActiveLogDetail(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>Rincian</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile View: Card-based Presentation (Visible on < lg) */}
        {!loading && logs.length > 0 && (
          <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map((log) => (
              <div key={log.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getModuleBadge(log.module)}
                    {getActionBadge(log.action)}
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </span>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <Store className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="font-medium">{log.tenantName || log.tenantId}</span>
                  </div>
                )}

                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                  {log.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{log.userName}</span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${getRoleBadgeClasses(
                        log.userRole
                      )}`}
                    >
                      {log.userRole}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveLogDetail(log)}
                    className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Rincian</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && logs.length > 0 && (
          <div className="p-4 bg-slate-50/75 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-500 dark:text-slate-400">
                Menampilkan <strong>{startItem}</strong> - <strong>{endItem}</strong> dari <strong>{total}</strong> log
              </span>
              <div className="hidden sm:block">
                <PageSizeSelect
                  value={limit}
                  onChange={(newLimit) => {
                    setLimit(newLimit);
                    setPage(1);
                  }}
                  options={[10, 20, 50, 100]}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>

              <span className="px-2 font-medium text-slate-700 dark:text-slate-300">
                {page} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {activeLogDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setActiveLogDetail(null)}
          />

          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-6 overflow-hidden z-10 animate-in fade-in-90 zoom-in-95 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Rincian Log Aktivitas
                  </h3>
                  <p className="text-xs text-slate-400">ID: {activeLogDetail.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveLogDetail(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Structured Metadata Box */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Waktu Lengkap:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {formatDate(activeLogDetail.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Tenan / Warung:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {activeLogDetail.tenantName || activeLogDetail.tenantId}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Pelaksana (Aktor):</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {activeLogDetail.userName} ({activeLogDetail.userRole})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Alamat IP:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {activeLogDetail.ipAddress || '127.0.0.1'}
                </span>
              </div>
              <div className="col-span-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
                <span className="text-slate-400">Klasifikasi:</span>
                {getModuleBadge(activeLogDetail.module)}
                {getActionBadge(activeLogDetail.action)}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Deskripsi Lengkap
              </span>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                {activeLogDetail.description}
              </div>
            </div>

            {/* Technical JSON Details */}
            {activeLogDetail.details && Object.keys(activeLogDetail.details).length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Data Teknis / Parameter Perubahan (JSON)
                  </span>
                  <button
                    type="button"
                    onClick={copyLogJson}
                    className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800">
                  {JSON.stringify(activeLogDetail.details, null, 2)}
                </pre>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveLogDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogView;
