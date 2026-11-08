import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, ChevronLeft, Droplets, Leaf, MapPin, QrCode, Search, ShieldCheck, Sparkles, Sprout, Sun, Download, X } from 'lucide-react';
import { Link, useRoute } from 'wouter';
import { QRCodeSVG } from 'qrcode.react';
import { getManagedPlants, type ManagedPlant } from '@/data/managed-plants';
import { getPlantCareProfile } from '@/data/plant-guide-data';
import { getPlantGuideCategory, PLANT_GUIDE_CATEGORIES } from '@/data/plant-guide-taxonomy';
import './plant-guide-page.css';

const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const pageUrl = (path: string) => new URL(`${basePath}${path.startsWith('/') ? path : `/${path}`}`, window.location.origin).toString();
const directoryUrl = () => pageUrl('/plants');
const plantUrl = (id: string) => pageUrl(`/plants/${encodeURIComponent(id)}`);
const normalize = (value: string) => value.normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g, '').toLocaleLowerCase();
const safeFilename = (value: string) => value.normalize('NFKC').replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/^-|-$/g, '') || 'plant';

const nonLivingDecorCategoryIds = new Set(['id-1779608675326-62yls', 'id-1780917756228-hsi6f']);
const livingTurfGrassId = 'id-1790081508318-va81r';

