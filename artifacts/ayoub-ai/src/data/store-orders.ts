import type { StoreCartItem } from './store-cart';

export type StoreOrderStatus = 'new' | 'processing' | 'shipped' | 'completed';
export type StoreOrderInvoice = {
  number: string;
  date: string;
  type: 'مبيعات اونلاين';
  paymentMethod: 'عند استلام الطلب';
  customerName: string;
  phone: string;
  region: string;
  address: string;
  items: { name: string; quantity: number; price: number }[];
};
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
  invoice?: StoreOrderInvoice;
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

export function formatStoreOrderNumber(order: StoreOrder, orders: StoreOrder[] = getStoreOrders()): string {
  const formatDateTime = (createdAt: string) => new Intl.DateTimeFormat('ar-JO', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(new Date(createdAt));
  const dateTime = formatDateTime(order.createdAt);
  const matching = orders.filter((candidate) => candidate.id !== order.id && formatDateTime(candidate.createdAt) === dateTime);
  if (!matching.length) return dateTime;
  const customer = order.customerName.trim() || 'عميل';
  const duplicateName = matching.some((candidate) => (candidate.customerName.trim() || 'عميل') === customer);
  return `${dateTime} — ${customer}${duplicateName ? ` (${order.id.slice(-4)})` : ''}`;
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

export function saveStoreOrderInvoice(id: string, invoice: StoreOrderInvoice) {
  save(getStoreOrders().map((order) => order.id === id ? { ...order, invoice } : order));
}
