import type { ManagedPlant } from '@/data/managed-plants';
import { getPlantCareProfile } from '@/data/plant-guide-data';

export type PlantGuideCategoryId =
  | 'fruit-trees'
  | 'ornamental-trees'
  | 'olive-trees'
  | 'shrubs'
  | 'fruiting-shrubs'
  | 'climbers-groundcovers'
  | 'flowering-plants'
  | 'ornamental-perennials'
  | 'herbs-aromatics'
  | 'tropical-fruit-plants'
  | 'palms-architectural'
  | 'indoor-shade'
  | 'cacti-succulents'
  | 'ornamental-grasses'
  | 'other-plants';

export type PlantGuideCategory = {
  id: PlantGuideCategoryId;
  labelAr: string;
  descriptionAr: string;
};

export const PLANT_GUIDE_CATEGORIES: PlantGuideCategory[] = [
  { id: 'fruit-trees', labelAr: 'أشجار الفاكهة', descriptionAr: 'أشجار ومحاصيل بستانية معمّرة لإنتاج الثمار.' },
  { id: 'olive-trees', labelAr: 'أشجار الزيتون', descriptionAr: 'أصناف الزيتون وأشجاره المعمّرة.' },
  { id: 'ornamental-trees', labelAr: 'أشجار الزينة والظل', descriptionAr: 'أشجار ظلّ وتنسيق وصنوبريات ذات نمو شجري.' },
  { id: 'shrubs', labelAr: 'الشجيرات والسياجات', descriptionAr: 'شجيرات مزهرة أو دائمة الخضرة مناسبة للتنسيق والسياج.' },
  { id: 'fruiting-shrubs', labelAr: 'شجيرات الفاكهة', descriptionAr: 'أنواع مثمرة ذات نمو شجيري، مثل التوتيات.' },
  { id: 'climbers-groundcovers', labelAr: 'المتسلقات والمدادات', descriptionAr: 'كروم نباتية وأغطية أرضية وزاحفات.' },
  { id: 'flowering-plants', labelAr: 'الزهور والنباتات المزهرة', descriptionAr: 'ورود ونباتات موسمية ومعمّرة مزهرة.' },
  { id: 'ornamental-perennials', labelAr: 'نباتات الزينة المعمّرة', descriptionAr: 'نباتات معمّرة عشبية وورقية للحدائق والأحواض.' },
  { id: 'herbs-aromatics', labelAr: 'الأعشاب والطبية والعطرية', descriptionAr: 'أعشاب مطبخ ونباتات عطرية وطبية.' },
  { id: 'tropical-fruit-plants', labelAr: 'فواكه استوائية غير شجرية', descriptionAr: 'نباتات فاكهة عشبية أو شبيهة بالنخيل، مثل الموز والأناناس.' },
  { id: 'palms-architectural', labelAr: 'النخيل والنباتات المعمارية', descriptionAr: 'نخيل وسيكاس ويوكا ونباتات ذات هيئة بنيوية.' },
  { id: 'indoor-shade', labelAr: 'نباتات الظل والداخلية', descriptionAr: 'نباتات أوراق وزينة تناسب الظل الساطع والأصص الداخلية.' },
  { id: 'cacti-succulents', labelAr: 'الصباريات والعصاريات', descriptionAr: 'نباتات تخزن الماء وتحتاج صرفًا وريًا خاصين.' },
  { id: 'ornamental-grasses', labelAr: 'الحشائش وأغطية التربة', descriptionAr: 'نجيل وحشائش زينة ونباتات حدودية منخفضة.' },
  { id: 'other-plants', labelAr: 'أصناف تحتاج تحديدًا علميًا', descriptionAr: 'أسماء تجارية أو أشكال زراعية لا تكفي لتحديد النوع النباتي بدقة.' },
];

