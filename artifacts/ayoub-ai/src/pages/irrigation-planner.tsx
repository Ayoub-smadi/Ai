import { useEffect, useMemo, useRef, useState, type FormEvent, type ChangeEvent } from 'react';
import { Bell, BellRing, CalendarClock, Check, ChevronDown, Droplets, ImagePlus, LoaderCircle, MapPin, Phone, Search, ShieldCheck, Sprout, Trash2, UserRound, X } from 'lucide-react';
import { getManagedPlants, type ManagedPlant } from '@/data/managed-plants';
import { getPlantCareProfile } from '@/data/plant-guide-data';
import { getPlantGuideCategory } from '@/data/plant-guide-taxonomy';
import './irrigation-planner.css';

const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

type GrowthStage = 'new' | 'young' | 'mature';
type SelectedPlant = { plantId: string; stage: GrowthStage; checkEveryDays: number; nextCheckAt: number; lastNotifiedFor?: number };
type IrrigationPlan = {
  ownerName: string;
  phone: string;
  countryAr: string;
  region: string;
  plants: SelectedPlant[];
  alertsEnabled: boolean;
  updatedAt: number;
};
type SoilAdvice = {
  summaryAr: string;
  observationsAr: string[];
  recommendedPlants: { plantId: string; nameAr: string; reasonAr: string; warningAr: string }[];
  checksBeforePlantingAr: string[];
  caveatAr: string;
};

const STORAGE_KEY = 'qadri-irrigation-plan-v1';
const excludedDecorSections = new Set(['id-1779608675326-62yls', 'id-1780917756228-hsi6f']);
const livingTurfId = 'id-1790081508318-va81r';
const countries = ['الأردن', 'فلسطين', 'مصر', 'السعودية', 'قطر'];
const stageLabels: Record<GrowthStage, string> = { new: 'شتلة جديدة (أول 6 أسابيع)', young: 'نبات صغير (أقل من 3 سنوات)', mature: 'نبات مستقر/بالغ' };

function getIrrigationPlants(): ManagedPlant[] {
  return getManagedPlants().filter((plant) => plant.source === 'plant' && (!excludedDecorSections.has(plant.categoryId) || plant.id === livingTurfId));
}

function isSafeSelectedPlant(value: unknown, knownIds: Set<string>): value is SelectedPlant {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return typeof item.plantId === 'string' && knownIds.has(item.plantId)
    && (item.stage === 'new' || item.stage === 'young' || item.stage === 'mature')
    && Number.isInteger(item.checkEveryDays) && Number(item.checkEveryDays) >= 1 && Number(item.checkEveryDays) <= 21
    && typeof item.nextCheckAt === 'number' && Number.isFinite(item.nextCheckAt)
    && (item.lastNotifiedFor === undefined || (typeof item.lastNotifiedFor === 'number' && Number.isFinite(item.lastNotifiedFor)));
}

function readPlan(): IrrigationPlan | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const candidate = value as Record<string, unknown>;
    const knownIds = new Set(getIrrigationPlants().map((plant) => plant.id));
    if (typeof candidate.ownerName !== 'string' || !candidate.ownerName.trim() || candidate.ownerName.length > 80
      || !hasValidPhone(candidate.phone)
      || typeof candidate.countryAr !== 'string' || !countries.includes(candidate.countryAr)
      || typeof candidate.region !== 'string' || !candidate.region.trim() || candidate.region.length > 100
      || !Array.isArray(candidate.plants) || candidate.plants.length < 1 || candidate.plants.length > 300
      || !candidate.plants.every((item) => isSafeSelectedPlant(item, knownIds))
      || new Set(candidate.plants.map((item) => (item as SelectedPlant).plantId)).size !== candidate.plants.length
      || typeof candidate.alertsEnabled !== 'boolean'
      || typeof candidate.updatedAt !== 'number' || !Number.isFinite(candidate.updatedAt)) return null;
    return candidate as unknown as IrrigationPlan;
  } catch { return null; }
}

