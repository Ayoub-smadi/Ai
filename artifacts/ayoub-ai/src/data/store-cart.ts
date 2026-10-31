import type { StoreProduct } from './site-content';

export type StoreCartItem = {
  productId: string;
  name: string;
  image?: string;
  quantity: number;
  price?: number;
};

const STORAGE_KEY = 'qadri-store-cart-v1';

export function getStoreCart(): StoreCartItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed as StoreCartItem[] : [];
  } catch {
    return [];
  }
}

export function saveStoreCart(items: StoreCartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('qadri-store-cart-updated'));
}

export function addProductToCart(items: StoreCartItem[], product: StoreProduct): StoreCartItem[] {
  const existing = items.find((item) => item.productId === product.id);
  if (existing) {
    return items.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
  }
  const rawPrice = String(product.price ?? '').trim();
  const parsedPrice = rawPrice ? Number(rawPrice) : Number.NaN;
  return [...items, {
    productId: product.id,
    name: product.nameAr || product.nameEn || 'منتج',
    image: product.image || undefined,
    quantity: 1,
    ...(Number.isFinite(parsedPrice) && parsedPrice >= 0 ? { price: parsedPrice } : {}),
  }];
}

export function updateCartItemQuantity(items: StoreCartItem[], productId: string, quantity: number): StoreCartItem[] {
  if (quantity < 1) return items.filter((item) => item.productId !== productId);
  return items.map((item) => item.productId === productId ? { ...item, quantity } : item);
}

export function removeCartItem(items: StoreCartItem[], productId: string): StoreCartItem[] {
  return items.filter((item) => item.productId !== productId);
}