function useCurrentPlants() {
  const [plants, setPlants] = useState<ManagedPlant[]>(getManagedPlants);
  useEffect(() => {
    const refresh = () => setPlants(getManagedPlants());
    window.addEventListener('qadri-managed-plants-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('qadri-managed-plants-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return plants.filter((plant) => plant.source === 'plant' && (!nonLivingDecorCategoryIds.has(plant.categoryId) || plant.id === livingTurfGrassId));
}

function PlantImage({ plant, accent, className = '' }: { plant: ManagedPlant; accent: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return <div className={`plant-guide-image ${className}`} style={{ '--plant-accent': accent } as CSSProperties}>
    {plant.image && !failed ? <img src={plant.image} alt={plant.nameAr} loading="lazy" onError={() => setFailed(true)} /> : <div className="plant-guide-image-fallback"><Leaf size={42} strokeWidth={1.25} /><span>QADRI / BOTANICAL FILE</span></div>}
    <span className="plant-guide-image-category">{getPlantGuideCategory(plant).labelAr}</span>
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
        <h2 id="plant-guide-home-title">{isArabic ? 'كل نبتة لها حكاية…' : 'Every plant has a story…'}<br /><span>{isArabic ? 'امسح واكتشف رعايتها.' : 'Scan to learn how to care.'}</span></h2>
        <p>{isArabic ? 'مكتبة مصوّرة من نباتات المشتل، مع معلومات الاسم العلمي وموسم الزراعة والري والآفات الشائعة. اختر النبتة أو امسح الرمز لتصل إليها بسرعة.' : 'Explore the nursery catalogue with botanical names, planting seasons, watering guidance and common pests. Browse or scan to open the guide.'}</p>
        <div className="plant-guide-region-chips" aria-label={isArabic ? 'مناطق الدليل' : 'Guide regions'}>
          {(isArabic ? ['الأردن', 'فلسطين', 'مصر', 'السعودية', 'قطر'] : ['Jordan', 'Palestine', 'Egypt', 'Saudi Arabia', 'Qatar']).map((country) => <span key={country}><MapPin size={12} />{country}</span>)}
        </div>
        <Link className="plant-guide-home-button" href="/plants">{isArabic ? 'تصفّح دليل النباتات' : 'Browse the plant guide'} {isArabic ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}</Link>
        <small>{isArabic ? 'الملاءمة تختلف بحسب المدينة والارتفاع والتربة.' : 'Suitability varies with city, altitude and soil.'}</small>
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
  const [category, setCategory] = useState('all');
  const categories = useMemo(() => {
    return PLANT_GUIDE_CATEGORIES
      .map((item) => ({ ...item, count: plants.filter((plant) => getPlantGuideCategory(plant).id === item.id).length }))
      .filter((item) => item.count > 0);
  }, [plants]);
  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return plants.filter((plant) => {
      const guideCategory = getPlantGuideCategory(plant);
      return (category === 'all' || guideCategory.id === category) && (!q || normalize(`${plant.nameAr} ${plant.nameEn} ${plant.scientificName} ${guideCategory.labelAr}`).includes(q));
    });
  }, [plants, search, category]);

  return <main className="plant-guide-page" dir="rtl" lang="ar">
    <section className="plant-guide-list-hero">
      <div className="plant-guide-list-hero-inner">
        <div className="plant-guide-list-copy">
          <div className="plant-guide-kicker"><BookOpen size={14} /> دليل القادري للنباتات</div>
          <h1>اعرف نبتتك.<br /><span>واعتنِ بها بثقة.</span></h1>
          <p>أصناف المشتل مرتبة حسب طبيعتها النباتية: أشجار، شجيرات، متسلقات، زهور وأعشاب. معلومات المناخ توضّح ملاءمة كل نوع لمناطق الأردن وفلسطين ومصر والسعودية وقطر.</p>
          <div className="plant-guide-list-stats"><span><strong>{plants.length}</strong> نبتة في الدليل</span><span><MapPin size={14} /> الأردن · فلسطين · مصر · السعودية · قطر</span></div>
        </div>
        <div className="plant-guide-list-hero-art" aria-hidden="true"><div className="guide-art-disc"><Leaf size={80} strokeWidth={0.9} /></div><span className="guide-art-label guide-art-label-top">FIELD NOTES / 01</span><span className="guide-art-label guide-art-label-bottom">GROW WITH KNOWLEDGE</span><i className="guide-art-ring guide-art-ring-one" /><i className="guide-art-ring guide-art-ring-two" /></div>
      </div>
    </section>

    <section className="plant-guide-catalog-wrap">
      <div className="plant-guide-catalog-head">
        <div><span className="plant-guide-kicker">تصنيف نباتي مستقل</span><h2>اكتشف نبتتك</h2><p>تصنيف حسب الشكل النباتي والاسم العلمي — وليس حسب أقسام عرض السعر. كل بطاقة تفتح صفحة خاصة بها مع QR قابل للتنزيل.</p></div>
        <label className="plant-guide-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو الاسم العلمي…" aria-label="ابحث في النباتات" /><span>{filtered.length}</span>{search && <button type="button" onClick={() => setSearch('')} aria-label="مسح البحث"><X size={14} /></button>}</label>
      </div>
      <div className="plant-guide-category-pills"><button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>كل النباتات <span>{plants.length}</span></button>{categories.map((item) => <button key={item.id} className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)}>{item.labelAr}<span>{item.count}</span></button>)}</div>
      {filtered.length ? <div className="plant-guide-grid">{filtered.map((plant) => {
        const accent = accentFor();
        const guideCategory = getPlantGuideCategory(plant);
        return <Link className="plant-guide-card" href={`/plants/${encodeURIComponent(plant.id)}`} key={plant.id} style={{ '--plant-accent': accent } as CSSProperties}>
          <PlantImage plant={plant} accent={accent} />
          <div className="plant-guide-card-copy"><span className="plant-guide-card-category">{guideCategory.labelAr}</span><h3>{plant.nameAr}</h3><em>{plant.scientificName || plant.nameEn || 'الاسم العلمي قيد المراجعة'}</em><span className="plant-guide-card-bottom">افتح بطاقة العناية <ChevronLeft size={15} /></span></div>
        </Link>;
      })}</div> : <div className="plant-guide-empty"><Leaf size={26} /><h3>لم نعثر على نبتة بهذا الاسم</h3><p>جرّب البحث باسم عربي أو علمي مختلف، أو اختر «كل النباتات».</p><button onClick={() => { setSearch(''); setCategory('all'); }}>إظهار كل النباتات</button></div>}
      <p className="plant-guide-climate-note"><ShieldCheck size={16} /> تختلف احتياجات النبات بحسب الصنف والمدينة والارتفاع ونوع التربة؛ استخدم الإرشادات كنقطة بداية، وراقب رطوبة التربة وحالة النبتة.</p>
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
  const guideCategory = getPlantGuideCategory(plant);
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
    <div className="plant-detail-topbar"><Link href="/plants"><ArrowRight size={16} /> العودة إلى دليل النباتات</Link><span>PLANT PASSPORT / {guideCategory.labelAr}</span></div>
    <section className="plant-detail-hero">
      <div className="plant-detail-hero-copy"><span className="plant-guide-kicker"><Sprout size={14} /> بطاقة عناية نباتية</span><h1>{plant.nameAr}</h1><em>{plant.scientificName || plant.nameEn}</em><p>{profile.summaryAr}</p><div className="plant-detail-hero-actions"><button className="plant-guide-download-button" onClick={downloadCard} disabled={downloading}><Download size={16} />{downloading ? 'يتم تجهيز البطاقة…' : 'تنزيل بطاقة PDF'}</button><a className="plant-guide-secondary-button" href={qrUrl} target="_blank" rel="noreferrer"><QrCode size={15} /> رابط صفحة النبتة</a></div>{downloadError && <p className="plant-guide-download-error" role="alert">{downloadError}</p>}<div className="plant-detail-hero-meta"><span><CalendarDays size={14} />{profile.plantingSeasonAr}</span><span><MapPin size={14} />{guideCategory.labelAr}</span></div></div>
      <PlantImage plant={plant} accent={accent} className="plant-detail-main-image" />
    </section>

    <section className="plant-detail-facts" aria-label="معلومات أساسية"><article><span><Sun size={17} /> الضوء والتربة</span><p>{profile.lightSoilAr}</p></article><article><span><CalendarDays size={17} /> موعد الزراعة</span><p>{profile.plantingSeasonAr}</p></article><article><span><Leaf size={17} /> الاسم العلمي</span><p className="plant-detail-scientific">{plant.scientificName || plant.nameEn || 'غير مسجل'}</p></article></section>
    <p className="plant-guide-climate-note" style={{ maxWidth: 1128, margin: '0 auto 24px', paddingInline: 'clamp(20px, 5vw, 70px)' }}><ShieldCheck size={16} /> {profile.matchNotesAr}</p>

    <section className="plant-detail-section"><div className="plant-detail-section-heading"><span className="plant-guide-kicker"><Sprout size={14} /> كيف تنمو</span><h2>العناية التي تناسبها</h2></div><div className="plant-care-story"><div className="plant-care-story-mark"><Leaf size={27} /></div><p>{profile.careAr}</p></div></section>

    <section className="plant-detail-section plant-water-section"><div className="plant-detail-section-heading"><span className="plant-guide-kicker"><Droplets size={14} /> دليل الري حسب العمر</span><h2>اسقِها بقدر حاجتها</h2><p>هذه إرشادات توقيت، وليست كمية ثابتة. افحص رطوبة التربة وعدّل الري مع الحر والمطر والتصريف.</p></div><div className="plant-water-grid"><article><span>01 / أول سنة</span><h3>شتلة جديدة</h3><p>{profile.waterSeedlingAr}</p></article><article><span>02 / من سنة إلى 3</span><h3>نبتة نامية</h3><p>{profile.waterYoungAr}</p></article><article><span>03 / بعد التأسيس</span><h3>نبتة بالغة</h3><p>{profile.waterMatureAr}</p></article></div></section>

    <section className="plant-detail-section plant-pests-section"><div className="plant-detail-section-heading"><span className="plant-guide-kicker"><ShieldCheck size={14} /> الوقاية أولًا</span><h2>آفات وأمراض محتملة</h2><p>ابدأ بالملاحظة والعزل والتنظيف وتحسين الري والتهوية. لا تستخدم مبيدًا إلا بعد التأكد من التشخيص وقراءة ملصق المنتج.</p></div><div className="plant-pest-grid">{profile.pests.map((pest) => <article key={pest.nameAr}><span className="plant-pest-index">FIELD NOTE / {String(profile.pests.indexOf(pest) + 1).padStart(2, '0')}</span><h3>{pest.nameAr}</h3><p><strong>علامات:</strong> {pest.signsAr}</p><p><strong>الوقاية:</strong> {pest.preventionAr}</p><p><strong>التعامل:</strong> {pest.treatmentAr}</p></article>)}</div></section>

    <section className="plant-detail-region-section"><div><span className="plant-guide-kicker"><MapPin size={14} /> ملاءمة المناخ</span><h2>من الأردن إلى الخليج</h2><p>قد ينجح النبات في مدينة ويحتاج حماية إضافية في مدينة أخرى؛ راعِ الارتفاع والحرارة والرياح والصقيع.</p></div><div className="plant-region-fit-grid">{profile.regionalFit.map((region) => <article key={region.countryAr}><strong>{region.countryAr}</strong><p>{region.noteAr}</p></article>)}</div></section>

    <section className="plant-detail-sources"><span className="plant-guide-kicker"><BookOpen size={14} /> مصادر ومزيد من القراءة</span><div>{profile.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.title}<ArrowLeft size={13} /></a>)}</div><small>للتشخيص الدقيق، استشر مهندسًا زراعيًا محليًا، خصوصًا قبل استخدام أي مادة معالجة.</small></section>

    <section className="plant-card-download-section"><div className="plant-detail-section-heading"><span className="plant-guide-kicker"><QrCode size={14} /> بطاقة تحفظها أو تشاركها</span><h2>رعاية النبتة… في بطاقة واحدة</h2><p>رمز QR أدناه يفتح صفحة هذه النبتة مباشرة. نزّلها بصيغة PDF واحتفظ بها قرب النبتة أو شاركها مع من يرعاها.</p></div>
      <article ref={cardRef} className="plant-passport-card" style={{ '--plant-accent': accent } as CSSProperties}>
        <div className="plant-passport-card-decor"><span className="passport-decor-leaf"><Leaf size={98} strokeWidth={0.75} /></span><span className="passport-decor-number">Q / {plant.id.slice(-5)}</span></div>
        <div className="plant-passport-card-copy"><span className="plant-passport-brand">القادري الزراعي الذكي <i>·</i> QADRI BOTANICAL FILE</span><span className="plant-passport-tag">{guideCategory.labelAr}</span><h3>{plant.nameAr}</h3><em>{plant.scientificName || plant.nameEn}</em><p>{profile.summaryAr}</p><div className="plant-passport-quick-facts"><span><b>الموسم</b>{profile.plantingSeasonAr}</span><span><b>الري</b>{profile.waterYoungAr}</span></div><small>معلومات إرشادية — تختلف بحسب الموقع والعمر والتربة.</small></div>
        <div className="plant-passport-qr"><div className="plant-passport-qr-frame"><QRCodeSVG value={qrUrl} size={150} level="H" includeMargin title={`رمز QR لصفحة ${plant.nameAr}`} /></div><strong>امسح لفتح صفحة النبتة</strong><span dir="ltr">{new URL(qrUrl).host}</span></div>
      </article>
    </section>
    <footer className="plant-detail-bottom"><Link href="/plants"><ArrowRight size={15} /> كل النباتات</Link><Link href="/quotes">طلب عرض سعر لهذه النبتة <ChevronLeft size={15} /></Link></footer>
  </main>;
}