function savePlan(plan: IrrigationPlan | null) {
  if (plan) localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  else localStorage.removeItem(STORAGE_KEY);
}

function normalize(value: string) { return value.normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g, '').toLocaleLowerCase(); }
function westernizeDigits(value: string) { return value.replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) >= 0x06f0 ? digit.charCodeAt(0) - 0x06f0 : digit.charCodeAt(0) - 0x0660)); }
function hasValidPhone(value: unknown) { if (typeof value !== 'string' || value.length > 22) return false; const digits = westernizeDigits(value).replace(/\D/g, '').length; return digits >= 8 && digits <= 15; }

function extractIntervalDays(instructions: string, stage: GrowthStage, hotMonths: boolean): number {
  const text = normalize(instructions);
  const range = text.match(/(?:كل|every)\s*(\d+)\s*(?:الى|إلى|[-–])\s*(\d+)\s*(يوم|ايام|أيام|اسبوع|أسبوع)/i);
  const single = text.match(/(?:كل|every)\s*(\d+)\s*(يوم|ايام|أيام|اسبوع|أسبوع)/i);
  let days: number;
  if (range) {
    const midpoint = (Number(range[1]) + Number(range[2])) / 2;
    days = Math.round(midpoint * (range[3].toLowerCase().includes('سبوع') ? 7 : 1));
  } else if (single) {
    days = Number(single[1]) * (single[2].toLowerCase().includes('سبوع') ? 7 : 1);
  } else if (/يوميا|يومي|كل يوم|daily/.test(text)) days = 1;
  else if (/مرتين.*اسبوع|مرتين.*أسبوع/.test(text)) days = 3;
  else if (/اسبوعيا|أسبوعيا|كل اسبوع|كل أسبوع|weekly/.test(text)) days = 7;
  else days = stage === 'new' ? 2 : stage === 'young' ? 5 : 7;
  if (hotMonths) days = Math.min(days, stage === 'new' ? 1 : stage === 'young' ? 3 : 5);
  return Math.max(1, Math.min(days, 21));
}

function nextCheckTime(from: number, days: number) {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  date.setHours(9, 0, 0, 0);
  return date.getTime();
}

function formatDate(value: number) {
  return new Date(value).toLocaleDateString('ar-JO', { weekday: 'long', day: 'numeric', month: 'long' });
}

async function compressPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('اختر ملف صورة صالحًا.');
  if (file.size > 12 * 1024 * 1024) throw new Error('حجم الصورة كبير؛ اختر صورة أقل من 12 ميغابايت.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) { bitmap.close(); throw new Error('تعذر تجهيز الصورة في هذا المتصفح.'); }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.78);
}

