import { quoteCatalogItems, type QuoteCatalogItem } from './quote-catalog';

export type ManagedPlant = QuoteCatalogItem & {
  scientificName: string;
  landscapeIcon?: string;
};

const STORAGE_KEY = 'qadri-managed-plants-v1';

export function getManagedPlants(): ManagedPlant[] {
  const base = quoteCatalogItems.filter((item) => item.source === 'plant').map((item) => ({
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
    const merged = base.filter((plant) => !deletedIds.includes(plant.id)).map((plant) => overrides.get(plant.id) || plant);
    const baseIds = new Set(base.map((plant) => plant.id));
    return [...merged, ...saved.filter((plant) => !baseIds.has(plant.id))];
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
