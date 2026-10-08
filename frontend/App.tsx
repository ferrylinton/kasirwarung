import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavTab } from './components/Sidebar';
import { RootLayout, AuthLayout } from './layouts';
import { ConfirmationModal } from './components/Modals/ConfirmationModal';
import { Product } from './types';
import { useAuth } from './hooks/useAuth';
import { useToast } from './hooks/useToast';
import { productService } from './services/productService';
import { authService } from './services/authService';

// Route-level container components (pages)
import {
  ProductCatalogPage,
  ProductManagementPage,
  CategoryManagementPage,
  UnitManagementPage,
  POSPage,
  SalesHistoryPage,
  AdminDashboardPage,
  TenantDashboardPage,
  CashierManagementPage,
  ActivityLogPage,
  LoginHistoryPage,
  TenantManagementPage,
  TenantDeactivationReviewPage,
  TenantInfoPage,
  UserManagementPage,
  ActiveSessionsPage,
  TenantActiveSessionsPage,
  ConfigurationPage,
  UserProfilePage,
  LoginPage,
  RegisterPage,
  VerifyEmailPage,
} from './pages';

export default function App() {
  const { t } = useTranslation();
  const { user, token, logout, refreshMe, refreshTokenIfExpiring, idleTimeoutMinutes, setIdleTimeoutMinutes } = useAuth();
  const { addToast } = useToast();

  // Navigation state - ADMIN defaults to admin-dashboard
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.role === 'ADMIN') return 'admin-dashboard';
      }
    } catch {}
    return 'catalog';
  });

  const [searchQuery, setSearchQuery] = useState('');

  // When role ADMIN is detected, direct to admin-dashboard
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      setCurrentTab((prev) => (prev === 'catalog' ? 'admin-dashboard' : prev));
    }
  }, [user?.role, user?.id]);

  // Route guard: Redirect non-admin if currently on admin-only tabs
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      const adminTabs: NavTab[] = ['admin-dashboard', 'tenants', 'tenant-requests', 'user-management', 'active-sessions'];
      if (adminTabs.includes(currentTab)) {
        setCurrentTab('catalog');
      }
    }
  }, [user?.role, currentTab]);

  // Reset navbar search query when switching tabs
  useEffect(() => {
    setSearchQuery('');
  }, [currentTab]);

  // Auth screen mode when not logged in
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'verify'>('login');
  const [verifyToken, setVerifyToken] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Logout confirmation modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);

  // Check URL query parameters for ?token=... or /verify-email (email verification link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      setVerifyToken(tokenParam);
      setAuthMode('verify');
    } else if (window.location.pathname === '/verify-email') {
      setAuthMode('verify');
    }
  }, []);

  // Fetch public auth configuration (idle timeout minutes from backend env)
  useEffect(() => {
    authService
      .getConfig()
      .then((data) => {
        if (data && typeof data.idleTimeoutMinutes === 'number' && data.idleTimeoutMinutes > 0) {
          setIdleTimeoutMinutes(data.idleTimeoutMinutes);
        }
      })
      .catch(() => {});
  }, [setIdleTimeoutMinutes]);

  // Fetch current user on mount
  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  // Proactive Token Expiration Check (every 15s)
  useEffect(() => {
    if (!token || !user) return;

    const interval = setInterval(() => {
      refreshTokenIfExpiring().catch(() => {});
    }, 15000);

    return () => clearInterval(interval);
  }, [token, user, refreshTokenIfExpiring]);

  // Inactivity / Idle Auto-Logout Tracker
  useEffect(() => {
    if (!user?.id || !token) return;

    let lastActivityTime = Date.now();
    let idleCheckInterval: any = null;
    let throttleTimeout: any = null;

    const timeoutDurationMs = (idleTimeoutMinutes || 5) * 60 * 1000;

    const handleUserActivity = () => {
      lastActivityTime = Date.now();
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          refreshTokenIfExpiring().catch(() => {});
          throttleTimeout = null;
        }, 30000);
      }
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    idleCheckInterval = setInterval(() => {
      const elapsedMs = Date.now() - lastActivityTime;
      if (elapsedMs >= timeoutDurationMs) {
        logout('IDLE_TIMEOUT');
        setShowLogoutConfirm(false);
        addToast({
          type: 'warning',
          title: t('auth.idleLogoutTitle', 'Sesi Berakhir Karena Tidak Ada Aktivitas'),
          message: t('auth.idleLogoutMsg', {
            defaultValue: `Anda telah otomatis dikeluarkan dari sistem karena tidak ada aktivitas selama ${idleTimeoutMinutes} menit.`,
            minutes: idleTimeoutMinutes,
          }),
          duration: 8000,
        });
      }
    }, 5000);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      if (idleCheckInterval) clearInterval(idleCheckInterval);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [user?.id, token, idleTimeoutMinutes, logout, addToast, t, refreshTokenIfExpiring]);

  // Product fetching via productService
  const fetchProducts = async () => {
    if (!token) return;
    try {
      const list = await productService.getProducts();
      setProducts(list);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchProducts();
    }
  }, [user?.id, token]);

  const handleLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    addToast({
      type: 'info',
      title: t('auth.logoutSuccessTitle', 'Sampai Jumpa'),
      message: t('auth.logoutSuccessMsg', 'Anda telah berhasil keluar dari sistem KasirWarung.'),
    });
  };

  // If user is not authenticated, show Auth Layout & Views
  if (!user || !token) {
    return (
      <AuthLayout>
        {authMode === 'register' && (
          <RegisterPage
            onSwitchToLogin={() => setAuthMode('login')}
            onRegisteredSuccess={(email) => {
              setRegisteredEmail(email);
              setVerifyToken('');
              setAuthMode('login');
            }}
          />
        )}

        {authMode === 'verify' && (
          <VerifyEmailPage
            initialToken={verifyToken}
            initialEmail={registeredEmail}
            onVerifiedSuccess={() => {
              if (window.location.search || window.location.pathname === '/verify-email') {
                window.history.replaceState({}, document.title, '/');
              }
              setAuthMode('login');
              fetchProducts();
            }}
            onBackToLogin={() => {
              if (window.location.search || window.location.pathname === '/verify-email') {
                window.history.replaceState({}, document.title, '/');
              }
              setAuthMode('login');
            }}
          />
        )}

        {authMode === 'login' && (
          <LoginPage
            onSwitchToRegister={() => setAuthMode('register')}
            onSwitchToVerify={(t) => {
              if (t) setVerifyToken(t);
              setAuthMode('verify');
            }}
          />
        )}
      </AuthLayout>
    );
  }

  return (
    <RootLayout
      currentTab={currentTab}
      onSelectTab={(tab) => setCurrentTab(tab)}
      onRequestLogout={() => setShowLogoutConfirm(true)}
      productCount={products.length}
    >
      {currentTab === 'catalog' && (
        <ProductCatalogPage
          products={products}
          onRefreshProducts={fetchProducts}
          onNavigateToPOS={() => setCurrentTab('pos')}
          searchQuery={searchQuery}
        />
      )}

      {currentTab === 'product-management' && (
        <ProductManagementPage
          products={products}
          onRefreshProducts={fetchProducts}
          onNavigateToCategories={() => setCurrentTab('category-management')}
          onNavigateToUnits={() => setCurrentTab('unit-management')}
        />
      )}

      {currentTab === 'category-management' && (
        <CategoryManagementPage
          products={products}
          onRefreshProducts={fetchProducts}
          onNavigateToProducts={() => setCurrentTab('product-management')}
        />
      )}

      {currentTab === 'unit-management' && (
        <UnitManagementPage
          products={products}
          onRefreshProducts={fetchProducts}
          onNavigateToProducts={() => setCurrentTab('product-management')}
          onNavigateToCatalog={() => setCurrentTab('catalog')}
        />
      )}

      {currentTab === 'categories' && (
        <ProductCatalogPage
          products={products}
          onRefreshProducts={fetchProducts}
          onNavigateToPOS={() => setCurrentTab('pos')}
        />
      )}

      {currentTab === 'pos' && (
        <POSPage
          products={products}
          onRefreshProducts={fetchProducts}
          onNavigateToCatalog={() => setCurrentTab('catalog')}
        />
      )}

      {currentTab === 'history' && <SalesHistoryPage />}

      {currentTab === 'admin-dashboard' && (
        <AdminDashboardPage onNavigateToRequests={() => setCurrentTab('tenant-requests')} />
      )}

      {currentTab === 'dashboard' && <TenantDashboardPage />}

      {currentTab === 'cashiers' && (
        <CashierManagementPage onNavigateToSessions={() => setCurrentTab('tenant-sessions')} />
      )}

      {currentTab === 'activity-log' && <ActivityLogPage />}

      {currentTab === 'login-history' && <LoginHistoryPage />}

      {currentTab === 'tenants' && (
        <TenantManagementPage onNavigateToRequests={() => setCurrentTab('tenant-requests')} />
      )}

      {currentTab === 'tenant-requests' && (
        <TenantDeactivationReviewPage
          onNavigateBack={() => setCurrentTab(user?.role === 'ADMIN' ? 'admin-dashboard' : 'catalog')}
        />
      )}

      {currentTab === 'user-management' && <UserManagementPage />}

      {currentTab === 'active-sessions' && (
        user?.role === 'MANAGER' ? (
          <TenantActiveSessionsPage
            onNavigateBack={() => setCurrentTab('catalog')}
            onNavigateToCashiers={() => setCurrentTab('cashiers')}
          />
        ) : (
          <ActiveSessionsPage
            onNavigateBack={() => setCurrentTab(user?.role === 'ADMIN' ? 'admin-dashboard' : 'catalog')}
          />
        )
      )}

      {currentTab === 'tenant-sessions' && (
        <TenantActiveSessionsPage
          onNavigateBack={() => setCurrentTab('catalog')}
          onNavigateToCashiers={() => setCurrentTab('cashiers')}
        />
      )}

      {currentTab === 'tenant-info' && <TenantInfoPage />}

      {currentTab === 'configuration' && (
        <ConfigurationPage
          onRequestLogout={() => setShowLogoutConfirm(true)}
          onNavigateToPOS={() => setCurrentTab('pos')}
        />
      )}

      {currentTab === 'profile' && <UserProfilePage />}

      {/* Confirmation Modal for Logout */}
      <ConfirmationModal
        isOpen={showLogoutConfirm}
        type="LOGOUT"
        title={t('modals.logoutTitle', 'Konfirmasi Keluar Aplikasi')}
        description={t('modals.logoutDesc', 'Apakah Anda yakin ingin keluar dari KasirWarung? Sesi kasir Anda akan diakhiri secara aman.')}
        confirmText={t('modals.logoutConfirm', 'Ya, Keluar Akun')}
        cancelText={t('common.cancel', 'Batal')}
        isDestructive={true}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </RootLayout>
  );
}
