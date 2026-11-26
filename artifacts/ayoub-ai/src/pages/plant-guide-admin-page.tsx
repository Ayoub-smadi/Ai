import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AlertTriangle, ArrowLeft, Check, ImagePlus, Leaf, Search, Upload, X } from 'lucide-react';
import { Link } from 'wouter';
import {
  getPlantGuideRecords,
  savePlantGuideRecord,
  type PlantGuideRecord,
  type PlantGuideReference,
  type PlantGuideRegion,
} from '@/data/plant-guide-content';
import './plant-guide-admin-page.css';

type Draft = PlantGuideRecord & {
  classificationText: string;
  nativeDistributionText: string;
  cultivationRegionsText: string;
  referencesText: string;
  confirmImageMatch: boolean;
};

const formatRegions = (regions: PlantGuideRegion[] = []) => regions.map((region) => `${region.place} | ${region.sourceIds.join(', ')}`).join('\n');
const formatReferences = (references: PlantGuideReference[] = []) => references.map((reference) => `${reference.id} | ${reference.title} | ${reference.url} | ${reference.sourceType} | ${reference.supports.join(', ')}`).join('\n');
const makeDraft = (plant: PlantGuideRecord): Draft => ({
  ...plant,
  image: plant.image ? { ...plant.image } : null,
  classificationText: plant.classifications.map((item) => `${item.mainCategoryAr} | ${item.subcategoryAr}`).join('\n'),
  nativeDistributionText: formatRegions(plant.nativeDistribution),
  cultivationRegionsText: formatRegions(plant.cultivationRegions),
  referencesText: formatReferences(plant.references),
  confirmImageMatch: plant.imageStatus === 'verified' || plant.imageStatus === 'admin_verified',
});
const reviewNeeded = (plant: PlantGuideRecord) => plant.documentationStatus !== 'verified' || Boolean(plant.imageNeedsReview);

function parseRegions(text: string): PlantGuideRegion[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const [place, sourceIds = ''] = line.split('|');
    return { place: place.trim(), sourceIds: sourceIds.split(',').map((id) => id.trim()).filter(Boolean) };
  });
}

function parseReferences(text: string): PlantGuideReference[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const [id = '', title = '', url = '', sourceType = '', supports = ''] = line.split('|');
    return { id: id.trim(), title: title.trim(), url: url.trim(), sourceType: sourceType.trim(), supports: supports.split(',').map((item) => item.trim()).filter(Boolean) };
  });
}

