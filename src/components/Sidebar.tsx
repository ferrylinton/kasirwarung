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
  User,
  ClipboardList,
  KeyRound,
  SlidersHorizontal,
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
  | 'activity-log'
  | 'login-history'
  | 'tenants'
  | 'configuration'
  | 'profile';

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

  interface MenuItem {
    id: NavTab;
    label: string;
    icon: React.ElementType;
    badge?: string;
    hasDot?: boolean;
    roles: string[];
  }

  interface MenuGroup {
    id: string;
    title: string;
    items: MenuItem[];
  }

  const menuGroups: MenuGroup[] = [
    {
      id: 'transactions',
      title: t('nav.groups.transactions', 'Transaksi & Kasir'),
      items: [
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
      ],
    },
    {
      id: 'inventory',
      title: t('nav.groups.inventory', 'Katalog & Produk'),
      items: [
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
      ],
    },
    {
      id: 'management',
      title: t('nav.groups.management', 'Manajemen & Analisis'),
      items: [
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
      ],
    },
    {
      id: 'audit',
      title: t('nav.groups.audit', 'Audit & Keamanan'),
      items: [
        {
          id: 'activity-log' as NavTab,
          label: t('nav.activityLog', 'Log Aktivitas'),
          icon: ClipboardList,
          roles: ['MANAGER'],
        },
        {
          id: 'login-history' as NavTab,
          label: t('nav.loginHistory', 'Histori Login'),
          icon: KeyRound,
          roles: ['ADMIN', 'MANAGER', 'CASHIER'],
        },
      ],
    },
    {
      id: 'preferences',
      title: t('nav.groups.preferences', 'Konfigurasi & Akun'),
      items: [
        {
          id: 'configuration' as NavTab,
          label: t('nav.configuration', 'Konfigurasi Sistem'),
          icon: SlidersHorizontal,
          roles: ['ADMIN', 'MANAGER', 'CASHIER'],
        },
        {
          id: 'profile' as NavTab,
          label: t('nav.profile', 'Profil Pengguna'),
          icon: User,
          roles: ['ADMIN', 'MANAGER', 'CASHIER'],
        },
      ],
    },
  ];

  const visibleGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={`h-full max-h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col min-h-0 transition-all duration-200 shrink-0 overflow-hidden select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Brand Header (Fixed at top) */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 z-10">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            {/* Basket logo with theme background */}
            <div className="w-9 h-9 rounded-xl btn-theme-primary flex items-center justify-center text-white shadow-xs shrink-0">
              <ShoppingBag className="w-5 h-5 text-amber-300" />
            </div>
            <div className="truncate">
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight truncate">
                {tenantName}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Toko Kelontong</div>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="w-full flex justify-center">
            <div className="w-9 h-9 rounded-xl btn-theme-primary flex items-center justify-center text-white shadow-xs">
              <ShoppingBag className="w-5 h-5 text-amber-300" />
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden md:block cursor-pointer"
          title={isCollapsed ? t('nav.expandMenu', 'Perluas Menu') : t('nav.collapseMenu', 'Perkecil Menu')}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Menu Section with Groups (Scrollable middle container) */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 space-y-3.5 custom-sidebar-scrollbar overscroll-contain">
        {visibleGroups.map((group, groupIdx) => (
          <div key={group.id} className="space-y-1">
            {!isCollapsed ? (
              <div className="px-3 pt-1 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {group.title}
              </div>
            ) : (
              groupIdx > 0 && <div className="border-t border-slate-100 dark:border-slate-800 my-2" />
            )}

            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'btn-theme-primary shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={item.label}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-current' : 'text-slate-400 dark:text-slate-400'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!isCollapsed && item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                        isActive ? 'bg-black/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
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
        ))}
      </div>

      {/* Bottom Section: Sync Status & Logout (Fixed at bottom) */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2 shrink-0 bg-white dark:bg-slate-900 z-10">
        {/* Multi-Tenant Indicator */}
        {!isCollapsed && role === 'ADMIN' && (
          <div className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl text-[11px] text-purple-800 dark:text-purple-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="font-semibold">{t('nav.multiTenantActive', 'Mode Multi-Tenant Aktif')}</span>
          </div>
        )}

        {/* Online Cloud Sync pill */}
        {!isCollapsed ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300">
            <div className="w-2 h-2 rounded-full bg-theme-primary animate-pulse shrink-0"></div>
            <div className="truncate flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{tenantName}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-theme-primary font-medium">
                <span>{t('nav.onlineCloudSync', 'Online Cloud Sync')}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center p-2 text-theme-primary" title={t('nav.onlineCloudSync', 'Online Cloud Sync')}>
            <div className="w-2.5 h-2.5 rounded-full bg-theme-primary animate-pulse"></div>
          </div>
        )}

        {/* Logout button */}
        <button
          onClick={onRequestLogout}
          className="w-full flex items-center gap-3 p-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
          title={t('nav.logout', 'Keluar Aplikasi')}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>{t('nav.logout', 'Keluar Aplikasi')}</span>}
        </button>
      </div>
    </aside>
  );
};
