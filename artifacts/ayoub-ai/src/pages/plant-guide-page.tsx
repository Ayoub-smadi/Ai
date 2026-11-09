import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, ChevronLeft, Droplets, Leaf, MapPin, QrCode, Search, ShieldCheck, Sparkles, Sprout, Sun, Download, X } from 'lucide-react';
import { Link, useRoute } from 'wouter';
import { QRCodeSVG } from 'qrcode.react';
import { getPlantGuideRecords, getPlantGuideSourceCount, PLANT_GUIDE_STORAGE_KEY, PLANT_GUIDE_UPDATED_EVENT, type PlantGuidePhoto as PlantPhoto } from '@/data/plant-guide-content';
import { getPlantCareProfile } from '@/data/plant-guide-data';
import IrrigationPlanner from './irrigation-planner';
import './plant-guide-page.css';

const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const pageUrl = (path: string) => new URL(`${basePath}${path.startsWith('/') ? path : `/${path}`}`, window.location.origin).toString();
const directoryUrl = () => pageUrl('/plants');
const plantUrl = (id: string) => pageUrl(`/plants/${encodeURIComponent(id)}`);
const normalize = (value: string) => value.normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g, '').toLocaleLowerCase();
const safeFilename = (value: string) => value.normalize('NFKC').replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/^-|-$/g, '') || 'plant';

type GuidePlant = {
  id: string; nameAr: string; nameEn: string; scientificName: string; descriptionAr: string; descriptionEn: string; image?: PlantPhoto | null;
  categoryId: string; categoryAr: string; categoryEn: string;
  source: 'plant'; classifications: { mainCategoryAr: string; subcategoryAr: string }[]; markets: string[]; notes: string[]; imageIsRepresentative: boolean; imageNeedsReview?: boolean;
};

