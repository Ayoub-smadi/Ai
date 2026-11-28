import type { StoreProduct, StoreProductVariant } from './site-content';

export type StoreCartItem = {
  productId: string;
  variantId?: string;
  variantLabel?: string;
  name: string;
  image?: string;
  quantity: number;
  price?: number;
};

const STORAGE_KEY = 'qadri-store-cart-v1';

export function getStoreCartItemKey(item: Pick<StoreCartItem, 'productId' | 'variantId'>): string {
  return `${item.productId}::${item.variantId || 'default'}`;
}

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

function parsePrice(value: number | string | undefined): number | undefined {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  const price = Number(raw);
  return Number.isFinite(price) && price >= 0 ? price : undefined;
}

export function getStoreVariantLabel(variant?: StoreProductVariant): string {
  return variant ? [variant.size, variant.color].map((value) => value?.trim()).filter(Boolean).join(' — ') : '';
}

export function addProductToCart(items: StoreCartItem[], product: StoreProduct, variant?: StoreProductVariant): StoreCartItem[] {
  const variantId = variant?.id;
  const existing = items.find((item) => item.productId === product.id && item.variantId === variantId);
  if (existing) {
    return items.map((item) => item.productId === product.id && item.variantId === variantId ? { ...item, quantity: item.quantity + 1 } : item);
  }
  const variantLabel = getStoreVariantLabel(variant);
  const price = variant ? parsePrice(variant.price) : parsePrice(product.price);
  return [...items, {
    productId: product.id,
    ...(variantId ? { variantId } : {}),
    ...(variantLabel ? { variantLabel } : {}),
    name: [product.nameAr || product.nameEn || 'منتج', variantLabel].filter(Boolean).join(' — '),
    image: product.image || undefined,
    quantity: 1,
    ...(price !== undefined ? { price } : {}),
  }];
}

export function updateCartItemQuantity(items: StoreCartItem[], itemKey: string, quantity: number): StoreCartItem[] {
  if (quantity < 1) return items.filter((item) => getStoreCartItemKey(item) !== itemKey);
  return items.map((item) => getStoreCartItemKey(item) === itemKey ? { ...item, quantity } : item);
}

export function removeCartItem(items: StoreCartItem[], itemKey: string): StoreCartItem[] {
  return items.filter((item) => getStoreCartItemKey(item) !== itemKey);
}
