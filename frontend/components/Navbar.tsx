import React from 'react';
import {
  Menu,
  Store,
  Calculator,
  User,
  LogOut,
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
  ChevronRight,
  Boxes,
  FolderTree,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { NavTab } from './Sidebar';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './Theme/ThemeToggle';

export interface NavbarProps {
  onToggleSidebar: () => void;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onRequestLogout: () => void;
  isScrolled?: boolean;
}

const TAB_CONFIG: Record<NavTab, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  'admin-dashboard': { label: 'Dashboard Admin', icon: Shield },
  catalog: { label: 'Katalog Produk', icon: Package },
  categories: { label: 'Kategori', icon: Layers },
  'product-management': { label: 'Kelola Produk', icon: Boxes },
  'category-management': { label: 'Kelola Kategori', icon: FolderTree },
  pos: { label: 'Kasir (POS)', icon: Calculator },
  history: { label: 'Riwayat Transaksi', icon: Receipt },
  dashboard: { label: 'Laporan Toko', icon: BarChart3 },
  cashiers: { label: 'Staf Kasir', icon: Users2 },
  tenants: { label: 'Manajemen Tenant', icon: Building2 },
  'tenant-info': { label: 'Informasi Toko', icon: Store },
  'activity-log': { label: 'Log Aktivitas', icon: ClipboardList },
  'login-history': { label: 'Histori Login', icon: KeyRound },
  configuration: { label: 'Konfigurasi Sistem', icon: SlidersHorizontal },
  profile: { label: 'Profil Pengguna', icon: User },
};

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  currentTab,
  onSelectTab,
  onRequestLogout,
  isScrolled = false,
}) => {
  const { t } = useTranslation();
  const { user, tenant } = useAuthStore();
  const { getItemCount } = useCartStore();

  const cartItemCount = getItemCount();
  const currentTabInfo = TAB_CONFIG[currentTab] || { label: 'Dashboard', icon: Store };
  const TabIcon = currentTabInfo.icon;

  const roleBadge = () => {
    switch (user?.role) {
      case 'ADMIN':
        return {
          label: 'Super Admin',
          color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
        };
      case 'MANAGER':
        return {
          label: 'Manajer',
          color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
        };
      case 'CASHIER':
      default:
        return {
          label: 'Kasir',
          color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        };
    }
  };

  const badge = roleBadge();

  return (
    <header
      className={`sticky top-0 z-30 h-16 w-full flex items-center justify-between px-3 sm:px-6 transition-all duration-200 select-none ${
        isScrolled
          ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xs border-b border-slate-200/80 dark:border-slate-800/80'
          : 'bg-white/45 dark:bg-slate-950/45 backdrop-blur-md border-b border-slate-200/40 dark:border-slate-800/40'
      }`}
    >
      {/* 1. Left: Mobile Toggle, Brand & Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer shrink-0"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Store Brand / Current Page Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-theme-primary flex items-center justify-center text-white shadow-xs shrink-0">
            <TabIcon className="w-4 h-4" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                {currentTabInfo.label}
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md border text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/80 bg-slate-100/50 dark:bg-slate-800/50 shrink-0">
                {tenant?.name || 'KasirWarung'}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate hidden md:inline">
              Sistem POS & Inventaris KasirWarung
            </span>
          </div>
        </div>
      </div>

      {/* 2. Middle: Status & Quick Actions */}
      <div className="hidden md:flex items-center gap-2.5">
        {/* Quick POS Shortcut (visible when not on POS and user is not admin) */}
        {currentTab !== 'pos' && user?.role !== 'ADMIN' && (
          <button
            onClick={() => onSelectTab('pos')}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            title="Buka Kasir (POS)"
          >
            <Calculator className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
            <span>Kasir (POS)</span>
            {cartItemCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white font-mono">
                {cartItemCount}
              </span>
            )}
          </button>
        )}

        {/* Live POS / System Status */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 px-2.5 py-1.2 rounded-xl backdrop-blur-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-xs" />
          <span className="text-[11px]">Sistem Kasir Aktif</span>
        </div>
      </div>

      {/* 3. Right: Language, Theme, User Chip & Logout */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Language Selector */}
        <LanguageSelector variant="compact" />

        {/* Theme & Accent Color Toggle */}
        <ThemeToggle />

        <div className="h-5 w-px bg-slate-200/80 dark:bg-slate-700/80 mx-0.5 hidden sm:block" />

        {/* User Profile Chip */}
        <button
          onClick={() => onSelectTab('profile')}
          className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer text-left"
          title={`Profil Pengguna: ${user?.name || 'Kasir'} (${badge.label})`}
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 border border-slate-300/60 dark:border-slate-700/60">
            {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <div className="hidden sm:flex flex-col min-w-0">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[110px]">
              {user?.name || 'Pengguna'}
            </span>
            <span className={`text-[10px] font-semibold px-1 rounded-md border w-fit leading-tight mt-0.5 ${badge.color}`}>
              {badge.label}
            </span>
          </div>
        </button>

        {/* Quick Logout Button */}
        <button
          onClick={onRequestLogout}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          title={t('auth.logout', 'Keluar Akun')}
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
