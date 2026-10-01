import React from 'react';
import { useAuth } from '../hooks/useAuth.ts';
import { AdminDashboardView } from '../components/Admin/AdminDashboardView.tsx';
import { TenantDashboardView } from '../components/Dashboard/TenantDashboardView.tsx';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  if (user?.role === 'ADMIN') {
    return <AdminDashboardView />;
  }

  return <TenantDashboardView />;
};

export default DashboardPage;
