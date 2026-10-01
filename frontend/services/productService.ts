import api from './api.ts';
import { Product, Category } from '../types/product.ts';

export const productService = {
  getProducts: async (params?: { category?: string; q?: string; stockStatus?: string; tenantId?: string }) => {
    const res = await api.get<{ success: boolean; count: number; products: Product[] }>('/products', { params });
    return res.products || [];
  },

  searchProducts: async (q: string, limit: number = 10, tenantId?: string) => {
    const res = await api.get<{ success: boolean; count: number; products: Product[] }>('/products/search', {
      params: { q, limit, tenantId },
    });
    return res.products || [];
  },

  createProduct: async (payload: Partial<Product>) => {
    return api.post<{ success: boolean; message: string; product: Product }>('/products', payload);
  },

  updateProduct: async (id: string, payload: Partial<Product>) => {
    return api.put<{ success: boolean; message: string; product: Product }>(`/products/${id}`, payload);
  },

  deleteProduct: async (id: string) => {
    return api.delete<{ success: boolean; message: string }>(`/products/${id}`);
  },

  getCategories: async (tenantId?: string) => {
    const res = await api.get<{ success: boolean; totalCategories: number; categories: Category[] }>('/categories', {
      params: { tenantId },
    });
    return res.categories || [];
  },

  createCategory: async (name: string) => {
    return api.post<{ success: boolean; message: string; category: Category }>('/categories', { name });
  },

  renameCategory: async (oldCategory: string, newCategory: string) => {
    return api.put<{ success: boolean; message: string }>('/categories/rename', { oldCategory, newCategory });
  },

  deleteCategory: async (name: string) => {
    return api.delete<{ success: boolean; message: string }>(`/categories/${encodeURIComponent(name)}`);
  },
};

export default productService;
