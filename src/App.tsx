import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from './store/authStore';
import { useToastStore } from './store/toastStore';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { CashierView } from './components/POS/CashierView';
import { ProductCatalogView } from './components/Catalog/ProductCatalogView';
import { SalesHistoryView } from './components/Sales/SalesHistoryView';
import { TenantDashboardView } from './components/Dashboard/TenantDashboardView';
import { CashierManagementView } from './components/Manager/CashierManagementView';
import { ProductManagementView } from './components/Manager/ProductManagementView';
import { CategoryManagementView } from './components/Manager/CategoryManagementView';
import { TenantManagementView } from './components/Admin/TenantManagementView';
import { UserProfileView } from './components/Profile/UserProfileView';
import { ConfigurationView } from './components/Settings/ConfigurationView';
import { ActivityLogView } from './components/Manager/ActivityLogView';
import { LoginHistoryView } from './components/Auth/LoginHistoryView';
import { LoginView } from './components/Auth/LoginView';
import { RegisterView } from './components/Auth/RegisterView';
import { VerifyEmailView } from './components/Auth/VerifyEmailView';
import { ToastContainer } from './components/ToastContainer';
import { ConfirmationModal } from './components/Modals/ConfirmationModal';
import { Product } from './types';
import { TenantInfoView } from './components/Manager/TenantInfoView';

