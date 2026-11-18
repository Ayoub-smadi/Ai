import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, Leaf, Sprout, Sun } from 'lucide-react';
import { getManagedPlants, type ManagedPlant } from '@/data/managed-plants';
import './daily-plant-feature.css';

const FIRST_DAY = '2026-11-01';
const GOLD_STAR_ID = 'id-1779350171772-4t3d6';
const IMAGE_ORIGIN = 'https://www.alqadrioffers.online';

type Language = 'ar' | 'en';

function localDayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toUtcDay(day: string): number {
  const [year, month, date] = day.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, date) / 86_400_000);
}

function isGoldStar(plant: ManagedPlant): boolean {
  const names = `${plant.id} ${plant.nameAr} ${plant.nameEn} ${plant.scientificName}`.toLocaleLowerCase();
  return plant.id === GOLD_STAR_ID || /gold\s*star|goldcrest|جولد\s*ستار|غولد\s*ستار/.test(names);
}

function getDailyPlant(plants: ManagedPlant[], day: string): ManagedPlant | null {
  const withPhotos = plants.filter((plant) => typeof plant.image === 'string' && plant.image.trim().length > 0);
  if (!withPhotos.length) return null;
  const firstPlant = withPhotos.find(isGoldStar) || withPhotos[0];
  const rotation = [firstPlant, ...withPhotos.filter((plant) => plant.id !== firstPlant.id)];
  const offset = toUtcDay(day) - toUtcDay(FIRST_DAY);
  const index = ((offset % rotation.length) + rotation.length) % rotation.length;
  return rotation[index];
}

function resolveImageUrl(image: string): string {
  if (/^(https?:|data:|blob:)/i.test(image)) return image;
  if (image.startsWith('/api/images/')) {
    const origin = window.location.hostname.endsWith('alqadrioffers.online') ? window.location.origin : IMAGE_ORIGIN;
    return `${origin}${image}`;
  }
  return image;
}

function InfoItem({ icon, label, value, language }: { icon: ReactNode; label: string; value?: string; language: Language }) {
  return <article className="daily-plant-fact"><span className="daily-plant-fact-icon">{icon}</span><div><span className="daily-plant-fact-label">{label}</span><p>{value?.trim() || (language === 'ar' ? 'لم تُضف المعلومة بعد' : 'Care detail not added yet')}</p></div></article>;
}

