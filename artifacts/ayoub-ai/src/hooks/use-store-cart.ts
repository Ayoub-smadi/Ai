import { useEffect, useState } from 'react';
import { addProductToCart, getStoreCart, getStoreCartItemKey, removeCartItem, saveStoreCart, updateCartItemQuantity, type StoreCartItem } from '@/data/store-cart';
import type { StoreProduct, StoreProductVariant } from '@/data/site-content';

const CART_STORAGE_KEY = 'qadri-store-cart-v1';

export function useStoreCart() {
  const [items, setItems] = useState<StoreCartItem[]>(getStoreCart);

  useEffect(() => {
    const refresh = () => setItems(getStoreCart());
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === CART_STORAGE_KEY) refresh();
    };
    window.addEventListener('qadri-store-cart-updated', refresh);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('qadri-store-cart-updated', refresh);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const persist = (next: StoreCartItem[]) => {
    setItems(next);
    saveStoreCart(next);
  };
  const addProduct = (product: StoreProduct, variant?: StoreProductVariant) => persist(addProductToCart(getStoreCart(), product, variant));
  const setQuantity = (itemKey: string, quantity: number) => persist(updateCartItemQuantity(getStoreCart(), itemKey, quantity));
  const removeProduct = (itemKey: string) => persist(removeCartItem(getStoreCart(), itemKey));
  const clear = () => persist([]);

  return { items, addProduct, setQuantity, removeProduct, getItemKey: getStoreCartItemKey, clear };
}
