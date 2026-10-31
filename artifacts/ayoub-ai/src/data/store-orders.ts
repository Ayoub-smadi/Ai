import type { StoreCartItem } from './store-cart';

export type StoreOrderStatus = 'new' | 'processing' | 'shipped' | 'completed';
export type StoreOrder = {
  id: string;
  createdAt: string;
  customerName: string;
  phone: string;
  region: string;
  address?: string;
  items: StoreCartItem[];
  total?: number;
  status: StoreOrderStatus;
};

const STORAGE_KEY = 'qadri-store-orders-v1';

export function getStoreOrders(): StoreOrder[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed as StoreOrder[] : [];
  } catch {
    return [];
  }
}

function save(orders: StoreOrder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  window.dispatchEvent(new CustomEvent('qadri-store-orders-updated'));
}

export function submitStoreOrder(input: Omit<StoreOrder, 'id' | 'createdAt' | 'status'>): StoreOrder {
  const order: StoreOrder = {
    ...input,
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `store-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    status: 'new',
  };
  save([order, ...getStoreOrders()]);
  return order;
}

export function updateStoreOrderStatus(id: string, status: StoreOrderStatus) {
  save(getStoreOrders().map((order) => order.id === id ? { ...order, status } : order));
}