const categoriesById = Object.fromEntries(PLANT_GUIDE_CATEGORIES.map((category) => [category.id, category])) as Record<PlantGuideCategoryId, PlantGuideCategory>;
const normalize = (value: string) => value.normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g, '').toLocaleLowerCase();
const any = (value: string, pattern: RegExp) => pattern.test(value);

const fruitTreePattern = /\b(citrus|prunus|malus|cydonia|eriobotrya|diospyros|ficus carica|morus|psidium|acca|pyrus|punica|ziziphus|juglans|ceratonia|pistacia|mangifera|annona|persea|carica papaya)\b/i;
const fruitingShrubPattern = /\b(vaccinium|rubus)\b/i;
const climbingPattern = /\b(vitis|passiflora|hylocereus|parthenocissus|dolichandra|hedera|trachelospermum|jasminum officinale)\b|مخلب القط|هيدرا|لبلاب|ياسمين عراقي|عنب زيني|باشن فروت/i;
const succulentPattern = /\b(cactaceae|echinocactus|cereus|agave|aloe|succulent|peperomia)\b|صبار|صباريات|عصاريات|أغاف|الوفيرا|ألوفيرا/i;
const aromaticPattern = /\b(lavandula|thymus|mentha|salvia officinalis|salvia rosmarinus|rosmarinus|ocimum|laurus nobilis|ruta graveolens|achillea|artemisia|salvia yangii|perovskia)\b|لافندر|زعتر|نعنع|ميرمية|إكليل الجبل|روزمري|ريحان|حبق|نبتة الشذاب|قيصوم|شيح/i;
const palmArchitecturePattern = /\b(washingtonia|dypsis|chamaedorea|cycas|yucca|strelitzia|phormium|agapanthus|dracaena sanderiana)\b|نخيل|واشنطونيا|اريكا|أريكا|شمادوريا|سيكاس|يوكا|عصفور الجنة|فورميوم|أغابانثوس|ساق البامبو/i;
const indoorPattern = /\b(hydrangea|codiaeum|aucuba|sansevieria|epipremnum|pachira|ficus elastica|ficus benjamina|ficus spp|spathiphyllum|dieffenbachia|anthurium|zamioculcas|monstera|dracaena marginata|chamaedorea|croton|aucuba)\b|قرطاسية|كروتون|غبار الذهب|بونساي|جلد النمر|قلب عبد الوهاب|بشيرة|كوشوك|زنبق السلام|دفنباخيا|أنثوريوم|زاميا|قفص صدري|دراسينا حمراء|خيزران/i;
const ornamentalGrassPattern = /\b(festuca|pennisetum|cortaderia|poaceae)\b|\b(turf grass)\b|حلفاء|فستوكا|نجيل|حشيش زينة/i;
const fruitingHerbPattern = /\b(musa|ananas)\b|موز مثمر|أناناس/i;
const ornamentalTreePattern = /\b(eucalyptus|albizia|jacaranda|melia|delonix|bauhinia|parkinsonia|brachychiton|cercis|tilia|tamarix|paulownia|grevillea|schinus|vitex|lagerstroemia|conocarpus|ster?culia|pinus|quercus|cedrus|cupressus|thuja|araucaria|ficus benjamina|ficus nitida|ficus sycomorus|moringa oleifera)\b/i;
const fruitTreeProfileIds = new Set(['citrus', 'deciduous-orchard', 'fig-mulberry', 'dryland-fruit', 'warm-subtropical', 'tropical-mango', 'tropical-papaya', 'tropical-annona', 'tropical-avocado']);
const shrubProfileIds = new Set(['orn-hedge-shrubs', 'orn-flowering-shrubs', 'orn-drought-flowering', 'indoor-hydrangea', 'bay-laurel', 'arak-salvadora-persica']);
const flowerProfileIds = new Set(['roses-climbing-hybrid-damask', 'gazania-dry-sun', 'warm-annuals-tagetes-celosia-vinca', 'pelargonium-geranium', 'salvia-genus-unspecified', 'shukriya-unidentified-ornamental', 'mild-season-bedding-annuals', 'tropical-flowering', 'calla-pot']);
const indoorProfileIds = new Set(['low-water-foliage', 'aucuba-shade', 'tropical-foliage', 'indoor-palms', 'indoor-hydrangea', 'bonsai-unspecified']);
const climbingProfileIds = new Set(['orn-climbers', 'grape', 'tropical-passion-fruit']);
const ornamentalTreeProfileIds = new Set(['orn-conifers', 'orn-ornamental-trees']);

