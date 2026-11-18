import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AlertTriangle, ArrowLeft, Check, ImagePlus, Leaf, Search, Upload, X } from 'lucide-react';
import { Link } from 'wouter';
import {
  getPlantGuideRecords,
  savePlantGuideRecord,
  type PlantGuideRecord,
} from '@/data/plant-guide-content';
import './plant-guide-admin-page.css';

type Draft = PlantGuideRecord & { classificationText: string; marketsText: string; notesText: string };
const makeDraft = (plant: PlantGuideRecord): Draft => ({
  ...plant,
  image: plant.image ? { ...plant.image } : null,
  classificationText: plant.classifications.map((item) => `${item.mainCategoryAr} | ${item.subcategoryAr}`).join('\n'),
  marketsText: plant.markets.join('\n'),
  notesText: plant.notes.join('\n'),
});
const reviewNeeded = (plant: PlantGuideRecord) => Boolean(plant.imageNeedsReview);

export default function PlantGuideAdminPage() {
  const [plants, setPlants] = useState<PlantGuideRecord[]>(() => getPlantGuideRecords({ keepRepeatedPhotos: true }));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState('');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [notice, setNotice] = useState('');
  const imageInput = useRef<HTMLInputElement>(null);
  const reviewCount = plants.filter(reviewNeeded).length;
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return plants.filter((plant) => (!reviewOnly || reviewNeeded(plant)) && (!search || `${plant.nameAr} ${plant.nameEn || ''} ${plant.scientificName || ''} ${plant.classifications.map((item) => `${item.mainCategoryAr} ${item.subcategoryAr}`).join(' ')}`.toLocaleLowerCase().includes(search)));
  }, [plants, query, reviewOnly]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => current ? { ...current, [key]: value } : current);
  const setImageUrl = (imageUrl: string) => setDraft((current) => {
    if (!current) return current;
    if (!imageUrl.trim()) return { ...current, image: null };
    return { ...current, image: { imageUrl: imageUrl.trim(), sourceUrl: current.image?.sourceUrl || '', license: current.image?.license || '', credit: current.image?.credit || '', fileTitle: current.image?.fileTitle || '', matchScore: 100, matchQuery: 'admin-reviewed' } };
  });
  const uploadImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !draft) return;
    if (!file.type.startsWith('image/')) { setNotice('اختر ملف صورة صالحًا.'); event.target.value = ''; return; }
    if (file.size > 400 * 1024) { setNotice('الصورة أكبر من 400 كيلوبايت؛ صغّرها أو استخدم رابط HTTPS واضحًا لتجنّب امتلاء تخزين المتصفح.'); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => setDraft((current) => current ? { ...current, image: { imageUrl: String(reader.result), sourceUrl: '', license: 'صورة رفعها المشرف', credit: '', fileTitle: file.name, matchScore: 100, matchQuery: 'admin-upload' }, imageIsRepresentative: false } : current);
    reader.onerror = () => setNotice('تعذرت قراءة الصورة. حاول اختيار ملف آخر.');
    reader.readAsDataURL(file);
    setNotice('تم تجهيز الصورة؛ احفظ التعديلات لتطبيقها على هذا المتصفح.');
    event.target.value = '';
  };
  const save = () => {
    if (!draft?.nameAr.trim()) { setNotice('أدخل اسم النبات بالعربية قبل الحفظ.'); return; }
    const photoUrl = draft.image?.imageUrl.trim() || '';
    if (photoUrl && !photoUrl.startsWith('data:image/') && !/^https:\/\//i.test(photoUrl)) { setNotice('استخدم رابط صورة يبدأ بـ HTTPS أو ارفع ملف صورة.'); return; }
    const classifications = draft.classificationText.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const [mainCategoryAr, ...rest] = line.split('|');
      return { mainCategoryAr: mainCategoryAr.trim(), subcategoryAr: rest.join('|').trim() || mainCategoryAr.trim() };
    }).filter((item) => item.mainCategoryAr && item.subcategoryAr);
    const saved: PlantGuideRecord = {
      ...draft,
      nameAr: draft.nameAr.trim(),
      nameEn: (draft.nameEn || '').trim(),
      scientificName: (draft.scientificName || '').trim(),
      descriptionAr: (draft.descriptionAr || '').trim(),
      descriptionEn: draft.descriptionEn?.trim() || '',
      classifications,
      markets: draft.marketsText.split('\n').map((item) => item.trim()).filter(Boolean),
      notes: draft.notesText.split('\n').map((item) => item.trim()).filter(Boolean),
      image: draft.image?.imageUrl.trim() ? { ...draft.image, imageUrl: draft.image.imageUrl.trim() } : null,
      imageIsRepresentative: draft.imageIsRepresentative,
    };
    try {
      savePlantGuideRecord(saved);
      setPlants(getPlantGuideRecords({ keepRepeatedPhotos: true }));
      setDraft(null);
      setNotice('تم حفظ التعديلات في تخزين هذا المتصفح.');
    } catch {
      setNotice('تعذر الحفظ؛ يبدو أن مساحة تخزين المتصفح امتلأت. استخدم رابط صورة HTTPS أو ملفًا أصغر.');
    }
  };

  return <main className="plant-guide-admin" dir="rtl">
    <header className="plant-guide-admin-head">
      <div><Link className="plant-guide-admin-back" href="/admin"><ArrowLeft size={16} /> لوحة الأدمن</Link><span className="plant-guide-admin-eyebrow">QADRI / PLANT GUIDE CONTENT</span><h1>إدارة دليل النباتات</h1><p>عدّل الصور والأسماء والأوصاف والتصنيفات والملاحظات التي تظهر فعلًا في صفحة <code dir="ltr">/plants</code>.</p></div>
      <Link className="plant-guide-public-link" href="/plants">معاينة الدليل العام</Link>
    </header>
    <div className="plant-guide-admin-warning"><AlertTriangle size={19} /><div><strong>مراجعة الصور والتخزين</strong><p>أُخفيت تلقائيًا الصور المكررة أو منخفضة المطابقة حتى لا تظهر صور مضللة. عدّل العناصر التي عليها علامة مراجعة واختر صورة مختلفة وواضحة. التغييرات الحالية تُحفظ على هذا المتصفح فقط؛ لن تظهر للزوار أو على أجهزة أخرى حتى إعداد تخزين دائم وواجهة API. كما أن قفل الإدارة الحالي على الواجهة وليس صلاحية admin موثقة على الخادم.</p></div><span>{reviewCount} للمراجعة</span></div>
    <section className="plant-guide-admin-toolbar"><label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم النبات أو الاسم العلمي…" /></label><button type="button" className={reviewOnly ? 'active' : ''} onClick={() => setReviewOnly((value) => !value)}><AlertTriangle size={15} /> {reviewOnly ? 'عرض الكل' : `المراجعة فقط (${reviewCount})`}</button><span>{filtered.length} من {plants.length}</span></section>
    {notice && <p className="plant-guide-admin-notice" role="status">{notice}</p>}
    <section className="plant-guide-admin-grid">{filtered.map((plant) => <article key={plant.id} className={`plant-guide-admin-card ${reviewNeeded(plant) ? 'needs-review' : ''}`}>
      <div className="plant-guide-admin-photo">{plant.image?.imageUrl ? <img src={plant.image.imageUrl} alt={plant.nameAr} /> : <div><ImagePlus size={25} /><span>{plant.reviewReason || 'لا توجد صورة'}</span></div>}<button type="button" onClick={() => { setDraft(makeDraft(plant)); setNotice(''); }} aria-label={`تعديل ${plant.nameAr}`}>تعديل المحتوى</button></div>
      <div className="plant-guide-admin-card-copy"><strong>{plant.nameAr}</strong><em>{plant.scientificName || plant.nameEn || 'لم يضف اسم علمي'}</em><small>{plant.classifications[0]?.subcategoryAr || 'بدون تصنيف'}</small>{reviewNeeded(plant) && <span><AlertTriangle size={13} /> تحتاج مراجعة الصورة</span>}</div>
    </article>)}</section>

    {draft && <div className="plant-guide-admin-overlay" onClick={() => setDraft(null)}><section className="plant-guide-admin-editor" onClick={(event) => event.stopPropagation()}>
      <header><div><span className="plant-guide-admin-eyebrow">PLANT / {draft.id}</span><h2>تعديل بيانات النبات</h2></div><button type="button" onClick={() => setDraft(null)} aria-label="إغلاق"><X size={18} /></button></header>
      <div className="plant-guide-admin-fields">
        <label>الاسم بالعربية<input value={draft.nameAr} onChange={(event) => update('nameAr', event.target.value)} /></label>
        <label>الاسم بالإنجليزية<input dir="ltr" value={draft.nameEn || ''} onChange={(event) => update('nameEn', event.target.value)} /></label>
        <label>الاسم العلمي<input dir="ltr" value={draft.scientificName || ''} onChange={(event) => update('scientificName', event.target.value)} /></label>
        <label>صورة HTTPS<input dir="ltr" value={draft.image?.imageUrl.startsWith('data:') ? '' : draft.image?.imageUrl || ''} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://…" /></label>
        <label className="full">الوصف بالعربية<textarea rows={3} value={draft.descriptionAr || ''} onChange={(event) => update('descriptionAr', event.target.value)} placeholder="وصف واضح للنبات" /></label>
        <label className="full">Description in English<textarea dir="ltr" rows={3} value={draft.descriptionEn || ''} onChange={(event) => update('descriptionEn', event.target.value)} /></label>
        <label className="full">التصنيفات — سطر لكل تصنيف: رئيسي | فرعي<textarea rows={3} value={draft.classificationText} onChange={(event) => update('classificationText', event.target.value)} /></label>
        <label>الأسواق/المناطق، سطر لكل واحدة<textarea rows={3} value={draft.marketsText} onChange={(event) => update('marketsText', event.target.value)} /></label>
        <label>الملاحظات، سطر لكل واحدة<textarea rows={3} value={draft.notesText} onChange={(event) => update('notesText', event.target.value)} /></label>
        <label>مصدر الصورة<input dir="ltr" value={draft.image?.sourceUrl || ''} onChange={(event) => update('image', draft.image ? { ...draft.image, sourceUrl: event.target.value } : null)} placeholder="https://…" /></label>
        <label>الرخصة / الإسناد<input value={`${draft.image?.license || ''}${draft.image?.credit ? ` — ${draft.image.credit}` : ''}`} onChange={(event) => { const [license, ...credit] = event.target.value.split('—'); update('image', draft.image ? { ...draft.image, license: license.trim(), credit: credit.join('—').trim() } : null); }} /></label>
        <div className="plant-guide-admin-photo-tools"><input ref={imageInput} type="file" accept="image/*" hidden onChange={uploadImage} /><button type="button" onClick={() => imageInput.current?.click()}><Upload size={15} /> رفع صورة محلية (حتى 400KB)</button><button type="button" className="quiet" onClick={() => setImageUrl('')}>إزالة الصورة</button><label><input type="checkbox" checked={draft.imageIsRepresentative} onChange={(event) => update('imageIsRepresentative', event.target.checked)} /> الصورة تمثيلية وليست للصنف المحدد</label></div>
        {draft.image?.imageUrl && <img className="plant-guide-admin-preview" src={draft.image.imageUrl} alt="معاينة الصورة الجديدة" />}
      </div>
      <footer><button type="button" className="quiet" onClick={() => setDraft(null)}>إلغاء</button><button type="button" className="save" onClick={save}><Check size={16} /> حفظ التغييرات</button></footer>
    </section></div>}
    <footer className="plant-guide-admin-foot"><Leaf size={15} /> التغييرات هنا تخص محتوى دليل النباتات؛ لا تغيّر عناصر عرض السعر في كتالوج آخر.</footer>
  </main>;
}
