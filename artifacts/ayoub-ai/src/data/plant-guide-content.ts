import plantDirectory from './plant-directory.json';
import plantResearch from './plant-guide-research.json';

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
export type PlantGuideReference = {
  id: string;
  title: string;
  url: string;
  sourceType: string;
  supports: string[];
};
export type PlantGuideRegion = { place: string; sourceIds: string[] };
export type PlantGuideStatus = 'verified' | 'partial' | 'ambiguous' | 'not_found' | 'not_reviewed';
export type PlantGuideImageStatus = 'verified' | 'admin_verified' | 'unverified' | 'no_verified_image' | 'not_reviewed';
export type PlantGuideRecord = {
  id: string;
  nameAr: string;
  nameEn?: string;
  scientificName?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  identityStatus?: PlantGuideStatus;
  documentationStatus?: PlantGuideStatus;
  identityNote?: string;
  nativeDistribution?: PlantGuideRegion[];
  cultivationRegions?: PlantGuideRegion[];
  references?: PlantGuideReference[];
  imageStatus?: PlantGuideImageStatus;
  classifications: PlantGuideClassification[];
  markets: string[];
  notes: string[];
  image: PlantGuidePhoto | null;
  imageIsRepresentative: boolean;
  imageNeedsReview?: boolean;
  reviewReason?: string;
};

type DirectoryData = { sourceEntries: number; uniquePlants: number; subcategories: number; plants: PlantGuideRecord[] };
type ResearchData = { version: number; plants: Partial<PlantGuideRecord>[] };
type Overrides = Record<string, Partial<PlantGuideRecord>>;

export const PLANT_GUIDE_STORAGE_KEY = 'qadri-public-plant-guide-v1';
export const PLANT_GUIDE_UPDATED_EVENT = 'qadri-plant-guide-updated';
const directory = plantDirectory as DirectoryData;
const researchedById = new Map((plantResearch as ResearchData).plants.map((record) => [record.id, record]));

function loadOverrides(): Overrides {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(PLANT_GUIDE_STORAGE_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Overrides : {};
  } catch {
    return {};
  }
}

export function getPlantGuideSourceCount() {
  return directory.sourceEntries;
}

export function getPlantGuideRecords(options: { includeUnverifiedImages?: boolean } = {}): PlantGuideRecord[] {
  const overrides = loadOverrides();
  return directory.plants.map((base) => {
    const evidence = researchedById.get(base.id) || {};
    const override = overrides[base.id] || {};
    const record: PlantGuideRecord = {
      ...base,
      ...evidence,
      ...override,
      classifications: override.classifications ?? evidence.classifications ?? base.classifications,
      markets: override.markets ?? base.markets,
      notes: (override.notes ?? evidence.notes ?? base.notes).filter((note) => note.trim() !== 'يُتحقق من ملاءمة الصنف للمنطقة المناخية قبل اعتماده تجارياً'),
      references: override.references ?? evidence.references ?? [],
      nativeDistribution: override.nativeDistribution ?? evidence.nativeDistribution ?? [],
      cultivationRegions: override.cultivationRegions ?? evidence.cultivationRegions ?? [],
      documentationStatus: override.documentationStatus ?? evidence.documentationStatus ?? 'not_reviewed',
      identityStatus: override.identityStatus ?? evidence.identityStatus ?? 'not_reviewed',
      imageStatus: override.imageStatus ?? evidence.imageStatus ?? 'not_reviewed',
      image: Object.prototype.hasOwnProperty.call(override, 'image')
        ? override.image ?? null
        : Object.prototype.hasOwnProperty.call(evidence, 'image')
          ? evidence.image ?? null
          : base.image,
      imageIsRepresentative: override.imageIsRepresentative ?? evidence.imageIsRepresentative ?? base.imageIsRepresentative,
    };
    const imageApproved = record.imageStatus === 'verified' || record.imageStatus === 'admin_verified';
    const imageNeedsReview = !imageApproved || !record.image?.imageUrl;
    const reviewReason = !record.image?.imageUrl
      ? 'لا توجد صورة موثقة لهذا النبات.'
      : imageApproved
        ? undefined
        : 'الصورة المرشحة غير موثقة؛ أخفاها الدليل حتى مراجعتها.';
    return {
      ...record,
      image: options.includeUnverifiedImages || imageApproved ? record.image : null,
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
