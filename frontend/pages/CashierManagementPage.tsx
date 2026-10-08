import React from 'react';
import { CashierManagementView } from '../components/Manager/CashierManagementView.tsx';

export interface CashierManagementPageProps {
  onNavigateToSessions?: () => void;
}

export const CashierManagementPage: React.FC<CashierManagementPageProps> = ({
  onNavigateToSessions,
}) => {
  return <CashierManagementView onNavigateToSessions={onNavigateToSessions} />;
};

export default CashierManagementPage;
