import React from 'react';
import { CartView } from '../components/POS/CartView.tsx';
import { Product } from '../types/product.ts';

export interface POSPageProps {
  products: Product[];
  onRefreshProducts: () => void;
  onNavigateToCatalog: () => void;
}

export const POSPage: React.FC<POSPageProps> = (props) => {
  return <CartView {...props} />;
};

export default POSPage;
