import React from 'react';
import { ToastContainer } from '../components/ToastContainer';

export interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 flex flex-col justify-center font-['Plus_Jakarta_Sans',sans-serif] transition-colors">
      <ToastContainer />
      {children}
    </div>
  );
};

export default AuthLayout;
