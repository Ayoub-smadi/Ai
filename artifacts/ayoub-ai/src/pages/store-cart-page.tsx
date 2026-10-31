import { Link } from 'wouter';
import { ArrowLeft, Minus, Plus, ShoppingBag, ShoppingCart, Trash2 } from 'lucide-react';
import { useStoreCart } from '@/hooks/use-store-cart';

const money = (amount: number) => `${amount.toFixed(2)} د.أ`;

export default function StoreCartPage() {
  const { items, setQuantity, removeProduct } = useStoreCart();
  const total = items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
  const missingPrices = items.some((item) => item.price === undefined);

  return <main className="store-flow-page" dir="rtl" lang="ar">
    <header className="store-flow-header">
      <span className="store-flow-eyebrow">المتجر الزراعي</span>
      <h1>سلة التسوق</h1>
      <p>راجع المنتجات والكميات قبل إرسال طلبك.</p>
    </header>

    {items.length ? <div className="store-flow-layout">
      <section className="store-cart-list" aria-label="منتجات السلة">
        {items.map((item) => <article className="store-cart-item" key={item.productId}>
          {item.image ? <img src={item.image} alt={item.name} /> : <div className="store-cart-image-placeholder"><ShoppingBag size={24} /></div>}
          <div className="store-cart-item-info">
            <h2>{item.name}</h2>
            <p>{item.price !== undefined ? money(item.price) : 'يُحدَّد السعر عند تأكيد الطلب'}</p>
            <div className="store-cart-item-controls">
              <div className="store-quantity-control" aria-label={`الكمية: ${item.quantity}`}>
                <button type="button" onClick={() => setQuantity(item.productId, item.quantity - 1)} aria-label="تقليل الكمية"><Minus size={14} /></button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => setQuantity(item.productId, item.quantity + 1)} aria-label="زيادة الكمية"><Plus size={14} /></button>
              </div>
              <button type="button" className="store-remove-item" onClick={() => removeProduct(item.productId)}><Trash2 size={14} />إزالة</button>
            </div>
          </div>
          <strong className="store-cart-line-total">{item.price !== undefined ? money(item.price * item.quantity) : '—'}</strong>
        </article>)}
      </section>

      <aside className="store-cart-summary">
        <h2>ملخص الطلب</h2>
        <div><span>عدد المنتجات</span><strong>{items.reduce((sum, item) => sum + item.quantity, 0)}</strong></div>
        <div><span>المجموع</span><strong>{missingPrices ? 'يُحدَّد لاحقًا' : money(total)}</strong></div>
        {missingPrices && <p>بعض المنتجات بلا سعر مُدخل؛ ستؤكد الإدارة السعر قبل تجهيز الطلب.</p>}
        <Link className="btn store-flow-primary" href="/checkout">متابعة الشراء <ArrowLeft size={16} /></Link>
        <Link className="store-flow-back" href="/store">متابعة التسوق</Link>
      </aside>
    </div> : <section className="store-flow-empty">
      <div><ShoppingCart size={28} /></div>
      <h2>سلتك فارغة</h2>
      <p>أضف المنتجات التي تريدها من المتجر لتظهر هنا.</p>
      <Link className="btn store-flow-primary" href="/store">العودة إلى المتجر <ArrowLeft size={16} /></Link>
    </section>}
  </main>;
}
