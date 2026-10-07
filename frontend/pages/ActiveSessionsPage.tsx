import React from 'react';
import { ActiveSessionsView } from '../components/Admin/ActiveSessionsView.tsx';

interface ActiveSessionsPageProps {
  onNavigateBack?: () => void;
}

export const ActiveSessionsPage: React.FC<ActiveSessionsPageProps> = ({ onNavigateBack }) => {
  return <ActiveSessionsView onNavigateBack={onNavigateBack} />;
};

export default ActiveSessionsPage;
