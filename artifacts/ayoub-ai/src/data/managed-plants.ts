import { quoteCatalogItems, type QuoteCatalogItem } from './quote-catalog';

export type ManagedPlant = QuoteCatalogItem & {
  scientificName: string;
  landscapeIcon?: string;
  plantingSeasonAr?: string;
  plantingSeasonEn?: string;
  preferredClimateAr?: string;
  preferredClimateEn?: string;
  soilTypeAr?: string;
  soilTypeEn?: string;
};

const STORAGE_KEY = 'qadri-managed-plants-v1';
const GOLD_STAR_ID = 'id-1779350171772-4t3d6';
const goldStarCare = {
  descriptionAr: 'سرو جولدكريست دائم الخضرة بأوراق إبرية ذهبية عطرية وشكل قائم مخروطي. يضيف لونًا مميزًا للمداخل والحدائق، ويصلح كنبتة بارزة أو ضمن سياج نباتي.',
  descriptionEn: "An evergreen lemon cypress with aromatic golden needles and a narrow, upright habit. Use it as a bright focal point or in a planted screen.",
  plantingSeasonAr: 'الخريف المعتدل أو أوائل الربيع؛ ازرعها بعيدًا عن موجات الحر والصقيع، ولا تزرع في تربة متجمدة أو مشبعة بالماء.',
  plantingSeasonEn: 'Mild autumn or early spring; avoid heatwaves, frozen ground, and waterlogged soil.',
  preferredClimateAr: 'شمس كاملة أو ظل جزئي. تتحمل الرياح الساحلية المالحة، ويُفضّل تجنّب ظروف الحر الشديد عند الزراعة.',
  preferredClimateEn: 'Full sun to partial shade. It tolerates salty coastal winds; avoid planting during extreme heat.',
  soilTypeAr: 'تربة جيدة التصريف؛ تنجح في التربة الرملية، كما تقبل الطميية أو الطينية إذا كان الصرف جيدًا.',
  soilTypeEn: 'Well-drained soil; sandy soil is suitable, and loam or clay can work when drainage is good.',
};

function isGoldStar(plant: Pick<ManagedPlant, 'id' | 'nameAr' | 'nameEn' | 'scientificName'>): boolean {
  const names = `${plant.id} ${plant.nameAr} ${plant.nameEn} ${plant.scientificName}`.toLocaleLowerCase();
  return plant.id === GOLD_STAR_ID || /gold\s*star|goldcrest|جولد\s*ستار|غولد\s*ستار/.test(names);
}

function applyGoldStarDefaults(plant: ManagedPlant): ManagedPlant {
  if (!isGoldStar(plant)) return plant;
  const correctedDescriptionAr = plant.descriptionAr.includes('متسلق') || plant.descriptionAr.includes('عنصر نباتي مختار') ? goldStarCare.descriptionAr : plant.descriptionAr;
  const lowerDescriptionEn = plant.descriptionEn.toLocaleLowerCase();
  const correctedDescriptionEn = lowerDescriptionEn.includes('climbing') || lowerDescriptionEn.includes('a considered plant choice') ? goldStarCare.descriptionEn : plant.descriptionEn;
  return {
    ...plant,
    descriptionAr: correctedDescriptionAr || goldStarCare.descriptionAr,
    descriptionEn: correctedDescriptionEn || goldStarCare.descriptionEn,
    plantingSeasonAr: plant.plantingSeasonAr ?? goldStarCare.plantingSeasonAr,
    plantingSeasonEn: plant.plantingSeasonEn ?? goldStarCare.plantingSeasonEn,
    preferredClimateAr: plant.preferredClimateAr ?? goldStarCare.preferredClimateAr,
    preferredClimateEn: plant.preferredClimateEn ?? goldStarCare.preferredClimateEn,
    soilTypeAr: plant.soilTypeAr ?? goldStarCare.soilTypeAr,
    soilTypeEn: plant.soilTypeEn ?? goldStarCare.soilTypeEn,
  };
}

export function getManagedPlants(): ManagedPlant[] {
  const base = quoteCatalogItems.filter((item) => item.source === 'plant').map((item) => applyGoldStarDefaults({
    ...item,
    scientificName: item.nameEn || '',
    landscapeIcon: '',
  } satisfies ManagedPlant));
  try {
    const decoded = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as ManagedPlant[] | { plants?: ManagedPlant[]; deletedIds?: string[] } | null;
    if (!decoded) return base;
    const saved = Array.isArray(decoded) ? decoded : decoded.plants || [];
    const deletedIds = Array.isArray(decoded) ? [] : decoded.deletedIds || [];
    const overrides = new Map(saved.map((plant) => [plant.id, plant]));
    const merged = base.filter((plant) => !deletedIds.includes(plant.id)).map((plant) => applyGoldStarDefaults({ ...plant, ...(overrides.get(plant.id) || {}) }));
    const baseIds = new Set(base.map((plant) => plant.id));
    return [...merged, ...saved.filter((plant) => !baseIds.has(plant.id)).map(applyGoldStarDefaults)];
  } catch {
    return base;
  }
}

export function saveManagedPlants(plants: ManagedPlant[]) {
  const baseIds = quoteCatalogItems.filter((item) => item.source === 'plant').map((item) => item.id);
  const presentIds = new Set(plants.map((plant) => plant.id));
  const deletedIds = baseIds.filter((id) => !presentIds.has(id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ plants, deletedIds }));
}
