import api from './api.ts';
import { CashierUser } from '../types/user.ts';

export interface CreateCashierPayload {
  name: string;
  email: string;
  password?: string;
}

export const userService = {
  // Cashier management
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
};

export default userService;
