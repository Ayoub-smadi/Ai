import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowRight, ImagePlus, Pencil, Plus, Save, Search, Trash2, Upload, X } from 'lucide-react';
import { Link } from 'wouter';
import { getStoreProducts, saveStoreProducts, STORE_PRODUCTS_STORAGE_KEY, type StoreProduct } from '@/data/site-content';
import { moveAdminEntityToTrash } from '@/lib/admin-document-storage';
import './admin-store-image-upload.css';
import './store-image-size.css';

const blankProduct = (): StoreProduct => ({ id: '', nameAr: '', nameEn: '', image: '', descriptionAr: '', descriptionEn: '', category: '', price: '' });
const categoryLabels: Record<string, string> = { irrigation: 'شبكات الري', 'garden-decor': 'ديكور الحديقة', pots: 'أحواض وأصص', tools: 'أدوات زراعية', fertilizers: 'أسمدة ومحسنات تربة', pesticides: 'مبيدات ومعالجات', seeds: 'بذور', 'seedling-supplies': 'مستلزمات المشاتل' };
const MAX_SOURCE_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_STORED_IMAGE_BYTES = 480 * 1024;

async function compressStoreImage(file: File): Promise<string> {
  let bitmap: ImageBitmap | null = null;
  let image: HTMLImageElement | null = null;
  let objectUrl = '';
  try {
    if (typeof createImageBitmap === 'function') {
      try { bitmap = await createImageBitmap(file); } catch { /* Fall back to the browser image decoder. */ }
    }
    if (!bitmap) {
      image = new Image();
      objectUrl = URL.createObjectURL(file);
      image.src = objectUrl;
      await image.decode();
    }
    const source = bitmap || image!;
    const width = bitmap?.width || image!.naturalWidth;
    const height = bitmap?.height || image!.naturalHeight;
    if (!width || !height) throw new Error('تعذر قراءة أبعاد الصورة.');

    let scale = Math.min(1, 1400 / Math.max(width, height));
    let blob: Blob | null = null;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('تعذر تجهيز الصورة على هذا الجهاز.');
    for (let attempt = 0; attempt < 6; attempt += 1) {
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', [0.84, 0.78, 0.72, 0.66, 0.6, 0.54][attempt]));
      if (!blob) throw new Error('تعذر ضغط الصورة.');
      if (blob.size <= MAX_STORED_IMAGE_BYTES) break;
      scale *= 0.82;
    }
    if (!blob || blob.size > MAX_STORED_IMAGE_BYTES) throw new Error('تعذر تصغير الصورة للحجم المناسب. جرّب صورة أصغر.');
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('تعذر قراءة الصورة. حاول مرة أخرى.'));
      reader.readAsDataURL(blob!);
    });
  } finally {
    bitmap?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export default function AdminStorePage() {
  const [products, setProducts] = useState(getStoreProducts);
  const [draft, setDraft] = useState<StoreProduct | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const updateDraft = (patch: Partial<StoreProduct>) => setDraft((current) => current ? { ...current, ...patch } : current);
  const visible = products.filter((product) => `${product.nameAr} ${product.nameEn} ${product.category}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const openNewProduct = () => { setDraft(blankProduct()); setError(''); };
  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || !draft) return;
    if (!file.type.startsWith('image/')) { setError('اختر ملف صورة صالحًا.'); return; }
    if (file.size > MAX_SOURCE_IMAGE_BYTES) { setError('حجم الصورة أكبر من 8 ميغابايت. اختر صورة أصغر.'); return; }
    setUploading(true);
    setError('');
    try {
      const image = await compressStoreImage(file);
      updateDraft({ image });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'تعذر تجهيز الصورة. حاول مرة أخرى.');
    } finally {
      setUploading(false);
    }
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!draft?.nameAr.trim()) { setError('يرجى إدخال اسم المنتج بالعربية.'); return; }
    const normalized = { ...draft, price: draft.price === '' ? '' : Number(draft.price) };
    const next = draft.id ? products.map((product) => product.id === draft.id ? normalized : product) : [{ ...normalized, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }, ...products];
    try {
      saveStoreProducts(next);
      setProducts(next);
      setDraft(null);
      setError('');
    } catch {
      setError('تعذر الحفظ: مساحة التخزين في المتصفح ممتلئة. أزل بعض الصور أو استخدم صورًا أصغر.');
    }
  };
  const remove = (id: string) => { const product = products.find((item) => item.id === id); if (!product || !window.confirm(`نقل المنتج «${product.nameAr}» إلى سجل المحذوفات؟ يمكنك استعادته لاحقًا.`)) return; moveAdminEntityToTrash('storeProduct', STORE_PRODUCTS_STORAGE_KEY, product); const next = products.filter((item) => item.id !== id); saveStoreProducts(next); setProducts(next); };

  return <main className="admin-page content-admin-page" dir="rtl"><header className="admin-head"><div><div className="eyebrow">QADRI AI / STORE MANAGEMENT</div><h1>إدارة المتجر</h1><p className="page-desc">أضف المنتجات، حدّث بياناتها أو احذفها. التغييرات تظهر في صفحة المتجر.</p></div><div className="admin-head-actions"><Link className="btn secondary small" href="/admin"><ArrowRight size={14} />لوحة التحكم</Link><button className="btn" type="button" onClick={openNewProduct}><Plus size={15} />إضافة منتج</button></div></header>
    <div className="content-admin-toolbar"><label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث باسم المنتج أو الفئة..." /></label><span>{products.length} منتج</span></div>
    {visible.length ? <div className="content-admin-grid">{visible.map((product) => <article className="panel content-admin-card" key={product.id}>{product.image ? <img src={product.image} alt={product.nameAr} /> : <div className="content-admin-card-placeholder"><ImagePlus size={24} /></div>}<div className="content-admin-card-body"><span className="eyebrow">{categoryLabels[product.category] || product.category || 'بدون فئة'}</span><h2>{product.nameAr}</h2>{product.nameEn && <small>{product.nameEn}</small>}<p>{product.descriptionAr || 'لا يوجد وصف.'}</p>{product.price !== '' && <strong className="content-admin-price">{product.price} د.أ</strong>}<div className="content-admin-card-actions"><button className="btn secondary small" onClick={() => { setDraft({ ...product }); setError(''); }}><Pencil size={14} />تعديل</button><button className="btn danger small" onClick={() => remove(product.id)}><Trash2 size={14} />حذف</button></div></div></article>)}</div> : <section className="panel content-admin-empty"><ImagePlus size={28} /><h2>{products.length ? 'لا توجد نتائج' : 'المتجر فارغ'}</h2><p>{products.length ? 'جرّب تغيير كلمات البحث.' : 'أضف أول منتج إلى متجرك.'}</p>{!products.length && <button className="btn" onClick={openNewProduct}><Plus size={15} />إضافة منتج</button>}</section>}
    {draft && <div className="content-admin-backdrop" onClick={() => !uploading && setDraft(null)}><form className="panel content-admin-form" onSubmit={save} onClick={(event) => event.stopPropagation()}><header><div><span className="eyebrow">STORE PRODUCT</span><h2>{draft.id ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h2></div><button type="button" className="icon-button" onClick={() => !uploading && setDraft(null)} aria-label="إغلاق"><X size={18} /></button></header>
      <label>اسم المنتج بالعربية *<input required value={draft.nameAr} onChange={(event) => updateDraft({ nameAr: event.target.value })} /></label>
      <div className="content-admin-form-row"><label>الاسم بالإنجليزية<input dir="ltr" value={draft.nameEn} onChange={(event) => updateDraft({ nameEn: event.target.value })} /></label><label>الفئة<select value={draft.category} onChange={(event) => updateDraft({ category: event.target.value })}><option value="">اختر الفئة</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <div className="content-admin-form-row"><label>السعر (د.أ)<input type="number" min="0" step="0.01" value={draft.price} onChange={(event) => updateDraft({ price: event.target.value === '' ? '' : Number(event.target.value) })} /></label><div className="content-admin-image-field"><span>صورة المنتج</span><input ref={imageInput} className="content-admin-image-input" type="file" accept="image/*" onChange={uploadImage} aria-label="رفع صورة المنتج من الجهاز" /><div className={`content-admin-image-preview ${draft.image ? 'has-image' : ''}`}>{draft.image ? <img src={draft.image} alt={`معاينة ${draft.nameAr || 'صورة المنتج'}`} /> : <div><ImagePlus size={22} /><small>لا توجد صورة</small></div>}</div><div className="content-admin-image-actions"><button type="button" className="btn secondary small" onClick={() => imageInput.current?.click()} disabled={uploading}><Upload size={13} />{uploading ? 'جاري تجهيز الصورة…' : draft.image ? 'تغيير الصورة' : 'رفع صورة من الجهاز'}</button>{draft.image && <button type="button" className="btn danger small" onClick={() => updateDraft({ image: '' })} disabled={uploading}><Trash2 size={13} />إزالة الصورة</button>}</div><small className="content-admin-image-hint">JPG أو PNG أو أي صيغة صورة. الحد الأقصى 8 ميغابايت؛ تُضغط الصورة تلقائيًا قبل الحفظ.</small></div></div>
      <label>وصف المنتج بالعربية<textarea rows={3} value={draft.descriptionAr} onChange={(event) => updateDraft({ descriptionAr: event.target.value })} /></label><label>وصف المنتج بالإنجليزية<textarea rows={3} dir="ltr" value={draft.descriptionEn} onChange={(event) => updateDraft({ descriptionEn: event.target.value })} /></label>{error && <p className="admin-error" role="alert">{error}</p>}<footer><button type="button" className="btn secondary" onClick={() => !uploading && setDraft(null)}>إلغاء</button><button className="btn" type="submit" disabled={uploading}><Save size={15} />حفظ المنتج</button></footer></form></div>}
  </main>;
}
