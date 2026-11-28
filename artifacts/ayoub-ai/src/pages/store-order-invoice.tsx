import { useRef, useState } from 'react';
import { FileDown, Save, X } from 'lucide-react';
import type { StoreOrder, StoreOrderInvoice } from '@/data/store-orders';
import './store-order-invoice.css';

const makeInvoice = (order: StoreOrder): StoreOrderInvoice => ({
  number: `SALE-${order.id.slice(-8).toUpperCase()}`,
  date: new Date().toISOString().slice(0, 10),
  type: 'مبيعات اونلاين',
  paymentMethod: 'عند استلام الطلب',
  customerName: order.customerName || '',
  phone: order.phone || '',
  region: order.region || '',
  address: order.address || '',
  items: order.items.map((item) => ({ name: item.name, quantity: item.quantity, price: item.price ?? 0 })),
});

export default function StoreOrderInvoice({ order, onClose, onSave }: { order: StoreOrder; onClose: () => void; onSave: (invoice: StoreOrderInvoice) => void }) {
  const [invoice, setInvoice] = useState<StoreOrderInvoice>(() => ({ ...(order.invoice || makeInvoice(order)), type: 'مبيعات اونلاين', paymentMethod: 'عند استلام الطلب' }));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const sheetRef = useRef<HTMLElement>(null);
  const total = invoice.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const patch = (values: Partial<StoreOrderInvoice>) => setInvoice((current) => ({ ...current, ...values }));
  const updateLine = (index: number, values: Partial<StoreOrderInvoice['items'][number]>) => patch({ items: invoice.items.map((item, current) => current === index ? { ...item, ...values } : item) });
  const save = () => { onSave(invoice); setNotice('تم حفظ الفاتورة ويمكنك فتحها وتعديلها لاحقًا.'); };
  const downloadPdf = async () => {
    if (!sheetRef.current) return;
    setBusy(true);
    try {
      await document.fonts?.ready;
      await Promise.all(Array.from(sheetRef.current.querySelectorAll('img')).map((image) => image.decode().catch(() => undefined)));
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const canvas = await html2canvas(sheetRef.current, { scale: 2, backgroundColor: '#fff', logging: false });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const width = 190; const height = canvas.height * width / canvas.width; const fit = Math.min(1, 277 / height);
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', (210 - width * fit) / 2, 10, width * fit, height * fit);
      pdf.save(`${invoice.number || 'sales-invoice'}.pdf`);
    } catch (error) {
      console.error('Store order invoice PDF failed', error);
      window.alert('تعذر تنزيل الفاتورة PDF. حاول مرة أخرى.');
    } finally { setBusy(false); }
  };
  return <div className="store-order-invoice-backdrop" role="presentation" onClick={onClose}><section className="store-order-invoice-modal" role="dialog" aria-modal="true" aria-label="فاتورة مبيعات الطلب" onClick={(event) => event.stopPropagation()}>
    <header className="store-order-invoice-toolbar"><div><span className="eyebrow">STORE / SALES INVOICE</span><h2>فاتورة مبيعات · {order.id}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="إغلاق"><X size={18} /></button></header>
    <div className="store-order-invoice-columns"><form className="store-order-invoice-editor" onSubmit={(event) => { event.preventDefault(); save(); }}>
      <label>رقم الفاتورة<input value={invoice.number} onChange={(event) => patch({ number: event.target.value })} /></label><label>تاريخ الفاتورة<input type="date" value={invoice.date} onChange={(event) => patch({ date: event.target.value })} /></label>
      <label>الزبون<input value={invoice.customerName} onChange={(event) => patch({ customerName: event.target.value })} /></label><label>رقم الهاتف<input dir="ltr" value={invoice.phone} onChange={(event) => patch({ phone: event.target.value })} /></label>
      <label>المنطقة<input value={invoice.region} onChange={(event) => patch({ region: event.target.value })} /></label><label>العنوان<input value={invoice.address} onChange={(event) => patch({ address: event.target.value })} /></label>
      <strong className="store-order-invoice-fixed">نوع الفاتورة: مبيعات اونلاين <span>طريقة الدفع: عند استلام الطلب</span></strong>
      <h3>بنود الفاتورة</h3>{invoice.items.map((item, index) => <div className="store-order-invoice-line-edit" key={`${index}-${item.name}`}><label>الصنف<input value={item.name} onChange={(event) => updateLine(index, { name: event.target.value })} /></label><label>الكمية<input type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateLine(index, { quantity: Math.max(1, Number(event.target.value) || 1) })} /></label><label>سعر الوحدة (د.أ)<input type="number" min="0" step="0.001" value={item.price} onChange={(event) => updateLine(index, { price: Math.max(0, Number(event.target.value) || 0) })} /></label></div>)}
      <p className="store-order-invoice-total">الإجمالي: <b>{total.toFixed(3)} د.أ</b></p>{notice && <p role="status" className="store-order-invoice-notice">{notice}</p>}
      <footer><button className="btn secondary" type="submit"><Save size={14} />حفظ التعديلات</button><button className="btn" type="button" onClick={() => void downloadPdf()} disabled={busy}><FileDown size={15} />{busy ? 'جارٍ إنشاء PDF…' : 'تنزيل PDF'}</button></footer>
    </form>
    <article className="store-order-invoice-sheet" ref={sheetRef}>
      <header><div className="store-order-invoice-brand"><img src="/alqadri-logo.png" alt="" /><div><span>مؤسسة القادري الزراعية</span><h1>فاتورة مبيعات اونلاين</h1></div></div><div><b>{invoice.number}</b><small>{invoice.date}</small></div></header>
      <div className="store-order-invoice-badges"><span>نوع الفاتورة: مبيعات اونلاين</span><span>طريقة الدفع: عند استلام الطلب</span></div>
      <section className="store-order-invoice-customer"><p><b>الزبون:</b> {invoice.customerName || '—'}</p><p><b>الهاتف:</b> {invoice.phone || '—'}</p><p><b>المنطقة:</b> {invoice.region || '—'}</p><p><b>العنوان:</b> {invoice.address || '—'}</p></section>
      <table><thead><tr><th>الصنف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>{invoice.items.map((item, index) => <tr key={`${index}-${item.name}`}><td>{item.name}</td><td>{item.quantity}</td><td>{item.price.toFixed(3)} د.أ</td><td>{(item.quantity * item.price).toFixed(3)} د.أ</td></tr>)}</tbody></table>
      <strong className="store-order-invoice-sheet-total">المجموع: {total.toFixed(3)} د.أ</strong>
    </article></div>
  </section></div>;
}
