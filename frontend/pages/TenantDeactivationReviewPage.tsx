import React from 'react';
import { TenantDeactivationReviewView } from '../components/Admin/TenantDeactivationReviewView.tsx';

export interface TenantDeactivationReviewPageProps {
  onNavigateBack?: () => void;
}

export const TenantDeactivationReviewPage: React.FC<TenantDeactivationReviewPageProps> = ({
  onNavigateBack,
}) => {
  return <TenantDeactivationReviewView onNavigateBack={onNavigateBack} />;
};

export default TenantDeactivationReviewPage;
