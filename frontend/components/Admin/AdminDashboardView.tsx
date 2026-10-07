import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-date-picker';
import 'react-date-picker/dist/DatePicker.css';
import 'react-calendar/dist/Calendar.css';
import {
  TrendingUp,
  Building2,
  Package,
  ShoppingCart,
  Calendar as CalendarIcon,
  RotateCcw,
  Award,
  Store,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Layers,
  ChevronDown,
  Check,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { AdminDashboardData, Tenant } from '../../types';
import { useAuthStore } from '../../stores/authStore';

export interface AdminDashboardViewProps {
  onNavigateToRequests?: () => void;
}

type ValuePiece = Date | null;
type DatePickerValue = ValuePiece | [ValuePiece, ValuePiece];
type DatePreset = 'today' | 'week' | 'month' | '3months' | 'custom';

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onNavigateToRequests,
}) => {
  const { t } = useTranslation();
  const { token, user, refreshTokenIfExpiring } = useAuthStore();

  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('ALL');
  const [activePreset, setActivePreset] = useState<DatePreset>('today');
  const [selectedDate, setSelectedDate] = useState<DatePickerValue>(new Date());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate start & end Date based on preset
  const getDateRangeForPreset = (preset: DatePreset, customVal?: DatePickerValue): { startDate: string; endDate: string } => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    if (preset === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (preset === 'week') {
      // Current week (Monday to now)
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (preset === 'month') {
      // 1st of current month to now
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (preset === '3months') {
      // 3 months ago to now
      start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (preset === 'custom') {
      if (customVal instanceof Date) {
        start = new Date(customVal);
        start.setHours(0, 0, 0, 0);
        end = new Date(customVal);
        end.setHours(23, 59, 59, 999);
      } else if (Array.isArray(customVal) && customVal[0]) {
        start = new Date(customVal[0]);
        start.setHours(0, 0, 0, 0);
        end = customVal[1] ? new Date(customVal[1]) : new Date(customVal[0]);
        end.setHours(23, 59, 59, 999);
      }
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  };

  // Fetch Tenants for dropdown
  useEffect(() => {
    if (!token) return;
    fetch('/api/tenants', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (resData?.tenants) {
          setTenants(resData.tenants);
        }
      })
      .catch(() => {});
  }, [token]);

  // Fetch Admin Dashboard Data
  const fetchDashboardData = useCallback(
    async (presetToUse: DatePreset = activePreset, customVal: DatePickerValue = selectedDate) => {
      const activeToken = useAuthStore.getState().token || token;
      if (!activeToken) return;

      try {
        setLoading(true);
        setError(null);

        const { startDate, endDate } = getDateRangeForPreset(presetToUse, customVal);
        const params = new URLSearchParams({
          startDate,
          endDate,
          tenantId: selectedTenantId,
          preset: presetToUse,
        });

        let res = await fetch(`/api/admin/dashboard?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        });

        // Attempt automatic refresh if session expired or revoked
        if (res.status === 401 || res.status === 403) {
          try {
            await refreshTokenIfExpiring();
            const freshToken = useAuthStore.getState().token;
            if (freshToken && freshToken !== activeToken) {
              res = await fetch(`/api/admin/dashboard?${params.toString()}`, {
                headers: {
                  Authorization: `Bearer ${freshToken}`,
                },
              });
            }
          } catch {
            // continue with original response evaluation
          }
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const fallbackMsg = res.status === 403
            ? 'Akses ditolak. Anda memerlukan hak akses Administrator.'
            : 'Gagal memuat analitik dashboard admin';
          throw new Error(errData.message || fallbackMsg);
        }

        const resJson = await res.json();
        setData(resJson);
      } catch (err: any) {
        console.error('Error fetching admin dashboard:', err);
        setError(err.message || 'Terjadi kesalahan sistem saat mengambil data');
      } finally {
        setLoading(false);
      }
    },
    [token, selectedTenantId, activePreset, selectedDate, refreshTokenIfExpiring]
  );

  // Initial fetch and on dependencies change
  useEffect(() => {
    if (token) {
      fetchDashboardData(activePreset, selectedDate);
    }
  }, [token, selectedTenantId, activePreset]);

  // Handle Preset Button Click
  const handleSelectPreset = (preset: DatePreset) => {
    setActivePreset(preset);
    if (preset === 'today') {
      setSelectedDate(new Date());
    } else if (preset === 'week') {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      setSelectedDate(new Date(now.setDate(diff)));
    } else if (preset === 'month') {
      const now = new Date();
      setSelectedDate(new Date(now.getFullYear(), now.getMonth(), 1));
    } else if (preset === '3months') {
      const now = new Date();
      now.setMonth(now.getMonth() - 3);
      setSelectedDate(now);
    }
  };

  // Handle DatePicker Change
  const handleDateChange = (val: DatePickerValue) => {
    setSelectedDate(val);
    setActivePreset('custom');
    if (val) {
      fetchDashboardData('custom', val);
    }
  };

  // Helpers for currency & numbers
  const formatRupiah = (val: number = 0) => {
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  const getPresetLabel = (p: DatePreset) => {
    switch (p) {
      case 'today':
        return 'Hari Ini';
      case 'week':
        return 'Minggu Ini';
      case 'month':
        return 'Bulan Ini';
      case '3months':
        return '3 Bulan Terakhir';
      default:
        return 'Tanggal Kustom';
    }
  };

  const maxProductQty = data?.top10Products?.[0]?.totalQty || 1;

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 pt-16">
        <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Akses Khusus Administrator
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Halaman Dashboard Admin Global hanya dapat diakses oleh pengguna dengan peran Administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 pt-1">
          <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Dashboard Admin Global
          </h1>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
            Multi-Tenant
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => fetchDashboardData()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-xl transition cursor-pointer shadow-2xs disabled:opacity-50"
            title="Muat Ulang Data"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{t('common.refresh', 'Perbarui')}</span>
          </button>
        </div>
      </div>

      {/* Pending Tenant Deactivation Notice */}
      {tenants.filter((t) => t.deactivationRequest?.status === 'PENDING').length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Terdapat {tenants.filter((t) => t.deactivationRequest?.status === 'PENDING').length} Permohonan Penonaktifan Tenan
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-400">
                Manajer toko mengajukan penonaktifan akun warung dan menunggu evaluasi resmi dari Administrator.
              </div>
            </div>
          </div>
          {onNavigateToRequests && (
            <button
              type="button"
              onClick={onNavigateToRequests}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-center shadow-xs"
            >
              <span>Review Permohonan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 2. Filter Bar with Date Presets & react-date-picker */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5" />
              Periode:
            </span>
            <button
              onClick={() => handleSelectPreset('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activePreset === 'today'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => handleSelectPreset('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activePreset === 'week'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Minggu Ini
            </button>
            <button
              onClick={() => handleSelectPreset('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activePreset === 'month'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => handleSelectPreset('3months')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activePreset === '3months'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              3 Bulan Terakhir
            </button>
          </div>

          {/* react-date-picker Container & Tenant Selector */}
          <div className="flex flex-wrap items-center gap-3">
            {/* react-date-picker */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Pilih Tanggal:</span>
              <DatePicker
                onChange={handleDateChange}
                value={selectedDate}
                showLeadingZeros={true}
                format="dd/MM/yyyy"
                clearIcon={null}
                calendarIcon={<CalendarIcon className="w-3.5 h-3.5 text-emerald-600" />}
                dayPlaceholder="dd"
                monthPlaceholder="mm"
                yearPlaceholder="yyyy"
                className="text-xs"
              />
            </div>

            {/* Filter per Tenant using Radix UI Select */}
            <div className="min-w-[190px]">
              <Select.Root
                value={selectedTenantId}
                onValueChange={(val: string) => setSelectedTenantId(val)}
              >
                <Select.Trigger
                  className="w-full inline-flex items-center justify-between px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-750 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden transition cursor-pointer shadow-2xs gap-2"
                  aria-label="Filter per Tenant"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Store className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <Select.Value>
                      <span className="truncate">
                        {selectedTenantId === 'ALL'
                          ? '🏪 Semua Tenant Warung'
                          : tenants.find((t) => t.id === selectedTenantId)?.name || selectedTenantId}
                      </span>
                    </Select.Value>
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
                        value="ALL"
                        className="flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-800 dark:hover:text-emerald-300 data-[highlighted]:bg-emerald-50 dark:data-[highlighted]:bg-emerald-950/40 data-[highlighted]:text-emerald-800 dark:data-[highlighted]:text-emerald-300 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span>🏪 Semua Tenant Warung</span>
                        </div>
                        <Select.ItemIndicator className="text-emerald-600 dark:text-emerald-400 pl-2">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </Select.ItemIndicator>
                      </Select.Item>

                      {tenants.map((t) => (
                        <Select.Item
                          key={t.id}
                          value={t.id}
                          className="flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-800 dark:hover:text-emerald-300 data-[highlighted]:bg-emerald-50 dark:data-[highlighted]:bg-emerald-950/40 data-[highlighted]:text-emerald-800 dark:data-[highlighted]:text-emerald-300 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span>{t.name}</span>
                          </div>
                          <Select.ItemIndicator className="text-emerald-600 dark:text-emerald-400 pl-2">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
          </div>
        </div>

        {/* Active Range Information Badge */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span>Filter Aktif:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/40">
              {getPresetLabel(activePreset)}
            </span>
            {selectedTenantId !== 'ALL' && (
              <span className="font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                Toko: {tenants.find((t) => t.id === selectedTenantId)?.name || selectedTenantId}
              </span>
            )}
          </div>
          {data?.period?.startDate && (
            <span className="text-[11px] text-slate-400">
              Periode Data: {new Date(data.period.startDate).toLocaleDateString('id-ID')} - {new Date(data.period.endDate).toLocaleDateString('id-ID')}
            </span>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-700 dark:text-rose-300 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={() => fetchDashboardData()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold self-start sm:self-auto cursor-pointer transition shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Coba Lagi
          </button>
        </div>
      )}

      {/* 3. Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Omzet */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Omzet Global</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-2">
            {formatRupiah(data?.stats?.totalRevenue || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Rata-rata order: {formatRupiah(data?.stats?.averageOrderValue || 0)}</div>
        </div>

        {/* Total Transaksi */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Transaksi Selesai</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-2">
            {(data?.stats?.totalOrders || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Struk nota terverifikasi</div>
        </div>

        {/* Total Produk Terjual */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Produk Terjual (Unit)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-2">
            {(data?.stats?.totalProductsSold || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Total kuantitas barang</div>
        </div>

        {/* Tenant Aktif */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tenant Toko Aktif</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-2">
            {data?.stats?.activeTenantsCount || 0} / {data?.stats?.totalTenants || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Warung beroperasi pada periode ini</div>
        </div>
      </div>

      {/* 4. Section: Omzet di Setiap Tenant */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Omzet di Setiap Tenant
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Rincian pendapatan dan performa seluruh warung terdaftar
          </span>
        </div>

        {/* Tenant Breakdown Cards / Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data?.tenantsOmzet || []).map((t, idx) => (
            <div
              key={t.tenantId}
              className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-700 transition shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t.tenantName}</h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>

                {t.address && (
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{t.address}</p>
                )}

                {/* Numbers */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Omzet</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                      {formatRupiah(t.totalRevenue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Transaksi</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5">
                      {t.orderCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Item Terjual</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5">
                      {t.itemsSold}
                    </div>
                  </div>
                </div>

                {/* Progress bar of revenue contribution */}
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">Kontribusi Omzet</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{t.revenuePercentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(t.revenuePercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Top product for this tenant */}
              {t.topProduct && (
                <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="truncate">Produk Unggulan: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{t.topProduct.name}</strong></span>
                  <span className="shrink-0 text-emerald-600 font-medium ml-1">({t.topProduct.qty} terjual)</span>
                </div>
              )}
            </div>
          ))}

          {(!data?.tenantsOmzet || data.tenantsOmzet.length === 0) && (
            <div className="col-span-2 text-center py-8 text-slate-400 text-xs">
              Belum ada riwayat transaksi pada tenant untuk periode ini.
            </div>
          )}
        </div>
      </div>

      {/* 5. Section: 10 Produk Terlaris */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              10 Produk Terlaris
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Peringkat produk dengan volume penjualan tertinggi di seluruh tenant
          </span>
        </div>

        {/* Top 10 Products List / Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-2.5 px-3 w-14 text-center">Peringkat</th>
                <th className="py-2.5 px-3">Nama Produk</th>
                <th className="py-2.5 px-3">Kategori</th>
                <th className="py-2.5 px-3">Toko / Tenant</th>
                <th className="py-2.5 px-3 text-right">Volume Terjual</th>
                <th className="py-2.5 px-3 text-right">Total Pendapatan</th>
                <th className="py-2.5 px-3 text-right">Rata-rata Harga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(data?.top10Products || []).map((prod, idx) => {
                const rank = idx + 1;
                const percentOfMax = Math.round((prod.totalQty / maxProductQty) * 100);

                let rankBadge = (
                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center mx-auto text-xs">
                    {rank}
                  </span>
                );

                if (rank === 1) {
                  rankBadge = (
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-black flex items-center justify-center mx-auto text-xs shadow-xs">
                      🥇 1
                    </span>
                  );
                } else if (rank === 2) {
                  rankBadge = (
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 border border-slate-300 font-black flex items-center justify-center mx-auto text-xs">
                      🥈 2
                    </span>
                  );
                } else if (rank === 3) {
                  rankBadge = (
                    <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-800 dark:text-amber-300 border border-amber-600/30 font-black flex items-center justify-center mx-auto text-xs">
                      🥉 3
                    </span>
                  );
                }

                return (
                  <tr
                    key={prod.productId || idx}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-3 text-center">{rankBadge}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-100">
                      <div className="flex flex-col">
                        <span>{prod.name}</span>
                        {/* Progress Bar of volume */}
                        <div className="w-24 h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${percentOfMax}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {prod.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Store className="w-3 h-3 text-slate-400" />
                        {prod.tenantName || 'Semua Warung'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-800 dark:text-slate-100 font-mono">
                      {prod.totalQty.toLocaleString('id-ID')} unit
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatRupiah(prod.totalRevenue)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400 font-mono">
                      {formatRupiah(prod.averagePrice)}
                    </td>
                  </tr>
                );
              })}

              {(!data?.top10Products || data.top10Products.length === 0) && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    Belum ada data produk terlaris pada rentang tanggal ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
