import React from 'react';
import { TenantManagementView } from '../components/Admin/TenantManagementView.tsx';

export interface TenantManagementPageProps {
  onNavigateToRequests?: () => void;
}

export const TenantManagementPage: React.FC<TenantManagementPageProps> = ({ onNavigateToRequests }) => {
  return <TenantManagementView onNavigateToRequests={onNavigateToRequests} />;
};

export default TenantManagementPage;
