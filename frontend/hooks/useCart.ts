import { useCartStore } from '../stores/cartStore';

export function useCart() {
  const store = useCartStore();

  return {
    ...store,
    items: store.items,
    itemCount: store.getItemCount(),
    total: store.getTotal(),
  };
}

export default useCart;
