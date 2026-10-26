import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Check, ImagePlus, LoaderCircle, Package, Plus, RefreshCw, Save, ShoppingBag, Sparkles,
  Upload, X,
} from 'lucide-react';

type EntityId = string | number;
type Product = {
  id: EntityId;
  nameArabic: string;
  nameEnglish: string;
  description?: string | null;
  category?: string | null;
  price: number | string;
  currency?: string | null;
  stockQuantity: number;
  imageId?: EntityId | null;
  imageUrl?: string | null;
  sku?: string | null;
  isPublished?: boolean;
};
type ProductInput = {
  nameArabic: string;
  nameEnglish: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  sku: string;
  stockQuantity: number;
  imageId: EntityId | null;
  isPublished: boolean;
};
type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
type QuoteStatus = 'requested' | 'reviewing' | 'quoted' | 'accepted' | 'declined' | 'expired';
type OrderItem = { productId?: EntityId; quantity?: number; name?: string; nameArabic?: string; nameEnglish?: string };
type StoreOrder = {
  id: EntityId;
  customerName?: string;
  phone?: string;
  email?: string | null;
  deliveryAddress?: string;
  items?: OrderItem[];
  customerNote?: string | null;
  total?: number | string;
  currency?: string | null;
  status: OrderStatus;
  adminNote?: string | null;
  createdAt?: string;
};
type StoreQuote = {
  id: EntityId;
  customerName?: string;
  phone?: string;
  email?: string | null;
  request?: string;
  status: QuoteStatus;
  quotedTotal?: number | null;
  currency?: string | null;
  adminNote?: string | null;
  createdAt?: string;
};
type ApiAsset = { id: EntityId; url: string };

const ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const QUOTE_STATUSES: QuoteStatus[] = ['requested', 'reviewing', 'quoted', 'accepted', 'declined', 'expired'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body) headers.set('Content-Type', 'application/json');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers.set('X-App-Request', '1');
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers,
  });
  const responseText = await response.text();
  let result: unknown;
  if (responseText) {
    try { result = JSON.parse(responseText); }
    catch { result = responseText; }
  }
  if (!response.ok) {
    const payload = result && typeof result === 'object' ? result as { error?: unknown; message?: unknown } : {};
    const message = typeof payload.error === 'string' ? payload.error : typeof payload.message === 'string'
      ? payload.message
      : `تعذّر إكمال الطلب (HTTP ${response.status}).`;
    throw new Error(message);
  }
  return result as T;
}

async function getArray<T>(path: string): Promise<T[]> {
  const data = await apiRequest<unknown>(path);
  if (!Array.isArray(data)) throw new Error('استجابة الخادم غير متوقعة.');
  return data as T[];
}

function getError(error: unknown): string {
  return error instanceof Error ? error.message : 'حدث خطأ غير متوقع. حاول مرة أخرى.';
}
function displayMoney(price: number | string, currency?: string | null) {
  const amount = Number.isFinite(Number(price)) ? Number(price) : 0;
  return `${new Intl.NumberFormat('ar', { maximumFractionDigits: 2 }).format(amount)} ${currency || 'JOD'}`;
}
function formatDate(date?: string) {
  if (!date) return '—';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat('ar', { dateStyle: 'medium' }).format(parsed);
}
function idKey(id: EntityId) { return String(id); }

function Notice({ kind, children }: { kind: 'success' | 'error'; children: ReactNode }) {
  return <div role={kind === 'error' ? 'alert' : 'status'} className={`store-notice ${kind}`}>
    {kind === 'success' ? <Check size={15} /> : <X size={15} />}{children}
  </div>;
}
function SectionTitle({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: ReactNode }) {
  return <div className="page-head">
    <div><div className="eyebrow">{eyebrow}</div><h2 className="store-section-title">{title}</h2>{detail && <p className="page-desc">{detail}</p>}</div>
    {action}
  </div>;
}
function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="empty-state"><div className="empty-mark"><Sparkles size={18} /></div><h3>{title}</h3><p>{detail}</p></div>;
}
function LoadingState({ label }: { label: string }) {
  return <div className="loading-state" role="status"><LoaderCircle size={19} className="store-spin" /> {label}</div>;
}
function InlineError({ detail, onRetry }: { detail: string; onRetry: () => void }) {
  return <div className="error-state panel"><div className="empty-mark"><X size={18} /></div><h3>تعذّر تحميل البيانات</h3><p>{detail}</p><button className="btn secondary small" onClick={onRetry} type="button"><RefreshCw size={13} /> إعادة المحاولة</button></div>;
}

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-900/10';
const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-700';

