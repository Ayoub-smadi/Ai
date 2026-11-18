import { useEffect, useRef, useState } from 'react';
import { BellRing, Volume2, VolumeX } from 'lucide-react';
import { getQuoteRequests } from '@/data/quote-requests';
import { toast } from '@/hooks/use-toast';

type StoreOrder = {
  id: string;
  status?: 'new' | 'processing' | 'shipped' | 'completed';
  customerName?: string;
  items?: Array<{ name: string; quantity: number }>;
};

const ALERTS_KEY = 'qadri-order-alerts-enabled-v1';
const STORE_ORDERS_KEY = 'qadri-store-orders-v1';
const SUMMARY_SHOWN_KEY = 'qadri-admin-order-summary-shown-v1';
let sharedAudioContext: AudioContext | null = null;
let notificationPermissionRequest: Promise<NotificationPermission> | null = null;

function getAudioContext() {
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  sharedAudioContext ??= new window.AudioContext();
  return sharedAudioContext;
}

function readStoreOrders(): StoreOrder[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORE_ORDERS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed as StoreOrder[] : [];
  } catch {
    return [];
  }
}

function playAlertTone() {
  try {
    const context = getAudioContext();
    if (!context) return;
    const play = () => {
      const notes = [660, 880, 990];
      notes.forEach((frequency, index) => {
        const start = context.currentTime + index * 0.16;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.15);
      });
    };
    if (context.state === 'suspended') void context.resume().then(play);
    else play();
  } catch {
    // Some browsers block audio until the user interacts with the page.
  }
}

export function activateOrderAlertsFromUserGesture() {
  localStorage.setItem(ALERTS_KEY, 'true');
  try {
    const context = getAudioContext();
    if (context?.state === 'suspended') void context.resume();
  } catch {
    // The admin page still shows in-app notifications if audio is unavailable.
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    notificationPermissionRequest = Notification.requestPermission();
  }
}

export default function OrderAlertControl() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(ALERTS_KEY) !== 'false');
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const seen = useRef<{ quotes: Set<string>; orders: Set<string> } | null>(null);

  const notify = (title: string, description: string, route?: string, id?: string, playSound = true) => {
    if (!enabledRef.current) return;
    if (playSound) playAlertTone();
    toast({ title, description });
    if (typeof Notification === 'undefined') return;
    const showSystemNotification = (permission: NotificationPermission) => {
      if (permission !== 'granted') return;
      try {
        const notification = new Notification(title, { body: description, tag: id ? `qadri-order-${id}` : 'qadri-order-summary' });
        if (route) notification.onclick = () => { window.focus(); window.location.assign(route); };
      } catch {
        // Keep the in-app toast and sound if system notifications are blocked.
      }
    };
    if (Notification.permission === 'granted') showSystemNotification('granted');
    else if (notificationPermissionRequest) void notificationPermissionRequest.then(showSystemNotification);
  };

  useEffect(() => {
    const refresh = () => {
      const quotes = getQuoteRequests();
      const orders = readStoreOrders();
      if (!seen.current) {
        seen.current = { quotes: new Set(quotes.map((request) => request.id)), orders: new Set(orders.map((order) => order.id)) };
        if (sessionStorage.getItem(SUMMARY_SHOWN_KEY) !== 'true') {
          sessionStorage.setItem(SUMMARY_SHOWN_KEY, 'true');
          const pendingQuotes = quotes.filter((request) => request.status === 'pending').length;
          const newOrders = orders.filter((order) => !order.status || order.status === 'new').length;
          notify('ملخص الطلبات الجديدة', `طلبات عروض الأسعار: ${pendingQuotes} · طلبات المتجر: ${newOrders}`, undefined, undefined, pendingQuotes + newOrders > 0);
        }
        return;
      }

      const previous = seen.current;
      for (const request of quotes) {
        if (!previous.quotes.has(request.id)) {
          notify('طلب عرض سعر جديد', `العميل: ${request.customerName} · ${request.items.length} بند`, '/admin/quote-requests', request.id);
        }
      }
      for (const order of orders) {
        if (!previous.orders.has(order.id)) {
          const itemCount = order.items?.length ?? 0;
          notify('طلب متجر جديد', `العميل: ${order.customerName || 'عميل المتجر'} · ${itemCount} منتج`, '/admin/store-orders', order.id);
        }
      }
      seen.current = { quotes: new Set(quotes.map((request) => request.id)), orders: new Set(orders.map((order) => order.id)) };
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === 'qadri-quote-requests-v1' || event.key === STORE_ORDERS_KEY) refresh();
    };
    refresh();
    window.addEventListener('qadri-quote-requests-updated', refresh);
    window.addEventListener('qadri-store-orders-updated', refresh);
    window.addEventListener('storage', handleStorage);
    const poll = window.setInterval(refresh, 5000);
    return () => {
      window.removeEventListener('qadri-quote-requests-updated', refresh);
      window.removeEventListener('qadri-store-orders-updated', refresh);
      window.removeEventListener('storage', handleStorage);
      window.clearInterval(poll);
    };
  }, []);

  const toggle = () => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    localStorage.setItem(ALERTS_KEY, String(next));
    if (next) {
      playAlertTone();
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        notificationPermissionRequest = Notification.requestPermission();
      }
      toast({ title: 'تم تفعيل تنبيهات الطلبات', description: 'سيصدر صوت ويظهر إشعار عند وصول طلب جديد.' });
    } else {
      toast({ title: 'تم إيقاف تنبيهات الطلبات' });
    }
  };

  return <button type="button" className={`order-alert-control ${enabled ? 'is-enabled' : ''}`} onClick={toggle} aria-pressed={enabled}>
    {enabled ? <Volume2 size={16} /> : <BellRing size={16} />}
    <span>{enabled ? 'إيقاف تنبيهات الطلبات' : 'تفعيل صوت وإشعارات الطلبات'}</span>
    {enabled ? <VolumeX size={14} /> : null}
  </button>;
}
