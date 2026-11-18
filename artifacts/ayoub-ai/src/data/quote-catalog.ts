import backup from './alqadri-backup.json';

export type QuoteCatalogItem = {
  id: string;
  nameAr: string;
  nameEn: string;
  image?: string;
  categoryId: string;
  categoryAr: string;
  categoryEn: string;
  descriptionAr: string;
  descriptionEn: string;
  source: 'plant' | 'supply';
};

export type QuoteCatalogCategory = {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: 'tree' | 'flower' | 'leaf' | 'pot' | 'water' | 'stone' | 'tools';
  accent: string;
  items: QuoteCatalogItem[];
};

type BackupSection = { id?: string; nameAr?: string; nameEn?: string; photos?: Array<{ id?: string; nameAr?: string; nameEn?: string; image?: string }> };
type BackupStoreItem = { id?: string; nameAr?: string; nameEn?: string; image?: string; category?: string };
const siteData = (backup as { siteData: { sections?: BackupSection[]; agriStoreProducts?: BackupStoreItem[] } }).siteData;

const sectionMeta: Record<string, { icon: QuoteCatalogCategory['icon']; accent: string }> = {
  'sec-ornamental': { icon: 'tree', accent: '#2f6b4f' },
  'id-1779352740663-wxw04': { icon: 'leaf', accent: '#557b67' },
  'id-1779353798374-7jqi5': { icon: 'tree', accent: '#8c6b42' },
  'id-1779354629512-h4uda': { icon: 'leaf', accent: '#16858b' },
  'id-1779357507016-3f6rk': { icon: 'leaf', accent: '#769b45' },
  'id-1779357539381-ob6z9': { icon: 'flower', accent: '#b34e6d' },
  'id-1779477913229-x8puo': { icon: 'flower', accent: '#8a5a9d' },
  'id-1779696103581-y2h9g': { icon: 'tree', accent: '#7b6c3e' },
  'id-1779608675326-62yls': { icon: 'stone', accent: '#8c7356' },
  'id-1780917756228-hsi6f': { icon: 'pot', accent: '#a9684a' },
};

const storeMeta: Record<string, { ar: string; en: string; icon: QuoteCatalogCategory['icon']; accent: string }> = {
  irrigation: { ar: 'شبكات الري', en: 'Irrigation Systems', icon: 'water', accent: '#247d91' },
  'garden-decor': { ar: 'ديكور الحديقة', en: 'Garden Decor', icon: 'stone', accent: '#9a6a42' },
  pots: { ar: 'أحواض وأصص', en: 'Pots & Planters', icon: 'pot', accent: '#a9684a' },
  tools: { ar: 'أدوات زراعية', en: 'Garden Tools', icon: 'tools', accent: '#58687b' },
  fertilizers: { ar: 'أسمدة ومحسنات تربة', en: 'Fertilizers & Soil', icon: 'leaf', accent: '#6d8440' },
  pesticides: { ar: 'مبيدات ومعالجات', en: 'Plant Care', icon: 'leaf', accent: '#92753c' },
  seeds: { ar: 'بذور', en: 'Seeds', icon: 'flower', accent: '#8c6b42' },
  'seedling-supplies': { ar: 'مستلزمات المشاتل', en: 'Nursery Supplies', icon: 'tools', accent: '#5e7c69' },
};

function cleanName(value: string | undefined, fallback: string) {
  return (value || fallback).replace(/\s+/g, ' ').trim();
}
function improvedDescription(nameAr: string, categoryAr: string, source: 'plant' | 'supply') {
  if (source === 'supply') return `${nameAr} — خيار عملي لإكمال أعمال الحديقة والموقع، مع استخدام مرن حسب المساحة وطبيعة التنفيذ. يُفضّل اختيار المقاس والكمية المناسبة قبل اعتماد البند في عرض السعر.`;
  return `${nameAr} — عنصر نباتي مختار لتنسيق المساحات الخارجية وإضافة طبقة واضحة من اللون والملمس إلى التصميم. يُراعى موقع الزراعة، كمية الضوء، نوع التربة، وبرنامج الري عند اعتماد الكمية والتوزيع.`;
}

const plantCategories: QuoteCatalogCategory[] = (siteData.sections || []).map((section) => {
  const meta = sectionMeta[section.id || ''] || { icon: 'leaf' as const, accent: '#557b67' };
  const categoryAr = cleanName(section.nameAr, 'نباتات وتنسيق');
  const categoryEn = cleanName(section.nameEn, 'Plants & Landscaping');
  return {
    id: section.id || categoryAr,
    nameAr: categoryAr,
    nameEn: categoryEn,
    icon: meta.icon,
    accent: meta.accent,
    items: (section.photos || []).map((photo, index) => {
      const nameAr = cleanName(photo.nameAr, `نبات ${index + 1}`);
      return {
        id: photo.id || `${section.id}-${index}`,
        nameAr,
        nameEn: cleanName(photo.nameEn, nameAr),
        image: photo.image,
        categoryId: section.id || categoryAr,
        categoryAr,
        categoryEn,
        descriptionAr: improvedDescription(nameAr, categoryAr, 'plant'),
        descriptionEn: `${cleanName(photo.nameEn, nameAr)} — a considered plant choice for outdoor landscaping, bringing structure, colour, and texture to the design. Select its quantity and placement according to light, soil, and irrigation needs.`,
        source: 'plant',
      } satisfies QuoteCatalogItem;
    }),
  };
});

const supplyCategories: QuoteCatalogCategory[] = Object.entries(storeMeta).map(([id, meta]) => {
  const items = (siteData.agriStoreProducts || []).filter((item) => item.category === id).map((item, index) => {
    const nameAr = cleanName(item.nameAr, `مادة زراعية ${index + 1}`);
    return {
      id: item.id || `${id}-${index}`,
      nameAr,
      nameEn: cleanName(item.nameEn, nameAr),
      image: item.image,
      categoryId: id,
      categoryAr: meta.ar,
      categoryEn: meta.en,
      descriptionAr: improvedDescription(nameAr, meta.ar, 'supply'),
      descriptionEn: `${cleanName(item.nameEn, nameAr)} — a practical landscape supply selected to support reliable installation and garden maintenance. Confirm the required size and quantity before adding it to a quotation.`,
      source: 'supply' as const,
    } satisfies QuoteCatalogItem;
  });
  return { id, nameAr: meta.ar, nameEn: meta.en, icon: meta.icon, accent: meta.accent, items } satisfies QuoteCatalogCategory;
});

export const quoteCatalog: QuoteCatalogCategory[] = [...plantCategories, ...supplyCategories].filter((category) => category.items.length > 0);
export const quoteCatalogItems = quoteCatalog.flatMap((category) => category.items);
