import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, Download, Leaf, MapPin, QrCode, Search, ShieldCheck, Sprout, X } from 'lucide-react';
import { Link, useRoute } from 'wouter';
import { QRCodeSVG } from 'qrcode.react';
import {
  getPlantGuideRecords,
  getPlantGuideSourceCount,
  PLANT_GUIDE_STORAGE_KEY,
  PLANT_GUIDE_UPDATED_EVENT,
  type PlantGuideRecord,
  type PlantGuidePhoto,
  type PlantGuideReference,
  type PlantGuideRegion,
} from '@/data/plant-guide-content';
import './plant-guide-page.css';

const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const pageUrl = (path: string) => new URL(`${basePath}${path.startsWith('/') ? path : `/${path}`}`, window.location.origin).toString();
const plantUrl = (id: string) => pageUrl(`/plants/${encodeURIComponent(id)}`);
const normalize = (value: string) => value.normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g, '').toLocaleLowerCase();
const safeFilename = (value: string) => value.normalize('NFKC').replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/^-|-$/g, '') || 'plant';

type GuidePlant = Pick<PlantGuideRecord,
  'id' | 'nameAr' | 'nameEn' | 'scientificName' | 'descriptionAr' | 'descriptionEn' | 'classifications' | 'image' |
  'imageIsRepresentative' | 'imageNeedsReview' | 'reviewReason' | 'identityStatus' | 'documentationStatus' | 'identityNote' |
  'nativeDistribution' | 'cultivationRegions' | 'references' | 'imageStatus'>;

const mapGuidePlant = (plant: PlantGuideRecord): GuidePlant => {
  const references = plant.references || [];
  const referenceIds = new Set(references.map((reference) => reference.id));
  const hasCitedText = (text?: string) => {
    if (!text?.trim()) return false;
    const citedIds = [...text.matchAll(/\[(\d+)\]/g)].map((match) => match[1]);
    return citedIds.length > 0 && citedIds.every((id) => referenceIds.has(id));
  };
  const identityVerified = plant.identityStatus === 'verified';
  const supportedRegions = (regions: PlantGuideRegion[] = []) => regions.filter((region) =>
    region.place.trim() && region.sourceIds.length > 0 && region.sourceIds.every((id) => referenceIds.has(id)));
  return ({
  id: plant.id,
  nameAr: plant.nameAr,
  nameEn: identityVerified ? plant.nameEn || '' : '',
  scientificName: identityVerified ? plant.scientificName || '' : '',
  descriptionAr: hasCitedText(plant.descriptionAr) ? plant.descriptionAr || '' : '',
  descriptionEn: hasCitedText(plant.descriptionEn) ? plant.descriptionEn || '' : '',
  classifications: plant.classifications,
  image: plant.image,
  imageIsRepresentative: plant.imageIsRepresentative,
  imageNeedsReview: plant.imageNeedsReview,
  reviewReason: plant.reviewReason,
  identityStatus: plant.identityStatus || 'not_reviewed',
  documentationStatus: plant.documentationStatus || 'not_reviewed',
  identityNote: plant.identityNote || '',
  nativeDistribution: supportedRegions(plant.nativeDistribution),
  cultivationRegions: supportedRegions(plant.cultivationRegions),
  references,
  imageStatus: plant.imageStatus || 'not_reviewed',
  });
};

function useCurrentPlants() {
  const [plants, setPlants] = useState<GuidePlant[]>(() => getPlantGuideRecords().map(mapGuidePlant));
  useEffect(() => {
    const refresh = () => setPlants(getPlantGuideRecords().map(mapGuidePlant));
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key === PLANT_GUIDE_STORAGE_KEY) refresh(); };
    window.addEventListener(PLANT_GUIDE_UPDATED_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener(PLANT_GUIDE_UPDATED_EVENT, refresh); window.removeEventListener('storage', onStorage); };
  }, []);
  return plants;
}

