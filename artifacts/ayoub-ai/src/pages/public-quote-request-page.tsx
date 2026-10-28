import { useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, ChevronRight, Minus, Plus, Search, ShoppingBag, Sprout, Trash2, X } from 'lucide-react';
import { Link } from 'wouter';
import { quoteCatalog, type QuoteCatalogCategory, type QuoteCatalogItem } from '@/data/quote-catalog';
import { getManagedPlants } from '@/data/managed-plants';
import { submitQuoteRequest, type QuoteRequestItem } from '@/data/quote-requests';

type CartItem = QuoteRequestItem & { productId: string };
const plantSizes = ['صغير', 'متوسط', 'كبير'];

function catalogWithManagedPlants(): QuoteCatalogCategory[] {
  const plants = getManagedPlants();
  return [
    ...quoteCatalog.map((category) => category.items.some((item) => item.source === 'plant')
      ? { ...category, items: [...plants.filter((plant) => plant.categoryId === category.id), ...category.items.filter((item) => item.source !== 'plant')] }
      : category),
    ...[...new Set(plants.map((plant) => plant.categoryId))]
      .filter((id) => !quoteCatalog.some((category) => category.id === id))
      .map((id) => ({ id, nameAr: plants.find((plant) => plant.categoryId === id)?.categoryAr || 'نباتات', nameEn: 'Plants', icon: 'leaf' as const, accent: '#557b67', items: plants.filter((plant) => plant.categoryId === id) })),
  ];
}

