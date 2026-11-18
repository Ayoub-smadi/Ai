import { useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, CheckCircle2, MapPin, ShoppingCart } from 'lucide-react';
import { submitStoreOrder, type StoreOrder } from '@/data/store-orders';
import { saveStoreCart } from '@/data/store-cart';
import { useStoreCart } from '@/hooks/use-store-cart';

const money = (amount: number) => `${amount.toFixed(2)} د.أ`;

export default function StoreCheckoutPage() {
  const { items } = useStoreCart();
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [address, setAddress] = useState('');
  const [submittedOrder, setSubmittedOrder] = useState<StoreOrder | null>(null);
  const total = items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
  const missingPrices = items.some((item) => item.price === undefined);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!items.length) return;
    const order = submitStoreOrder({
      customerName: customerName.trim(),
      phone: phone.trim(),
      region: region.trim(),
      address: address.trim() || undefined,
      items: items.map((item) => ({ ...item })),
      ...(!missingPrices ? { total } : {}),
    });
    saveStoreCart([]);
    setSubmittedOrder(order);
  };

  if (submittedOrder) return <main className="store-flow-page" dir="rtl" lang="ar">
    <section className="store-flow-success">
      <div><CheckCircle2 size={36} /></div>
      <span className="store-flow-eyebrow">تم استلام طلبك</span>
      <h1>شكرًا لطلبك، {submittedOrder.customerName}</h1>
      <p>تم إرسال طلبك إلى سجل طلبات المتجر. سيتواصل معك فريقنا على الرقم المدخل لتأكيد التفاصيل والتوصيل.</p>
      <div className="store-order-reference"><span>رقم الطلب</span><strong dir="ltr">{submittedOrder.id}</strong><small>الحالة: جديد</small></div>
      <Link className="btn store-flow-primary" href="/store">العودة إلى المتجر <ArrowLeft size={16} /></Link>
    </section>
  </main>;

  if (!items.length) return <main className="store-flow-page" dir="rtl" lang="ar">
    <section className="store-flow-empty"><div><ShoppingCart size={28} /></div><h1>لا توجد منتجات لإتمام الطلب</h1><p>أضف المنتجات إلى السلة أولًا.</p><Link className="btn store-flow-primary" href="/store">العودة إلى المتجر <ArrowLeft size={16} /></Link></section>
  </main>;

  return <main className="store-flow-page" dir="rtl" lang="ar">
    <header className="store-flow-header">
      <span className="store-flow-eyebrow">المتجر الزراعي</span>
      <h1>إتمام الشراء</h1>
      <p>أدخل بيانات التواصل وموقع التوصيل لإرسال طلبك إلى الإدارة.</p>
    </header>
    <div className="store-flow-layout store-checkout-layout">
      <form className="store-checkout-form" onSubmit={submit}>
        <h2>بيانات العميل والتوصيل</h2>
        <label className="store-checkout-field"><span>الاسم الكامل <b>*</b></span><input name="customerName" value={customerName} onChange={(event) => setCustomerName(event.target.value)} autoComplete="name" required maxLength={100} placeholder="الاسم الذي سيتم تسجيل الطلب به" /></label>
        <label className="store-checkout-field"><span>رقم الهاتف <b>*</b></span><input name="phone" type="tel" dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required minLength={7} maxLength={24} placeholder="07XXXXXXXX" /></label>
        <label className="store-checkout-field"><span><MapPin size={14} /> المنطقة / المدينة <b>*</b></span><input name="region" value={region} onChange={(event) => setRegion(event.target.value)} autoComplete="address-level2" required maxLength={120} placeholder="مثال: جرش، سوف" /></label>
        <label className="store-checkout-field"><span>تفاصيل عنوان التوصيل <small>(اختياري)</small></span><textarea name="address" value={address} onChange={(event) => setAddress(event.target.value)} autoComplete="street-address" maxLength={300} rows={3} placeholder="الحي، الشارع، أقرب معلم..." /></label>
        <button className="btn store-flow-primary" type="submit">إرسال الطلب <ArrowLeft size={16} /></button>
        <p className="store-checkout-privacy">لن يُرسل الطلب إلا بعد ضغطك على «إرسال الطلب».</p>
      </form>

      <aside className="store-checkout-summary">
        <h2>مراجعة المنتجات</h2>
        <div className="store-checkout-items">{items.map((item) => <div key={item.productId}><span>{item.name} × {item.quantity}</span><strong>{item.price !== undefined ? money(item.price * item.quantity) : 'السعر عند التأكيد'}</strong></div>)}</div>
        <div className="store-checkout-total"><span>المجموع</span><strong>{missingPrices ? 'يُحدَّد عند التأكيد' : money(total)}</strong></div>
        {missingPrices && <p className="store-checkout-privacy">بعض المنتجات بلا سعر مُدخل؛ ستؤكد الإدارة السعر معك قبل التجهيز.</p>}
        <Link className="store-flow-back" href="/cart">العودة إلى السلة</Link>
      </aside>
    </div>
  </main>;
}
