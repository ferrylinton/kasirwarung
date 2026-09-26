import React, { useState, useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useToastStore } from './store/toastStore';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { CashierView } from './components/POS/CashierView';
import { ProductCatalogView } from './components/Catalog/ProductCatalogView';
import { SalesHistoryView } from './components/Sales/SalesHistoryView';
import { TenantDashboardView } from './components/Dashboard/TenantDashboardView';
import { CashierManagementView } from './components/Manager/CashierManagementView';
import { TenantManagementView } from './components/Admin/TenantManagementView';
import { LoginView } from './components/Auth/LoginView';
import { RegisterView } from './components/Auth/RegisterView';
import { VerifyEmailView } from './components/Auth/VerifyEmailView';
import { ToastContainer } from './components/ToastContainer';
import { ConfirmationModal } from './components/Modals/ConfirmationModal';
import { Product } from './types';

export default function App() {
  const { user, token, logout, refreshMe } = useAuthStore();
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

  // Fetch current user and products
  useEffect(() => {
    refreshMe();
  }, []);

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
      title: 'Sampai Jumpa',
      message: 'Anda telah berhasil keluar dari sistem KasirWarung.',
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Toast Notifications */}
      <ToastContainer />

      {/* Top Navigation Bar matching images */}
      <Navbar
        onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onNavigateToPOS={() => setCurrentTab('pos')}
        onSearchChange={(q) => setSearchQuery(q)}
        searchQuery={searchQuery}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Compact Sidebar */}
        <div className="hidden lg:block shrink-0">
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
            <div className="relative z-50 w-72 bg-white flex flex-col h-full shadow-2xl">
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

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'catalog' && (
            <ProductCatalogView
              products={products}
              onRefreshProducts={fetchProducts}
              onNavigateToPOS={() => setCurrentTab('pos')}
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

          {currentTab === 'tenants' && <TenantManagementView />}
        </main>
      </div>

      {/* Confirmation Modal for Logout as required */}
      <ConfirmationModal
        isOpen={showLogoutConfirm}
        type="LOGOUT"
        title="Konfirmasi Keluar Aplikasi"
        description="Apakah Anda yakin ingin keluar dari KasirWarung? Sesi kasir Anda akan diakhiri secara aman."
        confirmText="Ya, Keluar Akun"
        cancelText="Batal"
        isDestructive={true}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
