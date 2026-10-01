export interface Product {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  unit: string;
  minStock: number;
  description: string;
  imageUrl: string;
  isPopular?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  name: string;
  count: number;
}
