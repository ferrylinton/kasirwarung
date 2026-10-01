import api from './api.ts';
import { Order, SavedOrder } from '../types/order.ts';

export const orderService = {
  createOrder: async (payload: { items: any[]; tenderAmount: number; paymentMethod: string }) => {
    return api.post<{ success: boolean; message: string; order: Order }>('/orders', payload);
  },

  getOrders: async (params?: { q?: string; payment?: string; tenantId?: string }) => {
    const res = await api.get<{ success: boolean; count: number; orders: Order[] }>('/orders', { params });
    return res.orders || [];
  },

  updateOrderStatus: async (orderId: string, status: string) => {
    return api.patch<{ success: boolean; message: string; order: Order }>(`/orders/${orderId}/status`, { status });
  },

  // Hold / Saved Orders
  getSavedOrders: async () => {
    const res = await api.get<{ success: boolean; count: number; savedOrders: SavedOrder[] }>('/saved-orders');
    return res.savedOrders || [];
  },

  createSavedOrder: async (payload: { note: string; items: any[]; paymentMethod?: string; tenderAmount?: number }) => {
    return api.post<{ success: boolean; message: string; savedOrder: SavedOrder }>('/saved-orders', payload);
  },

  updateSavedOrderNote: async (id: string, note: string) => {
    return api.patch<{ success: boolean; message: string }>(`/saved-orders/${id}/note`, { note });
  },

  deleteSavedOrder: async (id: string) => {
    return api.delete<{ success: boolean; message: string }>(`/saved-orders/${id}`);
  },
};

export default orderService;
