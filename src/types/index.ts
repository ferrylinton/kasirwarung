export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string | null;
  tenantName: string | null;
  isVerified: boolean;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type TenantStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'INACTIVE';

export interface TenantDeactivationRequest {
  id: string;
  requestedBy: string;
  requestedByEmail: string;
  requestedAt: string;
  reason: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  evaluatedAt?: string;
  evaluatedBy?: string;
  rejectionReason?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  status: TenantStatus;
  createdAt: string;
  deactivationRequest?: TenantDeactivationRequest | null;
  productCount?: number;
  userCount?: number;
  orderCount?: number;
  totalRevenue?: number;
}

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
  createdAt: string;
}

export interface CartItem {
  product: Product;
  qty: number;
  subtotal: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  subtotal: number;
}

export type PaymentMethod = 'TUNAI' | 'QRIS' | 'TRANSFER' | 'KASBON';
export type PaymentStatus = 'LUNAS' | 'BELUM_LUNAS';

export interface Order {
  id: string;
  orderNumber: string;
  tenantId: string;
  items: OrderItem[];
  total: number;
  tenderAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  cashierName: string;
  createdAt: string;
}

export interface SavedOrder {
  id: string;
  orderNumber: string;
  tenantId?: string;
  note: string; // Keterangan tentang pesanan saat disimpan
  items: CartItem[];
  total: number;
  itemCount: number;
  paymentMethod: PaymentMethod;
  tenderAmount: number;
  cashierName: string;
  createdAt: string;
}

export interface DashboardStats {
  totalOmzet: number;
  kasTunai: number;
  qrisTransfer: number;
  kasbon: number;
  kasbonPendingCount: number;
  completedOrders: number;
  totalProducts: number;
  totalCategories: number;
  lowStockCount: number;
  fastMoving: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  duration?: number;
}

export type ActivityModule = 'PRODUCT' | 'CATEGORY' | 'CASHIER';

export type ActivityAction =
  | 'CREATE_PRODUCT'
  | 'UPDATE_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'CREATE_CATEGORY'
  | 'UPDATE_CATEGORY'
  | 'DELETE_CATEGORY'
  | 'CREATE_CASHIER'
  | 'DELETE_CASHIER';

export interface ActivityLog {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  userRole: Role;
  module: ActivityModule;
  action: ActivityAction;
  description: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

export interface ActivityLogResponse {
  success: boolean;
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  logs: ActivityLog[];
}

export interface LoginHistoryItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: Role;
  tenantId: string | null;
  tenantName: string | null;
  status: 'SUCCESS' | 'FAILED';
  failureReason?: string;
  ipAddress: string;
  userAgent?: string;
  device: string;
  browser: string;
  os: string;
  createdAt: string;
}

export interface LoginHistoryResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats?: {
    total: number;
    successCount: number;
    failedCount: number;
    uniqueUsers: number;
  };
  history: LoginHistoryItem[];
}

export interface TenantOmzetItem {
  tenantId: string;
  tenantName: string;
  address?: string;
  phone?: string;
  status: TenantStatus;
  orderCount: number;
  totalRevenue: number;
  itemsSold: number;
  revenuePercentage: number;
  topProduct?: {
    name: string;
    qty: number;
    revenue: number;
  } | null;
}

export interface TopProductItem {
  productId: string;
  name: string;
  category: string;
  totalQty: number;
  totalRevenue: number;
  averagePrice: number;
  tenantName?: string;
}

export interface AdminDashboardData {
  period: {
    startDate: string;
    endDate: string;
    preset: string;
  };
  stats: {
    totalRevenue: number;
    totalOrders: number;
    totalProductsSold: number;
    activeTenantsCount: number;
    totalTenants: number;
    averageOrderValue: number;
  };
  tenantsOmzet: TenantOmzetItem[];
  top10Products: TopProductItem[];
}

