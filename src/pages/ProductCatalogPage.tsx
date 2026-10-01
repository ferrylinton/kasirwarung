import React from 'react';
import { ProductCatalogView } from '../components/Catalog/ProductCatalogView.tsx';
import { Product } from '../types/product.ts';

export interface ProductCatalogPageProps {
  products: Product[];
  onRefreshProducts: () => void;
  onNavigateToPOS: () => void;
  searchQuery?: string;
}

export const ProductCatalogPage: React.FC<ProductCatalogPageProps> = (props) => {
  return <ProductCatalogView {...props} />;
};

export default ProductCatalogPage;
