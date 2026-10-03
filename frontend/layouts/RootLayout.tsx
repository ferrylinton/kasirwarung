import React, { useState, useRef, useEffect } from 'react';
import { Sidebar, NavTab } from '../components/Sidebar';
import { ToastContainer } from '../components/ToastContainer';
import { Navbar } from '../components/Navbar';

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
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      setIsScrolled(el.scrollTop > 8);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

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
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative z-50 w-72 bg-white dark:bg-slate-900 flex flex-col h-full max-h-screen min-h-0 shadow-2xl overflow-hidden animate-in slide-in-from-left duration-200">
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
        {/* Main Content Scroll Viewport with Sticky Transparent Navbar */}
        <main ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 relative flex flex-col">
          {/* Transparent Frosted Glass Navbar */}
          <Navbar
            onToggleSidebar={() => setIsMobileSidebarOpen(true)}
            currentTab={currentTab}
            onSelectTab={onSelectTab}
            onRequestLogout={onRequestLogout}
            isScrolled={isScrolled}
          />

          {/* Child View Container */}
          <div className="flex-1">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default RootLayout;
