export type PaymentMethod = 'TUNAI' | 'QRIS' | 'TRANSFER' | 'KASBON';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  subtotal: number;
  category?: string;
}

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
  status?: string;
  createdAt: string;
}

export interface CartItem {
  product: import('./product.ts').Product;
  qty: number;
}

export interface SavedOrder {
  id: string;
  orderNumber: string;
  tenantId: string;
  note: string;
  items: CartItem[];
  total: number;
  itemCount: number;
  paymentMethod: PaymentMethod;
  tenderAmount: number;
  cashierName: string;
  createdAt: string;
}