export function PublicStorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderMessage, setOrderMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getArray<Product>('/api/store/products');
      setProducts(data);
      setSelectedId((current) => data.some((product) => idKey(product.id) === current) ? current : (data[0] ? idKey(data[0].id) : ''));
    } catch (error) { setLoadError(getError(error)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadProducts(); }, []);

  const selectedProduct = products.find((product) => idKey(product.id) === selectedId);
  const maxOrderQuantity = selectedProduct ? Math.max(1, Number(selectedProduct.stockQuantity) || 1) : 1;
  const shownProducts = useMemo(() => products, [products]);

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const orderForm = event.currentTarget;
    setOrderMessage(null);
    const form = new FormData(orderForm);
    const customerName = String(form.get('orderName') ?? '').trim();
    const phone = String(form.get('orderPhone') ?? '').trim();
    const address = String(form.get('orderAddress') ?? '').trim();
    if (!customerName || !phone || !address || !selectedProduct) {
      setOrderMessage({ kind: 'error', text: 'أكمل الاسم ورقم الهاتف وعنوان التوصيل واختر منتجاً.' });
      return;
    }
    if (Number(selectedProduct.stockQuantity) < quantity) {
      setOrderMessage({ kind: 'error', text: 'الكمية المطلوبة تتجاوز المخزون المتاح.' });
      return;
    }
    setOrderBusy(true);
    try {
      await apiRequest('/api/public/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName,
          phone,
          email: String(form.get('orderEmail') ?? '').trim() || undefined,
          address,
          items: [{ productId: selectedProduct.id, quantity }],
          note: String(form.get('orderNote') ?? '').trim(),
        }),
      });
      orderForm.reset();
      setQuantity(1);
      setOrderMessage({ kind: 'success', text: 'تم استلام طلبك بنجاح. سنتواصل معك لتأكيد التفاصيل.' });
    } catch (error) { setOrderMessage({ kind: 'error', text: getError(error) }); }
    finally { setOrderBusy(false); }
  }

  async function submitQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quoteForm = event.currentTarget;
    setQuoteMessage(null);
    const form = new FormData(quoteForm);
    const customerName = String(form.get('quoteName') ?? '').trim();
    const phone = String(form.get('quotePhone') ?? '').trim();
    const request = String(form.get('quoteRequest') ?? '').trim();
    if (!customerName || !phone || !request) {
      setQuoteMessage({ kind: 'error', text: 'أكمل الاسم ورقم الهاتف ووصف طلب التسعير.' });
      return;
    }
    setQuoteBusy(true);
    try {
      await apiRequest('/api/public/quotes', {
        method: 'POST',
        body: JSON.stringify({ customerName, phone, email: String(form.get('quoteEmail') ?? '').trim() || undefined, request }),
      });
      quoteForm.reset();
      setQuoteMessage({ kind: 'success', text: 'وصل طلب التسعير. سيتواصل معك فريقنا بعد مراجعة التفاصيل.' });
    } catch (error) { setQuoteMessage({ kind: 'error', text: getError(error) }); }
    finally { setQuoteBusy(false); }
  }

  return <main className="page store-page" dir="rtl" lang="ar">
    <header className="store-hero panel">
      <div className="store-hero-copy"><div className="eyebrow">AYOUB AI · المتجر</div><h1>منتجات مختارة، وطلب واضح.</h1><p className="page-desc">استعرض المنتجات المتاحة أو أرسل طلباً للحصول على عرض سعر. سنؤكد التفاصيل معك مباشرة.</p></div>
      <div className="store-hero-mark" aria-hidden="true"><ShoppingBag size={25} strokeWidth={1.5} /></div>
    </header>

    <section aria-labelledby="store-products-heading" className="store-products-section">
      <SectionTitle eyebrow="الكتالوج" title="المنتجات المتاحة" detail="اختر المنتج الذي يناسبك للاطلاع على تفاصيله وطلبه." action={<button type="button" className="btn secondary small" onClick={() => void loadProducts()} disabled={loading}><RefreshCw size={13} /> تحديث القائمة</button>} />
      {loading ? <LoadingState label="جارٍ تحميل المنتجات…" /> : loadError ? <InlineError detail={loadError} onRetry={() => void loadProducts()} /> : shownProducts.length === 0 ? <EmptyState title="لا توجد منتجات منشورة حالياً" detail="عد لاحقاً للاطلاع على المنتجات الجديدة." /> : <div className="store-product-grid">
        {shownProducts.map((product) => {
          const chosen = selectedId === idKey(product.id);
          const outOfStock = Number(product.stockQuantity) <= 0;
          return <article key={idKey(product.id)} className={`panel store-product-card ${chosen ? 'chosen' : ''}`}>
            <div className="store-product-image">{product.imageUrl ? <img src={product.imageUrl} alt={product.nameArabic || product.nameEnglish} loading="lazy" /> : <Package size={29} strokeWidth={1.5} aria-label="لا توجد صورة" />}</div>
            <div className="store-product-copy"><div className="store-product-overline"><span>{product.category || 'منتج'}</span><span className={outOfStock ? 'store-stock out' : 'store-stock'}>{outOfStock ? 'غير متوفر' : `متاح · ${product.stockQuantity}`}</span></div>
              <h3>{product.nameArabic || product.nameEnglish}</h3><div className="store-product-english" dir="ltr">{product.nameEnglish}</div>
              {product.description && <p>{product.description}</p>}
              <div className="store-product-footer"><strong>{displayMoney(product.price, product.currency)}</strong><button type="button" className={chosen ? 'btn small' : 'btn secondary small'} disabled={outOfStock} onClick={() => { setSelectedId(idKey(product.id)); setQuantity(1); setOrderMessage(null); }}>{chosen ? 'تم الاختيار' : 'اختر المنتج'}</button></div>
            </div>
          </article>;
        })}
      </div>}
    </section>

    <div className="store-form-grid">
      <section className="panel form-card" aria-labelledby="store-order-heading">
        <div className="eyebrow">طلب منتج</div><h2 id="store-order-heading" className="store-form-title">أرسل طلبك</h2><p className="page-desc store-form-intro">سنراجع التوفر والعنوان ونتواصل معك لتأكيد الطلب. لا يتضمن هذا النموذج دفعاً إلكترونياً.</p>
        {orderMessage && <Notice kind={orderMessage.kind}>{orderMessage.text}</Notice>}
        <form onSubmit={submitOrder} className="form-grid store-form" noValidate>
          <div className="field full"><label htmlFor="order-product">المنتج</label><select id="order-product" className={inputClass} value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setQuantity(1); }} disabled={!products.length} required><option value="">اختر منتجاً</option>{products.map((item) => <option key={idKey(item.id)} value={idKey(item.id)} disabled={Number(item.stockQuantity) < 1}>{item.nameArabic || item.nameEnglish}</option>)}</select></div>
          <div className="field"><label htmlFor="order-quantity">الكمية</label><input id="order-quantity" className={inputClass} type="number" min="1" max={maxOrderQuantity} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} required /></div>
          <div className="field"><label htmlFor="order-name">الاسم الكامل <span aria-hidden="true">*</span></label><input id="order-name" name="orderName" className={inputClass} autoComplete="name" maxLength={160} required /></div>
          <div className="field"><label htmlFor="order-phone">رقم الهاتف <span aria-hidden="true">*</span></label><input id="order-phone" name="orderPhone" className={inputClass} type="tel" autoComplete="tel" maxLength={40} required dir="ltr" /></div>
          <div className="field"><label htmlFor="order-email">البريد الإلكتروني <span className="font-normal text-slate-500">(اختياري)</span></label><input id="order-email" name="orderEmail" className={inputClass} type="email" autoComplete="email" maxLength={254} dir="ltr" /></div>
          <div className="field full"><label htmlFor="order-address">عنوان التوصيل <span aria-hidden="true">*</span></label><textarea id="order-address" name="orderAddress" className={inputClass} rows={2} autoComplete="street-address" maxLength={800} required /></div>
          <div className="field full"><label htmlFor="order-note">ملاحظة <span className="font-normal text-slate-500">(اختياري)</span></label><textarea id="order-note" name="orderNote" className={inputClass} rows={2} maxLength={1000} /></div>
          <div className="field full"><button type="submit" className="btn store-submit" disabled={orderBusy || loading || !selectedProduct || Number(selectedProduct.stockQuantity) < 1}>{orderBusy ? <LoaderCircle className="store-spin" size={15} /> : <ShoppingBag size={15} />} إرسال طلب المنتج</button></div>
        </form>
      </section>

      <section className="panel form-card" aria-labelledby="store-quote-heading">
        <div className="eyebrow">طلب مخصص</div><h2 id="store-quote-heading" className="store-form-title">اطلب عرض سعر</h2><p className="page-desc store-form-intro">صف ما تبحث عنه، وسنراجع احتياجك ونرسل إليك عرضاً مناسباً.</p>
        {quoteMessage && <Notice kind={quoteMessage.kind}>{quoteMessage.text}</Notice>}
        <form onSubmit={submitQuote} className="form-grid store-form" noValidate>
          <div className="field full"><label htmlFor="quote-name">الاسم الكامل <span aria-hidden="true">*</span></label><input id="quote-name" name="quoteName" className={inputClass} autoComplete="name" maxLength={160} required /></div>
          <div className="field"><label htmlFor="quote-phone">رقم الهاتف <span aria-hidden="true">*</span></label><input id="quote-phone" name="quotePhone" className={inputClass} type="tel" autoComplete="tel" maxLength={40} required dir="ltr" /></div>
          <div className="field"><label htmlFor="quote-email">البريد الإلكتروني <span className="font-normal text-slate-500">(اختياري)</span></label><input id="quote-email" name="quoteEmail" className={inputClass} type="email" autoComplete="email" maxLength={254} dir="ltr" /></div>
          <div className="field full"><label htmlFor="quote-request">تفاصيل طلب التسعير <span aria-hidden="true">*</span></label><textarea id="quote-request" name="quoteRequest" className={inputClass} rows={6} maxLength={4000} required placeholder="اذكر المنتج أو الخدمة والكمية أو المواصفات المطلوبة…" /></div>
          <div className="field full"><button type="submit" className="btn store-submit" disabled={quoteBusy}>{quoteBusy ? <LoaderCircle className="store-spin" size={15} /> : <Check size={15} />} إرسال طلب التسعير</button></div>
        </form>
      </section>
    </div>
    <StorePageStyles />
  </main>;
}

