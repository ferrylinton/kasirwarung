import React, { useState, useEffect } from 'react';
import { Search, ScanBarcode, ShoppingCart, Menu, Store, Shield, User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { LanguageSelector } from './LanguageSelector';

interface NavbarProps {
  onToggleSidebar: () => void;
  onNavigateToPOS: () => void;
  onNavigateToProfile?: () => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onNavigateToPOS,
  onNavigateToProfile,
  onSearchChange,
  searchQuery,
}) => {
  const { t, i18n } = useTranslation();
  const { user, tenant } = useAuthStore();
  const { getItemCount } = useCartStore();
  const itemCount = getItemCount();

  const [currentTime, setCurrentTime] = useState<string>('');

  const isEn = i18n.language && i18n.language.startsWith('en');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const locale = isEn ? 'en-US' : 'id-ID';
      const dateStr = now.toLocaleDateString(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      const timeStr = now.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      });
      setCurrentTime(`${dateStr} • ${timeStr} ${isEn ? '' : 'WIB'}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000 * 30);
    return () => clearInterval(timer);
  }, [isEn]);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return t('nav.roles.admin', 'Admin Global');
      case 'MANAGER':
        return t('nav.roles.manager', 'Manajer Toko');
      case 'CASHIER':
        return t('nav.roles.cashier', 'Kasir Utama');
      default:
        return t('nav.roles.staff', 'Staf Warung');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-3 md:px-6">
      {/* Left: Mobile hamburger & Global Fast Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('nav.searchPlaceholder', 'Cari produk cepat (nama sembako atau scan barcode)...')}
            className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden transition-all text-slate-800 placeholder:text-slate-400"
          />
          <div
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            title={t('nav.scanBarcode', 'Tekan F2 untuk Scan Barcode')}
          >
            <ScanBarcode className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Right Controls: Language Selector, Store status, Time, Cart button, User Profile */}
      <div className="flex items-center gap-2 sm:gap-3 pl-3">
        {/* Radix UI Select Language Selector */}
        <LanguageSelector variant="navbar" />

        {/* Toko Buka Status Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{t('nav.storeOpen', 'Toko Buka')}</span>
        </div>

        {/* Live Date / Time */}
        <div className="hidden md:block text-xs font-medium text-slate-600 tabular-nums">
          {currentTime}
        </div>

        {/* Pesanan Flyout Button */}
        <button
          onClick={onNavigateToPOS}
          className="relative flex items-center gap-2 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          <ShoppingCart className="w-4 h-4 text-emerald-600" />
          <span className="hidden xs:inline">{t('nav.orders', 'Pesanan')}</span>
          {itemCount > 0 && (
            <span className="bg-amber-500 text-white text-[11px] px-1.5 py-0.2 rounded-full font-mono">
              {itemCount}
            </span>
          )}
        </button>

        {/* User Profile Lockup */}
        <button
          type="button"
          onClick={onNavigateToProfile}
          className="flex items-center gap-2.5 pl-2 border-l border-slate-200 hover:opacity-85 transition-opacity cursor-pointer text-left"
          title={t('nav.profile', 'Profil Pengguna')}
        >
          <div className="w-8 h-8 rounded-full bg-linear-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 overflow-hidden ring-2 ring-emerald-500/20">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-800 leading-tight">
              {user?.name || 'Kasir'}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              {getRoleBadge(user?.role)}
            </div>
          </div>
        </button>
      </div>
    </header>
  );
};
