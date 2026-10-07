import React from 'react';
import { AdminDashboardView } from '../components/Admin/AdminDashboardView.tsx';

export interface AdminDashboardPageProps {
  onNavigateToRequests?: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigateToRequests }) => {
  return <AdminDashboardView onNavigateToRequests={onNavigateToRequests} />;
};

export default AdminDashboardPage;