function statusLabel(status: GuidePlant['documentationStatus']): string {
  switch (status) {
    case 'verified': return 'موثق بالمراجع';
    case 'partial': return 'توثيق جزئي';
    case 'ambiguous': return 'هوية ملتبسة';
    case 'not_found': return 'تعذر إثبات الهوية';
    default: return 'غير موثق بعد';
  }
}

function StatusBadge({ status }: { status: GuidePlant['documentationStatus'] }) {
  return <span className={`plant-documentation-status status-${status || 'not_reviewed'}`}>{statusLabel(status)}</span>;
}

function renderCitedText(text: string, references: PlantGuideReference[]) {
  const referenceById = new Map(references.map((reference) => [reference.id, reference]));
  return text.split(/(\[\d+\])/g).map((part, index) => {
    const match = part.match(/^\[(\d+)\]$/);
    const reference = match ? referenceById.get(match[1]) : undefined;
    return reference
      ? <a className="plant-inline-citation" href={reference.url} target="_blank" rel="noreferrer" key={`${reference.id}-${index}`}>{part}</a>
      : <span key={index}>{part}</span>;
  });
}

function RegionList({ title, regions, references }: { title: string; regions: PlantGuideRegion[]; references: PlantGuideReference[] }) {
  const referenceById = new Map(references.map((reference) => [reference.id, reference]));
  return <section className="plant-evidence-region-group"><h3>{title}</h3>{regions.length ? <ul>{regions.map((region, index) => <li key={`${region.place}-${index}`}><strong>{region.place}</strong>{region.sourceIds.map((sourceId) => {
    const reference = referenceById.get(sourceId);
    return reference ? <a key={sourceId} href={reference.url} target="_blank" rel="noreferrer">[{sourceId}]</a> : null;
  })}</li>)}</ul> : <p className="plant-unknown-value">لا توجد مناطق مثبتة في المراجع المتاحة لهذا السجل.</p>}</section>;
}

