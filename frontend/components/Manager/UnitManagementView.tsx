import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Boxes,
  Droplets,
  Layers,
  HelpCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Store,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Product, CashierUnit, UnitCategory, UnitStats } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { ConfirmationModal } from '../Modals/ConfirmationModal';
import { UnitModal } from './UnitModal';
import { PageSizeSelect } from './PageSizeSelect';

interface UnitManagementViewProps {
  products: Product[];
  onRefreshProducts: () => void;
  onNavigateToProducts: () => void;
  onNavigateToCatalog?: () => void;
}

export const UnitManagementView: React.FC<UnitManagementViewProps> = ({
  products,
  onRefreshProducts,
  onNavigateToProducts,
  onNavigateToCatalog,
}) => {
  const { t } = useTranslation();
  const { user, tenant, token } = useAuthStore();
  const { addToast } = useToastStore();

  const isManager = user?.role === 'MANAGER';

  // Search & Filtering
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'name' | 'symbol' | 'productCount'>('productCount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Data & State
  const [units, setUnits] = useState<CashierUnit[]>([]);
  const [stats, setStats] = useState<UnitStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Modals
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<CashierUnit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<CashierUnit | null>(null);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);
  const [inspectingUnit, setInspectingUnit] = useState<CashierUnit | null>(null);

  // Fetch Units from API
  const fetchUnits = async () => {
    if (!token || !isManager) return;
    try {
      setLoading(true);
      const res = await fetch('/api/units', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUnits(data.units || []);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403) {
          console.warn('Unit access restricted to managers:', errData.message);
        }
      }
    } catch (err) {
      console.error('Failed to load units:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, [token, isManager, products]);

  // Handle Save (Create or Update)
  const handleSaveUnit = async (data: {
    name: string;
    symbol: string;
    category: UnitCategory;
    description: string;
    syncProducts?: boolean;
  }) => {
    if (!token) return;

    if (editingUnit) {
      // Update
      const res = await fetch(`/api/units/${editingUnit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || 'Gagal memperbarui satuan kasir.');
      }

      addToast({
        type: 'success',
        title: 'Satuan Berhasil Diperbarui',
        message: resData.message || `Satuan "${data.name}" (${data.symbol}) berhasil disimpan.`,
      });
    } else {
      // Create
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || 'Gagal menambahkan satuan kasir.');
      }

      addToast({
        type: 'success',
        title: 'Satuan Baru Ditambahkan',
        message: resData.message || `Satuan "${data.name}" (${data.symbol}) siap digunakan.`,
      });
    }

    setEditingUnit(null);
    setIsUnitModalOpen(false);
    fetchUnits();
    onRefreshProducts();
  };

  // Handle Delete Unit
  const handleDeleteUnit = async (force: boolean = false) => {
    if (!deletingUnit || !token) return;

    try {
      const res = await fetch(`/api/units/${deletingUnit.id}${force ? '?force=true' : ''}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.inUse && !force) {
          // Trigger forced delete warning
          addToast({
            type: 'warning',
            title: 'Satuan Masih Digunakan',
            message: data.message,
            duration: 5000,
          });
          return;
        }
        throw new Error(data.message || 'Gagal menghapus satuan kasir.');
      }

      addToast({
        type: 'success',
        title: 'Satuan Dihapus',
        message: data.message || `Satuan "${deletingUnit.name}" berhasil dihapus.`,
      });

      setDeletingUnit(null);
      fetchUnits();
      onRefreshProducts();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Gagal Menghapus Satuan',
        message: err.message,
      });
    }
  };

  // Handle Seed Defaults
  const handleSeedDefaults = async () => {
    if (!token) return;

    try {
      const res = await fetch('/api/units/seed-defaults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ overwrite: false }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal memuat satuan standar.');
      }

      addToast({
        type: 'success',
        title: 'Satuan Standar Dimuat',
        message: data.message || 'Satuan kasir kelontong standar berhasil ditambahkan.',
      });

      setShowSeedConfirm(false);
      fetchUnits();
      onRefreshProducts();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Gagal Memuat Satuan Standar',
        message: err.message,
      });
    }
  };

  // Category Badges & Helpers
  const getCategoryMeta = (cat: UnitCategory | string) => {
    switch (cat) {
      case 'ECERAN':
        return {
          label: 'Eceran Satuan',
          badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          icon: Package,
        };
      case 'KEMASAN':
        return {
          label: 'Kemasan / Grosir',
          badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          icon: Boxes,
        };
      case 'TIMBANGAN':
        return {
          label: 'Timbangan / Berat',
          badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          icon: Scale,
        };
      case 'VOLUME':
        return {
          label: 'Volume / Cairan',
          badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
          icon: Droplets,
        };
      case 'IKATAN':
        return {
          label: 'Ikatan / Sayur',
          badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          icon: Layers,
        };
      default:
        return {
          label: 'Lainnya',
          badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          icon: HelpCircle,
        };
    }
  };

  // Filtered & Sorted Units
  const filteredUnits = useMemo(() => {
    return units
      .filter((u) => {
        const matchesCategory = selectedCategory === 'ALL' || u.category === selectedCategory;
        const matchesSearch =
          !search ||
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.symbol.toLowerCase().includes(search.toLowerCase()) ||
          (u.description && u.description.toLowerCase().includes(search.toLowerCase()));
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'productCount') {
          valA = a.productCount || 0;
          valB = b.productCount || 0;
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [units, search, selectedCategory, sortField, sortOrder]);

  // Pagination Calculation
  const totalPages = Math.ceil(filteredUnits.length / pageSize) || 1;
  const paginatedUnits = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUnits.slice(start, start + pageSize);
  }, [filteredUnits, currentPage, pageSize]);

  // Handle Sort Toggle
  const handleSort = (field: 'name' | 'symbol' | 'productCount') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'productCount' ? 'desc' : 'asc');
    }
  };

  // If user is not manager, display strict RBAC Forbidden Screen
  if (!isManager) {
    return (
      <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
              Akses Khusus Manager Toko
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Halaman <strong>Daftar Istilah Satuan Kasir</strong> hanya dapat diakses oleh pengguna dengan role <strong>MANAGER</strong> untuk toko/tenant bersangkutan. Akun Anda saat ini memiliki role <strong>{user?.role || 'GUEST'}</strong>.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            {onNavigateToCatalog && (
              <button
                type="button"
                onClick={onNavigateToCatalog}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold btn-theme-primary text-white shadow-xs cursor-pointer"
              >
                Kembali ke Katalog Produk
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-theme-light text-theme-primary flex items-center justify-center shrink-0 shadow-2xs">
            <Scale className="w-6 h-6 stroke-[2.25]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Daftar Istilah Satuan Kasir
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Khusus Manager
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              <span>Toko: <strong>{tenant?.name || 'KasirWarung'}</strong></span>
              <span>•</span>
              <span>Kelola singkatan & istilah satuan kasir</span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onNavigateToProducts}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors shadow-2xs cursor-pointer"
            title="Buka Manajemen Produk"
          >
            <Package className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Kelola Produk</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSeedConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/80 rounded-xl transition-colors shadow-2xs cursor-pointer"
            title="Muat atau lengkapi satuan standar toko kelontong"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Muat Satuan Standar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingUnit(null);
              setIsUnitModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold btn-theme-primary text-white rounded-xl shadow-xs transition-transform hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Satuan Baru</span>
          </button>
        </div>
      </div>

      {/* 2. KPI / Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Satuan */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              Total Istilah Satuan
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-1">
              {stats?.totalUnits || units.length}
            </div>
            <span className="text-[11px] text-slate-400">Terdaftar di toko</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-theme-light text-theme-primary flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5" />
          </div>
        </div>

        {/* Eceran Satuan */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              Satuan Eceran
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              {stats?.eceranCount ?? units.filter((u) => u.category === 'ECERAN').length}
            </div>
            <span className="text-[11px] text-slate-400">pcs, bks, sachet, butir</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Kemasan & Grosir */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              Kemasan / Grosir
            </span>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono mt-1">
              {stats?.kemasanCount ?? units.filter((u) => u.category === 'KEMASAN').length}
            </div>
            <span className="text-[11px] text-slate-400">dus, renceng, karung, slop</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* Timbangan & Volume */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              Timbangan & Cairan
            </span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
              {(stats?.timbanganCount || 0) + (stats?.volumeCount || 0) ||
                units.filter((u) => u.category === 'TIMBANGAN' || u.category === 'VOLUME').length}
            </div>
            <span className="text-[11px] text-slate-400">kg, gr, ons, liter, botol</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Droplets className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Toolbar: Search, Category Filter Tabs & Sorting */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3.5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama satuan atau simbol (misal: bks, kg, dus)..."
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-theme-primary focus:outline-hidden focus:ring-2 focus:ring-[var(--theme-ring)] transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Toolbar Controls: Sort & Page Size */}
          <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <span className="hidden sm:inline">Urutkan:</span>
              <select
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-') as [any, any];
                  setSortField(field);
                  setSortOrder(order);
                }}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:border-theme-primary focus:outline-hidden cursor-pointer shadow-2xs"
              >
                <option value="productCount-desc">Terbanyak Dipakai Produk</option>
                <option value="productCount-asc">Paling Sedikit Dipakai</option>
                <option value="name-asc">Nama Satuan (A-Z)</option>
                <option value="name-desc">Nama Satuan (Z-A)</option>
                <option value="symbol-asc">Simbol Kasir (A-Z)</option>
              </select>
            </div>

            <PageSizeSelect
              value={pageSize}
              onChange={(newSize: number) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              options={[10, 20, 50]}
            />
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          {[
            { id: 'ALL', label: 'Semua Kategori', count: units.length },
            { id: 'ECERAN', label: 'Eceran Satuan', count: units.filter((u) => u.category === 'ECERAN').length },
            { id: 'KEMASAN', label: 'Kemasan / Grosir', count: units.filter((u) => u.category === 'KEMASAN').length },
            { id: 'TIMBANGAN', label: 'Timbangan / Berat', count: units.filter((u) => u.category === 'TIMBANGAN').length },
            { id: 'VOLUME', label: 'Volume / Cairan', count: units.filter((u) => u.category === 'VOLUME').length },
            { id: 'IKATAN', label: 'Ikatan / Sayur', count: units.filter((u) => u.category === 'IKATAN').length },
            { id: 'LAINNYA', label: 'Lainnya', count: units.filter((u) => u.category === 'LAINNYA').length },
          ].map((tab) => {
            const isSelected = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'btn-theme-primary text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Units Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Istilah & Simbol Kasir</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Keterangan / Penggunaan</th>
                <th
                  onClick={() => handleSort('productCount')}
                  className="py-3.5 px-4 text-center cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Produk Terkait</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">Memuat daftar istilah satuan kasir...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedUnits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Tidak Ada Istilah Satuan Ditemukan
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      {search || selectedCategory !== 'ALL'
                        ? 'Tidak ada satuan yang cocok dengan kata kunci atau filter yang dipilih.'
                        : 'Belum ada satuan kasir yang terdaftar untuk toko Anda.'}
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSearch('');
                          setSelectedCategory('ALL');
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                      >
                        Reset Filter
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSeedConfirm(true)}
                        className="px-3 py-1.5 rounded-xl btn-theme-primary text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Muat Satuan Standar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUnits.map((u) => {
                  const catMeta = getCategoryMeta(u.category);
                  const CatIcon = catMeta.icon;
                  const isUsageActive = (u.productCount || 0) > 0;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors group"
                    >
                      {/* Name & Symbol */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-300 group-hover:border-theme-primary transition-colors">
                            <Tag className="w-3.5 h-3.5 text-theme-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                                {u.name}
                              </span>
                              <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-theme-light text-theme-primary border border-theme-border shadow-2xs">
                                {u.symbol}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono block sm:hidden mt-0.5">
                              {catMeta.label}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${catMeta.badge}`}
                        >
                          <CatIcon className="w-3 h-3 shrink-0" />
                          <span>{catMeta.label}</span>
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 hidden md:table-cell">
                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md line-clamp-2">
                          {u.description || <span className="italic text-slate-400">Tidak ada keterangan</span>}
                        </p>
                      </td>

                      {/* Product Usage Count */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setInspectingUnit(u)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                            isUsageActive
                              ? 'bg-slate-100 hover:bg-theme-light dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 hover:text-theme-text dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                              : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 border border-transparent'
                          }`}
                          title="Klik untuk melihat produk yang memakai satuan ini"
                        >
                          <span>{u.productCount || 0}</span>
                          <span className="text-[10px] font-normal font-sans">produk</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUnit(u);
                              setIsUnitModalOpen(true);
                            }}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-theme-primary text-slate-600 dark:text-slate-300 hover:text-theme-primary hover:bg-theme-light transition-colors cursor-pointer"
                            title="Edit istilah satuan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingUnit(u)}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-400 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Hapus satuan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredUnits.length > 0 && (
          <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
            <div>
              Menampilkan <strong>{(currentPage - 1) * pageSize + 1}</strong> -{' '}
              <strong>{Math.min(currentPage * pageSize, filteredUnits.length)}</strong> dari{' '}
              <strong>{filteredUnits.length}</strong> satuan kasir
            </div>

            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer"
                title="Halaman sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 font-mono font-semibold">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer"
                title="Halaman berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Add / Edit Unit Modal */}
      <UnitModal
        isOpen={isUnitModalOpen}
        unit={editingUnit}
        onClose={() => {
          setIsUnitModalOpen(false);
          setEditingUnit(null);
        }}
        onSubmit={handleSaveUnit}
      />

      {/* 6. Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deletingUnit)}
        type="DELETE"
        isDestructive={true}
        title={`Hapus Satuan "${deletingUnit?.name}" (${deletingUnit?.symbol})?`}
        description={
          (deletingUnit?.productCount || 0) > 0
            ? `Perhatian: Terdapat ${deletingUnit?.productCount} produk aktif yang saat ini memakai satuan "${deletingUnit?.symbol}". Jika Anda tetap menghapusnya, produk tersebut tidak akan terhapus namun satuan kasirnya perlu diperbarui manual.`
            : `Apakah Anda yakin ingin menghapus istilah satuan "${deletingUnit?.name}" (${deletingUnit?.symbol}) dari daftar kasir toko? Tindakan ini tidak dapat dibatalkan.`
        }
        confirmText={(deletingUnit?.productCount || 0) > 0 ? 'Tetap Hapus Satuan Ini' : 'Ya, Hapus Satuan'}
        cancelText="Batal"
        onConfirm={() => handleDeleteUnit(true)}
        onCancel={() => setDeletingUnit(null)}
      />

      {/* 7. Seed Defaults Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSeedConfirm}
        type="CUSTOM"
        title="Muat Satuan Standar Kasir Kelontong?"
        description="Aksi ini akan melengkapi toko Anda dengan 18 istilah satuan kasir standar Indonesia (pcs, bks, sachet, renceng, dus, karung, slop, kg, liter, dll) tanpa menghapus satuan kustom yang sudah ada."
        confirmText="Ya, Muat Satuan Standar"
        cancelText="Batal"
        onConfirm={handleSeedDefaults}
        onCancel={() => setShowSeedConfirm(false)}
      />

      {/* 8. Inspect Unit Products Modal */}
      {inspectingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 transition-colors my-8">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-theme-light text-theme-primary flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Produk Menggunakan Satuan &quot;{inspectingUnit.name}&quot;
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    Simbol kasir: <strong>{inspectingUnit.symbol}</strong> • {inspectingUnit.productCount || 0} produk terdaftar
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingUnit(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
              {products.filter(
                (p) =>
                  p.unit?.trim().toLowerCase() === inspectingUnit.symbol.toLowerCase() ||
                  p.unit?.trim().toLowerCase() === inspectingUnit.name.toLowerCase()
              ).length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Belum ada produk aktif yang memakai satuan &quot;{inspectingUnit.symbol}&quot;.
                </div>
              ) : (
                products
                  .filter(
                    (p) =>
                      p.unit?.trim().toLowerCase() === inspectingUnit.symbol.toLowerCase() ||
                      p.unit?.trim().toLowerCase() === inspectingUnit.name.toLowerCase()
                  )
                  .map((p) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {p.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          SKU: {p.sku} • {p.category}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 block">
                          Rp {p.price.toLocaleString('id-ID')}
                        </span>
                        <span className="text-[11px] text-theme-primary font-mono font-semibold">
                          Stok: {p.stock} {p.unit}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setInspectingUnit(null);
                  onNavigateToProducts();
                }}
                className="text-xs font-bold text-theme-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Buka di Manajemen Produk</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setInspectingUnit(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
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
