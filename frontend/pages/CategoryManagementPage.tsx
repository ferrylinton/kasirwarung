import React from 'react';
import { CategoryManagementView } from '../components/Manager/CategoryManagementView.tsx';
import { Product } from '../types/product.ts';

export interface CategoryManagementPageProps {
  products: Product[];
  onRefreshProducts: () => void;
  onNavigateToProducts: () => void;
}

export const CategoryManagementPage: React.FC<CategoryManagementPageProps> = (props) => {
  return <CategoryManagementView {...props} />;
};

export default CategoryManagementPage;