function PlantImage({ plant, accent, className = '', categoryLabel, showCategory = true }: { plant: GuidePlant; accent: string; className?: string; categoryLabel?: string; showCategory?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <div className={`plant-guide-image ${className}`} style={{ '--plant-accent': accent } as CSSProperties}>
    {plant.image?.imageUrl && !failed
      ? <img src={plant.image.imageUrl} alt={plant.nameAr} loading="lazy" onError={() => setFailed(true)} />
      : <div className="plant-guide-image-fallback"><Leaf size={42} strokeWidth={1.25} /><span>{plant.imageNeedsReview ? 'الصورة غير موثقة بعد' : 'لا توجد صورة معتمدة'}</span></div>}
    {showCategory && <span className="plant-guide-image-category">{categoryLabel || plant.classifications[0]?.subcategoryAr || 'تصنيف غير متاح'}</span>}
  </div>;
}

const navbarColor = '#020618';
function accentFor() { return navbarColor; }

export function PlantGuideHomeFeature({ lang }: { lang: 'ar' | 'en' }) {
  const isArabic = lang === 'ar';
  return <section className="plant-guide-home-section" aria-labelledby="plant-guide-home-title" dir={isArabic ? 'rtl' : 'ltr'}>
    <div className="plant-guide-home-shell">
      <div className="plant-guide-home-copy">
        <span className="plant-guide-kicker"><Sprout size={14} /> {isArabic ? 'دليل نباتات القادري' : 'Qadri plant guide'}</span>
        <h2 id="plant-guide-home-title">{isArabic ? 'معلومات نباتية موثقة.' : 'Evidence-led plant information.'}<br /><span>{isArabic ? 'لكل سجل مراجعه.' : 'Sources for every record.'}</span></h2>
        <p>{isArabic ? 'افتح بطاقة النبات لمراجعة اسمه وتصنيفه ومعلومات الزراعة والمناطق التي تؤيدها المراجع. الحقول التي لا تتوفر لها أدلة تبقى معلّمة بأنها غير موثقة.' : 'Open a plant record to review its names, classification, sourced cultivation details, and documented regions. Unsupported fields remain clearly marked as undocumented.'}</p>
        <div className="plant-guide-region-chips" aria-label={isArabic ? 'حالة المناطق' : 'Regional evidence status'}>
          <span><MapPin size={12} />{isArabic ? 'المناطق تُذكر لكل نبات بمصدر' : 'Regions cited per plant'}</span>
        </div>
        <Link className="plant-guide-home-button" href="/plants">{isArabic ? 'تصفّح دليل النباتات' : 'Browse the plant guide'} {isArabic ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}</Link>
        <small>{isArabic ? 'لا تُعرض توصيات عامة بديلًا عن معلومات موثقة.' : 'General recommendations are not used as a substitute for verified information.'}</small>
      </div>
      <div className="plant-guide-home-qr-stage">
        <div className="plant-guide-home-orbit plant-guide-home-orbit-one" />
        <div className="plant-guide-home-orbit plant-guide-home-orbit-two" />
        <div className="plant-guide-home-qr-card">
          <div className="plant-guide-home-qr-label"><span><QrCode size={15} /> QADRI / PLANT LIBRARY</span><span className="plant-guide-live-dot" /></div>
          <div className="plant-guide-home-qr-box"><QRCodeSVG value={pageUrl('/plants')} size={176} level="H" includeMargin title={isArabic ? 'رمز QR لدليل النباتات' : 'QR code to the plant guide'} /></div>
        </div>
        <div className="plant-guide-qr-leaf leaf-one"><Leaf size={28} /></div>
        <div className="plant-guide-qr-leaf leaf-two"><Sprout size={25} /></div>
      </div>
    </div>
  </section>;
}

export function PlantGuidePage() {
  const plants = useCurrentPlants();
  const [search, setSearch] = useState('');
  const [mainCategory, setMainCategory] = useState('all');
  const [subcategory, setSubcategory] = useState('all');
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    plants.forEach((plant) => [...new Set(plant.classifications.map((item) => item.mainCategoryAr))].forEach((name) => counts.set(name, (counts.get(name) || 0) + 1)));
    return [...counts].map(([name, count]) => ({ name, count }));
  }, [plants]);
  const subcategories = useMemo(() => [...new Set(plants.flatMap((plant) => plant.classifications
    .filter((item) => mainCategory === 'all' || item.mainCategoryAr === mainCategory)
    .map((item) => item.subcategoryAr)))].sort((a, b) => a.localeCompare(b, 'ar')), [plants, mainCategory]);
  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return plants.filter((plant) => {
      const matchesClassification = plant.classifications.some((item) =>
        (mainCategory === 'all' || item.mainCategoryAr === mainCategory) &&
        (subcategory === 'all' || item.subcategoryAr === subcategory));
      const searchable = `${plant.nameAr} ${plant.nameEn || ''} ${plant.scientificName || ''} ${plant.classifications.map((item) => `${item.mainCategoryAr} ${item.subcategoryAr}`).join(' ')}`;
      return matchesClassification && (!q || normalize(searchable).includes(q));
    });
  }, [plants, search, mainCategory, subcategory]);

  return <main className="plant-guide-page" dir="rtl" lang="ar">
    <section className="plant-guide-list-hero">
      <div className="plant-guide-list-hero-inner">
        <div className="plant-guide-list-copy">
          <div className="plant-guide-kicker"><BookOpen size={14} /> دليل القادري للنباتات</div>
          <h1>دليل النباتات.<br /><span>بمراجع واضحة.</span></h1>
          <p>سجل نباتي ثنائي اللغة. تعرض كل بطاقة حالة التوثيق ومصادر الادعاءات؛ لا تُستبدل المعلومات الناقصة بتوصيات عامة أو تخمينات.</p>
          <div className="plant-guide-list-stats"><span><strong>{plants.length}</strong> سجلًا نباتيًا</span><span><strong>{getPlantGuideSourceCount()}</strong> إدراجًا مصدرًا في القائمة الأصلية</span><span><ShieldCheck size={14} />المناطق موثقة لكل سجل</span></div>
        </div>
        <div className="plant-guide-list-hero-art" aria-hidden="true"><div className="guide-art-disc"><Leaf size={80} strokeWidth={0.9} /></div><span className="guide-art-label guide-art-label-top">FIELD NOTES / 01</span><span className="guide-art-label guide-art-label-bottom">SOURCE EVERY CLAIM</span><i className="guide-art-ring guide-art-ring-one" /><i className="guide-art-ring guide-art-ring-two" /></div>
      </div>
    </section>

    <section className="plant-guide-catalog-wrap">
      <div className="plant-guide-catalog-head">
        <div><span className="plant-guide-kicker">كتالوج النباتات</span><h2>اكتشف نبتتك</h2><p>الأسماء الإنجليزية والعلمية والتصنيفات الأصلية قابلة للبحث؛ افتح السجل لمراجعة الأدلة والمراجع.</p></div>
        <label className="plant-guide-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو التصنيف…" aria-label="ابحث في النباتات" /><span>{filtered.length}</span>{search && <button type="button" onClick={() => setSearch('')} aria-label="مسح البحث"><X size={14} /></button>}</label>
      </div>
      <div className="plant-guide-category-pills"><button className={mainCategory === 'all' ? 'active' : ''} onClick={() => { setMainCategory('all'); setSubcategory('all'); }}>كل النباتات <span>{plants.length}</span></button>{categories.map((item) => <button key={item.name} className={mainCategory === item.name ? 'active' : ''} onClick={() => { setMainCategory(item.name); setSubcategory('all'); }}>{item.name}<span>{item.count}</span></button>)}</div>
      <label className="plant-guide-subcategory"><span>القسم الفرعي</span><select value={subcategory} onChange={(event) => setSubcategory(event.target.value)}><option value="all">كل الأقسام الفرعية</option>{subcategories.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
      {filtered.length ? <div className="plant-guide-grid">{filtered.map((plant) => {
        const accent = accentFor();
        const primaryClassification = plant.classifications.find((item) => (mainCategory === 'all' || item.mainCategoryAr === mainCategory) && (subcategory === 'all' || item.subcategoryAr === subcategory)) || plant.classifications[0];
        return <div className="plant-guide-card-frame" key={plant.id} style={{ '--plant-accent': accent } as CSSProperties}>
          <Link className="plant-guide-card" href={`/plants/${encodeURIComponent(plant.id)}`}>
            <PlantImage plant={plant} accent={accent} categoryLabel={primaryClassification?.subcategoryAr} />
            <div className="plant-guide-card-copy"><span className="plant-guide-card-category">{primaryClassification?.mainCategoryAr || 'تصنيف من القائمة الأصلية'}</span><h3>{plant.nameAr}</h3>{plant.nameEn && <span className="plant-card-name-en" dir="ltr">{plant.nameEn}</span>}<em>{plant.scientificName || 'الاسم العلمي غير موثق بعد'}</em><StatusBadge status={plant.documentationStatus} /><span className="plant-guide-card-bottom">افتح سجل النبات <ChevronLeft size={15} /></span></div>
          </Link>
          {plant.image?.sourceUrl ? <a className="plant-guide-image-credit" href={plant.image.sourceUrl} target="_blank" rel="noreferrer">{plant.image.license || 'مصدر الصورة'}{plant.image.credit ? ` · ${plant.image.credit}` : ''}</a> : <span className="plant-guide-image-credit">لا توجد صورة معتمدة لهذا السجل</span>}
        </div>;
      })}</div> : <div className="plant-guide-empty"><Leaf size={26} /><h3>لم نعثر على نبتة بهذا الاسم</h3><p>جرّب البحث باسم أو قسم فرعي مختلف، أو أزل الفلاتر.</p><button onClick={() => { setSearch(''); setMainCategory('all'); setSubcategory('all'); }}>إظهار كل النباتات</button></div>}
      <p className="plant-guide-climate-note"><ShieldCheck size={16} />التصنيفات من القائمة الأصلية. لا تُعرض المناطق أو نصائح العناية إلا إذا كانت مرتبطة بمراجع واضحة داخل سجل النبات. الصور غير المتحققة مخفية.</p>
    </section>
  </main>;
}

