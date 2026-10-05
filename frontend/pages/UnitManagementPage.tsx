import React from 'react';
import { UnitManagementView } from '../components/Manager/UnitManagementView.tsx';
import { Product } from '../types/product.ts';

export interface UnitManagementPageProps {
  products: Product[];
  onRefreshProducts: () => void;
  onNavigateToProducts: () => void;
  onNavigateToCatalog?: () => void;
}

export const UnitManagementPage: React.FC<UnitManagementPageProps> = (props) => {
  return <UnitManagementView {...props} />;
};

export default UnitManagementPage;
