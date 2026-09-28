import React from 'react';
import { Search, ScanBarcode, ShoppingCart, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../store/cartStore';

interface NavbarProps {
  onToggleSidebar: () => void;
  onNavigateToPOS: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToConfiguration?: () => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onNavigateToPOS,
  onSearchChange,
  searchQuery,
}) => {
  const { t } = useTranslation();
  const { getItemCount } = useCartStore();
  const itemCount = getItemCount();

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 flex items-center justify-between px-3 md:px-6 transition-colors">
      {/* Left: Mobile hamburger & Global Fast Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('nav.searchPlaceholder', 'Cari produk cepat (nama sembako atau scan barcode)...')}
            className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-900 focus:border-theme-primary focus:outline-hidden transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <div
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            title={t('nav.scanBarcode', 'Tekan F2 untuk Scan Barcode')}
          >
            <ScanBarcode className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Right Controls: Cart / Pesanan Flyout button */}
      <div className="flex items-center gap-2 pl-2">
        <button
          onClick={onNavigateToPOS}
          className="relative flex items-center gap-2 py-1.5 px-3 bg-theme-light hover:opacity-90 border border-theme-border text-theme-text rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4 text-theme-primary" />
          <span className="hidden xs:inline">{t('nav.orders', 'Pesanan')}</span>
          {itemCount > 0 && (
            <span className="bg-amber-500 text-white text-[11px] px-1.5 py-0.2 rounded-full font-mono">
              {itemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
export default Navbar;
