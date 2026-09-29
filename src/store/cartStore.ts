import { create } from 'zustand';
import { CartItem, Product, PaymentMethod, SavedOrder } from '../types';

export const ACTIVE_CART_STORAGE_KEY = 'kasirwarung_active_cart';
export const SAVED_ORDERS_STORAGE_KEY = 'kasirwarung_saved_orders';

export interface ActiveCartData {
  items: CartItem[];
  customerName: string;
  customerNote: string;
  discount: number;
  paymentMethod: PaymentMethod;
  tenderAmount: number;
}

const DEFAULT_ACTIVE_CART: ActiveCartData = {
  items: [],
  customerName: 'Umum (Pelanggan Lepas)',
  customerNote: '',
  discount: 0,
  paymentMethod: 'TUNAI',
  tenderAmount: 0,
};

const getInitialActiveCart = (): ActiveCartData => {
  try {
    const raw = localStorage.getItem(ACTIVE_CART_STORAGE_KEY);
    if (!raw) return DEFAULT_ACTIVE_CART;
    const parsed = JSON.parse(raw);
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      customerName:
        typeof parsed.customerName === 'string' && parsed.customerName.trim()
          ? parsed.customerName
          : DEFAULT_ACTIVE_CART.customerName,
      customerNote: typeof parsed.customerNote === 'string' ? parsed.customerNote : '',
      discount: typeof parsed.discount === 'number' ? parsed.discount : 0,
      paymentMethod: 'TUNAI',
      tenderAmount: typeof parsed.tenderAmount === 'number' ? parsed.tenderAmount : 0,
    };
  } catch (err) {
    console.error('Failed to parse active cart from localStorage:', err);
    return DEFAULT_ACTIVE_CART;
  }
};