export function getPlantGuideCategory(plant: Pick<ManagedPlant, 'id' | 'nameAr' | 'nameEn' | 'scientificName' | 'categoryId'>): PlantGuideCategory {
  const identity = normalize(`${plant.scientificName} ${plant.nameEn} ${plant.nameAr}`);
  const careProfileId = getPlantCareProfile(plant.id, plant.categoryId).id;

  if (plant.id === 'id-1790081508318-va81r' || any(identity, ornamentalGrassPattern)) return categoriesById['ornamental-grasses'];
  if (any(identity, succulentPattern)) return categoriesById['cacti-succulents'];
  if (any(identity, aromaticPattern)) return categoriesById['herbs-aromatics'];
  if (/\bolea europaea\b|زيتون/.test(identity)) return categoriesById['olive-trees'];
  if (any(identity, climbingPattern) || /ورد جوري متسلق/.test(identity) || climbingProfileIds.has(careProfileId)) return categoriesById['climbers-groundcovers'];
  if (any(identity, fruitingShrubPattern) || careProfileId === 'berries') return categoriesById['fruiting-shrubs'];
  if (any(identity, palmArchitecturePattern)) return categoriesById['palms-architectural'];
  if (any(identity, fruitingHerbPattern)) return categoriesById['tropical-fruit-plants'];
  if (shrubProfileIds.has(careProfileId) || /\b(tecoma|callistemon|euonymus|buxus|murraya|pittosporum|duranta|viburnum|hibiscus|cestrum|nerium|bougainvillea|plumbago|dodonaea|hebe|leucophyllum|carissa|berberis|lantana|myrtus|polygala|photinia|ligustrum|nandina|jasminum sambac|rhus coriaria)\b|ورد جوري|فل بلدي|فل جيزاني|فيكس مقزم|سماق/i.test(identity)) return categoriesById['shrubs'];
  if (any(identity, fruitTreePattern) || fruitTreeProfileIds.has(careProfileId) || careProfileId.startsWith('tropical-') && !['tropical-foliage', 'tropical-flowering', 'tropical-passion-fruit'].includes(careProfileId)) return categoriesById['fruit-trees'];
  if (ornamentalTreeProfileIds.has(careProfileId) || any(identity, ornamentalTreePattern)) return categoriesById['ornamental-trees'];
  if (careProfileId === 'orn-ficus') return categoriesById['ornamental-trees'];
  if (/bonsai|بونساي/i.test(identity)) return categoriesById['other-plants'];
  if (any(identity, indoorPattern) || indoorProfileIds.has(careProfileId)) return categoriesById['indoor-shade'];
  if (careProfileId === 'orn-foliage-perennials') return categoriesById['ornamental-perennials'];
  if (any(identity, ornamentalGrassPattern)) return categoriesById['ornamental-grasses'];
  if (flowerProfileIds.has(careProfileId) || /\b(gazania|tagetes|celosia|petunia|dianthus|chrysanthemum|antirrhinum|argyranthemum|catharanthus|rosa|pelargonium|salvia|plumbago)\b|ورد|جوري|غازانيا|فينكا|بتونيا|قرنفل|كريز|اقحوان|فم السمكة|سالفيا|جيرانيوم|جاردينيا/i.test(identity)) return categoriesById['flowering-plants'];
  if (any(identity, fruitTreePattern)) return categoriesById['fruit-trees'];
  return categoriesById['other-plants'];
}
