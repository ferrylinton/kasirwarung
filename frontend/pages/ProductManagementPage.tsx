import React from 'react';
import { ProductManagementView } from '../components/Manager/ProductManagementView.tsx';
import { Product } from '../types/product.ts';

export interface ProductManagementPageProps {
  products: Product[];
  onRefreshProducts: () => void;
  onNavigateToCategories: () => void;
  onNavigateToUnits?: () => void;
}

export const ProductManagementPage: React.FC<ProductManagementPageProps> = (props) => {
  return <ProductManagementView {...props} />;
};

export default ProductManagementPage;
