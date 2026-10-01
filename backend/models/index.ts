export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER';
export type TenantStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'INACTIVE';
export type PaymentMethod = 'TUNAI' | 'QRIS' | 'TRANSFER' | 'KASBON';

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

export interface TenantDoc {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  status: TenantStatus;
  createdAt: string;
  updatedAt?: string;
  deactivationRequest?: TenantDeactivationRequest | null;
}

export interface UserDoc {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  tenantId: string | null;
  tenantName: string | null;
  isVerified: boolean;
  phone?: string;
  verificationToken?: string;
  verificationTokenExpires?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductDoc {
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
  updatedAt?: string;
}

export interface OrderItemDoc {
  productId: string;
  name: string;
  price: number;
  qty: number;
  subtotal: number;
  category?: string;
}

export interface OrderDoc {
  id: string;
  orderNumber: string;
  tenantId: string;
  items: OrderItemDoc[];
  total: number;
  tenderAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  cashierName: string;
  status?: string;
  createdAt: string;
}

export interface SavedOrderDoc {
  id: string;
  orderNumber: string;
  tenantId: string;
  note: string;
  items: any[];
  total: number;
  itemCount: number;
  paymentMethod: PaymentMethod;
  tenderAmount: number;
  cashierName: string;
  createdAt: string;
}

export interface ActivityLogDoc {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  userRole: string;
  module: 'PRODUCT' | 'CATEGORY' | 'CASHIER' | 'TENANT';
  action: string;
  description: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

export interface LoginHistoryDoc {
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

export interface TokenDoc {
  jti: string;
  userId: string;
  type: 'access' | 'refresh';
  expiresAt: number;
  revoked: boolean;
  createdAt: number;
}
