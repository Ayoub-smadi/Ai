import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, LayoutDashboard, Package, ShoppingBag, Truck } from 'lucide-react';
import { Link } from 'wouter';

type StoreOrder = {
  id: string;
  createdAt: string;
  customerName: string;
  phone: string;
  items: Array<{ name: string; quantity: number; price?: number }>;
  total?: number;
  status?: 'new' | 'processing' | 'shipped' | 'completed';
};

const STORAGE_KEY = 'qadri-store-orders-v1';
const readOrders = (): StoreOrder[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as StoreOrder[]; } catch { return []; }
};

export default function AdminStoreOrdersPage() {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  useEffect(() => {
    const refresh = () => setOrders(readOrders());
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('qadri-store-orders-updated', refresh);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('qadri-store-orders-updated', refresh); };
  }, []);
  const stats = useMemo(() => ({ new: orders.filter((order) => !order.status || order.status === 'new').length, processing: orders.filter((order) => order.status === 'processing').length, completed: orders.filter((order) => order.status === 'completed').length }), [orders]);
  return <main className="admin-page store-orders-page" dir="rtl">
    <div className="admin-head"><div><div className="eyebrow">QADRI AI / STORE DESK</div><h1>طلبات المتجر</h1><p className="page-desc">سجل مستقل لطلبات شراء منتجات المتجر، بعيدًا عن طلبات عروض الأسعار.</p></div><div className="admin-head-actions"><Link className="btn secondary" href="/admin"><LayoutDashboard size={14} />لوحة التحكم</Link><Link className="btn secondary" href="/admin/store"><ShoppingBag size={14} />إدارة المتجر</Link></div></div>
    <div className="store-orders-summary"><section className="panel store-order-stat"><span><Package size={16} />إجمالي الطلبات</span><strong>{orders.length}</strong></section><section className="panel store-order-stat"><span><Clock3 size={16} />طلبات جديدة</span><strong>{stats.new}</strong></section><section className="panel store-order-stat"><span><Truck size={16} />قيد التجهيز</span><strong>{stats.processing}</strong></section><section className="panel store-order-stat"><span><CheckCircle2 size={16} />مكتملة</span><strong>{stats.completed}</strong></section></div>
    <section className="panel store-orders-panel"><div className="panel-head"><div><h2 className="panel-title">سجل طلبات المتجر</h2><div className="panel-kicker">هذه القائمة منفصلة بالكامل عن صفحة طلبات عروض الأسعار.</div></div><span className="training-count">{orders.length}</span></div>{orders.length ? <div className="store-orders-list">{orders.map((order) => <article className="store-order-row" key={order.id}><div className="store-order-icon"><ShoppingBag size={18} /></div><div className="store-order-main"><strong>{order.customerName || 'عميل المتجر'}</strong><span>{order.items.map((item) => `${item.name} × ${item.quantity}`).join('، ')}</span></div><div className="store-order-meta"><b>{order.total ? `${order.total.toFixed(2)} د.أ` : 'بدون إجمالي'}</b><small>{new Date(order.createdAt).toLocaleDateString('ar-JO')}</small></div><span className={`store-order-status status-${order.status || 'new'}`}>{order.status === 'completed' ? 'مكتمل' : order.status === 'processing' ? 'قيد التجهيز' : order.status === 'shipped' ? 'تم الشحن' : 'جديد'}</span></article>)}</div> : <div className="store-orders-empty"><div><ShoppingBag size={29} /></div><h3>لا توجد طلبات متجر بعد</h3><p>عند وصول طلب شراء من المتجر سيظهر هنا بشكل مستقل، ولن يظهر ضمن طلبات عروض الأسعار.</p><Link className="btn" href="/admin/store">إدارة منتجات المتجر <ArrowRight size={14} /></Link></div>}</section>
  </main>;
}