const persistActiveCart = (data: ActiveCartData) => {
  try {
    localStorage.setItem(ACTIVE_CART_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save active cart to localStorage:', err);
  }
};

const getInitialSavedOrders = (): SavedOrder[] => {
  try {
    const raw = localStorage.getItem(SAVED_ORDERS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse saved orders from localStorage:', err);
    return [];
  }
};

const persistSavedOrders = (orders: SavedOrder[]) => {
  try {
    localStorage.setItem(SAVED_ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error('Failed to save orders to localStorage:', err);
  }
};

/**
 * Removes all cart-related data (active cart and saved hold orders) from localStorage.
 */
export const clearAllCartLocalStorage = () => {
  try {
    localStorage.removeItem(ACTIVE_CART_STORAGE_KEY);
    localStorage.removeItem(SAVED_ORDERS_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to remove cart data from localStorage:', err);
  }
};

interface CartStore {
  items: CartItem[];
  customerName: string;
  customerNote: string;
  discount: number;
  paymentMethod: PaymentMethod;
  tenderAmount: number;
  savedOrders: SavedOrder[];

  addItem: (product: Product, qty?: number) => boolean;
  updateQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  clearAllCartData: () => void;

  setCustomer: (name: string, note?: string) => void;
  setDiscount: (discount: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setTenderAmount: (amount: number) => void;
  applyQuickTender: (amount: number | 'UANG_PAS') => void;

  getSubtotal: () => number;
  getTotal: () => number;
  getChange: () => number;
  getItemCount: () => number;

  // Saved Orders Feature (Simpan Pesanan Sebelum Dibayar)
  saveCurrentOrder: (note: string, cashierName?: string) => SavedOrder | null;
  loadSavedOrder: (id: string) => boolean;
  deleteSavedOrder: (id: string) => void;
  updateSavedOrderNote: (id: string, note: string) => void;
  setSavedOrders: (orders: SavedOrder[]) => void;
}

const initialCart = getInitialActiveCart();

export const useCartStore = create<CartStore>((set, get) => ({
  items: initialCart.items,
  customerName: initialCart.customerName,
  customerNote: initialCart.customerNote,
  discount: initialCart.discount,
  paymentMethod: initialCart.paymentMethod,
  tenderAmount: initialCart.tenderAmount,
  savedOrders: getInitialSavedOrders(),

  addItem: (product: Product, qty = 1) => {
    const { items } = get();
    const existingIndex = items.findIndex((it) => it.product.id === product.id);
    let updatedItems: CartItem[];

    if (existingIndex > -1) {
      const existing = items[existingIndex];
      const newQty = existing.qty + qty;
      if (newQty > product.stock) {
        return false; // exceeds stock
      }
      updatedItems = [...items];
      updatedItems[existingIndex] = {
        ...existing,
        qty: newQty,
        subtotal: newQty * product.price,
      };
    } else {
      if (product.stock < qty) {
        return false;
      }
      updatedItems = [
        ...items,
        {
          product,
          qty,
          subtotal: qty * product.price,
        },
      ];
    }

    // Auto set tender amount if cash and previously set lower than total
    const subtotal = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const total = Math.max(0, subtotal - get().discount);
    const newTenderAmount =
      get().paymentMethod === 'TUNAI' && get().tenderAmount < total
        ? total
        : get().tenderAmount;

    set({
      items: updatedItems,
      tenderAmount: newTenderAmount,
    });

    persistActiveCart({
      items: updatedItems,
      customerName: get().customerName,
      customerNote: get().customerNote,
      discount: get().discount,
      paymentMethod: get().paymentMethod,
      tenderAmount: newTenderAmount,
    });

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

    const updatedItems = items.map((it) =>
      it.product.id === productId
        ? { ...it, qty, subtotal: qty * it.product.price }
        : it
    );

    set({ items: updatedItems });
    persistActiveCart({
      items: updatedItems,
      customerName: get().customerName,
      customerNote: get().customerNote,
      discount: get().discount,
      paymentMethod: get().paymentMethod,
      tenderAmount: get().tenderAmount,
    });
  },

  removeItem: (productId: string) => {
    const updatedItems = get().items.filter((it) => it.product.id !== productId);
    set({ items: updatedItems });
    persistActiveCart({
      items: updatedItems,
      customerName: get().customerName,
      customerNote: get().customerNote,
      discount: get().discount,
      paymentMethod: get().paymentMethod,
      tenderAmount: get().tenderAmount,
    });
  },

  clearCart: () => {
    const emptyActive: ActiveCartData = {
      items: [],
      discount: 0,
      tenderAmount: 0,
      customerName: DEFAULT_ACTIVE_CART.customerName,
      customerNote: '',
      paymentMethod: 'TUNAI',
    };
    set(emptyActive);
    persistActiveCart(emptyActive);
  },

  clearAllCartData: () => {
    clearAllCartLocalStorage();
    const emptyActive: ActiveCartData = {
      items: [],
      discount: 0,
      tenderAmount: 0,
      customerName: DEFAULT_ACTIVE_CART.customerName,
      customerNote: '',
      paymentMethod: 'TUNAI',
    };
    set({
      ...emptyActive,
      savedOrders: [],
    });
  },

  setCustomer: (name: string, note = '') => {
    set({ customerName: name, customerNote: note });
    persistActiveCart({
      items: get().items,
      customerName: name,
      customerNote: note,
      discount: get().discount,
      paymentMethod: get().paymentMethod,
      tenderAmount: get().tenderAmount,
    });
  },

  setDiscount: (discount: number) => {
    const newDiscount = Math.max(0, discount);
    set({ discount: newDiscount });
    persistActiveCart({
      items: get().items,
      customerName: get().customerName,
      customerNote: get().customerNote,
      discount: newDiscount,
      paymentMethod: get().paymentMethod,
      tenderAmount: get().tenderAmount,
    });
  },

  setPaymentMethod: (paymentMethod: PaymentMethod) => {
    const total = get().getTotal();
    const tenderAmount =
      paymentMethod === 'TUNAI'
        ? get().tenderAmount < total
          ? total
          : get().tenderAmount
        : total;

    set({ paymentMethod, tenderAmount });
    persistActiveCart({
      items: get().items,
      customerName: get().customerName,
      customerNote: get().customerNote,
      discount: get().discount,
      paymentMethod,
      tenderAmount,
    });
  },

  setTenderAmount: (tenderAmount: number) => {
    const amount = Math.max(0, tenderAmount);
    set({ tenderAmount: amount });
    persistActiveCart({
      items: get().items,
      customerName: get().customerName,
      customerNote: get().customerNote,
      discount: get().discount,
      paymentMethod: get().paymentMethod,
      tenderAmount: amount,
    });
  },

  applyQuickTender: (amount: number | 'UANG_PAS') => {
    const total = get().getTotal();
    const tender = amount === 'UANG_PAS' ? total : amount;
    set({ tenderAmount: tender });
    persistActiveCart({
      items: get().items,
      customerName: get().customerName,
      customerNote: get().customerNote,
      discount: get().discount,
      paymentMethod: get().paymentMethod,
      tenderAmount: tender,
    });
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

  // Simpan Pesanan Sebelum Dibayar
  saveCurrentOrder: (note: string, cashierName = 'Kasir') => {
    const { items, paymentMethod, tenderAmount, getTotal, getItemCount, savedOrders } = get();
    if (items.length === 0) return null;

    const trimmedNote = note.trim();
    const randomSeq = Math.floor(100 + Math.random() * 900);
    const orderNumber = `HOLD-${randomSeq}`;
    const id = `saved-${Date.now()}`;

    const newSavedOrder: SavedOrder = {
      id,
      orderNumber,
      note: trimmedNote || 'Pesanan Disimpan Sementara',
      items: [...items],
      total: getTotal(),
      itemCount: getItemCount(),
      paymentMethod,
      tenderAmount,
      cashierName,
      createdAt: new Date().toISOString(),
    };

    const updatedSavedOrders = [newSavedOrder, ...savedOrders];
    persistSavedOrders(updatedSavedOrders);

    // Empty active cart so cashier is ready for next customer
    const emptyActive: ActiveCartData = {
      items: [],
      discount: 0,
      tenderAmount: 0,
      customerName: DEFAULT_ACTIVE_CART.customerName,
      customerNote: '',
      paymentMethod: 'TUNAI',
    };

    set({
      savedOrders: updatedSavedOrders,
      ...emptyActive,
    });
    persistActiveCart(emptyActive);

    return newSavedOrder;
  },

  loadSavedOrder: (id: string) => {
    const { savedOrders } = get();
    const targetOrder = savedOrders.find((so) => so.id === id);
    if (!targetOrder) return false;

    // Load items and payment setup into active cart
    const loadedActive: ActiveCartData = {
      items: [...targetOrder.items],
      paymentMethod: targetOrder.paymentMethod || 'TUNAI',
      tenderAmount: targetOrder.tenderAmount || targetOrder.total,
      discount: 0,
      customerName: DEFAULT_ACTIVE_CART.customerName,
      customerNote: '',
    };

    // Remove from saved list
    const remaining = savedOrders.filter((so) => so.id !== id);
    persistSavedOrders(remaining);

    set({
      ...loadedActive,
      savedOrders: remaining,
    });
    persistActiveCart(loadedActive);

    return true;
  },

  deleteSavedOrder: (id: string) => {
    const { savedOrders } = get();
    const remaining = savedOrders.filter((so) => so.id !== id);
    persistSavedOrders(remaining);
    set({ savedOrders: remaining });
  },

  updateSavedOrderNote: (id: string, note: string) => {
    const { savedOrders } = get();
    const updated = savedOrders.map((so) =>
      so.id === id ? { ...so, note: note.trim() } : so
    );
    persistSavedOrders(updated);
    set({ savedOrders: updated });
  },

  setSavedOrders: (orders: SavedOrder[]) => {
    persistSavedOrders(orders);
    set({ savedOrders: orders });
  },
}));

/**
 * Convenience helper to clear both active cart and saved orders from store and localStorage.
 * Ideal to call upon logout or user session switch.
 */
export const clearCartStoreAndStorage = () => {
  useCartStore.getState().clearAllCartData();
};
