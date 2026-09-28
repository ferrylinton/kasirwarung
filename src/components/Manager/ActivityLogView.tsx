import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-date-picker';
import 'react-date-picker/dist/DatePicker.css';
import 'react-calendar/dist/Calendar.css';
import {
  ClipboardList,
  Search,
  Calendar as CalendarIcon,
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
  Clock,
  User,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';
import { ActivityLog, ActivityModule, ActivityLogResponse } from '../../types';
import { useAuthStore } from '../../store/authStore';

type ValuePiece = Date | null;
type DatePickerValue = ValuePiece | [ValuePiece, ValuePiece];

export const ActivityLogView: React.FC = () => {
  const { t } = useTranslation();
  const { token, user } = useAuthStore();

  // State
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedModule, setSelectedModule] = useState<'ALL' | ActivityModule>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<DatePickerValue>(null);
  const [activeDatePreset, setActiveDatePreset] = useState<'all' | 'today' | 'yesterday' | '7days' | 'custom'>('all');

  // Detail Modal
  const [activeLogDetail, setActiveLogDetail] = useState<ActivityLog | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      if (selectedModule !== 'ALL') {
        params.append('module', selectedModule);
      }

      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }

      // Handle date filtering
      if (selectedDate instanceof Date) {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        params.append('startDate', dateStr);
        params.append('endDate', dateStr);
      } else if (Array.isArray(selectedDate)) {
        if (selectedDate[0] instanceof Date) {
          const s = selectedDate[0];
          params.append('startDate', `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`);
        }
        if (selectedDate[1] instanceof Date) {
          const e = selectedDate[1];
          params.append('endDate', `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`);
        }
      }

      const res = await fetch(`/api/activity-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept-Language': 'id',
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
  }, [token, page, limit, selectedModule, searchQuery, selectedDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filter changes
  const handleModuleChange = (mod: 'ALL' | ActivityModule) => {
    setSelectedModule(mod);
    setPage(1);
  };

  const handleDateChange = (val: DatePickerValue) => {
    setSelectedDate(val);
    setActiveDatePreset(val ? 'custom' : 'all');
    setPage(1);
  };

  const handleApplyPreset = (preset: 'all' | 'today' | 'yesterday' | '7days') => {
    setActiveDatePreset(preset);
    setPage(1);

    if (preset === 'all') {
      setSelectedDate(null);
    } else if (preset === 'today') {
      setSelectedDate(new Date());
    } else if (preset === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      setSelectedDate(yesterday);
    } else if (preset === '7days') {
      // Set to today, backend can do range or user can inspect recent
      setSelectedDate(null);
      // For quick 7-days filter we can leave date null and search recent or custom
    }
  };

  const handleResetFilters = () => {
    setSelectedModule('ALL');
    setSearchQuery('');
    setSelectedDate(null);
    setActiveDatePreset('all');
    setPage(1);
  };

  const copyLogJson = () => {
    if (!activeLogDetail) return;
    navigator.clipboard.writeText(JSON.stringify(activeLogDetail, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Helper formatting
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const getModuleBadge = (module: ActivityModule) => {
    switch (module) {
      case 'PRODUCT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Boxes className="w-3 h-3" />
            {t('activityLog.moduleProduct', 'Produk')}
          </span>
        );
      case 'CATEGORY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800 border border-sky-200">
            <FolderTree className="w-3 h-3" />
            {t('activityLog.moduleCategory', 'Kategori')}
          </span>
        );
      case 'CASHIER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
            <Users2 className="w-3 h-3" />
            {t('activityLog.moduleCashier', 'Staf Kasir')}
          </span>
        );
      default:
        return null;
    }
  };

  const getActionBadge = (action: string) => {
    if (action.startsWith('CREATE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          <PlusCircle className="w-3 h-3 text-emerald-600" />
          {t(`activityLog.actions.${action}`, 'Tambah')}
        </span>
      );
    }
    if (action.startsWith('UPDATE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
          <Pencil className="w-3 h-3 text-amber-600" />
          {t(`activityLog.actions.${action}`, 'Ubah')}
        </span>
      );
    }
    if (action.startsWith('DELETE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
          <Trash2 className="w-3 h-3 text-rose-600" />
          {t(`activityLog.actions.${action}`, 'Hapus')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
        {action}
      </span>
    );
  };

  // Start & end calculation for pagination
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 shadow-xs">
            <ClipboardList className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {t('activityLog.title', 'Log Aktivitas Toko')}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
                <ShieldCheck className="w-3 h-3 text-emerald-700" />
                Role: {user?.role || 'MANAGER'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {t('activityLog.subtitle', 'Audit lengkap seluruh riwayat aksi manajemen produk, kategori, dan staf kasir.')}
            </p>
          </div>
        </div>

        {/* Quick Refresh Button */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
            title="Muat Ulang Data"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden sm:inline">{t('common.refresh', 'Perbarui')}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Top: Module Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none border-b border-slate-100 pb-3">
          <button
            onClick={() => handleModuleChange('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedModule === 'ALL'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('activityLog.moduleAll', 'Semua Modul')}
          </button>
          <button
            onClick={() => handleModuleChange('PRODUCT')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedModule === 'PRODUCT'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4" />
            {t('activityLog.moduleProduct', 'Manajemen Produk')}
          </button>
          <button
            onClick={() => handleModuleChange('CATEGORY')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedModule === 'CATEGORY'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            {t('activityLog.moduleCategory', 'Manajemen Kategori')}
          </button>
          <button
            onClick={() => handleModuleChange('CASHIER')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedModule === 'CASHIER'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users2 className="w-4 h-4" />
            {t('activityLog.moduleCashier', 'Kelola Staf Kasir')}
          </button>
        </div>

        {/* Bottom Filter Controls: Search & React Date Picker */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
          {/* Keyword Search Input */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder={t('activityLog.searchPlaceholder', 'Cari deskripsi aktivitas, nama staf, aksi...')}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Date Picker using react-date-picker */}
          <div className="md:col-span-4 flex items-center gap-2">
            <div className="w-full">
              <DatePicker
                onChange={handleDateChange}
                value={selectedDate}
                format="dd/MM/yyyy"
                clearIcon={<X className="w-4 h-4 text-slate-400 hover:text-slate-700" />}
                calendarIcon={<CalendarIcon className="w-4 h-4 text-slate-500" />}
                dayPlaceholder="dd"
                monthPlaceholder="mm"
                yearPlaceholder="yyyy"
                className="w-full text-sm"
              />
            </div>
          </div>

          {/* Quick Clear / Reset Filters */}
          <div className="md:col-span-2 flex items-center justify-end">
            {(selectedModule !== 'ALL' || searchQuery || selectedDate) && (
              <button
                onClick={handleResetFilters}
                className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('activityLog.clearFilter', 'Reset Filter')}
              </button>
            )}
          </div>
        </div>

        {/* Quick Date Presets Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-400 font-medium">{t('activityLog.filterDate', 'Filter Tanggal')}:</span>
          <button
            onClick={() => handleApplyPreset('all')}
            className={`px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
              activeDatePreset === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('activityLog.allDates', 'Semua')}
          </button>
          <button
            onClick={() => handleApplyPreset('today')}
            className={`px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
              activeDatePreset === 'today'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('activityLog.today', 'Hari Ini')}
          </button>
          <button
            onClick={() => handleApplyPreset('yesterday')}
            className={`px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
              activeDatePreset === 'yesterday'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('activityLog.yesterday', 'Kemarin')}
          </button>
        </div>
      </div>

      {/* Main Content Area: Responsive Data Presentation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-100 text-sm text-rose-700 flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <RotateCcw className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-sm font-medium">{t('common.loading', 'Memuat log aktivitas...')}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && logs.length === 0 && (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <ClipboardList className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-700">
              {searchQuery || selectedModule !== 'ALL' || selectedDate
                ? t('activityLog.noLogsMatch', 'Tidak ada aktivitas yang sesuai dengan filter pencarian.')
                : t('activityLog.noLogs', 'Belum ada aktivitas yang tercatat.')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              {t('activityLog.noLogsDesc', 'Setiap penambahan, pengubahan, atau penghapusan data produk, kategori, dan staf kasir akan terekam di sini.')}
            </p>
            {(searchQuery || selectedModule !== 'ALL' || selectedDate) && (
              <button
                onClick={handleResetFilters}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('activityLog.clearFilter', 'Reset Filter')}
              </button>
            )}
          </div>
        )}

        {/* Desktop View: Full Data Table (Visible on lg and above) */}
        {!loading && logs.length > 0 && (
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">{t('activityLog.colTime', 'Waktu / Tanggal')}</th>
                  <th className="py-3.5 px-4">{t('activityLog.colUser', 'Pelaksana')}</th>
                  <th className="py-3.5 px-4">{t('activityLog.colModule', 'Modul')}</th>
                  <th className="py-3.5 px-4">{t('activityLog.colAction', 'Aksi')}</th>
                  <th className="py-3.5 px-4 min-w-[320px]">{t('activityLog.colDescription', 'Deskripsi Aktivitas')}</th>
                  <th className="py-3.5 px-4 text-center">{t('common.actions', 'Aksi')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition group">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(log.createdAt)}
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                          {log.userName ? log.userName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 text-xs leading-tight">
                            {log.userName || 'Pengguna'}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {log.userRole}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Module */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getModuleBadge(log.module)}
                    </td>

                    {/* Action Type */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-4 text-xs text-slate-700 leading-relaxed font-normal">
                      {log.description}
                    </td>

                    {/* Details Trigger */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => setActiveLogDetail(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                        title={t('activityLog.detailsBtn', 'Lihat Detail')}
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>{t('common.details', 'Detail')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tablet & Mobile View: Responsive Card Grid (Visible on md and below) */}
        {!loading && logs.length > 0 && (
          <div className="lg:hidden divide-y divide-slate-100">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-slate-50/70 transition space-y-3 cursor-pointer"
                onClick={() => setActiveLogDetail(log)}
              >
                {/* Header: Module + Action + Time */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {getModuleBadge(log.module)}
                    {getActionBadge(log.action)}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(log.createdAt)}
                  </div>
                </div>

                {/* Body: Description */}
                <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                  {log.description}
                </p>

                {/* Footer: Actor & Details Trigger */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100/80 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
                      {log.userName ? log.userName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="text-slate-600 font-medium text-xs truncate max-w-[140px] sm:max-w-[200px]">
                      {log.userName}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
                      {log.userRole}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveLogDetail(log);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>{t('common.details', 'Detail')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Section (Fully Responsive for Mobile, Tablet & Desktop) */}
        {!loading && logs.length > 0 && (
          <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            {/* Left: Summary and Limit Selector */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <span>
                {t('activityLog.showingLogs', {
                  start: startItem,
                  end: endItem,
                  total,
                  defaultValue: `Menampilkan ${startItem} - ${endItem} dari ${total} log`,
                })}
              </span>

              <div className="flex items-center gap-1.5">
                <span className="hidden md:inline">{t('activityLog.perPage', 'Per halaman')}:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Right: Pagination Controls */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-end">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('activityLog.prevPage', 'Sebelumnya')}</span>
              </button>

              {/* Numbered Page Buttons */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => {
                    const prevP = arr[idx - 1];
                    const showEllipsis = prevP && p - prevP > 1;

                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                        <button
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                            p === page
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium cursor-pointer"
              >
                <span className="hidden sm:inline">{t('activityLog.nextPage', 'Selanjutnya')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Activity Log Details Modal */}
      {activeLogDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {t('activityLog.modalDetailsTitle', 'Rincian Log Aktivitas')}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    ID: {activeLogDetail.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveLogDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs sm:text-sm">
              {/* Badges & Timestamp */}
              <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  {getModuleBadge(activeLogDetail.module)}
                  {getActionBadge(activeLogDetail.action)}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {formatDate(activeLogDetail.createdAt)}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  {t('activityLog.colDescription', 'Deskripsi Aktivitas')}
                </label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-medium leading-relaxed">
                  {activeLogDetail.description}
                </div>
              </div>

              {/* Metadata Key-Value Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-0.5">
                    <User className="w-3 h-3" />
                    {t('activityLog.colUser', 'Pelaksana')}
                  </div>
                  <div className="font-semibold text-slate-900 text-xs truncate">
                    {activeLogDetail.userName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    ID: {activeLogDetail.userId}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-0.5">
                    <ShieldCheck className="w-3 h-3" />
                    {t('activityLog.actorRole', 'Peran Akun')}
                  </div>
                  <div className="font-semibold text-slate-900 text-xs">
                    {activeLogDetail.userRole}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5" />
                    IP: {activeLogDetail.ipAddress || '127.0.0.1'}
                  </div>
                </div>
              </div>

              {/* Raw JSON Details Payload */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t('activityLog.rawPayload', 'Data Teknis JSON')}
                  </label>
                  <button
                    onClick={copyLogJson}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 transition cursor-pointer"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Salin JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-48 scrollbar-thin">
                  {JSON.stringify(activeLogDetail.details || {}, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveLogDetail(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer"
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
