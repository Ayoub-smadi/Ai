import plantDirectory from './plant-directory.json';

export type PlantGuideClassification = { mainCategoryAr: string; subcategoryAr: string };
export type PlantGuidePhoto = {
  imageUrl: string;
  sourceUrl?: string;
  license?: string;
  credit?: string;
  fileTitle?: string;
  matchScore?: number;
  matchQuery?: string;
};
export type PlantGuideRecord = {
  id: string;
  nameAr: string;
  nameEn?: string;
  scientificName?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  classifications: PlantGuideClassification[];
  markets: string[];
  notes: string[];
  image: PlantGuidePhoto | null;
  imageIsRepresentative: boolean;
  imageNeedsReview?: boolean;
  reviewReason?: string;
};

type DirectoryData = { sourceEntries: number; uniquePlants: number; subcategories: number; plants: PlantGuideRecord[] };
type Overrides = Record<string, Partial<PlantGuideRecord>>;

export const PLANT_GUIDE_STORAGE_KEY = 'qadri-public-plant-guide-v1';
export const PLANT_GUIDE_UPDATED_EVENT = 'qadri-plant-guide-updated';
const directory = plantDirectory as DirectoryData;

function loadOverrides(): Overrides {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(PLANT_GUIDE_STORAGE_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Overrides : {};
  } catch {
    return {};
  }
}

function normalizeImageKey(value: string): string {
  try {
    const url = new URL(value);
    url.search = '';
    url.hash = '';
    return `${url.hostname.toLowerCase()}${decodeURIComponent(url.pathname).toLowerCase()}`;
  } catch {
    return value.trim().toLowerCase();
  }
}

export function getPlantGuideSourceCount() {
  return directory.sourceEntries;
}

export function getPlantGuideRecords(options: { keepRepeatedPhotos?: boolean } = {}): PlantGuideRecord[] {
  const overrides = loadOverrides();
  const records = directory.plants.map((base) => {
    const override = overrides[base.id] || {};
    return {
      ...base,
      ...override,
      classifications: override.classifications ?? base.classifications,
      markets: override.markets ?? base.markets,
      notes: (override.notes ?? base.notes).filter((note) => note.trim() !== 'يُتحقق من ملاءمة الصنف للمنطقة المناخية قبل اعتماده تجارياً'),
      image: Object.prototype.hasOwnProperty.call(override, 'image') ? override.image ?? null : base.image,
      imageIsRepresentative: override.imageIsRepresentative ?? base.imageIsRepresentative,
    };
  });

  const seenImages = new Set<string>();
  return records.map((record) => {
    const key = record.image?.imageUrl ? normalizeImageKey(record.image.imageUrl) : '';
    const duplicate = Boolean(key && seenImages.has(key));
    if (key) seenImages.add(key);
    const score = record.image?.matchScore;
    const lowConfidence = typeof score === 'number' && score < 10;
    const imageNeedsReview = duplicate || lowConfidence || !record.image?.imageUrl;
    const reviewReason = duplicate
      ? 'تُستخدم الصورة نفسها لنبات آخر؛ أُخفيت حتى يختار المشرف صورة مستقلة.'
      : lowConfidence
        ? 'مطابقة الصورة ضعيفة؛ أُخفيت حتى يراجعها المشرف.'
        : !record.image?.imageUrl
          ? 'لا توجد صورة معتمدة بعد.'
          : undefined;
    return {
      ...record,
      image: options.keepRepeatedPhotos || (!duplicate && !lowConfidence) ? record.image : null,
      imageNeedsReview,
      reviewReason,
    };
  });
}

export function savePlantGuideRecord(record: PlantGuideRecord): void {
  const overrides = loadOverrides();
  const { imageNeedsReview: _imageNeedsReview, reviewReason: _reviewReason, ...content } = record;
  overrides[record.id] = content;
  localStorage.setItem(PLANT_GUIDE_STORAGE_KEY, JSON.stringify(overrides));
  window.dispatchEvent(new Event(PLANT_GUIDE_UPDATED_EVENT));
}
