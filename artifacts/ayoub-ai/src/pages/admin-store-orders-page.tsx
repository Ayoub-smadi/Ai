import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, LayoutDashboard, MapPin, Package, Phone, ShoppingBag, Truck } from 'lucide-react';
import { Link } from 'wouter';
import { getStoreOrders, updateStoreOrderStatus, type StoreOrder, type StoreOrderStatus } from '@/data/store-orders';

const statusLabels: Record<StoreOrderStatus, string> = {
  new: 'جديد',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  completed: 'مكتمل',
};

const formatMoney = (amount: number) => `${amount.toFixed(2)} د.أ`;

export default function AdminStoreOrdersPage() {
  const [orders, setOrders] = useState<StoreOrder[]>(getStoreOrders);

  useEffect(() => {
    const refresh = () => setOrders(getStoreOrders());
    window.addEventListener('storage', refresh);
    window.addEventListener('qadri-store-orders-updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('qadri-store-orders-updated', refresh);
    };
  }, []);

  const stats = useMemo(() => ({
    new: orders.filter((order) => order.status === 'new').length,
    processing: orders.filter((order) => order.status === 'processing').length,
    shipped: orders.filter((order) => order.status === 'shipped').length,
    completed: orders.filter((order) => order.status === 'completed').length,
  }), [orders]);

  const setStatus = (order: StoreOrder, status: StoreOrderStatus) => {
    updateStoreOrderStatus(order.id, status);
    setOrders(getStoreOrders());
  };

  return <main className="admin-page store-orders-page" dir="rtl">
    <header className="admin-head">
      <div><div className="eyebrow">QADRI AI / STORE DESK</div><h1>طلبات المتجر</h1><p className="page-desc">راجع بيانات العملاء والتوصيل، وحدّث حالة كل طلب حتى اكتماله.</p></div>
      <div className="admin-head-actions"><Link className="btn secondary" href="/admin"><LayoutDashboard size={14} />لوحة التحكم</Link><Link className="btn secondary" href="/admin/store"><ShoppingBag size={14} />إدارة المتجر</Link></div>
    </header>

    <div className="store-orders-summary">
      <section className="panel store-order-stat"><span><Package size={16} />إجمالي الطلبات</span><strong>{orders.length}</strong></section>
      <section className="panel store-order-stat"><span><Clock3 size={16} />جديدة</span><strong>{stats.new}</strong></section>
      <section className="panel store-order-stat"><span><Truck size={16} />قيد التجهيز</span><strong>{stats.processing}</strong></section>
      <section className="panel store-order-stat"><span><CheckCircle2 size={16} />مكتملة</span><strong>{stats.completed}</strong></section>
    </div>

    <section className="panel store-orders-panel">
      <div className="panel-head"><div><h2 className="panel-title">سجل طلبات المتجر</h2><div className="panel-kicker">طلبات المتجر منفصلة عن طلبات عروض الأسعار.</div></div><span className="training-count">{orders.length}</span></div>
      {orders.length ? <div className="store-orders-list">{orders.map((order) => <article className="store-order-card" key={order.id}>
        <div className="store-order-row">
          <div className="store-order-icon"><ShoppingBag size={18} /></div>
          <div className="store-order-main"><strong>{order.customerName || 'عميل المتجر'}</strong><span>{order.items.map((item) => `${item.name} × ${item.quantity}`).join('، ')}</span></div>
          <div className="store-order-meta"><b>{order.total !== undefined ? formatMoney(order.total) : 'السعر عند التأكيد'}</b><small>{new Date(order.createdAt).toLocaleString('ar-JO')}</small></div>
          <span className={`store-order-status status-${order.status || 'new'}`}>{statusLabels[order.status || 'new']}</span>
        </div>
        <div className="store-order-customer-details">
          <a href={`tel:${order.phone}`} dir="ltr"><Phone size={14} />{order.phone}</a>
          <span><MapPin size={14} />{order.region}{order.address ? ` · ${order.address}` : ''}</span>
        </div>
        <div className="store-order-update-row">
          <label htmlFor={`store-order-status-${order.id}`}>تحديث حالة الطلب</label>
          <select id={`store-order-status-${order.id}`} value={order.status || 'new'} onChange={(event) => setStatus(order, event.target.value as StoreOrderStatus)}>
            {(Object.entries(statusLabels) as [StoreOrderStatus, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <small>رقم الطلب: <b dir="ltr">{order.id}</b></small>
        </div>
      </article>)}</div> : <div className="store-orders-empty"><div><ShoppingBag size={29} /></div><h3>لا توجد طلبات متجر بعد</h3><p>عند إرسال طلب شراء من المتجر سيظهر هنا مع بيانات العميل وموقع التوصيل.</p><Link className="btn" href="/store">فتح المتجر <ArrowRight size={14} /></Link></div>}
    </section>
  </main>;
}
