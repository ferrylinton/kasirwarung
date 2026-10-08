import React from 'react';
import { TenantActiveSessionsView } from '../components/Manager/TenantActiveSessionsView.tsx';

export interface TenantActiveSessionsPageProps {
  onNavigateBack?: () => void;
  onNavigateToCashiers?: () => void;
}

export const TenantActiveSessionsPage: React.FC<TenantActiveSessionsPageProps> = ({
  onNavigateBack,
  onNavigateToCashiers,
}) => {
  return (
    <TenantActiveSessionsView
      onNavigateBack={onNavigateBack}
      onNavigateToCashiers={onNavigateToCashiers}
    />
  );
};

export default TenantActiveSessionsPage;
