export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string | null;
  tenantName: string | null;
  isVerified?: boolean;
  phone?: string;
  createdAt?: string;
}

export interface CashierUser {
  id: string;
  name: string;
  email: string;
  role: 'CASHIER';
  tenantId: string;
  tenantName?: string;
  createdAt?: string;
}

export interface UserProfile extends User {
  phone?: string;
  updatedAt?: string;
}
