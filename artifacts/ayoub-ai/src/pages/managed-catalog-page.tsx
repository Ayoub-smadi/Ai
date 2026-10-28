import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ArrowLeft, ImagePlus, Leaf, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { Link } from 'wouter';
import { getManagedPlants, saveManagedPlants, type ManagedPlant } from '@/data/managed-plants';
import { quoteCatalog } from '@/data/quote-catalog';

type PlantDraft = Pick<ManagedPlant, 'nameAr' | 'nameEn' | 'scientificName' | 'descriptionAr' | 'descriptionEn' | 'categoryId' | 'categoryAr' | 'image' | 'landscapeIcon'>;
const freshDraft = (): PlantDraft => { const category = quoteCatalog.find((c) => c.items.some((i) => i.source === 'plant')); return { nameAr: '', nameEn: '', scientificName: '', descriptionAr: '', descriptionEn: '', categoryId: category?.id || 'plants', categoryAr: category?.nameAr || 'نباتات', image: '', landscapeIcon: '' }; };
const newId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export default function ManagedCatalogPage() {
  const [plants, setPlants] = useState<ManagedPlant[]>(getManagedPlants);
  const [draft, setDraft] = useState<PlantDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [newCategory, setNewCategory] = useState('');
  const [notice, setNotice] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);
  const iconInput = useRef<HTMLInputElement>(null);
  const categories = useMemo(() => {
    const found = new Map<string, string>();
    plants.forEach((plant) => found.set(plant.categoryId, plant.categoryAr || 'نباتات'));
    return [...found.entries()].map(([id, nameAr]) => ({ id, nameAr }));
  }, [plants]);
  const filtered = plants.filter((plant) => (categoryFilter === 'all' || plant.categoryId === categoryFilter) && (!search.trim() || `${plant.nameAr} ${plant.nameEn} ${plant.scientificName} ${plant.categoryAr}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));

  const persist = (next: ManagedPlant[]) => {
    try {
      saveManagedPlants(next);
      setPlants(next);
      setNotice('تم حفظ التغييرات في هذا المتصفح.');
    } catch {
      setNotice('تعذر الحفظ: مساحة التخزين في المتصفح ممتلئة. استخدم صورًا أصغر أو انتظر ربط التخزين الدائم.');
    }
  };
  const startNew = () => { setEditingId(null); setDraft(freshDraft()); setNotice(''); };
  const startEdit = (plant: ManagedPlant) => {
    setEditingId(plant.id);
    setDraft({ nameAr: plant.nameAr, nameEn: plant.nameEn, scientificName: plant.scientificName || '', descriptionAr: plant.descriptionAr || '', descriptionEn: plant.descriptionEn || '', categoryId: plant.categoryId, categoryAr: plant.categoryAr, image: plant.image || '', landscapeIcon: plant.landscapeIcon || '' });
    setNotice('');
  };
  const acceptImage = (kind: 'image' | 'landscapeIcon') => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !draft) return;
    if (!file.type.startsWith('image/')) { setNotice('اختر ملف صورة صالحًا.'); event.target.value = ''; return; }
    if (file.size > MAX_IMAGE_BYTES) { setNotice('حجم الصورة أكبر من 2 ميغابايت. صغّر الصورة ثم أعد رفعها.'); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => setDraft((current) => current ? { ...current, [kind]: String(reader.result) } : current);
    reader.onerror = () => setNotice('تعذر قراءة الصورة. حاول مرة أخرى.');
    reader.readAsDataURL(file);
    event.target.value = '';
  };
  const addCategory = () => {
    const name = newCategory.trim();
    if (!name || !draft) return;
    const existing = categories.find((category) => category.nameAr === name);
    setDraft({ ...draft, categoryId: existing?.id || `category-${newId()}`, categoryAr: name });
    setNewCategory('');
  };
  const saveDraft = () => {
    if (!draft?.nameAr.trim() || !draft.scientificName.trim()) { setNotice('أدخل الاسم الشائع بالعربية والاسم العلمي قبل الحفظ.'); return; }
    if (!draft.categoryAr.trim()) { setNotice('اختر قسمًا للنبتة.'); return; }
    const current = editingId ? plants.find((plant) => plant.id === editingId) : undefined;
    const nextPlant: ManagedPlant = { ...current, ...draft, id: editingId || newId(), nameAr: draft.nameAr.trim(), nameEn: draft.nameEn.trim() || draft.nameAr.trim(), scientificName: draft.scientificName.trim(), categoryAr: draft.categoryAr.trim(), categoryEn: draft.categoryAr.trim(), source: 'plant', descriptionAr: draft.descriptionAr.trim(), descriptionEn: draft.descriptionEn.trim() };
    persist(editingId ? plants.map((plant) => plant.id === editingId ? nextPlant : plant) : [nextPlant, ...plants]);
    setDraft(null); setEditingId(null);
  };
  const removePlant = (plant: ManagedPlant) => {
    if (!window.confirm(`حذف «${plant.nameAr}» من الكتالوج؟`)) return;
    persist(plants.filter((item) => item.id !== plant.id));
    if (editingId === plant.id) setDraft(null);
  };
  const updateDraft = (key: keyof PlantDraft, value: string | number) => setDraft((current) => current ? { ...current, [key]: value } : current);

  return <main className="managed-catalog-page" dir="rtl">
    <header className="managed-catalog-header"><div><Link className="managed-back" href="/admin"><ArrowLeft size={16} /> لوحة الأدمن</Link><div className="eyebrow">QADRI AI / PLANT LIBRARY</div><h1>إدارة كتالوج النباتات</h1><p className="page-desc">أضف بيانات كل نبتة وصورتها وأيقونتها الخاصة لمخطط الـLandscape.</p></div><button className="btn" onClick={startNew}><Plus size={16} />إضافة نبتة</button></header>
    <div className="managed-catalog-note"><Leaf size={16} /><span>كل نبتة محفوظة هنا يمكن اختيارها داخل عرض السعر. حقول الاسم والوصف في عرض السعر تبقى قابلة للتعديل هناك.</span></div><div className="managed-catalog-persistence-warning" role="note">تنبيه: الحفظ الحالي على هذا المتصفح فقط. مزامنة الصور والبيانات بين الأجهزة وحفظها الدائم في Neon تتطلب ربط قاعدة البيانات وواجهة API للمشروع؛ لم أفعّلها دون إعدادات قاعدة بيانات.</div>
    <div className="managed-catalog-toolbar"><label className="managed-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو الاسم العلمي..." /></label><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">كل الأقسام</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.nameAr}</option>)}</select><span>{filtered.length} نبتة</span></div>
    {notice && <p className="managed-catalog-status" role="status">{notice}</p>}
    {filtered.length ? <div className="managed-plant-grid">{filtered.map((plant) => <article className="managed-plant-card" key={plant.id}><div className="managed-plant-photo">{plant.image ? <img src={plant.image} alt={plant.nameAr} /> : <ImagePlus size={24} />}<span>{plant.categoryAr}</span></div><div className="managed-plant-copy"><strong>{plant.nameAr}</strong><em>{plant.scientificName || 'لم يضاف الاسم العلمي'}</em><p>{plant.descriptionAr || 'لا يوجد وصف بعد.'}</p><div className="managed-plant-actions"><button className="btn secondary small" onClick={() => startEdit(plant)}>تعديل البيانات</button><button className="icon-button" onClick={() => removePlant(plant)} aria-label={`حذف ${plant.nameAr}`}><Trash2 size={15} /></button></div></div></article>)}</div> : <section className="managed-catalog-empty"><div><Leaf size={22} /></div><h2>لا توجد نباتات هنا بعد</h2><p>أضف أول نبتة، أو غيّر البحث والقسم.</p><button className="btn" onClick={startNew}><Plus size={15} />إضافة نبتة</button></section>}
    {draft && <div className="managed-editor-backdrop" onClick={() => setDraft(null)}><section className="managed-editor" onClick={(event) => event.stopPropagation()}><header><div><div className="eyebrow">PLANT DETAILS</div><h2>{editingId ? 'تعديل بيانات النبتة' : 'إضافة نبتة جديدة'}</h2></div><button className="icon-button" onClick={() => setDraft(null)} aria-label="إغلاق"><X size={17} /></button></header>
      <div className="managed-editor-fields">
        <label className="field"><span>الاسم الشائع بالعربي *</span><input value={draft.nameAr} onChange={(event) => updateDraft('nameAr', event.target.value)} placeholder="مثال: جود ستار" /></label>
        <label className="field"><span>الاسم الشائع بالإنجليزي</span><input dir="ltr" value={draft.nameEn} onChange={(event) => updateDraft('nameEn', event.target.value)} placeholder="Common name" /></label>
        <label className="field"><span>الاسم العلمي *</span><input dir="ltr" value={draft.scientificName} onChange={(event) => updateDraft('scientificName', event.target.value)} placeholder="Cupressus macrocarpa 'Goldcrest'" /></label>
        <label className="field"><span>القسم</span><select value={draft.categoryId} onChange={(event) => { const category = categories.find((item) => item.id === event.target.value); setDraft({ ...draft, categoryId: event.target.value, categoryAr: category?.nameAr || draft.categoryAr }); }}>{categories.map((category) => <option key={category.id} value={category.id}>{category.nameAr}</option>)}{!categories.length && <option value={draft.categoryId}>نباتات</option>}</select><div className="managed-category-add"><input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="أو اكتب قسمًا جديدًا" /><button type="button" className="btn secondary small" onClick={addCategory} disabled={!newCategory.trim()}><Plus size={13} />إضافة القسم</button></div></label>
        <label className="field full"><span>الوصف بالعربي</span><textarea rows={3} value={draft.descriptionAr} onChange={(event) => updateDraft('descriptionAr', event.target.value)} placeholder="اكتب وصف النبتة بنفسك؛ سيُدرج كما هو في عرض السعر." /></label>
        <label className="field full"><span>Description in English</span><textarea dir="ltr" rows={3} value={draft.descriptionEn} onChange={(event) => updateDraft('descriptionEn', event.target.value)} placeholder="Optional English description" /></label>
        <div className="managed-upload-panel"><div><strong>صورة النبتة</strong><p>الصورة التعريفية في صفحة الكتالوج.</p></div><input ref={photoInput} type="file" accept="image/*" hidden onChange={acceptImage('image')} /><button className="btn secondary small" onClick={() => photoInput.current?.click()}><Upload size={14} />رفع صورة</button>{draft.image && <div className="managed-upload-preview"><img src={draft.image} alt="معاينة صورة النبتة" /><button className="icon-button" onClick={() => updateDraft('image', '')} aria-label="إزالة صورة النبتة"><Trash2 size={14} /></button></div>}</div>
        <div className="managed-upload-panel"><div><strong>أيقونة Landscape الخاصة بالنبتة</strong><p>ارفع الأيقونة فقط هنا؛ حجمها وشكلها ومساحتها تتحكم بها لاحقًا من محرر الـLandscape لكل عرض سعر.</p></div><input ref={iconInput} type="file" accept="image/*" hidden onChange={acceptImage('landscapeIcon')} /><button className="btn secondary small" onClick={() => iconInput.current?.click()}><Upload size={14} />رفع الأيقونة</button>{draft.landscapeIcon && <div className="managed-upload-preview icon-preview"><img src={draft.landscapeIcon} alt="معاينة أيقونة Landscape" /><button className="icon-button" onClick={() => updateDraft('landscapeIcon', '')} aria-label="إزالة الأيقونة"><Trash2 size={14} /></button></div>}</div>
      </div>{notice && <p className="managed-catalog-status" role="alert">{notice}</p>}<footer><button className="btn secondary" onClick={() => setDraft(null)}>إلغاء</button><button className="btn" onClick={saveDraft}><Plus size={15} />حفظ النبتة</button></footer>
    </section></div>}
  </main>;
}