export default function IrrigationPlanner() {
  const plants = useMemo(getIrrigationPlants, []);
  const [ownerName, setOwnerName] = useState(() => readPlan()?.ownerName ?? '');
  const [phone, setPhone] = useState(() => readPlan()?.phone ?? '');
  const [countryAr, setCountryAr] = useState(() => readPlan()?.countryAr ?? 'الأردن');
  const [region, setRegion] = useState(() => readPlan()?.region ?? '');
  const [selected, setSelected] = useState<Record<string, GrowthStage>>(() => Object.fromEntries((readPlan()?.plants ?? []).map((item) => [item.plantId, item.stage])));
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState<IrrigationPlan | null>(() => readPlan());
  const [formError, setFormError] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [notice, setNotice] = useState('');
  const [photoData, setPhotoData] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [soilAdvice, setSoilAdvice] = useState<SoilAdvice | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const photoRef = useRef<HTMLInputElement>(null);

  const visiblePlants = useMemo(() => {
    const query = normalize(search.trim());
    return plants.filter((plant) => !query || normalize(`${plant.nameAr} ${plant.nameEn} ${plant.scientificName}`).includes(query)).slice(0, 60);
  }, [plants, search]);
  const selectedPlants = useMemo(() => plants.filter((plant) => Boolean(selected[plant.id])), [plants, selected]);

  useEffect(() => {
    if (!plan) return;
    const checkForDueReminders = () => {
      const now = Date.now();
      const due = plan.plants.filter((item) => item.nextCheckAt <= now && item.lastNotifiedFor !== item.nextCheckAt);
      if (!due.length) return;
      let systemNotificationShown = false;
      if (plan.alertsEnabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          const names = due.slice(0, 3).map((item) => plants.find((plant) => plant.id === item.plantId)?.nameAr).filter(Boolean).join('، ');
          const suffix = due.length > 3 ? ` و${due.length - 3} نباتات أخرى` : '';
          const notification = new Notification('موعد فحص رطوبة التربة', { body: `${names}${suffix} — افحص رطوبة التربة قرب الجذور قبل الري.`, tag: 'qadri-irrigation-check' });
          notification.onclick = () => { window.focus(); window.location.assign(`${basePath}/plants`); };
          systemNotificationShown = true;
        } catch { /* The persistent due state remains available inside the plan. */ }
      }
      if (!systemNotificationShown) setNotice(`حان موعد فحص رطوبة التربة لـ ${due.length} من نباتاتك؛ يبقى الموعد ظاهرًا حتى تسجل الفحص.`);
      const dueIds = new Set(due.map((item) => item.plantId));
      const updated = { ...plan, plants: plan.plants.map((item) => dueIds.has(item.plantId) ? { ...item, lastNotifiedFor: item.nextCheckAt } : item) };
      try { savePlan(updated); setPlan(updated); } catch { setNotice('تعذر تحديث موعد التذكير في مساحة التخزين لهذا المتصفح.'); }
    };
    checkForDueReminders();
    const interval = window.setInterval(checkForDueReminders, 60_000);
    return () => window.clearInterval(interval);
  }, [plan, plants]);

  const togglePlant = (plantId: string) => setSelected((current) => {
    const next = { ...current };
    if (next[plantId]) delete next[plantId];
    else next[plantId] = 'young';
    return next;
  });

  const createPlan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(''); setNotice('');
    const normalizedPhone = westernizeDigits(phone).trim();
    const phoneDigits = normalizedPhone.replace(/\D/g, '').length;
    if (phoneDigits < 8 || phoneDigits > 15) { setFormError('أدخل رقم هاتف صحيحًا يحتوي من 8 إلى 15 رقمًا؛ يمكن كتابة الأرقام العربية أو الإنجليزية.'); return; }
    if (!privacyConsent) { setFormError('يرجى الموافقة على حفظ بيانات الخطة محليًا على هذا الجهاز.'); return; }
    if (!Object.keys(selected).length) { setFormError('اختر نبتة واحدة على الأقل لإنشاء جدول عناية.'); return; }
    const hotMonths = new Date().getMonth() >= 3 && new Date().getMonth() <= 8;
    const items: SelectedPlant[] = selectedPlants.map((plant) => {
      const stage = selected[plant.id] ?? 'young';
      const profile = getPlantCareProfile(plant.id, plant.categoryId);
      const instructions = stage === 'new' ? profile.waterSeedlingAr : stage === 'young' ? profile.waterYoungAr : profile.waterMatureAr;
      const checkEveryDays = extractIntervalDays(instructions, stage, hotMonths);
      return { plantId: plant.id, stage, checkEveryDays, nextCheckAt: nextCheckTime(Date.now(), checkEveryDays) };
    });
    const created: IrrigationPlan = { ownerName: ownerName.trim(), phone: normalizedPhone, countryAr, region: region.trim(), plants: items, alertsEnabled: false, updatedAt: Date.now() };
    try { savePlan(created); setPlan(created); setNotice('جهزنا خطة الري والتذكيرات. الموعد يذكّرك بفحص التربة؛ لا تسقِ تلقائيًا قبل التأكد من جفافها.'); }
    catch { setFormError('تعذر حفظ الخطة على هذا الجهاز؛ تحقّق من إعدادات التخزين في المتصفح.'); }
  };

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') { setNotificationPermission('unsupported'); setNotice('هذا المتصفح لا يدعم إشعارات النظام؛ ستبقى مواعيد الفحص ظاهرة داخل الخطة.'); return; }
    try {
      const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
      setNotificationPermission(permission);
      if (permission !== 'granted') { setNotice('لم يُسمح بإشعارات المتصفح. يمكنك تغيير الإذن من إعدادات المتصفح.'); return; }
      const updated = plan ? { ...plan, alertsEnabled: true } : null;
      if (updated) { savePlan(updated); setPlan(updated); }
      setNotice('تم تفعيل تذكيرات فحص الرطوبة في هذا المتصفح.');
    } catch { setNotice('تعذر تفعيل إشعارات المتصفح؛ راجع إعدادات الإشعارات.'); }
  };

  const disableNotifications = () => {
    if (!plan) return;
    const updated = { ...plan, alertsEnabled: false };
    savePlan(updated); setPlan(updated); setNotice('أوقفت تذكيرات المتصفح.');
  };

  const acknowledgeSoilCheck = (plantId: string) => {
    if (!plan) return;
    const now = Date.now();
    const updated = { ...plan, plants: plan.plants.map((item) => item.plantId === plantId ? { ...item, nextCheckAt: nextCheckTime(now, item.checkEveryDays), lastNotifiedFor: undefined } : item) };
    try { savePlan(updated); setPlan(updated); setNotice('سُجل فحص التربة لهذا النبات، وحُدد موعد الفحص القادم.'); }
    catch { setNotice('تعذر حفظ تحديث موعد الفحص على هذا الجهاز.'); }
  };

  const clearPlan = () => {
    try { savePlan(null); setPlan(null); setOwnerName(''); setPhone(''); setRegion(''); setSelected({}); setPrivacyConsent(false); setNotice('حُذفت الخطة وبيانات الاسم والهاتف المحفوظة على هذا الجهاز.'); }
    catch { setNotice('تعذر حذف بيانات الخطة من هذا المتصفح.'); }
  };

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setPhotoError(''); setSoilAdvice(null); setPhotoData('');
    if (!file) return;
    try { setPhotoData(await compressPhoto(file)); }
    catch (error) { setPhotoError(error instanceof Error ? error.message : 'تعذر فتح الصورة.'); }
  };

  const analyzeSoil = async () => {
    if (!photoData) { setPhotoError('صوّر سطح التربة أو اختر صورة أولًا.'); return; }
    if (!region.trim()) { setPhotoError('أدخل اسم المدينة أو المنطقة قبل تحليل التربة.'); return; }
    setPhotoLoading(true); setPhotoError(''); setSoilAdvice(null);
    try {
      const availablePlantIds = plants.map((plant) => plant.id);
      const response = await fetch('/api/plant-advisor/analyze-soil', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ countryAr, region: region.trim(), imageDataUrl: photoData, availablePlantIds }) });
      const payload = await response.json().catch(() => null) as (SoilAdvice & { error?: string }) | null;
      if (!response.ok || !payload) {
        const message = payload?.error === 'AI_NOT_CONFIGURED' ? 'خدمة تحليل الصور غير مفعّلة على الخادم بعد.' : payload?.error === 'RATE_LIMITED' ? 'وصلت إلى حد التحليلات المؤقت؛ انتظر قليلًا ثم حاول مجددًا.' : payload?.error === 'INVALID_REQUEST' ? 'تحقق من الصورة وبيانات المنطقة ثم حاول مجددًا.' : 'تعذر الاتصال بتحليل التربة. تأكد أن خدمة الموقع متاحة ثم أعد المحاولة.';
        throw new Error(message);
      }
      setSoilAdvice(payload);
    } catch (error) { setPhotoError(error instanceof Error ? error.message : 'تعذر تحليل الصورة الآن.'); }
    finally { setPhotoLoading(false); }
  };

  return <section className="irrigation-planner" id="irrigation-plan" aria-labelledby="irrigation-planner-title">
    <div className="irrigation-planner-head">
      <div className="irrigation-planner-title-block"><span className="irrigation-eyebrow"><Droplets size={14} /> QADRI / SMART WATERING</span><h2 id="irrigation-planner-title">نظام ري متكامل لأشجارك ونباتاتك</h2><p>سجّل النباتات وعمرها وموقعها لتحصل على إرشادات الصنف وملاحظة ملاءمة الدولة، مع تذكير مبدئي بفحص رطوبة التربة. المواعيد لا تعتمد على بيانات طقس مباشرة.</p></div>
      <div className="irrigation-head-mark" aria-hidden="true"><Droplets size={31} /><span>01—05</span></div>
    </div>

    <form className="irrigation-form" onSubmit={createPlan}>
      <div className="irrigation-form-section-head"><span>01</span><div><h3>بياناتك وموقع الزراعة</h3><p>الاسم ورقم الهاتف والخطة تُحفظ محليًا في هذا المتصفح؛ لا يرسَل الموقع للتحليل إلا إذا طلبت تحليل صورة التربة.</p></div></div>
      <div className="irrigation-fields-grid">
        <label className="irrigation-field"><span><UserRound size={14} /> الاسم</span><input name="ownerName" autoComplete="name" maxLength={80} required value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder="اكتب اسمك" /></label>
        <label className="irrigation-field"><span><Phone size={14} /> رقم الهاتف</span><input name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" pattern="[0-9٠-٩۰-۹+()\s-]{8,22}" maxLength={22} required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="مثال: +962 7…" title="أدخل 8 إلى 15 رقمًا؛ الأرقام العربية والإنجليزية مقبولة" /></label>
        <label className="irrigation-field"><span><MapPin size={14} /> الدولة</span><select value={countryAr} onChange={(event) => setCountryAr(event.target.value)}>{countries.map((country) => <option key={country}>{country}</option>)}</select></label>
        <label className="irrigation-field"><span><MapPin size={14} /> المنطقة أو المدينة</span><input maxLength={100} required value={region} onChange={(event) => setRegion(event.target.value)} placeholder="مثال: عمّان — تلاع العلي" /></label>
      </div>

      <div className="irrigation-form-section-head plant-choice-heading"><span>02</span><div><h3>اختر النباتات والأشجار</h3><p>حدد عمر كل نبتة؛ سنعرض تعليمات الري المطابقة لمرحلتها.</p></div><b>{selectedPlants.length} محدد</b></div>
      <label className="irrigation-plant-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث في نباتات المشتل…" aria-label="ابحث عن نبات" />{search && <button type="button" onClick={() => setSearch('')} aria-label="مسح البحث"><X size={14} /></button>}</label>
      <div className="irrigation-plant-picker">
        {visiblePlants.map((plant) => {
          const stage = selected[plant.id];
          return <div className={`irrigation-plant-choice ${stage ? 'is-selected' : ''}`} key={plant.id}>
            <label className="irrigation-plant-main"><input type="checkbox" checked={Boolean(stage)} onChange={() => togglePlant(plant.id)} /><span className="irrigation-checkbox-mark"><Check size={12} /></span><span className="irrigation-plant-names"><strong>{plant.nameAr}</strong><em>{plant.scientificName || plant.nameEn || 'الاسم العلمي قيد المراجعة'}</em></span></label>
            {stage ? <label className="irrigation-stage-select"><span className="sr-only">مرحلة {plant.nameAr}</span><select value={stage} onChange={(event) => setSelected((current) => ({ ...current, [plant.id]: event.target.value as GrowthStage }))}>{Object.entries(stageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={13} /></label> : <span className="irrigation-choice-category">{getPlantGuideCategory(plant).labelAr}</span>}
          </div>;
        })}
        {!visiblePlants.length && <p className="irrigation-no-plants">لا توجد نتيجة مطابقة. جرّب اسمًا آخر.</p>}
        {visiblePlants.length === 60 && plants.length > 60 && <p className="irrigation-picker-limit">تظهر أول 60 نتيجة؛ استخدم البحث لتحديد الصنف المطلوب.</p>}
      </div>

      <label className="irrigation-consent"><input type="checkbox" checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} /><span>أوافق على حفظ الخطة والاسم ورقم الهاتف في مساحة التخزين المحلية لهذا المتصفح. لن نرسل رقم الهاتف إلى الخادم.</span></label>
      {formError && <p className="irrigation-error" role="alert">{formError}</p>}
      <div className="irrigation-form-actions"><button type="submit" className="irrigation-primary-button"><CalendarClock size={16} /> أنشئ نظام الري والتذكيرات</button><span><ShieldCheck size={14} /> التوقيت للتذكير بفحص التربة، وليس أمرًا آليًا بالري.</span></div>
    </form>

    {notice && <p className="irrigation-status-note" role="status">{notice}</p>}

    {plan && <section className="irrigation-results" aria-label="خطة الري والتذكيرات" aria-live="polite">
      <div className="irrigation-results-header"><div><span className="irrigation-eyebrow"><Check size={13} /> YOUR WATERING PLAN</span><h3>خطة {plan.ownerName} — {plan.region}، {plan.countryAr}</h3><p>سنذكّرك بموعد فحص الرطوبة، ثم قرّر الري بحسب جفاف التربة والصرف والطقس.</p></div><button type="button" className="irrigation-clear-button" onClick={clearPlan}><Trash2 size={14} /> حذف الخطة</button></div>
      <div className="irrigation-plan-list">{plan.plants.map((item) => {
        const plant = plants.find((entry) => entry.id === item.plantId);
        if (!plant) return null;
        const profile = getPlantCareProfile(plant.id, plant.categoryId);
        const instructions = item.stage === 'new' ? profile.waterSeedlingAr : item.stage === 'young' ? profile.waterYoungAr : profile.waterMatureAr;
        const regionalFit = profile.regionalFit.find((entry) => entry.countryAr === plan.countryAr)?.noteAr;
        const isDue = item.nextCheckAt <= Date.now();
        return <article className="irrigation-plan-item" key={item.plantId}>
          <div className="irrigation-plan-item-head"><div><span>{stageLabels[item.stage]}</span><h4>{plant.nameAr}</h4><em>{plant.scientificName || plant.nameEn}</em></div><span className={`irrigation-check-badge ${isDue ? 'is-due' : ''}`}><BellRing size={13} />{isDue ? 'افحص التربة الآن' : `الفحص التالي: ${formatDate(item.nextCheckAt)}`}</span></div>
          <p className="irrigation-water-advice"><Droplets size={15} />{instructions}</p>
          {regionalFit && <p className="irrigation-region-note"><MapPin size={14} /> {regionalFit}</p>}
          <span className="irrigation-frequency-note">تذكير فحص كل {item.checkEveryDays} {item.checkEveryDays === 1 ? 'يوم' : 'أيام'} مبدئيًا؛ عدّله عمليًا حسب رطوبة التربة والمطر والحرارة.</span>
          {isDue && <button type="button" className="irrigation-acknowledge-button" onClick={() => acknowledgeSoilCheck(item.plantId)}>فحصت التربة — جدولة الفحص القادم</button>}
        </article>;
      })}</div>
      <div className="irrigation-alert-row"><div><strong><Bell size={15} /> تذكيرات المتصفح</strong><small>تظهر فقط عندما يكون الموقع مفتوحًا في هذا المتصفح؛ لا تصل عند إغلاقه ولا تُرسل رسائل SMS.</small></div>{plan.alertsEnabled ? <button type="button" className="irrigation-secondary-button" onClick={disableNotifications}>إيقاف التذكيرات</button> : <button type="button" className="irrigation-secondary-button" onClick={enableNotifications}>{notificationPermission === 'unsupported' ? 'التنبيهات داخل الصفحة فقط' : 'تفعيل إشعارات المتصفح'}</button>}</div>
    </section>}

    <section className="soil-advisor" aria-labelledby="soil-advisor-title">
      <div className="soil-advisor-copy"><span className="irrigation-eyebrow"><Sprout size={14} /> SOIL PHOTO / AI PLANTING GUIDE</span><h3 id="soil-advisor-title">صوّر الأرض، واكتشف ما يناسب موقعك</h3><p>ارفع صورة لسطح التربة؛ وسيقارن التحليل المبدئي الملاحظات الظاهرة مع أصناف المشتل وملاءمتها المناخية للدولة والمنطقة المحددتين أعلاه.</p><div className="soil-advisor-location"><span><MapPin size={13} />{countryAr}</span><span>{region || 'أدخل المنطقة في النموذج أعلاه'}</span></div>
        <input ref={photoRef} className="soil-photo-input" type="file" accept="image/*" capture="environment" onChange={handlePhoto} aria-label="صوّر التربة أو اختر صورة" tabIndex={-1} />
        <div className="soil-photo-actions"><button type="button" className="irrigation-upload-button" onClick={() => photoRef.current?.click()}><ImagePlus size={16} />{photoData ? 'تغيير صورة التربة' : 'صوّر أو اختر صورة'}</button><button type="button" className="irrigation-primary-button soil-analyze-button" disabled={!photoData || photoLoading} onClick={analyzeSoil}>{photoLoading ? <LoaderCircle size={16} className="irrigation-spinner" /> : <Sprout size={16} />}{photoLoading ? 'يحلّل الصورة…' : 'حلّل واقترح ما أزرع'}</button></div>
        <small className="soil-analysis-share">عند ضغط زر التحليل، تُرسل الصورة المضغوطة والدولة والمنطقة وقائمة أصناف المشتل إلى خدمة الذكاء الاصطناعي؛ الاسم ورقم الهاتف لا يُرسلان.</small>
        {photoError && <p className="irrigation-error" role="alert">{photoError}</p>}
        <small className="soil-advisor-caveat"><ShieldCheck size={13} /> التحليل بصري استرشادي ولا يقيس الملوحة أو الحموضة؛ لا يرسل اسمك أو رقم هاتفك مع الصورة.</small>
      </div>
      <div className="soil-photo-preview">{photoData ? <><img src={photoData} alt="معاينة صورة التربة بعد تصغيرها" /><button type="button" onClick={() => { setPhotoData(''); setSoilAdvice(null); if (photoRef.current) photoRef.current.value = ''; }} aria-label="حذف صورة التربة"><X size={15} /></button></> : <div><ImagePlus size={29} /><strong>صورة واضحة لسطح التربة</strong><span>تُصغّر الصورة قبل التحليل ولا تُحفظ في الخطة.</span></div>}</div>
      {soilAdvice && <div className="soil-advice-result"><span className="irrigation-eyebrow"><Sprout size={13} /> SOIL SNAPSHOT</span><h4>{soilAdvice.summaryAr}</h4>{soilAdvice.recommendedPlants.length === 0 && <p className="soil-no-recommendations">لم تتوفر معلومات كافية لترشيح صنف بثقة؛ أكمل الفحوص المذكورة قبل الاختيار.</p>}{soilAdvice.observationsAr?.length > 0 && <div><strong>ملاحظات الصورة</strong><ul>{soilAdvice.observationsAr.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}{soilAdvice.recommendedPlants?.length > 0 && <div><strong>أصناف مقترحة من المشتل</strong><div className="soil-recommendations">{soilAdvice.recommendedPlants.map((item) => <article key={item.plantId}><b>{item.nameAr}</b><p>{item.reasonAr}</p>{item.warningAr && <small>{item.warningAr}</small>}</article>)}</div></div>}{soilAdvice.checksBeforePlantingAr?.length > 0 && <div><strong>قبل الزراعة</strong><ul>{soilAdvice.checksBeforePlantingAr.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}<p className="soil-advice-caveat">{soilAdvice.caveatAr}</p></div>}
    </section>

    <p className="irrigation-privacy-footnote"><ShieldCheck size={14} /> اسمك ورقمك محفوظان على جهازك فقط. الصورة وموقع الزراعة يُرسلان لخدمة التحليل الآلي عند ضغطك على زر التحليل؛ لا تُرسل معلومات التواصل معها.</p>
  </section>;
}