export default function PublicQuoteRequestPage() {
  const categories = useMemo(catalogWithManagedPlants, []);
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id || '');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<QuoteCatalogItem | null>(null);
  const [selectedSize, setSelectedSize] = useState('متوسط');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup' | ''>('');
  const [region, setRegion] = useState('');
  const [submittedId, setSubmittedId] = useState('');

  const normalized = search.trim().toLocaleLowerCase();
  const visibleCategories = categories.map((category) => ({ ...category, items: category.items.filter((item) => !normalized || `${item.nameAr} ${item.nameEn} ${item.categoryAr}`.toLocaleLowerCase().includes(normalized)) })).filter((category) => category.items.length > 0);
  const currentCategory = visibleCategories.find((category) => category.id === activeCategory) || visibleCategories[0];
  const addProduct = () => {
    if (!selectedProduct) return;
    const productId = `${selectedProduct.id}::${selectedSize}`;
    setCart((items) => {
      const existing = items.find((item) => item.productId === productId);
      if (existing) return items.map((item) => item.productId === productId ? { ...item, quantity: item.quantity + selectedQuantity } : item);
      return [...items, { productId, id: selectedProduct.id, name: selectedProduct.nameAr, category: selectedProduct.categoryAr, image: selectedProduct.image, size: selectedSize, quantity: selectedQuantity }];
    });
    setSelectedProduct(null);
    setSelectedQuantity(1);
  };
  const setQuantity = (productId: string, quantity: number) => setCart((items) => items.map((item) => item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cart.length || !fulfillment || (fulfillment === 'delivery' && !region.trim())) return;
    const request = submitQuoteRequest({ customerName: customerName.trim(), phone: phone.trim(), fulfillment, region: fulfillment === 'delivery' ? region.trim() : '', items: cart.map(({ productId: _productId, ...item }) => item) });
    setSubmittedId(request.id);
    setCart([]);
  };

  return <main className="customer-quote-page" dir="rtl">
    <header className="customer-quote-header"><Link className="btn secondary small" href="/"><ArrowLeft size={15} />العودة للموقع</Link><div className="customer-quote-brand">قادري <span>AI</span></div><span className="customer-quote-label">طلب عرض سعر</span></header>
    {submittedId ? <section className="quote-success-card"><div className="quote-success-icon"><Check size={25} /></div><div className="eyebrow">تم استلام طلبك</div><h1>شكرًا لك، وصلنا طلب عرض السعر</h1><p>سيقوم فريق المشتل بمراجعته والتواصل معك على رقم الهاتف المسجّل.</p><div className="quote-request-reference">رقم الطلب <strong dir="ltr">{submittedId.slice(0, 8).toUpperCase()}</strong></div><Link className="btn" href="/">العودة للموقع</Link></section> : <>
      <section className="customer-quote-intro"><div className="eyebrow">QADRI NURSERY / QUOTE REQUEST</div><h1>اختر نباتاتك واطلب تسعيرها</h1><p>أضف النباتات التي ترغب بها، حدّد الحجم والكمية، ثم أرسل بيانات التواصل وطريقة الاستلام.</p></section>
      <div className="customer-quote-layout">
        <section className="customer-quote-catalog panel">
          <div className="customer-quote-toolbar"><label className="customer-quote-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث عن نبتة أو منتج..." /></label><span>{categories.reduce((total, category) => total + category.items.length, 0)} منتج</span></div>
          <div className="customer-quote-browser">
            <aside className="customer-quote-categories">{visibleCategories.map((category) => <button key={category.id} className={category.id === (currentCategory?.id || activeCategory) ? 'active' : ''} onClick={() => setActiveCategory(category.id)}><span className="quote-category-mark"><Sprout size={17} /></span><span><strong>{category.nameAr}</strong><small>{category.items.length} منتج</small></span><ChevronRight size={15} /></button>)}</aside>
            <div className="customer-quote-products">{currentCategory ? <><div className="customer-quote-category-title"><div><span className="eyebrow">{currentCategory.nameEn}</span><h2>{currentCategory.nameAr}</h2></div><span>{currentCategory.items.length} منتج</span></div><div className="customer-quote-product-grid">{currentCategory.items.map((item) => <button type="button" className="customer-quote-product" key={item.id} onClick={() => { setSelectedProduct(item); setSelectedSize('متوسط'); setSelectedQuantity(1); }}><span className="customer-quote-product-image">{item.image ? <img src={item.image} alt={item.nameAr} onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <Sprout size={25} />}</span><span className="customer-quote-product-name">{item.nameAr}</span><small>{item.categoryAr}</small><span className="customer-quote-add"><Plus size={14} /> أضف للطلب</span></button>)}</div></> : <div className="customer-quote-empty">لا توجد نتائج مطابقة. جرّب اسمًا آخر.</div>}</div>
          </div>
        </section>
        <aside className="customer-quote-order">
          <section className="panel customer-quote-cart"><div className="customer-quote-panel-heading"><div><span className="eyebrow">YOUR SELECTION</span><h2>النباتات المختارة</h2></div><span className="customer-quote-cart-count">{cart.reduce((total, item) => total + item.quantity, 0)}</span></div>
            {cart.length ? <div className="customer-quote-cart-list">{cart.map((item) => <div className="customer-quote-cart-item" key={item.productId}><div className="customer-quote-cart-info"><strong>{item.name}</strong><span>الحجم: {item.size}</span><label>الكمية <input type="number" min="1" value={item.quantity} onChange={(event) => setQuantity(item.productId, Number(event.target.value))} /></label></div><button type="button" className="icon-button" aria-label={`حذف ${item.name}`} onClick={() => setCart((items) => items.filter((entry) => entry.productId !== item.productId))}><Trash2 size={15} /></button></div>)}</div> : <div className="customer-quote-cart-empty"><ShoppingBag size={20} /><span>لم تختر أي نبات بعد. اضغط على النباتات لإضافتها.</span></div>}
          </section>
          <form className="panel customer-quote-form" onSubmit={submit}>
            <div className="customer-quote-panel-heading"><div><span className="eyebrow">CONTACT & DELIVERY</span><h2>بيانات الطلب</h2></div></div>
            <label className="customer-quote-field">الاسم الكامل <span>*</span><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required maxLength={120} placeholder="اكتب اسمك الكامل" /></label>
            <label className="customer-quote-field">رقم الهاتف <span>*</span><input type="tel" dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} required maxLength={32} placeholder="07XXXXXXXX" /></label>
            <fieldset className="customer-quote-fulfillment"><legend>طريقة الاستلام <span>*</span></legend><label className={fulfillment === 'delivery' ? 'active' : ''}><input type="radio" name="fulfillment" required value="delivery" checked={fulfillment === 'delivery'} onChange={() => setFulfillment('delivery')} />توصيل إلى العنوان</label><label className={fulfillment === 'pickup' ? 'active' : ''}><input type="radio" name="fulfillment" required value="pickup" checked={fulfillment === 'pickup'} onChange={() => setFulfillment('pickup')} />استلام من المشتل</label></fieldset>
            {fulfillment === 'delivery' && <label className="customer-quote-field">منطقة التوصيل <span>*</span><input value={region} onChange={(event) => setRegion(event.target.value)} required maxLength={120} placeholder="اسم المنطقة أو الحي" /></label>}
            <button type="submit" className="btn customer-quote-submit" disabled={!cart.length || !customerName.trim() || !phone.trim() || !fulfillment || (fulfillment === 'delivery' && !region.trim())}>إرسال طلب عرض السعر <ArrowLeft size={16} /></button>
            <p className="customer-quote-required-note">جميع البيانات المطلوبة مميّزة بنجمة (*)</p>
          </form>
        </aside>
      </div>
    </>}
    {selectedProduct && <div className="customer-quote-modal-backdrop" onClick={() => setSelectedProduct(null)}><section className="customer-quote-modal" onClick={(event) => event.stopPropagation()}><button type="button" className="icon-button customer-quote-modal-close" onClick={() => setSelectedProduct(null)} aria-label="إغلاق"><X size={18} /></button><div className="customer-quote-modal-picture">{selectedProduct.image ? <img src={selectedProduct.image} alt={selectedProduct.nameAr} /> : <Sprout size={30} />}</div><span className="eyebrow">{selectedProduct.categoryAr}</span><h2>{selectedProduct.nameAr}</h2><p>{selectedProduct.descriptionAr}</p><label className="customer-quote-field">الحجم <span>*</span><select value={selectedSize} onChange={(event) => setSelectedSize(event.target.value)}>{plantSizes.map((size) => <option key={size}>{size}</option>)}</select></label><label className="customer-quote-field">الكمية <span>*</span><div className="customer-quote-quantity"><button type="button" onClick={() => setSelectedQuantity((value) => Math.max(1, value - 1))} aria-label="تقليل الكمية"><Minus size={15} /></button><input type="number" min="1" value={selectedQuantity} onChange={(event) => setSelectedQuantity(Math.max(1, Number(event.target.value)))} /><button type="button" onClick={() => setSelectedQuantity((value) => value + 1)} aria-label="زيادة الكمية"><Plus size={15} /></button></div></label><div className="customer-quote-modal-actions"><button type="button" className="btn" onClick={addProduct}><Plus size={15} />إضافة إلى الطلب</button><button type="button" className="btn secondary" onClick={() => setSelectedProduct(null)}>إلغاء</button></div></section></div>}
  </main>;
}