export default function App() {
  const { t } = useTranslation();
  const { user, token, logout, refreshMe, refreshTokenIfExpiring, idleTimeoutMinutes, setIdleTimeoutMinutes } = useAuthStore();
  const { addToast } = useToastStore();

  // Navigation & UI state
  const [currentTab, setCurrentTab] = useState<NavTab>('catalog');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Auth screen mode when not logged in
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'verify'>('login');
  const [verifyToken, setVerifyToken] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Logout confirmation modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Check URL query parameters for ?token=... (email verification link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      setVerifyToken(tokenParam);
      setAuthMode('verify');
    }
  }, []);

  // Fetch public auth configuration (idle timeout minutes from backend env)
  useEffect(() => {
    fetch('/api/auth/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.idleTimeoutMinutes === 'number' && data.idleTimeoutMinutes > 0) {
          setIdleTimeoutMinutes(data.idleTimeoutMinutes);
        }
      })
      .catch(() => {});
  }, [setIdleTimeoutMinutes]);

  // Fetch current user and products
  useEffect(() => {
    refreshMe();
  }, []);

  // Proactive Token Expiration Check:
  // When user is logged in, check token remaining time periodically (every 15s).
  // If remaining time is less than 1 minute, refresh token from backend.
  useEffect(() => {
    if (!token || !user) return;

    // Run check immediately
    refreshTokenIfExpiring();

    const interval = setInterval(() => {
      refreshTokenIfExpiring();
    }, 15000);

    return () => clearInterval(interval);
  }, [token, user?.id]);

  // ⏱️ Auto-Logout on Inactivity (User Activity Idle Timeout)
  // Automatically logs the user out if there is no user activity for idleTimeoutMinutes (default: 5 minutes)
  useEffect(() => {
    if (!user || !token) return;

    const timeoutDurationMs = (idleTimeoutMinutes || 5) * 60 * 1000;
    let lastActivityTime = Date.now();
    let idleCheckInterval: any = null;

    const resetActivity = () => {
      lastActivityTime = Date.now();
    };

    // User activity events across desktop and touch devices
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'wheel',
    ];

    // Debounce listener attachment to minimize overhead
    let throttleTimeout: any = null;
    const handleUserActivity = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          resetActivity();
          throttleTimeout = null;
        }, 1000);
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Check every 5 seconds whether the idle timeout has elapsed
    idleCheckInterval = setInterval(() => {
      const elapsedMs = Date.now() - lastActivityTime;
      if (elapsedMs >= timeoutDurationMs) {
        console.warn(`⏳ User idle for ${Math.round(elapsedMs / 1000)}s (limit: ${idleTimeoutMinutes}m). Logging out...`);
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
  }, [user?.id, token, idleTimeoutMinutes, logout, addToast, t]);

  const fetchProducts = async () => {
    if (!token) return;
    try {
      setLoadingProducts(true);
      const res = await fetch('/api/products', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoadingProducts(false);
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

  // If user is not authenticated, show Auth screens
  if (!user || !token) {
    if (authMode === 'register') {
      return (
        <>
          <ToastContainer />
          <RegisterView
            onSwitchToLogin={() => setAuthMode('login')}
            onRegisteredSuccess={(email, token) => {
              setRegisteredEmail(email);
              setVerifyToken(token);
              setAuthMode('verify');
            }}
          />
        </>
      );
    }

    if (authMode === 'verify') {
      return (
        <>
          <ToastContainer />
          <VerifyEmailView
            initialToken={verifyToken}
            initialEmail={registeredEmail}
            onVerifiedSuccess={() => {
              setAuthMode('login');
              fetchProducts();
            }}
            onBackToLogin={() => setAuthMode('login')}
          />
        </>
      );
    }

    return (
      <>
        <ToastContainer />
        <LoginView
          onSwitchToRegister={() => setAuthMode('register')}
          onSwitchToVerify={(t) => {
            if (t) setVerifyToken(t);
            setAuthMode('verify');
          }}
        />
      </>
    );
  }

  return (
    <div className="h-screen h-dvh bg-slate-50 dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 flex overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] transition-colors">
      {/* Toast Notifications */}
      <ToastContainer />

      {/* Desktop Sidebar - 100% Screen Height */}
      <div className="hidden lg:flex flex-col h-full max-h-screen min-h-0 shrink-0 overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onRequestLogout={() => setShowLogoutConfirm(true)}
          productCount={products.length}
        />
      </div>

      {/* Mobile / Tablet Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative z-50 w-72 bg-white dark:bg-slate-900 flex flex-col h-full max-h-screen min-h-0 shadow-2xl overflow-hidden">
            <Sidebar
              currentTab={currentTab}
              onSelectTab={(tab) => {
                setCurrentTab(tab);
                setIsMobileSidebarOpen(false);
              }}
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileSidebarOpen(false)}
              onRequestLogout={() => {
                setIsMobileSidebarOpen(false);
                setShowLogoutConfirm(true);
              }}
              productCount={products.length}
            />
          </div>
        </div>
      )}

      {/* Main Content Area: Header Navbar on top & Scrollable main content viewport */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Navigation Bar */}
        <Navbar
          onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onNavigateToPOS={() => setCurrentTab('pos')}
          onNavigateToProfile={() => setCurrentTab('profile')}
          onNavigateToConfiguration={() => setCurrentTab('configuration')}
          onSearchChange={(q) => setSearchQuery(q)}
          searchQuery={searchQuery}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto min-h-0">
          {currentTab === 'catalog' && (
            <ProductCatalogView
              products={products}
              onRefreshProducts={fetchProducts}
              onNavigateToPOS={() => setCurrentTab('pos')}
            />
          )}

          {currentTab === 'product-management' && (
            <ProductManagementView
              products={products}
              onRefreshProducts={fetchProducts}
              onNavigateToCategories={() => setCurrentTab('category-management')}
            />
          )}

          {currentTab === 'category-management' && (
            <CategoryManagementView
              products={products}
              onRefreshProducts={fetchProducts}
              onNavigateToProducts={() => setCurrentTab('product-management')}
            />
          )}

          {currentTab === 'categories' && (
            <ProductCatalogView
              products={products}
              onRefreshProducts={fetchProducts}
              onNavigateToPOS={() => setCurrentTab('pos')}
            />
          )}

          {currentTab === 'pos' && (
            <CashierView
              products={products}
              onRefreshProducts={fetchProducts}
            />
          )}

          {currentTab === 'history' && <SalesHistoryView />}

          {currentTab === 'dashboard' && <TenantDashboardView />}

          {currentTab === 'cashiers' && <CashierManagementView />}

          {currentTab === 'activity-log' && <ActivityLogView />}

          {currentTab === 'login-history' && <LoginHistoryView />}

          {currentTab === 'tenants' && <TenantManagementView />}

          {currentTab === 'tenant-info' && <TenantInfoView />}

          {currentTab === 'configuration' && (
            <ConfigurationView
              onRequestLogout={() => setShowLogoutConfirm(true)}
              onNavigateToPOS={() => setCurrentTab('pos')}
            />
          )}

          {currentTab === 'profile' && <UserProfileView />}
        </main>
      </div>

      {/* Confirmation Modal for Logout as required */}
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
    </div>
  );
}