export function PlantDetailPage() {
  const [, params] = useRoute('/plants/:plantId');
  const plants = useCurrentPlants();
  const plant = plants.find((item) => item.id === decodeURIComponent(params?.plantId || ''));
  const cardRef = useRef<HTMLElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  if (!plant) return <main className="plant-guide-page" dir="rtl" lang="ar"><section className="plant-guide-not-found"><div className="plant-guide-not-found-icon"><Leaf size={30} /></div><span className="plant-guide-kicker">QADRI / PLANT FILE</span><h1>لم نعثر على هذا السجل</h1><p>قد يكون الرابط قديمًا أو أن السجل غير موجود في القائمة.</p><Link className="plant-guide-home-button" href="/plants"><ArrowRight size={16} /> العودة إلى دليل النباتات</Link></section></main>;

  const references = plant.references || [];
  const accent = accentFor();
  const qrUrl = plantUrl(plant.id);
  const downloadCard = async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    setDownloadError('');
    try {
      await document.fonts?.ready;
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const canvas = await html2canvas(cardRef.current, { scale: 3, backgroundColor: '#f4f1e8', useCORS: true, allowTaint: false, logging: false });
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [148, 105], compress: true });
      const pageWidth = 148;
      const pageHeight = 105;
      const scale = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const width = canvas.width * scale;
      const height = canvas.height * scale;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageWidth - width) / 2, (pageHeight - height) / 2, width, height, undefined, 'FAST');
      pdf.save(`qadri-${safeFilename(plant.nameAr)}-plant-card.pdf`);
    } catch (error) {
      console.error('Plant card PDF export failed', error);
      setDownloadError('تعذر تنزيل البطاقة الآن. أعد المحاولة بعد تحميل الصفحة بالكامل.');
    } finally {
      setDownloading(false);
    }
  };

  return <main className="plant-guide-page plant-detail-page" dir="rtl" lang="ar" style={{ '--plant-accent': accent } as CSSProperties}>
    <div className="plant-detail-topbar"><Link href="/plants"><ArrowRight size={16} /> العودة إلى دليل النباتات</Link><span>PLANT PASSPORT</span></div>
    <section className="plant-detail-hero">
      <div className="plant-detail-hero-copy"><span className="plant-guide-kicker"><Sprout size={14} /> بطاقة تعريف نباتية</span><h1>{plant.nameAr}</h1>{plant.nameEn && <p className="plant-detail-name-en" dir="ltr">{plant.nameEn}</p>}<em>{plant.scientificName || 'الاسم العلمي غير موثق بعد'}</em><StatusBadge status={plant.documentationStatus} />{plant.identityNote && <p className="plant-identity-note">{plant.identityNote}</p>}<div className="plant-detail-hero-actions"><button className="plant-guide-download-button" onClick={downloadCard} disabled={downloading}><Download size={16} />{downloading ? 'يتم تجهيز البطاقة…' : 'تنزيل بطاقة PDF'}</button><a className="plant-guide-secondary-button" href={qrUrl} target="_blank" rel="noreferrer"><QrCode size={15} /> رابط صفحة النبات</a></div>{downloadError && <p className="plant-guide-download-error" role="alert">{downloadError}</p>}</div>
      <PlantImage plant={plant} accent={accent} className="plant-detail-main-image" showCategory={false} />
    </section>

    <section className="plant-detail-section plant-evidence-descriptions"><div className="plant-detail-section-heading"><span className="plant-guide-kicker"><BookOpen size={14} /> محتوى مدعوم بالمراجع</span><h2>الوصف والعناية</h2><p>تُعرض فقط المعلومات التي ترتبط بمصدر في قائمة المراجع أدناه.</p></div><div className="plant-evidence-language-grid"><article><h3>الوصف بالعربية</h3><p>{plant.descriptionAr ? renderCitedText(plant.descriptionAr, references) : <span className="plant-unknown-value">لا توجد معلومات عربية موثقة لهذا الحقل بعد.</span>}</p></article><article dir="ltr"><h3>Description in English</h3><p>{plant.descriptionEn ? renderCitedText(plant.descriptionEn, references) : <span className="plant-unknown-value">No verified English description is available for this record yet.</span>}</p></article></div></section>

    <section className="plant-detail-section plant-evidence-classifications"><div className="plant-detail-section-heading"><span className="plant-guide-kicker">التصنيفات</span><h2>التصنيف المسجل</h2></div>{plant.classifications.length ? <ul>{plant.classifications.map((item, index) => <li key={`${item.mainCategoryAr}-${item.subcategoryAr}-${index}`}>{item.mainCategoryAr} | {item.subcategoryAr}</li>)}</ul> : <p className="plant-unknown-value">لا يوجد تصنيف مسجل لهذا النبات.</p>}</section>

    <section className="plant-detail-region-section"><div><span className="plant-guide-kicker"><MapPin size={14} /> التوزيع والمناطق</span><h2>مناطق موثقة</h2><p>لا تعني مناطق الانتشار الطبيعي بالضرورة أن النبات ملائم للزراعة التجارية فيها.</p></div><div className="plant-evidence-region-columns"><RegionList title="الموطن أو الانتشار الطبيعي" regions={plant.nativeDistribution || []} references={references} /><RegionList title="مناطق زراعة موثقة" regions={plant.cultivationRegions || []} references={references} /></div></section>

    <section className="plant-detail-sources"><span className="plant-guide-kicker"><BookOpen size={14} /> المراجع</span>{references.length ? <div>{references.map((reference) => <a href={reference.url} target="_blank" rel="noreferrer" key={reference.id}><span><strong>[{reference.id}] {reference.title}</strong><small>{reference.sourceType} · {reference.supports.join('، ')}</small></span><ArrowLeft size={13} /></a>)}</div> : <p className="plant-unknown-value">لا توجد مراجع مسجلة لهذا السجل حتى الآن.</p>}{plant.image?.sourceUrl && <a className="plant-image-source-link" href={plant.image.sourceUrl} target="_blank" rel="noreferrer">مصدر الصورة · {plant.image.license || 'الرخصة غير موضحة'}{plant.image.credit ? ` · ${plant.image.credit}` : ''}<ArrowLeft size={13} /></a>}</section>

    <section className="plant-card-download-section"><div className="plant-detail-section-heading"><span className="plant-guide-kicker"><QrCode size={14} /> بطاقة قابلة للمشاركة</span><h2>بطاقة تعريف النبات</h2><p>تحتوي البطاقة على الاسم والمعلومات المدعومة المتاحة في هذا السجل.</p></div>
      <article ref={cardRef} className="plant-passport-card" style={{ '--plant-accent': accent } as CSSProperties}>
        <div className="plant-passport-card-decor"><span className="passport-decor-leaf"><Leaf size={98} strokeWidth={0.75} /></span><span className="passport-decor-number">Q / {plant.id.slice(-5)}</span></div>
        <div className="plant-passport-card-copy"><span className="plant-passport-brand">القادري الزراعي الذكي <i>·</i> QADRI BOTANICAL FILE</span><h3>{plant.nameAr}</h3>{plant.nameEn && <span dir="ltr">{plant.nameEn}</span>}<em>{plant.scientificName || 'الاسم العلمي غير موثق بعد'}</em><StatusBadge status={plant.documentationStatus} /><p>{plant.descriptionAr || 'لا توجد معلومات موثقة لهذا السجل بعد.'}</p></div>
        <div className="plant-passport-qr"><div className="plant-passport-qr-frame"><QRCodeSVG value={qrUrl} size={150} level="H" includeMargin title={`رمز QR لصفحة ${plant.nameAr}`} /></div><strong>امسح لفتح صفحة النبات</strong><span dir="ltr">{new URL(qrUrl).host}</span></div>
      </article>
    </section>
    <footer className="plant-detail-bottom"><Link href="/plants"><ArrowRight size={15} /> كل النباتات</Link><Link href="/quotes">طلب عرض سعر لهذه النبتة <ChevronLeft size={15} /></Link></footer>
  </main>;
}
