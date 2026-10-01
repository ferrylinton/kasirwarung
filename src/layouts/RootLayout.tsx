import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar, NavTab } from '../components/Sidebar';
import { ToastContainer } from '../components/ToastContainer';

export interface RootLayoutProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onRequestLogout: () => void;
  productCount?: number;
  children: React.ReactNode;
}

export const RootLayout: React.FC<RootLayoutProps> = ({
  currentTab,
  onSelectTab,
  onRequestLogout,
  productCount = 0,
  children,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="h-screen h-dvh bg-slate-50 dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 flex overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] transition-colors">
      {/* Toast Notifications */}
      <ToastContainer />

      {/* Desktop Sidebar - 100% Screen Height */}
      <div className="hidden lg:flex flex-col h-full max-h-screen min-h-0 shrink-0 overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onRequestLogout={onRequestLogout}
          productCount={productCount}
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
                onSelectTab(tab);
                setIsMobileSidebarOpen(false);
              }}
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileSidebarOpen(false)}
              onRequestLogout={() => {
                setIsMobileSidebarOpen(false);
                onRequestLogout();
              }}
              productCount={productCount}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Floating Mobile Sidebar Trigger */}
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="lg:hidden fixed top-3.5 left-3.5 z-30 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default RootLayout;
