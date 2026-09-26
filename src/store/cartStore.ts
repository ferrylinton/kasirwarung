import { create } from 'zustand';
import { CartItem, Product, PaymentMethod } from '../types';

interface CartStore {
  items: CartItem[];
  customerName: string;
  customerNote: string;
  discount: number;
  paymentMethod: PaymentMethod;
  tenderAmount: number;

  addItem: (product: Product, qty?: number) => boolean;
  updateQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;

  setCustomer: (name: string, note?: string) => void;
  setDiscount: (discount: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setTenderAmount: (amount: number) => void;
  applyQuickTender: (amount: number | 'UANG_PAS') => void;

  getSubtotal: () => number;
  getTotal: () => number;
  getChange: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  customerName: 'Pak RT Bambang',
  customerNote: 'Langganan Tetap (Kav. 4B)',
  discount: 0,
  paymentMethod: 'TUNAI',
  tenderAmount: 200000,

  addItem: (product: Product, qty = 1) => {
    const { items } = get();
    const existingIndex = items.findIndex((it) => it.product.id === product.id);

    if (existingIndex > -1) {
      const existing = items[existingIndex];
      const newQty = existing.qty + qty;
      if (newQty > product.stock) {
        return false; // exceeds stock
      }
      const updated = [...items];
      updated[existingIndex] = {
        ...existing,
        qty: newQty,
        subtotal: newQty * product.price,
      };
      set({ items: updated });
    } else {
      if (product.stock < qty) {
        return false;
      }
      set({
        items: [
          ...items,
          {
            product,
            qty,
            subtotal: qty * product.price,
          },
        ],
      });
    }

    // Auto set tender amount if previously set to uang pas or default
    const total = get().getTotal();
    if (get().paymentMethod === 'TUNAI' && get().tenderAmount < total) {
      set({ tenderAmount: total });
    }

    return true;
  },

  updateQty: (productId: string, qty: number) => {
    const { items } = get();
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }

    const item = items.find((it) => it.product.id === productId);
    if (!item) return;

    if (qty > item.product.stock) {
      return; // cannot exceed stock
    }

    set({
      items: items.map((it) =>
        it.product.id === productId
          ? { ...it, qty, subtotal: qty * it.product.price }
          : it
      ),
    });
  },

  removeItem: (productId: string) => {
    set({ items: get().items.filter((it) => it.product.id !== productId) });
  },

  clearCart: () => {
    set({
      items: [],
      discount: 0,
      tenderAmount: 0,
      customerName: 'Umum (Pelanggan Lepas)',
      customerNote: '',
      paymentMethod: 'TUNAI',
    });
  },

  setCustomer: (name: string, note = '') => {
    set({ customerName: name, customerNote: note });
  },

  setDiscount: (discount: number) => {
    set({ discount: Math.max(0, discount) });
  },

  setPaymentMethod: (paymentMethod: PaymentMethod) => {
    const total = get().getTotal();
    set({
      paymentMethod,
      tenderAmount: paymentMethod === 'TUNAI' ? (get().tenderAmount < total ? total : get().tenderAmount) : total,
    });
  },

  setTenderAmount: (tenderAmount: number) => {
    set({ tenderAmount: Math.max(0, tenderAmount) });
  },

  applyQuickTender: (amount: number | 'UANG_PAS') => {
    const total = get().getTotal();
    if (amount === 'UANG_PAS') {
      set({ tenderAmount: total });
    } else {
      set({ tenderAmount: amount });
    }
  },

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.subtotal, 0);
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    return Math.max(0, subtotal - get().discount);
  },

  getChange: () => {
    const total = get().getTotal();
    const tender = get().tenderAmount;
    if (get().paymentMethod !== 'TUNAI') return 0;
    return Math.max(0, tender - total);
  },

  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.qty, 0);
  },
}));
