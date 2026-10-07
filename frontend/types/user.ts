export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string | null;
  tenantName: string | null;
  isActive?: boolean;
  isVerified?: boolean;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string | null;
  tenantName: string | null;
  isActive: boolean;
  isVerified?: boolean;
  phone?: string;
  createdAt: string;
  updatedAt?: string;
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

