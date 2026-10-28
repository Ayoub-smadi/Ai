import { useMemo, useState } from "react";
import backup from "../data/alqadri-backup.json";

type StoreProduct = {
  id?: string;
  nameAr?: string;
  nameEn?: string;
  image?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  category?: string;
  price?: number | string;
};

type BackupShape = {
  siteData?: {
    agriStoreProducts?: StoreProduct[];
  };
};

const siteData = (backup as BackupShape).siteData;
const products: StoreProduct[] = Array.isArray(siteData?.agriStoreProducts)
  ? siteData.agriStoreProducts.filter((product): product is StoreProduct => Boolean(product && typeof product === "object"))
  : [];

const textOrEmpty = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const categoryNames: Record<string, string> = { irrigation: "شبكات الري", "garden-decor": "ديكور الحدائق", pots: "أحواض وأصص", tools: "أدوات زراعية", fertilizers: "أسمدة ومحسنات تربة", pesticides: "مبيدات ومعالجات", seeds: "بذور", "seedling-supplies": "مستلزمات المشاتل" };

export function StorePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => textOrEmpty(product.category)).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ar")),
    [],
  );
  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ar");
    return products.filter((product) => {
      const matchesCategory = category === "all" || textOrEmpty(product.category) === category;
      const searchable = [product.nameAr, product.nameEn, product.descriptionAr, product.descriptionEn, product.category]
        .map(textOrEmpty)
        .join(" ")
        .toLocaleLowerCase("ar");
      return matchesCategory && (!query || searchable.includes(query));
    });
  }, [search, category]);

  return (
    <main className="public-store-page" dir="rtl" lang="ar">
      <header className="public-store-page__header">
        <p className="public-store-page__eyebrow">المتجر الزراعي</p>
        <h1>منتجاتنا</h1>
        <p>تصفّح المنتجات المتاحة في بيانات المتجر وابحث عنها حسب الاسم أو الوصف أو الفئة.</p>
      </header>

      {products.length > 0 ? (
        <section className="public-store-page__catalog" aria-label="كتالوج المنتجات">
          <div className="public-store-page__filters">
            <label>
              <span>بحث</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث عن منتج..."
                aria-label="ابحث في المنتجات"
              />
            </label>
            <label>
              <span>الفئة</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="تصفية حسب الفئة">
                <option value="all">كل الفئات</option>
                {categories.map((item) => <option key={item} value={item}>{categoryNames[item] || item}</option>)}
              </select>
            </label>
          </div>

          {visibleProducts.length > 0 ? (
            <div className="public-store-page__grid">
              {visibleProducts.map((product, index) => {
                const name = textOrEmpty(product.nameAr) || textOrEmpty(product.nameEn) || "منتج";
                const description = textOrEmpty(product.descriptionAr) || textOrEmpty(product.descriptionEn);
                const image = textOrEmpty(product.image);
                const price = product.price;
                const hasPrice = typeof price === "number" ? Number.isFinite(price) : typeof price === "string" && price.trim().length > 0;
                return (
                  <article className="public-store-page__product" key={textOrEmpty(product.id) || `${name}-${index}`}>
                    {image ? <img className="public-store-page__image" src={image} alt={name} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
                    <div className="public-store-page__product-body">
                      {textOrEmpty(product.category) ? <p className="public-store-page__category">{categoryNames[textOrEmpty(product.category)] || textOrEmpty(product.category)}</p> : null}
                      <h2>{name}</h2>
                      {description ? <p className="public-store-page__description">{description}</p> : null}
                      {hasPrice ? <p className="public-store-page__price">{price} <span>د.أ</span></p> : null}
                      <a className="public-store-page__quote-link" href="/quotes">طلب عرض سعر</a>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="public-store-page__empty" role="status">لا توجد منتجات تطابق البحث أو الفئة المحددة.</p>
          )}
        </section>
      ) : (
        <section className="public-store-page__empty-state" role="status">
          <h2>المخزون فارغ حاليًا</h2>
          <p>لا توجد منتجات مسجلة في بيانات المتجر لعرضها الآن.</p>
        </section>
      )}
    </main>
  );
}

export function ProjectsPage() {
  return (
    <main className="portfolio-page" dir="rtl" lang="ar">
      <section className="portfolio-page__empty-state" aria-labelledby="portfolio-title">
        <p className="portfolio-page__eyebrow">أعمالنا</p>
        <h1 id="portfolio-title">لا توجد أعمال منشورة بعد</h1>
        <p>نعمل على توثيق المشاريع والأعمال المنجزة، وستظهر هنا عند نشرها.</p>
        <a className="portfolio-page__home-link" href="/">العودة إلى الرئيسية</a>
      </section>
    </main>
  );
}
