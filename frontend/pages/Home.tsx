import React from 'react';
import { useAuth } from '../hooks/useAuth.ts';
import { AdminDashboardView } from '../components/Admin/AdminDashboardView.tsx';
import { ProductCatalogView } from '../components/Catalog/ProductCatalogView.tsx';
import { Product } from '../types/product.ts';

export interface HomePageProps {
  products?: Product[];
  onRefreshProducts?: () => void;
  onNavigateToPOS?: () => void;
  searchQuery?: string;
}

export const Home: React.FC<HomePageProps> = ({
  products = [],
  onRefreshProducts = () => {},
  onNavigateToPOS = () => {},
  searchQuery = '',
}) => {
  const { user } = useAuth();

  if (user?.role === 'ADMIN') {
    return <AdminDashboardView />;
  }

  return (
    <ProductCatalogView
      products={products}
      onRefreshProducts={onRefreshProducts}
      onNavigateToPOS={onNavigateToPOS}
      searchQuery={searchQuery}
    />
  );
};

export default Home;
