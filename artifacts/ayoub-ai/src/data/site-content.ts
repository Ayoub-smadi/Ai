import backup from './alqadri-backup.json';

export type StoreProduct = {
  id: string;
  nameAr: string;
  nameEn: string;
  image: string;
  descriptionAr: string;
  descriptionEn: string;
  category: string;
  price: number | string;
};

export type PortfolioProject = {
  id: string;
  name: string;
  category: string;
  description: string;
  image: string;
  location: string;
  date: string;
};

type BackupShape = { siteData?: { agriStoreProducts?: Array<Partial<StoreProduct>> } };
const defaultProducts: StoreProduct[] = ((backup as BackupShape).siteData?.agriStoreProducts || []).map((product, index) => ({
  id: String(product.id || `store-${index + 1}`),
  nameAr: String(product.nameAr || ''),
  nameEn: String(product.nameEn || ''),
  image: String(product.image || ''),
  descriptionAr: String(product.descriptionAr || ''),
  descriptionEn: String(product.descriptionEn || ''),
  category: String(product.category || ''),
  price: product.price ?? '',
}));
const PRODUCTS_KEY = 'qadri-store-products-v1';
const PROJECTS_KEY = 'qadri-portfolio-projects-v1';

function readList<T>(key: string, fallback: T[]): T[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(parsed) ? parsed as T[] : fallback;
  } catch { return fallback; }
}
function publishUpdate() { window.dispatchEvent(new CustomEvent('qadri-site-content-updated')); }
export function getStoreProducts(): StoreProduct[] { return readList(PRODUCTS_KEY, defaultProducts); }
export function saveStoreProducts(items: StoreProduct[]) { localStorage.setItem(PRODUCTS_KEY, JSON.stringify(items)); publishUpdate(); }
export function getPortfolioProjects(): PortfolioProject[] { return readList(PROJECTS_KEY, []); }
export function savePortfolioProjects(items: PortfolioProject[]) { localStorage.setItem(PROJECTS_KEY, JSON.stringify(items)); publishUpdate(); }
