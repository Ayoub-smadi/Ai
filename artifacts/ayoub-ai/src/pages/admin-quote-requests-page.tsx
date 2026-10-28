import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock3, FileSpreadsheet, MapPin, Package, Phone, RefreshCw, Sprout } from 'lucide-react';
import { Link } from 'wouter';
import { getQuoteRequests, type QuoteRequest } from '@/data/quote-requests';

export default function AdminQuoteRequestsPage() {
  const [requests, setRequests] = useState<QuoteRequest[]>(getQuoteRequests);
  const [activeId, setActiveId] = useState('');
  const refresh = () => setRequests(getQuoteRequests());
  useEffect(() => {
    const handle = () => refresh();
    window.addEventListener('qadri-quote-requests-updated', handle);
    window.addEventListener('storage', handle);
    return () => { window.removeEventListener('qadri-quote-requests-updated', handle); window.removeEventListener('storage', handle); };
  }, []);
  const active = requests.find((request) => request.id === activeId);
  const pendingCount = requests.filter((request) => request.status === 'pending').length;

  return <main className="admin-page quote-requests-page" dir="rtl">
    <header className="admin-head"><div><div className="eyebrow">QADRI AI / SALES INBOX</div><h1>طلبات عروض الأسعار</h1><p className="page-desc">راجع طلبات الزبائن وافتح أي طلب في محرر عرض السعر لتسعيره وتعديله.</p></div><div className="admin-head-actions"><Link className="btn secondary small" href="/admin"><ArrowRight size={14} />لوحة التحكم</Link><button className="btn secondary small" onClick={refresh}><RefreshCw size={14} />تحديث</button></div></header>
    <div className="quote-requests-summary"><section className="panel"><span>إجمالي الطلبات</span><strong>{requests.length}</strong></section><section className="panel"><span>بانتظار التسعير</span><strong>{pendingCount}</strong></section><section className="panel"><span>تم تسعيرها</span><strong>{requests.length - pendingCount}</strong></section></div>
    <div className="quote-requests-layout">
      <section className="panel quote-request-list"><div className="panel-head"><div><h2 className="panel-title">الوارد</h2><div className="panel-kicker">اضغط على الطلب لمراجعة التفاصيل</div></div><span className="training-count">{requests.length}</span></div>
        {requests.length ? requests.map((request) => <button type="button" key={request.id} className={`quote-request-row ${active?.id === request.id ? 'active' : ''}`} onClick={() => setActiveId(request.id)}><span className="quote-request-row-icon"><Sprout size={17} /></span><span className="quote-request-row-main"><strong>{request.customerName}</strong><small>{request.items.length} بند · {request.phone}</small><small>{new Date(request.createdAt).toLocaleString('ar')}</small></span><span className={`quote-request-status ${request.status}`}>{request.status === 'pending' ? 'جديد' : 'تم التسعير'}</span></button>) : <div className="quote-request-empty"><Package size={25} /><h3>لا توجد طلبات حتى الآن</h3><p>ستظهر طلبات الزبائن هنا بعد إرسالها من صفحة طلب عرض السعر.</p></div>}
      </section>
      <section className="panel quote-request-detail">{active ? <><div className="quote-request-detail-head"><div><span className="eyebrow">REQUEST DETAILS</span><h2>{active.customerName}</h2></div><span className={`quote-request-status ${active.status}`}>{active.status === 'pending' ? 'بانتظار التسعير' : 'تم التسعير'}</span></div><div className="quote-request-meta"><div><Phone size={15} /><span dir="ltr">{active.phone}</span></div><div><MapPin size={15} /><span>{active.fulfillment === 'delivery' ? `توصيل · ${active.region}` : 'استلام من المشتل'}</span></div><div><Clock3 size={15} /><span>{new Date(active.createdAt).toLocaleString('ar')}</span></div></div><h3 className="quote-request-items-title">النباتات والكميات المطلوبة</h3><div className="quote-request-detail-items">{active.items.map((item, index) => <div key={`${item.id}-${index}`} className="quote-request-detail-item">{item.image ? <img src={item.image} alt="" /> : <span className="quote-request-item-thumb"><Sprout size={16} /></span>}<div><strong>{item.name}</strong><small>الحجم: {item.size} · الكمية: {item.quantity}</small><small>{item.category}</small></div></div>)}</div>{active.status === 'priced' && <div className="quote-request-priced-note"><FileSpreadsheet size={16} /> رقم العرض: {active.quoteNumber} · الإجمالي: {Number(active.quoteTotal || 0).toFixed(2)} د.أ</div>}<Link className="btn quote-request-edit-button" href={`/admin/quotes/new?request=${encodeURIComponent(active.id)}`}>{active.status === 'pending' ? 'فتح الطلب وتسعيره' : 'فتح وتعديل عرض السعر'}<ArrowLeft size={15} /></Link></> : <div className="quote-request-empty quote-request-select"><Package size={26} /><h3>اختر طلبًا لمراجعته</h3><p>ستظهر بيانات الزبون والبنود وطريقة الاستلام هنا.</p></div>}</section>
    </div>
  </main>;
}
