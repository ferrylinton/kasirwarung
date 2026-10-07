import api from './api.ts';
import { CashierUser, AdminUserItem } from '../types/user.ts';

export interface CreateCashierPayload {
  name: string;
  email: string;
  password?: string;
}

export const userService = {
  // Cashier management (Manager)
  getCashiers: async (): Promise<CashierUser[]> => {
    const res = await api.get<{ success: boolean; count: number; cashiers: CashierUser[] }>('/users/cashiers');
    return res.cashiers || [];
  },

  createCashier: async (payload: CreateCashierPayload): Promise<CashierUser> => {
    const res = await api.post<{ success: boolean; message: string; user: CashierUser }>('/users/cashier', payload);
    return res.user;
  },

  deleteCashier: async (cashierId: string): Promise<void> => {
    await api.delete(`/users/cashiers/${cashierId}`);
  },

  // Global User Management across all tenants (ADMIN only)
  getAllUsers: async (): Promise<AdminUserItem[]> => {
    const res = await api.get<{ success: boolean; count: number; users: AdminUserItem[] }>('/users/all');
    return res.users || [];
  },

  updateUserStatus: async (userId: string, isActive: boolean): Promise<{ success: boolean; message: string }> => {
    const res = await api.patch<{ success: boolean; message: string }>(`/users/${userId}/status`, { isActive });
    return res;
  },

  changeUserPassword: async (userId: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.patch<{ success: boolean; message: string }>(`/users/${userId}/password`, { newPassword });
    return res;
  },
};

export default userService;

