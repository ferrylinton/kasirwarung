import React from 'react';
import {
  Package,
  Layers,
  Calculator,
  Receipt,
  BarChart3,
  Users2,
  Building2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  CloudCheck,
  ShieldCheck,
  Boxes,
  FolderTree,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';

export type NavTab =
  | 'catalog'
  | 'categories'
  | 'product-management'
  | 'category-management'
  | 'pos'
  | 'history'
  | 'dashboard'
  | 'cashiers'
  | 'tenants';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onRequestLogout: () => void;
  productCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  onRequestLogout,
  productCount,
}) => {
  const { t } = useTranslation();
  const { user, tenant } = useAuthStore();

  const tenantName = tenant?.name || 'Berkah Jaya';
  const role = user?.role || 'CASHIER';

  const menuItems = [
    {
      id: 'catalog' as NavTab,
      label: t('nav.catalog', 'Katalog Produk'),
      icon: Package,
      badge: `${productCount || 104}+`,
      roles: ['ADMIN', 'MANAGER', 'CASHIER'],
    },
    {
      id: 'product-management' as NavTab,
      label: t('nav.productManagement', 'Manajemen Produk'),
      icon: Boxes,
      roles: ['MANAGER'],
    },
    {
      id: 'category-management' as NavTab,
      label: t('nav.categoryManagement', 'Manajemen Kategori'),
      icon: FolderTree,
      roles: ['MANAGER'],
    },
    {
      id: 'categories' as NavTab,
      label: t('nav.categories', 'Kategori & Stok'),
      icon: Layers,
      roles: ['ADMIN', 'CASHIER'],
    },
    {
      id: 'pos' as NavTab,
      label: t('nav.pos', 'Kasir / Transaksi'),
      icon: Calculator,
      hasDot: true,
      roles: ['MANAGER', 'CASHIER'],
    },
    {
      id: 'history' as NavTab,
      label: t('nav.history', 'Riwayat Penjualan'),
      icon: Receipt,
      roles: ['ADMIN', 'MANAGER', 'CASHIER'],
    },
    {
      id: 'dashboard' as NavTab,
      label: t('nav.dashboard', 'Dashboard Statistik'),
      icon: BarChart3,
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      id: 'cashiers' as NavTab,
      label: t('nav.cashiers', 'Kelola Staf Kasir'),
      icon: Users2,
      roles: ['MANAGER'],
    },
    {
      id: 'tenants' as NavTab,
      label: t('nav.tenants', 'Manajemen Tenant'),
      icon: Building2,
      roles: ['ADMIN'],
    },
  ];

  const visibleItems = menuItems.filter((item) => item.roles.includes(role));

  return (
    <aside
      className={`bg-white border-r border-slate-200 flex flex-col justify-between transition-all duration-200 shrink-0 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Brand Section */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              {/* Basket logo with green leaf icon */}
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <ShoppingBag className="w-5 h-5 text-amber-300" />
              </div>
              <div className="truncate">
                <div className="font-bold text-sm text-slate-900 leading-tight truncate">
                  {tenantName}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">Toko Kelontong</div>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="w-full flex justify-center">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                <ShoppingBag className="w-5 h-5 text-amber-300" />
              </div>
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors hidden md:block"
            title={isCollapsed ? t('nav.expandMenu', 'Perluas Menu') : t('nav.collapseMenu', 'Perkecil Menu')}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Menu Section */}
        <div className="p-3 space-y-1">
          {!isCollapsed && (
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {t('nav.mainMenu', 'Menu Utama')}
            </div>
          )}

          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title={item.label}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      isActive ? 'bg-emerald-700/80 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {item.hasDot && (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-amber-300' : 'bg-amber-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Sync Status & Logout */}
      <div className="p-3 border-t border-slate-100 space-y-2">
        {/* Multi-Tenant Indicator */}
        {!isCollapsed && role === 'ADMIN' && (
          <div className="px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-xl text-[11px] text-purple-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
            <span className="font-semibold">{t('nav.multiTenantActive', 'Mode Multi-Tenant Aktif')}</span>
          </div>
        )}

        {/* Online Cloud Sync pill matching images */}
        {!isCollapsed ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl text-xs text-slate-600">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
            <div className="truncate flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 truncate">{tenantName}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-emerald-600 font-medium">
                <span>{t('nav.onlineCloudSync', 'Online Cloud Sync')}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center p-2 text-emerald-500" title={t('nav.onlineCloudSync', 'Online Cloud Sync')}>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
        )}

        {/* Logout button */}
        <button
          onClick={onRequestLogout}
          className="w-full flex items-center gap-3 p-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
          title={t('nav.logout', 'Keluar Aplikasi')}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>{t('nav.logout', 'Keluar Aplikasi')}</span>}
        </button>
      </div>
    </aside>
  );
};
