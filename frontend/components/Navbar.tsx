import React from 'react';
import {
  Menu,
  Store,
  ShoppingCart,
  User,
  Package,
  Layers,
  Receipt,
  BarChart3,
  Users2,
  Building2,
  Shield,
  ClipboardList,
  KeyRound,
  SlidersHorizontal,
  Boxes,
  FolderTree,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { NavTab } from './Sidebar';

export interface NavbarProps {
  onToggleSidebar: () => void;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onRequestLogout?: () => void;
  isScrolled?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  currentTab,
  onSelectTab,
  isScrolled = false,
}) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { getItemCount, getTotal } = useCartStore();

  const tabConfig: Record<NavTab, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
    'admin-dashboard': { label: t('nav.adminDashboard', 'Dashboard Admin'), icon: Shield },
    catalog: { label: t('nav.catalog', 'Katalog Produk'), icon: Package },
    categories: { label: t('nav.categories', 'Kategori & Stok'), icon: Layers },
    'product-management': { label: t('nav.productManagement', 'Manajemen Produk'), icon: Boxes },
    'category-management': { label: t('nav.categoryManagement', 'Manajemen Kategori'), icon: FolderTree },
    'unit-management': { label: t('nav.unitManagement', 'Istilah Satuan Kasir'), icon: Scale },
    pos: { label: t('nav.pos', 'Keranjang'), icon: ShoppingCart },
    history: { label: t('nav.history', 'Riwayat Penjualan'), icon: Receipt },
    dashboard: { label: t('nav.dashboard', 'Dashboard Statistik'), icon: BarChart3 },
    cashiers: { label: t('nav.cashiers', 'Kelola Staf Kasir'), icon: Users2 },
    tenants: { label: t('nav.tenants', 'Manajemen Tenant'), icon: Building2 },
    'tenant-requests': { label: t('nav.tenantRequests', 'Review Nonaktif Tenan'), icon: ShieldAlert },
    'user-management': { label: t('nav.userManagement', 'Manajemen User'), icon: Users2 },
    'tenant-info': { label: t('nav.tenantInfo', 'Informasi Tenant'), icon: Store },
    'activity-log': { label: t('nav.activityLog', 'Log Aktivitas'), icon: ClipboardList },
    'login-history': { label: t('nav.loginHistory', 'Histori Login'), icon: KeyRound },
    configuration: { label: t('nav.configuration', 'Konfigurasi Sistem'), icon: SlidersHorizontal },
    profile: { label: t('nav.profile', 'Profil Pengguna'), icon: User },
  };

  const cartItemCount = getItemCount();
  const cartTotal = getTotal();
  const currentTabInfo = tabConfig[currentTab] || { label: t('nav.dashboard', 'Dashboard'), icon: Store };

  return (
    <header
      className={`sticky top-0 z-30 h-16 w-full flex items-center justify-between px-3 sm:px-6 py-3 transition-all duration-200 select-none ${
        isScrolled
          ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xs border-b border-slate-200/80 dark:border-slate-800/80'
          : 'bg-white/45 dark:bg-slate-950/45 backdrop-blur-md border-b border-slate-200/40 dark:border-slate-800/40'
      }`}
    >

      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer shrink-0"
          aria-label={t('nav.openMenu', 'Buka Menu')}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Current Page Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                {currentTabInfo.label}
              </span>
            </div>
          </div>
        </div>
      </div>


      <div className="flex items-center gap-2.5">
        {/* Tombol Keranjang (View Cart Button) */}
        {user?.role !== 'ADMIN' && (
          <button
            onClick={() => onSelectTab('pos')}
            className={`group flex items-center gap-2.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl transition-all cursor-pointer border shadow-sm hover:shadow-md hover:scale-102 active:scale-98 select-none ${
              currentTab === 'pos'
                ? 'bg-emerald-800 text-white border-emerald-700 ring-2 ring-emerald-500/30'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-600/50'
            }`}
            title={t('nav.openCartTooltip', 'Buka Keranjang / Kasir')}
          >
            <div className="relative flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-white transition-transform group-hover:scale-110" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2.5 min-w-[17px] h-[17px] flex items-center justify-center px-1 text-[9px] font-bold font-mono bg-amber-400 text-slate-950 rounded-full shadow-xs">
                  {cartItemCount}
                </span>
              )}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold leading-tight flex items-center gap-1.5">
                <span>{t('nav.pos', 'Keranjang')}</span>
              </span>
              {cartTotal > 0 && (
                <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-emerald-100 leading-tight">
                  Rp {cartTotal.toLocaleString('id-ID')}
                </span>
              )}
            </div>
          </button>
        )}
      </div>
    </header>
  );
};

export default Navbar;
