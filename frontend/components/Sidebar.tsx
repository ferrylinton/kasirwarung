import React from 'react';
import {
  Package,
  Layers,
  Calculator,
  ShoppingCart,
  Receipt,
  BarChart3,
  Users2,
  Building2,
  Store,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Boxes,
  FolderTree,
  User,
  ClipboardList,
  KeyRound,
  SlidersHorizontal,
  Scale,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';

export type NavTab =
  | 'admin-dashboard'
  | 'catalog'
  | 'categories'
  | 'product-management'
  | 'category-management'
  | 'unit-management'
  | 'pos'
  | 'history'
  | 'dashboard'
  | 'cashiers'
  | 'tenants'
  | 'tenant-info'
  | 'activity-log'
  | 'login-history'
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
  const { savedOrders, getItemCount } = useCartStore();

  const cartItemCount = getItemCount();
  const savedOrdersCount = savedOrders?.length || 0;

  const tenantName = tenant?.name || 'Berkah Jaya';
  const role = user?.role || 'CASHIER';

  const userInitials = (user?.name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  const getRoleLabel = (r: string) => {
    switch (r) {
      case 'ADMIN':
        return t('nav.roles.admin', 'Admin Global');
      case 'MANAGER':
        return t('nav.roles.manager', 'Manajer Toko');
      case 'CASHIER':
        return t('nav.roles.cashier', 'Kasir');
      default:
        return r;
    }
  };

  const getRoleBadgeClass = (r: string) => {
    switch (r) {
      case 'ADMIN':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800/60';
      case 'MANAGER':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60';
      case 'CASHIER':
      default:
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/60';
    }
  };

  interface MenuItem {
    id: NavTab;
    label: string;
    icon: React.ElementType;
    badge?: string;
    secondaryBadge?: string;
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
          id: 'catalog' as NavTab,
          label: t('nav.catalog', 'Katalog Produk'),
          icon: Package,
          badge: `${productCount || 0}+`,
          roles: ['MANAGER', 'CASHIER'],
        },
        {
          id: 'pos' as NavTab,
          label: t('nav.pos', 'Keranjang'),
          icon: ShoppingCart,
          badge:
            cartItemCount > 0
              ? `${cartItemCount}`
              : savedOrdersCount > 0
              ? `${savedOrdersCount} hold`
              : undefined,
          secondaryBadge:
            cartItemCount > 0 && savedOrdersCount > 0
              ? `${savedOrdersCount} hold`
              : undefined,
          hasDot: cartItemCount > 0 || savedOrdersCount > 0,
          roles: ['MANAGER', 'CASHIER'],
        },
        {
          id: 'history' as NavTab,
          label: t('nav.history', 'Riwayat Penjualan'),
          icon: Receipt,
          roles: ['MANAGER', 'CASHIER'],
        },
        {
          id: 'dashboard' as NavTab,
          label: t('nav.dashboard', 'Dashboard Statistik'),
          icon: BarChart3,
          roles: ['MANAGER'],
        },
      ],
    },
    {
      id: 'management',
      title: t('nav.groups.management', 'Manajemen & Analisis'),
      items: [
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
          id: 'unit-management' as NavTab,
          label: t('nav.unitManagement', 'Istilah Satuan Kasir'),
          icon: Scale,
          roles: ['MANAGER'],
        },
        {
          id: 'cashiers' as NavTab,
          label: t('nav.cashiers', 'Kelola Staf Kasir'),
          icon: Users2,
          roles: ['MANAGER'],
        },
        {
          id: 'tenant-info' as NavTab,
          label: t('nav.tenantInfo', 'Tenant Info'),
          icon: Building2,
          roles: ['MANAGER'],
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
      id: 'admin',
      title: t('nav.groups.admin', 'Admin'),
      items: [
        {
          id: 'admin-dashboard' as NavTab,
          label: t('nav.adminDashboard', 'Dashboard Admin'),
          icon: BarChart3,
          roles: ['ADMIN'],
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
              const isPosItem = item.id === 'pos';

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
                    isActive
                      ? 'btn-theme-primary shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={
                    isPosItem && (cartItemCount > 0 || savedOrdersCount > 0)
                      ? `${item.label} (${cartItemCount} item di keranjang${
                          savedOrdersCount > 0 ? `, ${savedOrdersCount} pesanan tersimpan` : ''
                        })`
                      : item.label
                  }
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="relative shrink-0 flex items-center justify-center">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-current' : 'text-slate-400 dark:text-slate-400'}`} />
                      {/* Collapsed badge overlay for Keranjang */}
                      {isCollapsed && isPosItem && (cartItemCount > 0 || savedOrdersCount > 0) && (
                        <span
                          className={`absolute -top-1.5 -right-2 px-1 min-w-[16px] h-4 rounded-full text-[9px] font-mono font-bold flex items-center justify-center shadow-xs border ${
                            isActive
                              ? 'bg-amber-400 text-slate-950 border-amber-300'
                              : 'bg-emerald-600 text-white border-white dark:border-slate-900'
                          }`}
                        >
                          {cartItemCount > 0 ? cartItemCount : savedOrdersCount}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!isCollapsed && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold transition-colors ${
                            isPosItem && cartItemCount > 0
                              ? isActive
                                ? 'bg-black/25 text-white ring-1 ring-white/30'
                                : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60'
                              : isPosItem && savedOrdersCount > 0
                              ? isActive
                                ? 'bg-black/25 text-white ring-1 ring-white/30'
                                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60'
                              : isActive
                              ? 'bg-black/20 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {item.secondaryBadge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                            isActive
                              ? 'bg-amber-300/30 text-amber-100 border border-amber-200/40'
                              : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60'
                          }`}
                          title={`${savedOrdersCount} pesanan tersimpan (hold)`}
                        >
                          {item.secondaryBadge}
                        </span>
                      )}

                      {item.hasDot && !item.badge && (
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isActive ? 'bg-amber-300' : 'bg-amber-500'
                          }`}
                        />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Section: User Info & Logout (Fixed at bottom) */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2 shrink-0 bg-white dark:bg-slate-900 z-10">
        {/* User Profile Info Card */}
        {!isCollapsed ? (
          <div
            onClick={() => onSelectTab('profile')}
            className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
            title={`${user?.name || 'Pengguna'} (${getRoleLabel(role)}) - ${t('nav.profile', 'Profil Pengguna')}`}
          >
            <div className="w-8 h-8 rounded-lg bg-theme-light border border-theme-border text-theme-text font-bold text-xs flex items-center justify-center shrink-0 uppercase shadow-2xs">
              {userInitials}
            </div>
            <div className="truncate flex-1 min-w-0">
              <div className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate group-hover:text-theme-primary transition-colors">
                {user?.name || 'Pengguna'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${getRoleBadgeClass(
                    role
                  )}`}
                >
                  {getRoleLabel(role)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => onSelectTab('profile')}
              className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-theme-primary flex items-center justify-center text-xs font-bold text-theme-text dark:text-slate-200 hover:bg-theme-light transition-all cursor-pointer relative"
              title={`${user?.name || 'Pengguna'} (${getRoleLabel(role)})`}
            >
              {userInitials}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                  role === 'ADMIN'
                    ? 'bg-purple-500'
                    : role === 'MANAGER'
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
                }`}
              />
            </button>
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