type ProductForm = {
  nameArabic: string; nameEnglish: string; description: string; category: string;
  price: string; currency: string; sku: string; stockQuantity: string;
  imageId: string; imageUrl: string; isPublished: boolean;
};
const emptyProductForm: ProductForm = { nameArabic: '', nameEnglish: '', description: '', category: '', price: '', currency: 'JOD', sku: '', stockQuantity: '0', imageId: '', imageUrl: '', isPublished: false };
function formFromProduct(product: Product): ProductForm {
  return {
    nameArabic: product.nameArabic || '', nameEnglish: product.nameEnglish || '', description: product.description || '', category: product.category || '',
    price: String(product.price ?? ''), currency: product.currency || 'JOD', sku: product.sku || '', stockQuantity: String(product.stockQuantity ?? 0),
    imageId: product.imageId == null ? '' : String(product.imageId), imageUrl: product.imageUrl || '', isPublished: Boolean(product.isPublished),
  };
}
function productPayload(form: ProductForm): ProductInput {
  return {
    nameArabic: form.nameArabic.trim(), nameEnglish: form.nameEnglish.trim(), description: form.description.trim(), category: form.category.trim(),
    price: Number(form.price), currency: form.currency.trim().toUpperCase(), sku: form.sku.trim(), stockQuantity: Number(form.stockQuantity),
    imageId: form.imageId.trim() || null, isPublished: form.isPublished,
  };
}
function toBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

