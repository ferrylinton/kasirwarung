import React from 'react';
import { Menu, Store } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export interface NavbarProps {
  onToggleSidebar: () => void;
  onNavigateToPOS?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToConfiguration?: () => void;
  onNavigateToCatalog?: () => void;
  onSearchChange?: (query: string) => void;
  searchQuery?: string;
  showSearchBar?: boolean;
  currentTab?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { tenant } = useAuthStore();

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 flex items-center justify-between px-3 md:px-6 transition-colors">
      {/* Left: Mobile hamburger & Store Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-700 dark:bg-emerald-600 flex items-center justify-center text-white shadow-xs">
            <Store className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
              {tenant?.name || 'KasirWarung'}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Sistem Kasir & Toko Kelontong
            </span>
          </div>
        </div>
      </div>

      {/* Right: POS Status indicator */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 px-3 py-1.5 rounded-xl">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Sistem Kasir Aktif</span>
        </div>
      </div>
    </header>
  );
};
