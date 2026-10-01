import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-date-picker';
import 'react-date-picker/dist/DatePicker.css';
import 'react-calendar/dist/Calendar.css';
import {
  KeyRound,
  Search,
  Calendar as CalendarIcon,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  User,
  ShieldAlert,
  ShieldCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  Info,
  X,
  Copy,
  Check,
  Clock,
  Laptop,
} from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { LoginHistoryItem, LoginHistoryResponse, Role, Tenant } from '../../types';
import { useAuthStore } from '../../stores/authStore';

type ValuePiece = Date | null;
type DatePickerValue = ValuePiece | [ValuePiece, ValuePiece];

export const LoginHistoryView: React.FC = () => {
  const { t } = useTranslation();
  const { token, user } = useAuthStore();

  const role = user?.role || 'CASHIER';

  // Data State
  const [logs, setLogs] = useState<LoginHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    successCount: 0,
    failedCount: 0,
    uniqueUsers: 0,
  });

  // Scope: 'ALL' (tenant / all tenants) vs 'ME' (only current user)
  const [scope, setScope] = useState<'ALL' | 'ME'>(role === 'CASHIER' ? 'ME' : 'ALL');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');
  const [selectedRole, setSelectedRole] = useState<'ALL' | Role>('ALL');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<DatePickerValue>(null);

  // Tenant list for ADMIN filter
  const [tenants, setTenants] = useState<Tenant[]>([]);

  // Detail Modal State
  const [activeDetail, setActiveDetail] = useState<LoginHistoryItem | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Fetch tenants if ADMIN
  useEffect(() => {
    if (role === 'ADMIN' && token) {
      fetch('/api/tenants', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.tenants) {
            setTenants(data.tenants);
          }
        })
        .catch((err) => console.error('Failed to fetch tenants:', err));
    }
  }, [role, token]);

  // Fetch Login History
  const fetchLoginHistory = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      if (scope === 'ME' || role === 'CASHIER') {
        params.set('scope', 'ME');
      } else {
        params.set('scope', 'ALL');
      }

      if (selectedStatus !== 'ALL') {
        params.set('status', selectedStatus);
      }

      if (selectedRole !== 'ALL' && role !== 'CASHIER') {
        params.set('role', selectedRole);
      }

      if (role === 'ADMIN' && selectedTenantId !== 'ALL') {
        params.set('tenantId', selectedTenantId);
      }

      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }

      // Date range filtering
      if (selectedDate) {
        if (Array.isArray(selectedDate)) {
          if (selectedDate[0]) params.set('startDate', selectedDate[0].toISOString());
          if (selectedDate[1]) params.set('endDate', selectedDate[1].toISOString());
        } else if (selectedDate instanceof Date) {
          const s = new Date(selectedDate);
          s.setHours(0, 0, 0, 0);
          const e = new Date(selectedDate);
          e.setHours(23, 59, 59, 999);
          params.set('startDate', s.toISOString());
          params.set('endDate', e.toISOString());
        }
      }

      const res = await fetch(`/api/login-history?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Gagal memuat histori login (${res.status})`);
      }

      const data: LoginHistoryResponse = await res.json();
      if (data.success) {
        setLogs(data.history || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        throw new Error('Respons server tidak valid');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  }, [
    token,
    page,
    limit,
    scope,
    role,
    selectedStatus,
    selectedRole,
    selectedTenantId,
    searchQuery,
    selectedDate,
  ]);

  useEffect(() => {
    fetchLoginHistory();
  }, [fetchLoginHistory]);

  // Debounced search reset to page 1
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleDateChange = (val: DatePickerValue) => {
    setSelectedDate(val);
    setPage(1);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('ALL');
    setSelectedRole('ALL');
    setSelectedTenantId('ALL');
    setSelectedDate(null);
    setPage(1);
  };

  // Copy JSON details helper
  const handleCopyJson = (item: LoginHistoryItem) => {
    navigator.clipboard.writeText(JSON.stringify(item, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 1500);
  };

  // Format Helper
  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return {
        date: d.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        time: d.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      };
    } catch {
      return { date: isoString, time: '' };
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return `${diffSec} detik lalu`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} menit lalu`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} jam lalu`;
      const diffDay = Math.floor(diffHour / 24);
      return `${diffDay} hari lalu`;
    } catch {
      return '';
    }
  };

  // Device Icon Helper
  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'smartphone':
        return <Smartphone className="w-4 h-4 text-sky-600" />;
      case 'tablet':
        return <Tablet className="w-4 h-4 text-indigo-600" />;
      default:
        return <Monitor className="w-4 h-4 text-emerald-600" />;
    }
  };

  // Role Badge Helper
  const renderRoleBadge = (targetRole: Role | string) => {
    switch (targetRole) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <ShieldAlert className="w-3 h-3 text-purple-700" />
            Super Admin
          </span>
        );
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-700" />
            Manajer Toko
          </span>
        );
      case 'CASHIER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <KeyRound className="w-3 h-3 text-amber-700" />
            Kasir
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {targetRole}
          </span>
        );
    }
  };

  // Page title
  const pageTitle = t('loginHistory.title', 'Histori Login');

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedStatus !== 'ALL' ||
    selectedRole !== 'ALL' ||
    selectedTenantId !== 'ALL' ||
    selectedDate !== null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Section */}
      <div className="flex items-center gap-2.5 pt-1">
        <KeyRound className="w-5 h-5 text-emerald-600" />
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          {pageTitle}
        </h1>
      </div>

      {/* 2. Scope Tabs for MANAGER & ADMIN */}
      {role !== 'CASHIER' && (
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
          <button
            onClick={() => {
              setScope('ALL');
              setPage(1);
            }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
              scope === 'ALL'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            {role === 'ADMIN'
              ? t('loginHistory.tabAllTenants', 'Semua Tenant & Pengguna')
              : t('loginHistory.tabTenantStaff', 'Semua Staf Toko')}
          </button>
          <button
            onClick={() => {
              setScope('ME');
              setPage(1);
            }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
              scope === 'ME'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className="w-4 h-4" />
            {t('loginHistory.tabMyHistory', 'Histori Akun Saya')}
          </button>
        </div>
      )}

      {/* Filters Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Row 1: Search and Date Filter */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Keyword Search */}
          <div className="md:col-span-7 lg:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('loginHistory.searchPlaceholder', 'Cari nama, email, IP, perangkat...')}
              className="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden transition shadow-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* React Date Picker */}
          <div className="md:col-span-5 lg:col-span-4">
            <DatePicker
              onChange={handleDateChange}
              value={selectedDate}
              format="dd/MM/yyyy"
              clearIcon={<X className="w-4 h-4 text-slate-400 hover:text-slate-700 cursor-pointer" />}
              calendarIcon={<CalendarIcon className="w-4 h-4 text-slate-500" />}
              dayPlaceholder="dd"
              monthPlaceholder="mm"
              yearPlaceholder="yyyy"
              className="w-full text-sm"
            />
          </div>
        </div>

        {/* Unified Filter Group: Status Filter, Role Filter, dan Tenant Filter */}
        <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              <span>Grup Filter Kategori</span>
            </div>
            <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500 hidden sm:inline">
              Status, Peran & Toko
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex-1 min-w-[170px]">
              <Select.Root
                value={selectedStatus}
                onValueChange={(val: 'ALL' | 'SUCCESS' | 'FAILED') => {
                  setSelectedStatus(val);
                  setPage(1);
                }}
              >
                <Select.Trigger
                  className="w-full inline-flex items-center justify-between px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-600 focus:outline-hidden transition cursor-pointer shadow-xs gap-2"
                  aria-label={t('loginHistory.filterStatus', 'Filter Status')}
                >
                  <div className="flex items-center gap-2 truncate">
                    {selectedStatus === 'SUCCESS' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                    {selectedStatus === 'FAILED' && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    )}
                    {selectedStatus === 'ALL' && (
                      <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                    )}
                    <Select.Value>
                      <span className="truncate">
                        {selectedStatus === 'ALL' && t('loginHistory.statusAll', 'Semua Status')}
                        {selectedStatus === 'SUCCESS' && t('loginHistory.statusSuccess', 'Berhasil')}
                        {selectedStatus === 'FAILED' && t('loginHistory.statusFailed', 'Gagal')}
                      </span>
                    </Select.Value>
                  </div>
                  <Select.Icon className="text-slate-400 dark:text-slate-500 shrink-0">
                    <ChevronDown className="w-4 h-4" />
                  </Select.Icon>
                </Select.Trigger>

                <Select.Portal>
                  <Select.Content
                    className="z-50 min-w-[180px] overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 animate-in fade-in-80 zoom-in-95"
                    position="popper"
                    sideOffset={6}
                  >
                    <Select.Viewport className="p-1 space-y-0.5">
                      <Select.Item
                        value="ALL"
                        className="flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-slate-100 dark:hover:bg-slate-800 data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          <Select.ItemText>{t('loginHistory.statusAll', 'Semua Status')}</Select.ItemText>
                        </div>
                        <Select.ItemIndicator className="text-emerald-600 pl-2">
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </Select.ItemIndicator>
                      </Select.Item>

                      <Select.Item
                        value="SUCCESS"
                        className="flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-slate-100 dark:hover:bg-slate-800 data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <Select.ItemText>{t('loginHistory.statusSuccess', 'Berhasil')}</Select.ItemText>
                        </div>
                        <Select.ItemIndicator className="text-emerald-600 pl-2">
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </Select.ItemIndicator>
                      </Select.Item>

                      <Select.Item
                        value="FAILED"
                        className="flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-slate-100 dark:hover:bg-slate-800 data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <Select.ItemText>{t('loginHistory.statusFailed', 'Gagal')}</Select.ItemText>
                        </div>
                        <Select.ItemIndicator className="text-emerald-600 pl-2">
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* Role Filter (Only for Manager/Admin in ALL scope) */}
            {role !== 'CASHIER' && scope === 'ALL' && (
              <div className="flex-1 min-w-[170px]">
                <Select.Root
                  value={selectedRole}
                  onValueChange={(val: 'ALL' | Role) => {
                    setSelectedRole(val);
                    setPage(1);
                  }}
                >
                  <Select.Trigger
                    className="w-full inline-flex items-center justify-between px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-600 focus:outline-hidden transition cursor-pointer shadow-xs gap-2"
                    aria-label={t('loginHistory.filterRole', 'Filter Peran')}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <Select.Value>
                        <span className="truncate">
                          {selectedRole === 'ALL' && t('loginHistory.roleAll', 'Semua Peran')}
                          {selectedRole === 'ADMIN' && 'Super Admin'}
                          {selectedRole === 'MANAGER' && 'Manajer Toko'}
                          {selectedRole === 'CASHIER' && 'Kasir'}
                        </span>
                      </Select.Value>
                    </div>
                    <Select.Icon className="text-slate-400 dark:text-slate-500 shrink-0">
                      <ChevronDown className="w-4 h-4" />
                    </Select.Icon>
                  </Select.Trigger>

                  <Select.Portal>
                    <Select.Content
                      className="z-50 min-w-[180px] overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 animate-in fade-in-80 zoom-in-95"
                      position="popper"
                      sideOffset={6}
                    >
                      <Select.Viewport className="p-1 space-y-0.5">
                        <Select.Item
                          value="ALL"
                          className="flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-slate-100 dark:hover:bg-slate-800 data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-800 transition-colors"
                        >
                          <Select.ItemText>{t('loginHistory.roleAll', 'Semua Peran')}</Select.ItemText>
                          <Select.ItemIndicator className="text-emerald-600 pl-2">
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </Select.ItemIndicator>
                        </Select.Item>

                        {role === 'ADMIN' && (
                          <Select.Item
                            value="ADMIN"
                            className="flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-slate-100 dark:hover:bg-slate-800 data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-800 transition-colors"
                          >
                            <Select.ItemText>Super Admin</Select.ItemText>
                            <Select.ItemIndicator className="text-emerald-600 pl-2">
                              <Check className="w-4 h-4 stroke-[2.5]" />
                            </Select.ItemIndicator>
                          </Select.Item>
                        )}

                        <Select.Item
                          value="MANAGER"
                          className="flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-slate-100 dark:hover:bg-slate-800 data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-800 transition-colors"
                        >
                          <Select.ItemText>Manajer Toko</Select.ItemText>
                          <Select.ItemIndicator className="text-emerald-600 pl-2">
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </Select.ItemIndicator>
                        </Select.Item>

                        <Select.Item
                          value="CASHIER"
                          className="flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-slate-100 dark:hover:bg-slate-800 data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-800 transition-colors"
                        >
                          <Select.ItemText>Kasir</Select.ItemText>
                          <Select.ItemIndicator className="text-emerald-600 pl-2">
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
            )}

            {/* Tenant Filter (Only for ADMIN in ALL scope) */}
            {role === 'ADMIN' && scope === 'ALL' && (
              <div className="flex-1 min-w-[170px]">
                <Select.Root
                  value={selectedTenantId}
                  onValueChange={(val: string) => {
                    setSelectedTenantId(val);
                    setPage(1);
                  }}
                >
                  <Select.Trigger
                    className="w-full inline-flex items-center justify-between px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-600 focus:outline-hidden transition cursor-pointer shadow-xs gap-2"
                    aria-label={t('loginHistory.filterTenant', 'Filter Toko / Tenant')}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <Select.Value>
                        <span className="truncate">
                          {selectedTenantId === 'ALL'
                            ? t('loginHistory.tenantAll', 'Semua Toko')
                            : tenants.find((tItem) => tItem.id === selectedTenantId)?.name || selectedTenantId}
                        </span>
                      </Select.Value>
                    </div>
                    <Select.Icon className="text-slate-400 dark:text-slate-500 shrink-0">
                      <ChevronDown className="w-4 h-4" />
                    </Select.Icon>
                  </Select.Trigger>

                  <Select.Portal>
                    <Select.Content
                      className="z-50 min-w-[200px] max-h-72 overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 animate-in fade-in-80 zoom-in-95"
                      position="popper"
                      sideOffset={6}
                    >
                      <Select.Viewport className="p-1 space-y-0.5">
                        <Select.Item
                          value="ALL"
                          className="flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-slate-100 dark:hover:bg-slate-800 data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-800 transition-colors"
                        >
                          <Select.ItemText>{t('loginHistory.tenantAll', 'Semua Toko')}</Select.ItemText>
                          <Select.ItemIndicator className="text-emerald-600 pl-2">
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </Select.ItemIndicator>
                        </Select.Item>

                        {tenants.map((tItem) => (
                          <Select.Item
                            key={tItem.id}
                            value={tItem.id}
                            className="flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-slate-100 dark:hover:bg-slate-800 data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-800 transition-colors"
                          >
                            <Select.ItemText>{tItem.name}</Select.ItemText>
                            <Select.ItemIndicator className="text-emerald-600 pl-2">
                              <Check className="w-4 h-4 stroke-[2.5]" />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
        {/* Refresh & Actions */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => fetchLoginHistory()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
            title="Muat Ulang Data"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden sm:inline">{t('common.refresh', 'Perbarui')}</span>
          </button>
        </div>

        {/* Clear Filter Action */}
        {hasActiveFilters && (
          
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 dark:text-rose-400 rounded-lg transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('loginHistory.clearFilter', 'Reset Filter')}
            </button>
          
        )}
        </div>
      </div>

      {/* 5. Error Message */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => fetchLoginHistory()}
            className="underline font-semibold hover:text-rose-800 cursor-pointer"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* 6. Content Section - Responsive Views */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RotateCcw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
            <p className="text-sm font-medium">{t('common.loading', 'Memuat data histori login...')}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <div className="text-base font-semibold text-slate-700">
              {hasActiveFilters
                ? t('loginHistory.noHistoryMatch', 'Tidak ada histori login yang cocok dengan filter pencarian.')
                : t('loginHistory.noHistory', 'Belum ada rekaman histori login')}
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('loginHistory.clearFilter', 'Reset Filter')}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (Visible on lg and larger) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">{t('loginHistory.colTime', 'Waktu Login')}</th>
                    <th className="py-3.5 px-4">{t('loginHistory.colUser', 'Pengguna & Akun')}</th>
                    <th className="py-3.5 px-4">{t('loginHistory.colRole', 'Peran')}</th>
                    {role !== 'CASHIER' && <th className="py-3.5 px-4">{t('loginHistory.colTenant', 'Toko / Tenant')}</th>}
                    <th className="py-3.5 px-4">{t('loginHistory.colDevice', 'Perangkat & Sistem')}</th>
                    <th className="py-3.5 px-4">{t('loginHistory.colIp', 'Alamat IP')}</th>
                    <th className="py-3.5 px-4">{t('loginHistory.colStatus', 'Status')}</th>
                    <th className="py-3.5 px-4 text-center">{t('loginHistory.colAction', 'Aksi')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((item) => {
                    const dt = formatDateTime(item.createdAt);
                    const rel = formatRelativeTime(item.createdAt);
                    const isSuccess = item.status === 'SUCCESS';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        {/* Waktu Login */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{dt.date}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{dt.time}</span>
                            <span className="text-[11px] text-slate-400">({rel})</span>
                          </div>
                        </td>

                        {/* Pengguna & Akun */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                              {item.userName ? item.userName.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div className="truncate max-w-[160px]">
                              <div className="font-semibold text-slate-900 truncate">{item.userName}</div>
                              <div className="text-xs text-slate-500 truncate">{item.userEmail}</div>
                            </div>
                          </div>
                        </td>

                        {/* Peran */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderRoleBadge(item.userRole)}
                        </td>

                        {/* Toko / Tenant */}
                        {role !== 'CASHIER' && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="text-xs font-medium text-slate-800">
                              {item.tenantName || 'Global System'}
                            </div>
                            {item.tenantId && (
                              <div className="text-[11px] text-slate-400 font-mono">
                                {item.tenantId}
                              </div>
                            )}
                          </td>
                        )}

                        {/* Perangkat & Sistem */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                            {getDeviceIcon(item.device)}
                            <span>{item.device}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-600">{item.os}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {item.browser}
                          </div>
                        </td>

                        {/* Alamat IP */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <button
                            onClick={() => handleCopyIp(item.ipAddress)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono text-xs transition cursor-pointer"
                            title="Klik untuk salin IP"
                          >
                            <span>{item.ipAddress}</span>
                            {copiedIp === item.ipAddress ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              {t('loginHistory.successBadge', 'BERHASIL')}
                            </span>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                                {t('loginHistory.failedBadge', 'GAGAL')}
                              </span>
                              {item.failureReason && (
                                <div className="text-[11px] text-rose-600 max-w-[150px] truncate mt-0.5" title={item.failureReason}>
                                  {item.failureReason}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Detail Action */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => setActiveDetail(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                          >
                            <Info className="w-3.5 h-3.5 text-slate-500" />
                            <span>{t('loginHistory.detailsBtn', 'Rincian')}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Card Layout (Hidden on lg, visible on md/sm/xs) */}
            <div className="block lg:hidden divide-y divide-slate-100">
              {logs.map((item) => {
                const dt = formatDateTime(item.createdAt);
                const rel = formatRelativeTime(item.createdAt);
                const isSuccess = item.status === 'SUCCESS';

                return (
                  <div key={item.id} className="p-4 sm:p-5 space-y-3 hover:bg-slate-50/50 transition">
                    {/* Top Row: Status badge & timestamp */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isSuccess ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            {t('loginHistory.successBadge', 'BERHASIL')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                            {t('loginHistory.failedBadge', 'GAGAL')}
                          </span>
                        )}
                        {renderRoleBadge(item.userRole)}
                      </div>

                      <div className="text-right text-xs text-slate-500">
                        <span className="font-semibold text-slate-800">{dt.time}</span>
                        <span className="text-[11px] text-slate-400 block">{dt.date}</span>
                      </div>
                    </div>

                    {/* Middle Row: User & Tenant */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                          {item.userName ? item.userName.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-slate-900 leading-tight">
                            {item.userName}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">{item.userEmail}</div>
                        </div>
                      </div>

                      {item.tenantName && (
                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {item.tenantName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Failure reason callout if failed */}
                    {!isSuccess && item.failureReason && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{item.failureReason}</span>
                      </div>
                    )}

                    {/* Bottom Metadata & Action */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1">
                          {getDeviceIcon(item.device)}
                          <span>{item.device}</span>
                        </span>
                        <span>•</span>
                        <span>{item.os}</span>
                        <span>•</span>
                        <span>{item.browser}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyIp(item.ipAddress)}
                          className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
                        >
                          <span>{item.ipAddress}</span>
                          {copiedIp === item.ipAddress ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400" />
                          )}
                        </button>

                        <button
                          onClick={() => setActiveDetail(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                        >
                          <Info className="w-3 h-3 text-slate-500" />
                          <span>{t('loginHistory.detailsBtn', 'Rincian')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 7. Pagination Bar */}
            <div className="p-4 sm:px-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              {/* Left: showing count & limit selector */}
              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500">
                <span>
                  {t('loginHistory.showingCount', {
                    from: (page - 1) * limit + 1,
                    to: Math.min(page * limit, total),
                    total,
                  })}
                </span>

                <div className="flex items-center gap-1">
                  <span className="text-slate-400 hidden sm:inline">{t('loginHistory.perPage', 'Data per halaman:')}</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(parseInt(e.target.value, 10));
                      setPage(1);
                    }}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {/* Right: page navigation buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-slate-700"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && page > 3) {
                      pageNum = page - 2 + i;
                      if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition cursor-pointer ${
                          page === pageNum
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-slate-700"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 8. Technical Detail Modal */}
      {activeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <KeyRound className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {t('loginHistory.modalTitle', 'Rincian Percobaan Login')}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono">{activeDetail.id}</div>
                </div>
              </div>
              <button
                onClick={() => setActiveDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content - Structured metadata */}
            <div className="space-y-3.5 text-xs sm:text-sm">
              {/* Status & Timestamp */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-xs mb-1">{t('loginHistory.colStatus', 'Status')}</span>
                  {activeDetail.status === 'SUCCESS' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      {t('loginHistory.successBadge', 'BERHASIL')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                      {t('loginHistory.failedBadge', 'GAGAL')}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block text-xs mb-1">{t('loginHistory.colTime', 'Waktu Login')}</span>
                  <div className="font-semibold text-slate-900">
                    {new Date(activeDetail.createdAt).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Failure reason if any */}
              {activeDetail.failureReason && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-rose-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{t('loginHistory.failureReason', 'Penyebab Kegagalan')}:</span>
                  </div>
                  <p className="font-medium pl-5.5">{activeDetail.failureReason}</p>
                </div>
              )}

              {/* User & Role Details */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-xs">{t('loginHistory.colUser', 'Pengguna')}</span>
                  <div className="font-bold text-slate-900 mt-0.5">{activeDetail.userName}</div>
                  <div className="text-slate-500 text-xs">{activeDetail.userEmail}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">{t('loginHistory.colRole', 'Peran Akun')}</span>
                  <div className="mt-1">{renderRoleBadge(activeDetail.userRole)}</div>
                </div>
              </div>

              {/* Tenant Store */}
              {activeDetail.tenantName && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-xs">{t('loginHistory.colTenant', 'Tenant / Toko')}</span>
                    <div className="font-semibold text-slate-900 mt-0.5">{activeDetail.tenantName}</div>
                  </div>
                  {activeDetail.tenantId && (
                    <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {activeDetail.tenantId}
                    </span>
                  )}
                </div>
              )}

              {/* Device, OS, Browser, and IP */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block text-xs">{t('loginHistory.deviceType', 'Tipe Perangkat')}</span>
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900 mt-0.5">
                      {getDeviceIcon(activeDetail.device)}
                      <span>{activeDetail.device}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">{t('loginHistory.os', 'Sistem Operasi')}</span>
                    <div className="font-semibold text-slate-900 mt-0.5">{activeDetail.os}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                  <div>
                    <span className="text-slate-400 block text-xs">{t('loginHistory.browser', 'Browser')}</span>
                    <div className="font-semibold text-slate-900 mt-0.5">{activeDetail.browser}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">{t('loginHistory.colIp', 'Alamat IP')}</span>
                    <div className="font-mono text-xs font-bold text-slate-900 mt-0.5">{activeDetail.ipAddress}</div>
                  </div>
                </div>
              </div>

              {/* Full User-Agent String */}
              {activeDetail.userAgent && (
                <div>
                  <span className="text-slate-400 block text-xs mb-1 font-medium">
                    {t('loginHistory.fullUserAgent', 'User Agent Lengkap')}:
                  </span>
                  <div className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-xl break-all">
                    {activeDetail.userAgent}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => handleCopyJson(activeDetail)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                {copiedJson ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('loginHistory.copiedJson', 'Tersalin!')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('loginHistory.copyJson', 'Salin Data JSON')}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setActiveDetail(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition cursor-pointer"
              >
                {t('common.close', 'Tutup')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default LoginHistoryView;