export function AdminStorePage() {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'quotes'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [quotes, setQuotes] = useState<StoreQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [editingProductId, setEditingProductId] = useState<EntityId | null>(null);
  const [productBusy, setProductBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [orderDrafts, setOrderDrafts] = useState<Record<string, { status: OrderStatus; adminNote: string }>>({});
  const [quoteDrafts, setQuoteDrafts] = useState<Record<string, { status: QuoteStatus; quotedTotal: string; currency: string; adminNote: string }>>({});

  const loadActiveData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      if (activeTab === 'products') setProducts(await getArray<Product>('/api/admin/store/products'));
      else if (activeTab === 'orders') {
        const data = await getArray<StoreOrder>('/api/admin/orders');
        setOrders(data);
        setOrderDrafts(Object.fromEntries(data.map((order) => [idKey(order.id), { status: order.status, adminNote: order.adminNote || '' }])));
      } else {
        const data = await getArray<StoreQuote>('/api/admin/quotes');
        setQuotes(data);
        setQuoteDrafts(Object.fromEntries(data.map((quote) => [idKey(quote.id), { status: quote.status, quotedTotal: quote.quotedTotal == null ? '' : String(quote.quotedTotal), currency: quote.currency || 'JOD', adminNote: quote.adminNote || '' }])));
      }
    } catch (error) { setLoadError(getError(error)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadActiveData(); }, [activeTab]);

  const selectTab = (tab: 'products' | 'orders' | 'quotes') => { setNotice(null); setLoadError(''); setActiveTab(tab); };
  const resetProductForm = () => { setProductForm(emptyProductForm); setEditingProductId(null); };
  const beginEdit = (product: Product) => { setProductForm(formFromProduct(product)); setEditingProductId(product.id); setNotice(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const updateProductForm = (field: keyof ProductForm, value: string | boolean) => setProductForm((current) => ({ ...current, [field]: value }));

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const payload = productPayload(productForm);
    if (!payload.nameArabic || !payload.nameEnglish || !payload.category || !payload.currency || !payload.sku || !Number.isFinite(payload.price) || payload.price < 0 || !Number.isInteger(payload.stockQuantity) || payload.stockQuantity < 0) {
      setNotice({ kind: 'error', text: 'تحقق من الاسم والتصنيف ورمز SKU والسعر والمخزون.' });
      return;
    }
    setProductBusy(true);
    try {
      if (editingProductId == null) await apiRequest('/api/admin/store/products', { method: 'POST', body: JSON.stringify(payload) });
      else await apiRequest(`/api/admin/store/products/${encodeURIComponent(idKey(editingProductId))}`, { method: 'PATCH', body: JSON.stringify(payload) });
      resetProductForm();
      setNotice({ kind: 'success', text: editingProductId == null ? 'تم إنشاء المنتج.' : 'تم تحديث المنتج.' });
      await loadActiveData();
    } catch (error) { setNotice({ kind: 'error', text: getError(error) }); }
    finally { setProductBusy(false); }
  }

  async function togglePublished(product: Product) {
    setNotice(null);
    setSavingRow(`product-${idKey(product.id)}`);
    try {
      await apiRequest(`/api/admin/store/products/${encodeURIComponent(idKey(product.id))}`, { method: 'PATCH', body: JSON.stringify({ ...productPayload(formFromProduct(product)), isPublished: !product.isPublished }) });
      setNotice({ kind: 'success', text: product.isPublished ? 'تم إلغاء نشر المنتج.' : 'تم نشر المنتج.' });
      await loadActiveData();
    } catch (error) { setNotice({ kind: 'error', text: getError(error) }); }
    finally { setSavingRow(null); }
  }

  async function uploadImage(file?: File) {
    setNotice(null);
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { setNotice({ kind: 'error', text: 'نوع الملف غير مدعوم. استخدم JPEG أو PNG أو WebP أو GIF.' }); return; }
    if (file.size > MAX_IMAGE_BYTES) { setNotice({ kind: 'error', text: 'حجم الصورة يتجاوز الحد الأقصى البالغ 4 ميبيبايت.' }); return; }
    setUploadBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const asset = await apiRequest<ApiAsset>('/api/admin/assets', {
        method: 'POST',
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, altText: productForm.nameArabic.trim() || file.name, data: toBase64(bytes) }),
      });
      if (asset?.id == null || !asset.url) throw new Error('استجابة رفع الصورة غير مكتملة.');
      setProductForm((current) => ({ ...current, imageId: String(asset.id), imageUrl: asset.url }));
      setNotice({ kind: 'success', text: 'تم رفع الصورة وربطها بالمنتج.' });
    } catch (error) { setNotice({ kind: 'error', text: getError(error) }); }
    finally { setUploadBusy(false); }
  }

  async function saveOrder(order: StoreOrder) {
    const key = idKey(order.id);
    const draft = orderDrafts[key] ?? { status: order.status, adminNote: order.adminNote || '' };
    setNotice(null);
    setSavingRow(`order-${key}`);
    try {
      await apiRequest(`/api/admin/orders/${encodeURIComponent(key)}`, { method: 'PATCH', body: JSON.stringify({ status: draft.status, adminNote: draft.adminNote }) });
      setNotice({ kind: 'success', text: 'تم تحديث الطلب.' });
      await loadActiveData();
    } catch (error) { setNotice({ kind: 'error', text: getError(error) }); }
    finally { setSavingRow(null); }
  }

  async function saveQuote(quote: StoreQuote) {
    const key = idKey(quote.id);
    const draft = quoteDrafts[key] ?? { status: quote.status, quotedTotal: quote.quotedTotal == null ? '' : String(quote.quotedTotal), currency: quote.currency || 'JOD', adminNote: quote.adminNote || '' };
    const quotedTotal = draft.quotedTotal.trim() ? Number(draft.quotedTotal) : null;
    if (quotedTotal !== null && (!Number.isFinite(quotedTotal) || quotedTotal < 0)) { setNotice({ kind: 'error', text: 'أدخل إجمالي عرض صحيحاً أو اتركه فارغاً.' }); return; }
    if (draft.status === 'quoted' && quotedTotal == null) { setNotice({ kind: 'error', text: 'أدخل إجمالي العرض قبل اختيار حالة «تم التسعير».' }); return; }
    setNotice(null);
    setSavingRow(`quote-${key}`);
    try {
      await apiRequest(`/api/admin/quotes/${encodeURIComponent(key)}`, { method: 'PATCH', body: JSON.stringify({ status: draft.status, quotedTotal, currency: draft.currency.trim().toUpperCase(), adminNote: draft.adminNote }) });
      setNotice({ kind: 'success', text: 'تم تحديث طلب التسعير.' });
      await loadActiveData();
    } catch (error) { setNotice({ kind: 'error', text: getError(error) }); }
    finally { setSavingRow(null); }
  }

  return <main className="page store-page admin-store-page" dir="rtl" lang="ar">
    <header className="store-admin-header"><div><div className="eyebrow">AYOUB AI · الإدارة</div><h1>إدارة المتجر</h1><p className="page-desc">إدارة المنتجات والطلبات وعروض الأسعار من مكان واحد.</p></div><button className="btn secondary small" type="button" onClick={() => void loadActiveData()} disabled={loading}><RefreshCw size={13} /> تحديث</button></header>
    <nav className="store-tabs" aria-label="أقسام إدارة المتجر" role="tablist">
      <button className={`store-tab ${activeTab === 'products' ? 'active' : ''}`} role="tab" aria-selected={activeTab === 'products'} type="button" onClick={() => selectTab('products')}><Package size={15} /> المنتجات</button>
      <button className={`store-tab ${activeTab === 'orders' ? 'active' : ''}`} role="tab" aria-selected={activeTab === 'orders'} type="button" onClick={() => selectTab('orders')}><ShoppingBag size={15} /> الطلبات <span className="store-tab-count">{orders.length}</span></button>
      <button className={`store-tab ${activeTab === 'quotes' ? 'active' : ''}`} role="tab" aria-selected={activeTab === 'quotes'} type="button" onClick={() => selectTab('quotes')}><Save size={15} /> طلبات التسعير <span className="store-tab-count">{quotes.length}</span></button>
    </nav>
    {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}

    {activeTab === 'products' && <section className="store-admin-section" aria-labelledby="admin-products-heading">
      <SectionTitle eyebrow="الكتالوج" title="المنتجات" detail="أنشئ المنتجات وعدّل بياناتها، أو بدّل حالة النشر دون حذفها." action={<span className="store-count">{products.length} منتج</span>} />
      <div className="store-admin-product-layout">
        <form className="panel form-card store-product-editor" onSubmit={saveProduct}>
          <div className="store-editor-title"><div><div className="eyebrow">{editingProductId == null ? 'منتج جديد' : 'تعديل المنتج'}</div><h3>{editingProductId == null ? 'إضافة منتج' : 'تحديث بيانات المنتج'}</h3></div>{editingProductId != null && <button type="button" className="btn ghost small" onClick={resetProductForm}>إلغاء التعديل</button>}</div>
          {productForm.imageUrl && <div className="store-uploaded-image"><img src={productForm.imageUrl} alt={productForm.nameArabic || 'صورة المنتج'} /><div><strong>الصورة المرتبطة</strong><span>معرّف الصورة: <bdi>{productForm.imageId}</bdi></span></div></div>}
          <div className="form-grid store-form">
            <div className="field"><label htmlFor="product-ar">اسم المنتج بالعربية</label><input id="product-ar" className={inputClass} value={productForm.nameArabic} onChange={(e) => updateProductForm('nameArabic', e.target.value)} maxLength={200} required /></div>
            <div className="field"><label htmlFor="product-en">اسم المنتج بالإنجليزية</label><input id="product-en" className={inputClass} value={productForm.nameEnglish} onChange={(e) => updateProductForm('nameEnglish', e.target.value)} dir="ltr" maxLength={200} required /></div>
            <div className="field full"><label htmlFor="product-description">الوصف</label><textarea id="product-description" className={inputClass} rows={3} value={productForm.description} onChange={(e) => updateProductForm('description', e.target.value)} maxLength={4000} /></div>
            <div className="field"><label htmlFor="product-category">التصنيف</label><input id="product-category" className={inputClass} value={productForm.category} onChange={(e) => updateProductForm('category', e.target.value)} maxLength={120} required /></div>
            <div className="field"><label htmlFor="product-sku">رمز SKU</label><input id="product-sku" className={inputClass} value={productForm.sku} onChange={(e) => updateProductForm('sku', e.target.value)} dir="ltr" maxLength={100} required /></div>
            <div className="field"><label htmlFor="product-price">السعر</label><input id="product-price" className={inputClass} type="number" min="0" step="0.01" value={productForm.price} onChange={(e) => updateProductForm('price', e.target.value)} required /></div>
            <div className="field"><label htmlFor="product-currency">العملة</label><input id="product-currency" className={inputClass} value={productForm.currency} onChange={(e) => updateProductForm('currency', e.target.value)} dir="ltr" maxLength={8} required /></div>
            <div className="field"><label htmlFor="product-stock">كمية المخزون</label><input id="product-stock" className={inputClass} type="number" min="0" step="1" value={productForm.stockQuantity} onChange={(e) => updateProductForm('stockQuantity', e.target.value)} required /></div>
            <div className="field"><label htmlFor="product-image">صورة المنتج</label><label className="store-file-button" htmlFor="product-image">{uploadBusy ? <LoaderCircle size={15} className="store-spin" /> : <ImagePlus size={15} />} {uploadBusy ? 'جارٍ الرفع…' : 'اختيار صورة ورفعها'}</label><input id="product-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={uploadBusy} onChange={(e) => { const file = e.currentTarget.files?.[0]; void uploadImage(file); e.currentTarget.value = ''; }} /><span className="hint">JPEG / PNG / WebP / GIF · حتى 4 ميبيبايت</span></div>
            <div className="field full"><label className="store-publish-check"><input type="checkbox" checked={productForm.isPublished} onChange={(e) => updateProductForm('isPublished', e.target.checked)} /><span>نشر المنتج وإتاحته في المتجر العام</span></label></div>
          </div>
          <div className="form-actions"><button className="btn" type="submit" disabled={productBusy || uploadBusy}>{productBusy ? <LoaderCircle size={15} className="store-spin" /> : editingProductId == null ? <Plus size={15} /> : <Save size={15} />}{editingProductId == null ? 'إنشاء المنتج' : 'حفظ التغييرات'}</button></div>
        </form>
        <div className="store-admin-list-column">
          {loading ? <LoadingState label="جارٍ تحميل المنتجات…" /> : loadError ? <InlineError detail={loadError} onRetry={() => void loadActiveData()} /> : products.length === 0 ? <EmptyState title="لا توجد منتجات بعد" detail="أضف أول منتج من النموذج المجاور." /> : <div className="store-admin-product-list">
            {products.map((product) => <article className="panel store-admin-product" key={idKey(product.id)}>
              <div className="store-admin-product-img">{product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" /> : <Package size={19} />}</div>
              <div className="store-admin-product-main"><div className="store-admin-product-title"><strong>{product.nameArabic || product.nameEnglish}</strong><span className={`store-status ${product.isPublished ? 'published' : ''}`}>{product.isPublished ? 'منشور' : 'مسودة'}</span></div><div className="store-admin-product-meta"><span>{product.category || '—'}</span><span>{displayMoney(product.price, product.currency)}</span><span>المخزون: {product.stockQuantity}</span></div></div>
              <div className="store-admin-product-actions"><button type="button" className="btn secondary small" onClick={() => beginEdit(product)}>تعديل</button><button type="button" className="btn ghost small" onClick={() => void togglePublished(product)} disabled={savingRow === `product-${idKey(product.id)}`}>{savingRow === `product-${idKey(product.id)}` ? <LoaderCircle size={13} className="store-spin" /> : null}{product.isPublished ? 'إلغاء النشر' : 'نشر'}</button></div>
            </article>)}
          </div>}
        </div>
      </div>
    </section>}

    {activeTab === 'orders' && <section className="store-admin-section" aria-labelledby="admin-orders-heading">
      <SectionTitle eyebrow="مبيعات المتجر" title="الطلبات" detail="راجع الطلبات وحدّث حالتها وأضف ملاحظة داخلية عند الحاجة." action={<span className="store-count">{orders.length} طلب</span>} />
      {loading ? <LoadingState label="جارٍ تحميل الطلبات…" /> : loadError ? <InlineError detail={loadError} onRetry={() => void loadActiveData()} /> : orders.length === 0 ? <EmptyState title="لا توجد طلبات" detail="ستظهر الطلبات الجديدة هنا عند استلامها." /> : <div className="store-record-list">
        {orders.map((order) => {
          const key = idKey(order.id); const draft = orderDrafts[key] ?? { status: order.status, adminNote: order.adminNote || '' }; const isSaving = savingRow === `order-${key}`;
          return <article className="panel store-record-card" key={key}>
            <div className="store-record-head"><div><div className="eyebrow">طلب <bdi>#{key}</bdi> · {formatDate(order.createdAt)}</div><h3>{order.customerName || 'عميل'}</h3></div><span className="store-status">{draft.status}</span></div>
            <div className="store-record-details"><span>الهاتف: <bdi dir="ltr">{order.phone || '—'}</bdi></span>{order.email && <span>البريد: <bdi dir="ltr">{order.email}</bdi></span>}<span>العنوان: {order.deliveryAddress || '—'}</span>{order.customerNote && <span>ملاحظة العميل: {order.customerNote}</span>}<span>الإجمالي: {displayMoney(order.total ?? 0, order.currency)}</span></div>
            {order.items?.length ? <div className="store-order-items"><strong>العناصر</strong>{order.items.map((item, index) => <span key={`${key}-${index}`}>{item.name || item.nameArabic || item.nameEnglish || `منتج ${item.productId ?? ''}`} · الكمية {item.quantity ?? 1}</span>)}</div> : null}
            <div className="form-grid store-record-controls"><div className="field"><label htmlFor={`order-status-${key}`}>حالة الطلب</label><select id={`order-status-${key}`} className={inputClass} value={draft.status} onChange={(e) => setOrderDrafts((all) => ({ ...all, [key]: { ...draft, status: e.target.value as OrderStatus } }))}>{ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></div><div className="field"><label htmlFor={`order-admin-note-${key}`}>ملاحظة إدارية</label><textarea id={`order-admin-note-${key}`} className={inputClass} rows={2} maxLength={2000} value={draft.adminNote} onChange={(e) => setOrderDrafts((all) => ({ ...all, [key]: { ...draft, adminNote: e.target.value } }))} /></div><div className="field full store-record-save"><button type="button" className="btn small" onClick={() => void saveOrder(order)} disabled={isSaving}>{isSaving ? <LoaderCircle size={14} className="store-spin" /> : <Save size={14} />} حفظ تحديث الطلب</button></div></div>
          </article>;
        })}
      </div>}
    </section>}

    {activeTab === 'quotes' && <section className="store-admin-section" aria-labelledby="admin-quotes-heading">
      <SectionTitle eyebrow="مبيعات المتجر" title="طلبات التسعير" detail="راجع تفاصيل الطلب، حدّد إجمالي العرض والعملة، ثم حدّث الحالة." action={<span className="store-count">{quotes.length} طلب</span>} />
      {loading ? <LoadingState label="جارٍ تحميل طلبات التسعير…" /> : loadError ? <InlineError detail={loadError} onRetry={() => void loadActiveData()} /> : quotes.length === 0 ? <EmptyState title="لا توجد طلبات تسعير" detail="ستظهر الطلبات الجديدة هنا عند استلامها." /> : <div className="store-record-list">
        {quotes.map((quote) => {
          const key = idKey(quote.id); const draft = quoteDrafts[key] ?? { status: quote.status, quotedTotal: quote.quotedTotal == null ? '' : String(quote.quotedTotal), currency: quote.currency || 'JOD', adminNote: quote.adminNote || '' }; const isSaving = savingRow === `quote-${key}`;
          return <article className="panel store-record-card" key={key}>
            <div className="store-record-head"><div><div className="eyebrow">طلب تسعير <bdi>#{key}</bdi> · {formatDate(quote.createdAt)}</div><h3>{quote.customerName || 'عميل'}</h3></div><span className="store-status">{draft.status}</span></div>
            <div className="store-record-details"><span>الهاتف: <bdi dir="ltr">{quote.phone || '—'}</bdi></span>{quote.email && <span>البريد: <bdi dir="ltr">{quote.email}</bdi></span>}</div>
            <div className="store-quote-request"><strong>تفاصيل الطلب</strong><p>{quote.request || '—'}</p></div>
            <div className="form-grid store-record-controls"><div className="field"><label htmlFor={`quote-status-${key}`}>حالة الطلب</label><select id={`quote-status-${key}`} className={inputClass} value={draft.status} onChange={(e) => setQuoteDrafts((all) => ({ ...all, [key]: { ...draft, status: e.target.value as QuoteStatus } }))}>{QUOTE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></div><div className="field"><label htmlFor={`quote-total-${key}`}>إجمالي العرض</label><input id={`quote-total-${key}`} className={inputClass} type="number" min="0" step="0.01" value={draft.quotedTotal} onChange={(e) => setQuoteDrafts((all) => ({ ...all, [key]: { ...draft, quotedTotal: e.target.value } }))} /></div><div className="field"><label htmlFor={`quote-currency-${key}`}>العملة</label><input id={`quote-currency-${key}`} className={inputClass} value={draft.currency} maxLength={8} dir="ltr" onChange={(e) => setQuoteDrafts((all) => ({ ...all, [key]: { ...draft, currency: e.target.value } }))} /></div><div className="field"><label htmlFor={`quote-note-${key}`}>ملاحظة إدارية</label><textarea id={`quote-note-${key}`} className={inputClass} rows={2} maxLength={2000} value={draft.adminNote} onChange={(e) => setQuoteDrafts((all) => ({ ...all, [key]: { ...draft, adminNote: e.target.value } }))} /></div><div className="field full store-record-save"><button type="button" className="btn small" onClick={() => void saveQuote(quote)} disabled={isSaving}>{isSaving ? <LoaderCircle size={14} className="store-spin" /> : <Save size={14} />} حفظ عرض السعر</button></div></div>
          </article>;
        })}
      </div>}
    </section>}
    <StorePageStyles />
  </main>;
}

function StorePageStyles() {
  return <style>{`
    .store-page{--store-green:#174c37;--store-green-soft:#edf4ef;--store-ink:#173125;padding-top:34px;}
    .store-page .eyebrow{color:#587365;}
    .store-page .store-section-title{font-size:23px;letter-spacing:-.04em;margin:0 0 6px;font-weight:600;color:var(--store-ink);}
    .store-page .page-desc{color:#64756c;}
    .store-page .btn{background:var(--store-green);border-color:var(--store-green);}
    .store-page .btn:hover{background:#fff;color:var(--store-green);}
    .store-page .btn.secondary{background:#fff;color:var(--store-green);border-color:#174c3730;}
    .store-page .btn.secondary:hover{background:var(--store-green);color:#fff;}
    .store-page .btn.ghost{background:transparent;color:var(--store-green);border-color:transparent;}
    .store-page .btn.ghost:hover{background:#174c370d;}
    .store-hero{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:clamp(22px,4vw,36px);margin-bottom:46px;background:linear-gradient(115deg,#f8fbf8,#fff 70%);border-color:#174c371b;}
    .store-hero h1{font-size:clamp(30px,4vw,42px);color:var(--store-ink);margin-bottom:12px;}
    .store-hero .page-desc{max-width:610px;}
    .store-hero-mark{width:60px;height:60px;flex:0 0 auto;border:1px solid #174c3722;border-radius:18px;background:#edf4ef;color:var(--store-green);display:grid;place-items:center;}
    .store-products-section{margin-bottom:46px;}
    .store-products-section>.page-head{margin-bottom:18px;}
    .store-product-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;}
    .store-product-card{overflow:hidden;transition:border-color .18s,box-shadow .18s;}
    .store-product-card.chosen{border-color:#174c3760;box-shadow:0 0 0 2px #174c370a;}
    .store-product-image{height:190px;display:grid;place-items:center;background:#f3f6f3;color:#668171;overflow:hidden;}
    .store-product-image img{width:100%;height:100%;object-fit:cover;}
    .store-product-copy{padding:17px;}
    .store-product-overline{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10px;color:#738278;margin-bottom:10px;}
    .store-stock{padding:4px 8px;border-radius:99px;background:#edf4ef;color:#285b40;font-size:9px;white-space:nowrap;}
    .store-stock.out{background:#f6eeee;color:#8a4545;}
    .store-product-copy h3{font-size:16px;letter-spacing:-.03em;margin:0 0 3px;color:var(--store-ink);}
    .store-product-english{font-size:10px;color:#718078;margin-bottom:10px;}
    .store-product-copy p{font-size:11px;color:#66766d;line-height:1.65;min-height:36px;margin:0 0 15px;}
    .store-product-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid #17312512;padding-top:13px;}
    .store-product-footer strong{font-size:13px;color:var(--store-green);}
    .store-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;align-items:start;}
    .store-form-grid>.form-card{padding:clamp(18px,2.3vw,25px);}
    .store-form-title{font-size:21px;letter-spacing:-.04em;margin:0 0 8px;color:var(--store-ink);}
    .store-form-intro{min-height:43px;font-size:11px;margin-bottom:19px;}
    .store-form{gap:13px;}
    .store-submit{width:100%;margin-top:4px;}
    .store-notice{display:flex;align-items:flex-start;gap:8px;padding:11px 13px;border:1px solid;border-radius:9px;font-size:11px;line-height:1.55;margin:0 0 14px;}
    .store-notice svg{flex:0 0 auto;margin-top:1px;}
    .store-notice.success{background:#f0f7f1;border-color:#cde0d1;color:#24523a;}
    .store-notice.error{background:#fff4f2;border-color:#efd2cc;color:#853f34;}
    .store-spin{animation:store-spin .9s linear infinite;}@keyframes store-spin{to{transform:rotate(360deg)}}
    .store-page .loading-state{display:flex;justify-content:center;align-items:center;gap:9px;color:#60766a;font-size:12px;padding:42px;}
    .store-page .error-state{border-color:#efd2cc;}
    .store-admin-header{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:27px;}
    .store-admin-header h1{font-size:34px;color:var(--store-ink);margin-bottom:8px;}
    .store-tabs{display:flex;gap:4px;border-bottom:1px solid #17312518;margin-bottom:27px;overflow:auto;}
    .store-tab{display:inline-flex;align-items:center;gap:8px;background:transparent;border:0;border-bottom:2px solid transparent;padding:13px 15px;margin-bottom:-1px;font-size:12px;color:#697970;white-space:nowrap;cursor:pointer;}
    .store-tab.active{color:var(--store-green);border-color:var(--store-green);font-weight:600;}
    .store-tab-count{font-size:9px;background:#edf4ef;padding:3px 7px;border-radius:99px;}
    .store-admin-section>.page-head{margin-bottom:18px;}
    .store-count{font-size:10px;color:#728077;border:1px solid #1731251b;padding:6px 10px;border-radius:99px;white-space:nowrap;}
    .store-admin-product-layout{display:grid;grid-template-columns:minmax(340px,.85fr) minmax(0,1.15fr);gap:16px;align-items:start;}
    .store-product-editor{padding:20px;}
    .store-editor-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;}
    .store-editor-title .eyebrow{margin-bottom:5px;}.store-editor-title h3{font-size:17px;margin:0;color:var(--store-ink);}
    .store-uploaded-image{display:flex;align-items:center;gap:12px;padding:8px;border:1px solid #17312515;border-radius:10px;margin-bottom:15px;}
    .store-uploaded-image img{width:54px;height:54px;object-fit:cover;border-radius:7px;background:#f4f6f4;}
    .store-uploaded-image strong,.store-uploaded-image span{display:block;font-size:10px;}.store-uploaded-image span{color:#6c7d72;margin-top:4px;}
    .store-file-button{min-height:40px;border:1px dashed #174c3745;border-radius:9px;display:flex;align-items:center;justify-content:center;gap:7px;color:var(--store-green);background:#f8fbf8;font-size:11px;font-weight:600;cursor:pointer;}
    .store-file-button:hover{background:#edf4ef;}
    .store-publish-check{display:flex;align-items:center;gap:9px;cursor:pointer;}
    .store-publish-check input{width:15px;height:15px;accent-color:var(--store-green);}
    .store-admin-list-column{min-width:0;}
    .store-admin-product-list,.store-record-list{display:grid;gap:10px;}
    .store-admin-product{display:flex;align-items:center;gap:12px;padding:13px;}
    .store-admin-product-img{width:48px;height:48px;flex:0 0 auto;border-radius:9px;background:#f3f6f3;display:grid;place-items:center;color:#71877a;overflow:hidden;}
    .store-admin-product-img img{width:100%;height:100%;object-fit:cover;}
    .store-admin-product-main{flex:1;min-width:0;}
    .store-admin-product-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}.store-admin-product-title strong{font-size:12px;}
    .store-status{font-size:9px;padding:4px 8px;border-radius:99px;background:#f2f3f1;color:#66746a;white-space:nowrap;}
    .store-status.published{background:#edf4ef;color:#285b40;}
    .store-admin-product-meta{display:flex;gap:10px;flex-wrap:wrap;font-size:9px;color:#748178;margin-top:6px;}
    .store-admin-product-actions{display:flex;align-items:center;gap:3px;}
    .store-record-card{padding:19px;}
    .store-record-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:13px;border-bottom:1px solid #17312512;}
    .store-record-head .eyebrow{margin-bottom:6px;font-size:9px;}.store-record-head h3{font-size:15px;margin:0;color:var(--store-ink);}
    .store-record-details{display:flex;gap:8px 20px;flex-wrap:wrap;padding:13px 0;color:#68786e;font-size:10px;line-height:1.6;}
    .store-order-items,.store-quote-request{display:grid;gap:6px;background:#f7f9f7;border-radius:9px;padding:12px;margin-bottom:14px;font-size:10px;color:#64756b;}
    .store-order-items strong,.store-quote-request strong{color:#304b3b;font-size:10px;}
    .store-quote-request p{white-space:pre-wrap;line-height:1.7;margin:0;}
    .store-record-controls{padding-top:14px;border-top:1px solid #17312512;}
    .store-record-save{display:flex;justify-content:flex-start;}
    @media(max-width:960px){.store-product-grid{grid-template-columns:repeat(2,minmax(0,1fr));}.store-admin-product-layout{grid-template-columns:1fr;}}
    @media(max-width:680px){.store-page{padding-top:23px;}.store-hero{margin-bottom:34px;}.store-hero-mark{width:48px;height:48px;border-radius:14px;}.store-form-grid{grid-template-columns:1fr;}.store-product-grid{grid-template-columns:1fr;}.store-product-image{height:210px;}.store-form-intro{min-height:0;}.store-admin-header{align-items:flex-start;}.store-admin-header h1{font-size:29px;}.store-admin-product{align-items:flex-start;flex-wrap:wrap;}.store-admin-product-main{min-width:calc(100% - 70px);}.store-admin-product-actions{width:100%;justify-content:flex-end;}.store-tabs{margin-inline:-4px;}.store-tab{padding-inline:10px;}}
  `}</style>;
}