const mapGuidePlant = (plant: ReturnType<typeof getPlantGuideRecords>[number]): GuidePlant => {
  const primary = plant.classifications[0];
  return {
    id: plant.id, nameAr: plant.nameAr, nameEn: plant.nameEn || '', scientificName: plant.scientificName || '', image: plant.image,
    categoryId: primary?.mainCategoryAr || 'catalog', categoryAr: primary?.mainCategoryAr || 'نباتات القادري', categoryEn: '',
    descriptionAr: plant.descriptionAr || plant.notes.join(' '), descriptionEn: plant.descriptionEn || '', source: 'plant' as const,
    classifications: plant.classifications, markets: plant.markets, notes: plant.notes,
    imageIsRepresentative: plant.imageIsRepresentative, imageNeedsReview: plant.imageNeedsReview,
  };
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

function PlantImage({ plant, accent, className = '', categoryLabel, showCategory = true }: { plant: GuidePlant; accent: string; className?: string; categoryLabel?: string; showCategory?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <div className={`plant-guide-image ${className}`} style={{ '--plant-accent': accent } as CSSProperties}>
    {plant.image?.imageUrl && !failed ? <img src={plant.image.imageUrl} alt={plant.nameAr} loading="lazy" onError={() => setFailed(true)} /> : <div className="plant-guide-image-fallback"><Leaf size={42} strokeWidth={1.25} /><span>{plant.imageNeedsReview ? 'الصورة قيد المراجعة' : 'لا تتوفر صورة معتمدة'}</span></div>}
    {showCategory && <span className="plant-guide-image-category">{categoryLabel || plant.classifications[0]?.subcategoryAr || plant.categoryAr}</span>}
  </div>;
}

const navbarColor = '#020618';
function accentFor() { return navbarColor; }

export function PlantGuideHomeFeature({ lang }: { lang: 'ar' | 'en' }) {
  const isArabic = lang === 'ar';
  const url = directoryUrl();
  return <section className="plant-guide-home-section" aria-labelledby="plant-guide-home-title" dir={isArabic ? 'rtl' : 'ltr'}>
    <div className="plant-guide-home-shell">
      <div className="plant-guide-home-copy">
        <span className="plant-guide-kicker"><Sparkles size={14} /> {isArabic ? 'دليل نباتات القادري' : 'Qadri plant guide'}</span>
        <h2 id="plant-guide-home-title">{isArabic ? 'كل نبتة لها حكاية…' : 'Every plant has a story…'}<br /><span>{isArabic ? 'امسح وافتح بطاقتها.' : 'Scan to open its listing.'}</span></h2>
        <p>{isArabic ? 'كتالوج مصوّر لأسماء النباتات وتصنيفاتها كما وردت في ملف القادري. اختر النبتة أو امسح الرمز لفتح صفحتها ومصدر صورتها.' : 'Browse an illustrated catalogue of the plant names and classifications provided in Qadri’s file. Open a plant to view its details and photo source.'}</p>
        <div className="plant-guide-region-chips" aria-label={isArabic ? 'مناطق الدليل' : 'Guide regions'}>
          {(isArabic ? ['الأردن', 'فلسطين', 'مصر', 'السعودية', 'قطر'] : ['Jordan', 'Palestine', 'Egypt', 'Saudi Arabia', 'Qatar']).map((country) => <span key={country}><MapPin size={12} />{country}</span>)}
        </div>
        <Link className="plant-guide-home-button" href="/plants">{isArabic ? 'تصفّح دليل النباتات' : 'Browse the plant guide'} {isArabic ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}</Link>
        <small>{isArabic ? 'القائمة مرجعية ولا تؤكد توفر كل صنف تجاريًا.' : 'Reference list only; it does not confirm stock availability.'}</small>
      </div>
      <div className="plant-guide-home-qr-stage">
        <div className="plant-guide-home-orbit plant-guide-home-orbit-one" />
        <div className="plant-guide-home-orbit plant-guide-home-orbit-two" />
        <div className="plant-guide-home-qr-card">
          <div className="plant-guide-home-qr-label"><span><QrCode size={15} /> QADRI / PLANT LIBRARY</span><span className="plant-guide-live-dot" /></div>
          <div className="plant-guide-home-qr-box"><QRCodeSVG value={url} size={176} level="H" includeMargin title={isArabic ? 'رمز QR لدليل النباتات' : 'QR code to the plant guide'} /></div>
          <strong>{isArabic ? 'وجّه الكاميرا وابدأ' : 'Point your camera to begin'}</strong>
          <span>{isArabic ? 'يفتح مكتبة النباتات كاملة' : 'Opens the full plant library'}</span>
          <div className="plant-guide-home-qr-url" dir="ltr">{new URL(url).host}/plants</div>
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
    plants.forEach((plant) => {
      [...new Set(plant.classifications.map((item) => item.mainCategoryAr))].forEach((name) => counts.set(name, (counts.get(name) || 0) + 1));
    });
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
      const searchable = `${plant.nameAr} ${plant.classifications.map((item) => `${item.mainCategoryAr} ${item.subcategoryAr}`).join(' ')} ${plant.markets.join(' ')}`;
      return matchesClassification && (!q || normalize(searchable).includes(q));
    });
  }, [plants, search, mainCategory, subcategory]);

  return <main className="plant-guide-page" dir="rtl" lang="ar">
    <section className="plant-guide-list-hero">
      <div className="plant-guide-list-hero-inner">
        <div className="plant-guide-list-copy">
          <div className="plant-guide-kicker"><BookOpen size={14} /> دليل القادري للنباتات</div>
          <h1>دليل النباتات.<br /><span>من ملف القادري.</span></h1>
          <p>كتالوج مرجعي للأشجار المثمرة والزينة والشجيرات والنباتات الداخلية والأعشاب وغيرها، مرتب حسب الأقسام الواردة في ملف دليل النباتات.</p>
          <div className="plant-guide-list-stats"><span><strong>{plants.length}</strong> اسمًا فريدًا</span><span><strong>{getPlantGuideSourceCount()}</strong> إدراجًا عبر الأقسام</span><span><MapPin size={14} /> الأردن · فلسطين · مصر · السعودية · قطر</span></div>
        </div>
        <div className="plant-guide-list-hero-art" aria-hidden="true"><div className="guide-art-disc"><Leaf size={80} strokeWidth={0.9} /></div><span className="guide-art-label guide-art-label-top">FIELD NOTES / 01</span><span className="guide-art-label guide-art-label-bottom">GROW WITH KNOWLEDGE</span><i className="guide-art-ring guide-art-ring-one" /><i className="guide-art-ring guide-art-ring-two" /></div>
      </div>
    </section>

    <IrrigationPlanner />

    <section className="plant-guide-catalog-wrap">
      <div className="plant-guide-catalog-head">
        <div><span className="plant-guide-kicker">كتالوج النباتات</span><h2>اكتشف نبتتك</h2><p>تُجمع الأسماء المتكررة في بطاقة واحدة مع الاحتفاظ بكل تصنيفاتها. الصور المتكررة أو غير المؤكدة مخفية لحين مراجعتها.</p></div>
        <label className="plant-guide-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو القسم…" aria-label="ابحث في النباتات" /><span>{filtered.length}</span>{search && <button type="button" onClick={() => setSearch('')} aria-label="مسح البحث"><X size={14} /></button>}</label>
      </div>
      <div className="plant-guide-category-pills"><button className={mainCategory === 'all' ? 'active' : ''} onClick={() => { setMainCategory('all'); setSubcategory('all'); }}>كل النباتات <span>{plants.length}</span></button>{categories.map((item) => <button key={item.name} className={mainCategory === item.name ? 'active' : ''} onClick={() => { setMainCategory(item.name); setSubcategory('all'); }}>{item.name}<span>{item.count}</span></button>)}</div>
      <label className="plant-guide-subcategory"><span>القسم الفرعي</span><select value={subcategory} onChange={(event) => setSubcategory(event.target.value)}><option value="all">كل الأقسام الفرعية</option>{subcategories.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
      {filtered.length ? <div className="plant-guide-grid">{filtered.map((plant) => {
        const accent = accentFor();
        const primaryClassification = plant.classifications.find((item) => (mainCategory === 'all' || item.mainCategoryAr === mainCategory) && (subcategory === 'all' || item.subcategoryAr === subcategory)) || plant.classifications[0];
        return <div className="plant-guide-card-frame" key={plant.id} style={{ '--plant-accent': accent } as CSSProperties}>
          <Link className="plant-guide-card" href={`/plants/${encodeURIComponent(plant.id)}`}>
            <PlantImage plant={plant} accent={accent} categoryLabel={primaryClassification?.subcategoryAr} />
            <div className="plant-guide-card-copy"><span className="plant-guide-card-category">{primaryClassification?.mainCategoryAr || 'نباتات القادري'}</span><h3>{plant.nameAr}</h3><em>{primaryClassification?.subcategoryAr || 'تصنيف من ملف القادري'}</em><span className="plant-guide-card-bottom">افتح بطاقة النبات <ChevronLeft size={15} /></span></div>
          </Link>
          {plant.image?.sourceUrl ? <a className="plant-guide-image-credit" href={plant.image.sourceUrl} target="_blank" rel="noreferrer">{plant.imageIsRepresentative ? 'صورة تمثيلية' : 'مصدر الصورة'} · {plant.image.license || 'Wikimedia Commons'}{plant.image.credit ? ` · ${plant.image.credit}` : ''}</a> : <span className="plant-guide-image-credit">لا تتوفر صورة مناسبة مرخصة</span>}
        </div>;
      })}</div> : <div className="plant-guide-empty"><Leaf size={26} /><h3>لم نعثر على نبتة بهذا الاسم</h3><p>جرّب البحث باسم أو قسم فرعي مختلف، أو أزل الفلاتر.</p><button onClick={() => { setSearch(''); setMainCategory('all'); setSubcategory('all'); }}>إظهار كل النباتات</button></div>}
      <p className="plant-guide-climate-note"><ShieldCheck size={16} /> القائمة مرجعية ولا تؤكد توفر كل صنف تجاريًا أو ملاءمته لكل موقع. الصور من Wikimedia Commons، وقد تمثل النوع النباتي لا الصنف التجاري حرفيًا؛ أُشير إلى الصور التمثيلية في البطاقة. تحقّق من اسم الصنف والاسم العلمي والملاءمة المناخية مع المشتل قبل اعتماده.</p>
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
  if (!plant) return <main className="plant-guide-page" dir="rtl" lang="ar"><section className="plant-guide-not-found"><div className="plant-guide-not-found-icon"><Leaf size={30} /></div><span className="plant-guide-kicker">QADRI / PLANT FILE</span><h1>لم نعثر على هذه النبتة</h1><p>قد تكون النبتة أزيلت من قائمة المشتل أو أن رابط QR قديم.</p><Link className="plant-guide-home-button" href="/plants"><ArrowRight size={16} /> العودة إلى دليل النباتات</Link></section></main>;

  const profile = getPlantCareProfile(plant.id, plant.categoryId);
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
      <div className="plant-detail-hero-copy"><span className="plant-guide-kicker"><Sprout size={14} /> بطاقة تعريف نباتية</span><h1>{plant.nameAr}</h1><em>{plant.scientificName || 'الاسم العلمي غير مذكور في الملف'}</em><p>{plant.descriptionAr || plant.notes.join(' · ') || profile.summaryAr}</p><div className="plant-detail-hero-actions"><button className="plant-guide-download-button" onClick={downloadCard} disabled={downloading}><Download size={16} />{downloading ? 'يتم تجهيز البطاقة…' : 'تنزيل بطاقة PDF'}</button><a className="plant-guide-secondary-button" href={qrUrl} target="_blank" rel="noreferrer"><QrCode size={15} /> رابط صفحة النبتة</a></div>{downloadError && <p className="plant-guide-download-error" role="alert">{downloadError}</p>}</div>
      <PlantImage plant={plant} accent={accent} className="plant-detail-main-image" showCategory={false} />
    </section>

    <section className="plant-detail-section"><div className="plant-detail-section-heading"><span className="plant-guide-kicker"><Sprout size={14} /> إرشادات عامة مؤقتة</span><h2>العناية التفصيلية للصنف غير موثقة</h2></div><div className="plant-care-story"><div className="plant-care-story-mark"><Leaf size={27} /></div><p>{profile.careAr}</p></div></section>

    <section className="plant-detail-section plant-water-section"><div className="plant-detail-section-heading"><span className="plant-guide-kicker"><Droplets size={14} /> ملاحظة ري عامة</span><h2>افحص التربة قبل الري</h2><p>هذه إرشادات توقيت، وليست كمية ثابتة. افحص رطوبة التربة وعدّل الري مع الحر والمطر والتصريف.</p></div><div className="plant-water-grid"><article><span>01 / أول سنة</span><h3>شتلة جديدة</h3><p>{profile.waterSeedlingAr}</p></article><article><span>02 / من سنة إلى 3</span><h3>نبتة نامية</h3><p>{profile.waterYoungAr}</p></article><article><span>03 / بعد التأسيس</span><h3>نبتة بالغة</h3><p>{profile.waterMatureAr}</p></article></div></section>

    <section className="plant-detail-section plant-pests-section"><div className="plant-detail-section-heading"><span className="plant-guide-kicker"><ShieldCheck size={14} /> الوقاية أولًا</span><h2>أمثلة عامة وليست تشخيصًا</h2><p>ابدأ بالملاحظة والعزل والتنظيف وتحسين الري والتهوية. لا تستخدم مبيدًا إلا بعد التأكد من التشخيص وقراءة ملصق المنتج.</p></div><div className="plant-pest-grid">{profile.pests.map((pest) => <article key={pest.nameAr}><span className="plant-pest-index">FIELD NOTE / {String(profile.pests.indexOf(pest) + 1).padStart(2, '0')}</span><h3>{pest.nameAr}</h3><p><strong>علامات:</strong> {pest.signsAr}</p><p><strong>الوقاية:</strong> {pest.preventionAr}</p><p><strong>التعامل:</strong> {pest.treatmentAr}</p></article>)}</div></section>



    <section className="plant-detail-sources"><span className="plant-guide-kicker"><BookOpen size={14} /> مصدر الصورة ومزيد من القراءة</span><div>{plant.image?.sourceUrl && <a href={plant.image.sourceUrl} target="_blank" rel="noreferrer" key="commons-photo">{plant.imageIsRepresentative ? 'صورة تمثيلية من فئة قريبة' : 'مصدر صورة النبات'} · Wikimedia Commons · {plant.image.license}{plant.image.credit ? ` · ${plant.image.credit}` : ''}<ArrowLeft size={13} /></a>}{profile.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.title}<ArrowLeft size={13} /></a>)}</div><small>تفاصيل الاسم والعناية مستمدة من ملف دليل النباتات المرفق؛ راجع الاسم العلمي والتوفر الفعلي مع المشتل قبل الاعتماد.</small></section>

    <section className="plant-card-download-section"><div className="plant-detail-section-heading"><span className="plant-guide-kicker"><QrCode size={14} /> بطاقة تحفظها أو تشاركها</span><h2>بطاقة تعريف نبتتك</h2><p>رمز QR أدناه يفتح صفحة هذه النبتة مباشرة. نزّلها بصيغة PDF واحتفظ بها قرب النبتة أو شاركها مع من يرعاها.</p></div>
      <article ref={cardRef} className="plant-passport-card" style={{ '--plant-accent': accent } as CSSProperties}>
        <div className="plant-passport-card-decor"><span className="passport-decor-leaf"><Leaf size={98} strokeWidth={0.75} /></span><span className="passport-decor-number">Q / {plant.id.slice(-5)}</span></div>
        <div className="plant-passport-card-copy"><span className="plant-passport-brand">القادري الزراعي الذكي <i>·</i> QADRI BOTANICAL FILE</span><h3>{plant.nameAr}</h3><em>{plant.scientificName || 'الاسم العلمي غير مذكور في الملف'}</em><p>{plant.descriptionAr || plant.notes.join(' · ') || profile.summaryAr}</p><small>بيانات تعريفية من الملف؛ إرشادات العناية العامة مؤقتة وغير متخصصة.</small></div>
        <div className="plant-passport-qr"><div className="plant-passport-qr-frame"><QRCodeSVG value={qrUrl} size={150} level="H" includeMargin title={`رمز QR لصفحة ${plant.nameAr}`} /></div><strong>امسح لفتح صفحة النبتة</strong><span dir="ltr">{new URL(qrUrl).host}</span></div>
      </article>
    </section>
    <footer className="plant-detail-bottom"><Link href="/plants"><ArrowRight size={15} /> كل النباتات</Link><Link href="/quotes">طلب عرض سعر لهذه النبتة <ChevronLeft size={15} /></Link></footer>
  </main>;
}
