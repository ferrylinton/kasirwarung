import { TenantStatus } from './tenant.ts';

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
  fastMoving: { name: string; count: number; revenue: number }[];
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

export interface TopProductStat {
  productId: string;
  name: string;
  category: string;
  totalQty: number;
  totalRevenue: number;
  averagePrice: number;
  tenantName: string;
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
  top10Products: TopProductStat[];
}