export default function DailyPlantFeature({ lang }: { lang: Language }) {
  const [today, setToday] = useState(localDayKey);
  const [plants, setPlants] = useState<ManagedPlant[]>(getManagedPlants);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const refreshPlants = () => setPlants(getManagedPlants());
    window.addEventListener('storage', refreshPlants);
    window.addEventListener('qadri-managed-plants-updated', refreshPlants);
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 300);
    const timer = window.setTimeout(() => setToday(localDayKey()), Math.max(1000, tomorrow.getTime() - Date.now()));
    return () => {
      window.removeEventListener('storage', refreshPlants);
      window.removeEventListener('qadri-managed-plants-updated', refreshPlants);
      window.clearTimeout(timer);
    };
  }, [today]);

  const plant = useMemo(() => getDailyPlant(plants, today), [plants, today]);
  useEffect(() => setImageFailed(false), [plant?.id, plant?.image]);

  const dateLabel = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-JO' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${today}T12:00:00`));
  const arabic = lang === 'ar';
  const displayName = plant && !arabic && isGoldStar(plant) ? 'Goldcrest Cypress' : (plant?.[arabic ? 'nameAr' : 'nameEn'] || plant?.nameAr || '');
  const displayCategory = plant ? (arabic ? plant.categoryAr : plant.categoryEn) : '';

  return <section className="daily-plant-section" dir={arabic ? 'rtl' : 'ltr'} aria-labelledby="daily-plant-title">
    <div className="daily-plant-inner">
      <div className="daily-plant-heading">
        <div><div className="daily-plant-eyebrow"><span><Leaf size={15} /></span>{arabic ? 'من كتالوج نباتات القادري' : 'FROM AL-QADRI’S PLANT CATALOG'}</div><h2 id="daily-plant-title">{arabic ? 'نبتة اليوم' : 'Plant of the day'}</h2><p>{arabic ? 'كل يوم نختار نبتة من مجموعتنا، مع إرشادات مختصرة تساعدك على زراعتها في المكان المناسب.' : 'A daily pick from our plant collection, with concise guidance for choosing the right place and soil.'}</p></div>
        <div className="daily-plant-date"><CalendarDays size={16} /><span>{dateLabel}</span><i>{arabic ? 'تتغيّر يوميًا' : 'NEW EACH DAY'}</i></div>
      </div>
      {plant ? <div className="daily-plant-card">
        <div className="daily-plant-visual">
          {!imageFailed ? <img src={resolveImageUrl(plant.image || '')} alt={arabic ? `صورة ${plant.nameAr}` : `Photo of ${displayName}`} loading="lazy" decoding="async" onError={() => setImageFailed(true)} /> : <div className="daily-plant-image-fallback"><Leaf size={42} /><span>{arabic ? 'الصورة ستظهر هنا بعد تحديثها من كتالوج النباتات' : 'A plant photo will appear here once added in the catalog'}</span></div>}
          <div className="daily-plant-image-shade" />
          <span className="daily-plant-photo-label"><span />{arabic ? 'اختيار اليوم' : 'TODAY’S PICK'}</span>
          <div className="daily-plant-photo-caption"><span>{displayCategory}</span><strong>{displayName}</strong><em>{plant.scientificName || plant.nameEn}</em></div>
        </div>
        <div className="daily-plant-copy">
          <div className="daily-plant-copy-top"><span className="daily-plant-species-tag"><Leaf size={13} />{arabic ? 'نبات مختار' : 'FEATURED PLANT'}</span><span className="daily-plant-season-mark">{arabic ? 'إرشادات العناية' : 'CARE NOTES'}</span></div>
          <h3>{displayName}</h3>
          <p className="daily-plant-scientific">{plant.scientificName || plant.nameEn}</p>
          <p className="daily-plant-description">{arabic ? plant.descriptionAr : plant.descriptionEn}</p>
          <div className="daily-plant-facts">
            <InfoItem icon={<CalendarDays size={17} />} label={arabic ? 'موعد الزراعة' : 'Planting time'} value={arabic ? plant.plantingSeasonAr : plant.plantingSeasonEn} language={lang} />
            <InfoItem icon={<Sun size={17} />} label={arabic ? 'الطقس والإضاءة' : 'Weather & light'} value={arabic ? plant.preferredClimateAr : plant.preferredClimateEn} language={lang} />
            <InfoItem icon={<Sprout size={17} />} label={arabic ? 'التربة المناسبة' : 'Suitable soil'} value={arabic ? plant.soilTypeAr : plant.soilTypeEn} language={lang} />
          </div>
          <div className="daily-plant-source">{arabic ? 'مراجع العناية:' : 'Care references:'} <a href="https://plants.ces.ncsu.edu/plants/hesperocyparis-macrocarpa-goldcrest/" target="_blank" rel="noreferrer">NC State Extension</a><span>·</span><a href="https://www.rhs.org.uk/plants/types/trees/planting-trees-shrubs" target="_blank" rel="noreferrer">RHS</a></div>
        </div>
      </div> : <div className="daily-plant-empty"><Leaf size={32} /><strong>{arabic ? 'أضف صور نباتات إلى الكتالوج' : 'Add plant photos to the catalog'}</strong><span>{arabic ? 'ستظهر هنا نبتة مختلفة كل يوم من النباتات التي لها صورة.' : 'A different plant with a photo will appear here each day.'}</span></div>}
    </div>
  </section>;
}
