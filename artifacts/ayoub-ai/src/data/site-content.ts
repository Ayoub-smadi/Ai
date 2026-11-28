import backup from './alqadri-backup.json';

export type StoreProductVariant = {
  id: string;
  size?: string;
  color?: string;
  price: number | string;
};

export type StoreProduct = {
  id: string;
  nameAr: string;
  nameEn: string;
  image: string;
  descriptionAr: string;
  descriptionEn: string;
  category: string;
  price: number | string;
  variants?: StoreProductVariant[];
};

export type PortfolioProject = {
  id: string;
  name: string;
  category: string;
  description: string;
  image: string;
  images?: string[];
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
export const STORE_PRODUCTS_STORAGE_KEY = 'qadri-store-products-v1';
export const PORTFOLIO_PROJECTS_STORAGE_KEY = 'qadri-portfolio-projects-v1';
const STORE_IMAGE_ORIGIN = 'https://www.alqadrioffers.online';

export function resolveStoreProductImage(image: string | undefined): string {
  const value = (image || '').trim();
  if (!value || /^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith('/api/images/')) return `${STORE_IMAGE_ORIGIN}${value}`;
  return value;
}

function readList<T>(key: string, fallback: T[]): T[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(parsed) ? parsed as T[] : fallback;
  } catch { return fallback; }
}
function publishUpdate() { window.dispatchEvent(new CustomEvent('qadri-site-content-updated')); }
export function getStoreProducts(): StoreProduct[] { return readList(STORE_PRODUCTS_STORAGE_KEY, defaultProducts); }
export function saveStoreProducts(items: StoreProduct[]) { localStorage.setItem(STORE_PRODUCTS_STORAGE_KEY, JSON.stringify(items)); publishUpdate(); }
export function getPortfolioProjects(): PortfolioProject[] { return readList(PORTFOLIO_PROJECTS_STORAGE_KEY, []); }
export function savePortfolioProjects(items: PortfolioProject[]) { localStorage.setItem(PORTFOLIO_PROJECTS_STORAGE_KEY, JSON.stringify(items)); publishUpdate(); }
