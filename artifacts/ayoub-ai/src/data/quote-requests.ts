export type QuoteRequestItem = {
  id: string;
  name: string;
  category: string;
  image?: string;
  size: string;
  quantity: number;
};

export type QuoteRequest = {
  id: string;
  createdAt: string;
  customerName: string;
  phone: string;
  fulfillment: 'delivery' | 'pickup';
  region: string;
  items: QuoteRequestItem[];
  status: 'pending' | 'priced';
  quoteNumber?: string;
  quoteTotal?: number;
};

const STORAGE_KEY = 'qadri-quote-requests-v1';

export function getQuoteRequests(): QuoteRequest[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed as QuoteRequest[] : [];
  } catch {
    return [];
  }
}

export function saveQuoteRequests(requests: QuoteRequest[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  window.dispatchEvent(new CustomEvent('qadri-quote-requests-updated'));
}

export function submitQuoteRequest(request: Omit<QuoteRequest, 'id' | 'createdAt' | 'status'>): QuoteRequest {
  const saved: QuoteRequest = {
    ...request,
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  saveQuoteRequests([saved, ...getQuoteRequests()]);
  return saved;
}