export default function PlantGuideAdminPage() {
  const [plants, setPlants] = useState<PlantGuideRecord[]>(() => getPlantGuideRecords({ includeUnverifiedImages: true }));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState('');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [notice, setNotice] = useState('');
  const imageInput = useRef<HTMLInputElement>(null);
  const reviewCount = plants.filter(reviewNeeded).length;
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return plants.filter((plant) => (!reviewOnly || reviewNeeded(plant)) && (!search || `${plant.nameAr} ${plant.nameEn || ''} ${plant.scientificName || ''} ${plant.identityNote || ''} ${plant.classifications.map((item) => `${item.mainCategoryAr} ${item.subcategoryAr}`).join(' ')}`.toLocaleLowerCase().includes(search)));
  }, [plants, query, reviewOnly]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => current ? { ...current, [key]: value } : current);
  const setImageUrl = (imageUrl: string) => setDraft((current) => {
    if (!current) return current;
    if (!imageUrl.trim()) return { ...current, image: null, imageStatus: 'no_verified_image', confirmImageMatch: false };
    return {
      ...current,
      image: { imageUrl: imageUrl.trim(), sourceUrl: current.image?.sourceUrl || '', license: current.image?.license || '', credit: current.image?.credit || '', fileTitle: current.image?.fileTitle || '', matchScore: 100, matchQuery: 'admin-reviewed' },
      imageStatus: 'unverified',
      confirmImageMatch: false,
    };
  });
  const uploadImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !draft) return;
    if (!file.type.startsWith('image/')) { setNotice('اختر ملف صورة صالحًا.'); event.target.value = ''; return; }
    if (file.size > 400 * 1024) { setNotice('الصورة أكبر من 400 كيلوبايت؛ صغّرها أو استخدم رابط HTTPS واضحًا.'); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => setDraft((current) => current ? {
      ...current,
      image: { imageUrl: String(reader.result), sourceUrl: '', license: 'صورة رفعها المشرف', credit: '', fileTitle: file.name, matchScore: 100, matchQuery: 'admin-upload' },
      imageStatus: 'unverified',
      imageIsRepresentative: false,
      confirmImageMatch: false,
    } : current);
    reader.onerror = () => setNotice('تعذرت قراءة الصورة. حاول اختيار ملف آخر.');
    reader.readAsDataURL(file);
    setNotice('تم تجهيز الصورة. ستبقى مخفية عن الزوار حتى تأكيد مطابقتها للسجل.');
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
    const references = parseReferences(draft.referencesText);
    if (references.some((reference) => !reference.id || !reference.title || !/^https:\/\//i.test(reference.url) || !reference.sourceType)) {
      setNotice('تحقق من صيغة كل مرجع: المعرّف | العنوان | رابط HTTPS | نوع المصدر | الحقول المدعومة.'); return;
    }
    if (new Set(references.map((reference) => reference.id)).size !== references.length) { setNotice('معرّف المرجع مكرر؛ اجعل لكل مرجع معرّفًا مختلفًا.'); return; }
    const nativeDistribution = parseRegions(draft.nativeDistributionText);
    const cultivationRegions = parseRegions(draft.cultivationRegionsText);
    const knownSourceIds = new Set(references.map((reference) => reference.id));
    if ([...nativeDistribution, ...cultivationRegions].some((region) => !region.place || region.sourceIds.length === 0 || region.sourceIds.some((id) => !knownSourceIds.has(id)))) {
      setNotice('كل منطقة تحتاج اسمًا ومعرّف مرجع موجودًا في قائمة المراجع.'); return;
    }
    if (draft.documentationStatus === 'verified' && (references.length === 0 || !draft.scientificName?.trim())) {
      setNotice('لا يمكن وضع السجل «موثق» بلا مراجع واسم علمي مدعوم.'); return;
    }
    const saved: PlantGuideRecord = {
      ...draft,
      nameAr: draft.nameAr.trim(),
      nameEn: (draft.nameEn || '').trim(),
      scientificName: (draft.scientificName || '').trim(),
      descriptionAr: (draft.descriptionAr || '').trim(),
      descriptionEn: (draft.descriptionEn || '').trim(),
      classifications,
      nativeDistribution,
      cultivationRegions,
      references,
      markets: [],
      notes: [],
      image: photoUrl ? { ...draft.image!, imageUrl: photoUrl } : null,
      imageStatus: photoUrl ? (draft.confirmImageMatch ? 'admin_verified' : 'unverified') : 'no_verified_image',
      imageIsRepresentative: false,
      documentationStatus: draft.documentationStatus || 'not_reviewed',
      identityStatus: draft.identityStatus || 'not_reviewed',
    };
    try {
      savePlantGuideRecord(saved);
      setPlants(getPlantGuideRecords({ includeUnverifiedImages: true }));
      setDraft(null);
      setNotice('حُفظت التعديلات في هذا المتصفح؛ تتم مزامنتها إلى التخزين البعيد عند تهيئة الخادم واتصاله بقاعدة البيانات.');
    } catch {
      setNotice('تعذر الحفظ؛ قد تكون مساحة التخزين المحلية ممتلئة. استخدم رابط صورة HTTPS أو ملفًا أصغر.');
    }
  };

  return <main className="plant-guide-admin" dir="rtl">
    <header className="plant-guide-admin-head">
      <div><Link className="plant-guide-admin-back" href="/admin"><ArrowLeft size={16} /> لوحة الأدمن</Link><span className="plant-guide-admin-eyebrow">QADRI / PLANT GUIDE CONTENT</span><h1>إدارة دليل النباتات</h1><p>حرر الهوية والوصف والمناطق والمراجع والتصنيفات. لا يظهر محتوى أو صورة للزوار قبل توثيقه.</p></div>
      <Link className="plant-guide-public-link" href="/plants">معاينة الدليل العام</Link>
    </header>
    <div className="plant-guide-admin-warning"><AlertTriangle size={19} /><div><strong>حالة التوثيق والصور</strong><p>لا تُنشر بيانات أو صور غير متحققة. الصور المرفوعة تبقى مخفية حتى تؤكد مطابقتها. تُحفظ التعديلات محليًا أولًا، وتُزامن إلى الخادم عند توفر الاتصال؛ لم يتم التحقق من اتصال Neon في بيئة الإنتاج.</p></div><span>{reviewCount} سجلًا يحتاج مراجعة</span></div>
    <section className="plant-guide-admin-toolbar"><label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو الاسم العلمي…" /></label><button type="button" className={reviewOnly ? 'active' : ''} onClick={() => setReviewOnly((value) => !value)}><AlertTriangle size={15} /> {reviewOnly ? 'عرض الكل' : `غير المكتمل (${reviewCount})`}</button><span>{filtered.length} من {plants.length}</span></section>
    {notice && <p className="plant-guide-admin-notice" role="status">{notice}</p>}
    <section className="plant-guide-admin-grid">{filtered.map((plant) => <article key={plant.id} className={`plant-guide-admin-card ${reviewNeeded(plant) ? 'needs-review' : ''}`}>
      <div className="plant-guide-admin-photo">{plant.image?.imageUrl ? <img src={plant.image.imageUrl} alt={plant.nameAr} /> : <div><ImagePlus size={25} /><span>{plant.reviewReason || 'لا توجد صورة'}</span></div>}<button type="button" onClick={() => { setDraft(makeDraft(plant)); setNotice(''); }} aria-label={`تعديل ${plant.nameAr}`}>تعديل المحتوى</button></div>
      <div className="plant-guide-admin-card-copy"><strong>{plant.nameAr}</strong><em>{plant.scientificName || plant.nameEn || 'الهوية غير موثقة'}</em><small>{plant.documentationStatus || 'not_reviewed'} · {plant.classifications[0]?.subcategoryAr || 'بدون تصنيف'}</small>{reviewNeeded(plant) && <span><AlertTriangle size={13} /> يحتاج توثيقًا</span>}</div>
    </article>)}</section>

    {draft && <div className="plant-guide-admin-overlay" onClick={() => setDraft(null)}><section className="plant-guide-admin-editor" onClick={(event) => event.stopPropagation()}>
      <header><div><span className="plant-guide-admin-eyebrow">PLANT / {draft.id}</span><h2>تعديل بيانات النبات</h2></div><button type="button" onClick={() => setDraft(null)} aria-label="إغلاق"><X size={18} /></button></header>
      <div className="plant-guide-admin-fields">
        <label>الاسم بالعربية<input value={draft.nameAr} onChange={(event) => update('nameAr', event.target.value)} /></label>
        <label>الاسم بالإنجليزية<input dir="ltr" value={draft.nameEn || ''} onChange={(event) => update('nameEn', event.target.value)} /></label>
        <label>الاسم العلمي<input dir="ltr" value={draft.scientificName || ''} onChange={(event) => update('scientificName', event.target.value)} /></label>
        <label>حالة التوثيق<select value={draft.documentationStatus || 'not_reviewed'} onChange={(event) => update('documentationStatus', event.target.value as PlantGuideRecord['documentationStatus'])}><option value="not_reviewed">غير موثق بعد</option><option value="verified">موثق بالمراجع</option><option value="partial">توثيق جزئي</option><option value="ambiguous">هوية ملتبسة</option><option value="not_found">تعذر إثبات الهوية</option></select></label>
        <label>حالة الهوية<select value={draft.identityStatus || 'not_reviewed'} onChange={(event) => update('identityStatus', event.target.value as PlantGuideRecord['identityStatus'])}><option value="not_reviewed">غير مراجعة</option><option value="verified">متحققة</option><option value="partial">جزئية</option><option value="ambiguous">ملتبسة</option><option value="not_found">غير مثبتة</option></select></label>
        <label className="full">ملاحظة الالتباس/الهوية<input value={draft.identityNote || ''} onChange={(event) => update('identityNote', event.target.value)} /></label>
        <label className="full">الوصف بالعربية<textarea rows={5} value={draft.descriptionAr || ''} onChange={(event) => update('descriptionAr', event.target.value || '')} placeholder="أدرج الادعاءات التي تدعمها المراجع فقط" /></label>
        <label className="full">Description in English<textarea dir="ltr" rows={5} value={draft.descriptionEn || ''} onChange={(event) => update('descriptionEn', event.target.value || '')} placeholder="Only include claims supported by the listed sources" /></label>
        <label className="full">التصنيفات — سطر لكل تصنيف: رئيسي | فرعي<textarea rows={3} value={draft.classificationText} onChange={(event) => update('classificationText', event.target.value)} /></label>
        <label className="full">الموطن/الانتشار الطبيعي — سطر: المنطقة | أرقام المراجع<textarea rows={3} value={draft.nativeDistributionText} onChange={(event) => update('nativeDistributionText', event.target.value)} placeholder="المنطقة | 1, 2" /></label>
        <label className="full">مناطق زراعة مثبتة — سطر: المنطقة | أرقام المراجع<textarea rows={3} value={draft.cultivationRegionsText} onChange={(event) => update('cultivationRegionsText', event.target.value)} placeholder="المنطقة | 2" /></label>
        <label className="full">المراجع — سطر: المعرّف | العنوان | رابط HTTPS | نوع المصدر | الحقول المدعومة<textarea dir="ltr" rows={6} value={draft.referencesText} onChange={(event) => update('referencesText', event.target.value)} placeholder="1 | University Extension guide | https://... | University Extension | cultivation, pests" /></label>
        <label>صورة HTTPS<input dir="ltr" value={draft.image?.imageUrl.startsWith('data:') ? '' : draft.image?.imageUrl || ''} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://…" /></label>
        <label>مصدر الصورة<input dir="ltr" value={draft.image?.sourceUrl || ''} onChange={(event) => update('image', draft.image ? { ...draft.image, sourceUrl: event.target.value } : null)} placeholder="https://…" /></label>
        <label>الرخصة / الإسناد<input value={`${draft.image?.license || ''}${draft.image?.credit ? ` — ${draft.image.credit}` : ''}`} onChange={(event) => { const [license, ...credit] = event.target.value.split('—'); update('image', draft.image ? { ...draft.image, license: license.trim(), credit: credit.join('—').trim() } : null); }} /></label>
        <div className="plant-guide-admin-photo-tools"><input ref={imageInput} type="file" accept="image/*" hidden onChange={uploadImage} /><button type="button" onClick={() => imageInput.current?.click()}><Upload size={15} /> رفع صورة محلية (حتى 400KB)</button><button type="button" className="quiet" onClick={() => setImageUrl('')}>إزالة الصورة</button><label><input type="checkbox" checked={draft.confirmImageMatch} onChange={(event) => update('confirmImageMatch', event.target.checked)} /> أؤكد أن الصورة مطابقة للنبات/الصنف المحدد</label></div>
        {draft.image?.imageUrl && <img className="plant-guide-admin-preview" src={draft.image.imageUrl} alt="معاينة الصورة" />}
      </div>
      <footer><button type="button" className="quiet" onClick={() => setDraft(null)}>إلغاء</button><button type="button" className="save" onClick={save}><Check size={16} /> حفظ التغييرات</button></footer>
    </section></div>}
    <footer className="plant-guide-admin-foot"><Leaf size={15} /> الصورة والمعلومات غير الموثقة مخفية في الدليل العام؛ اربط كل منطقة وادعاء بمرجع موجود.</footer>
  </main>;
}
