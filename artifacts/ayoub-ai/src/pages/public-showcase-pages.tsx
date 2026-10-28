import { useEffect, useMemo, useState } from "react";
import { getPortfolioProjects, getStoreProducts, type PortfolioProject, type StoreProduct } from "../data/site-content";

const textOrEmpty = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const categoryNames: Record<string, string> = { irrigation: "شبكات الري", "garden-decor": "ديكور الحدائق", pots: "أحواض وأصص", tools: "أدوات زراعية", fertilizers: "أسمدة ومحسنات تربة", pesticides: "مبيدات ومعالجات", seeds: "بذور", "seedling-supplies": "مستلزمات المشاتل" };
function useSiteContent<T>(read: () => T) {
  const [items, setItems] = useState(read);
  useEffect(() => {
    const refresh = () => setItems(read());
    window.addEventListener("qadri-site-content-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("qadri-site-content-updated", refresh); window.removeEventListener("storage", refresh); };
  }, [read]);
  return items;
}

export function StorePage() {
  const products = useSiteContent<StoreProduct[]>(getStoreProducts);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const categories = useMemo(() => Array.from(new Set(products.map((product) => textOrEmpty(product.category)).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ar")), [products]);
  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ar");
    return products.filter((product) => {
      const matchesCategory = category === "all" || textOrEmpty(product.category) === category;
      const searchable = [product.nameAr, product.nameEn, product.descriptionAr, product.descriptionEn, product.category].map(textOrEmpty).join(" ").toLocaleLowerCase("ar");
      return matchesCategory && (!query || searchable.includes(query));
    });
  }, [search, category, products]);
  return <main className="public-store-page" dir="rtl" lang="ar"><header className="public-store-page__header"><p className="public-store-page__eyebrow">المتجر الزراعي</p><h1>منتجاتنا</h1><p>تصفّح المنتجات المتاحة في المتجر وابحث عنها حسب الاسم أو الوصف أو الفئة.</p></header>
    {products.length > 0 ? <section className="public-store-page__catalog" aria-label="كتالوج المنتجات"><div className="public-store-page__filters"><label><span>بحث</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث عن منتج..." aria-label="ابحث في المنتجات" /></label><label><span>الفئة</span><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="تصفية حسب الفئة"><option value="all">كل الفئات</option>{categories.map((item) => <option key={item} value={item}>{categoryNames[item] || item}</option>)}</select></label></div>
      {visibleProducts.length > 0 ? <div className="public-store-page__grid">{visibleProducts.map((product) => { const name = textOrEmpty(product.nameAr) || textOrEmpty(product.nameEn) || "منتج"; const description = textOrEmpty(product.descriptionAr) || textOrEmpty(product.descriptionEn); const image = textOrEmpty(product.image); const hasPrice = product.price !== "" && product.price !== undefined && product.price !== null; return <article className="public-store-page__product" key={product.id}>{image ? <img className="public-store-page__image" src={image} alt={name} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}<div className="public-store-page__product-body">{textOrEmpty(product.category) ? <p className="public-store-page__category">{categoryNames[textOrEmpty(product.category)] || textOrEmpty(product.category)}</p> : null}<h2>{name}</h2>{description ? <p className="public-store-page__description">{description}</p> : null}{hasPrice ? <p className="public-store-page__price">{product.price} <span>د.أ</span></p> : null}<a className="public-store-page__quote-link" href="/quotes">طلب عرض سعر</a></div></article>; })}</div> : <p className="public-store-page__empty" role="status">لا توجد منتجات تطابق البحث أو الفئة المحددة.</p>}</section> : <section className="public-store-page__empty-state" role="status"><h2>المخزون فارغ حاليًا</h2><p>أضف منتجات من لوحة الإدارة لعرضها هنا.</p></section>}
  </main>;
}

export function ProjectsPage() {
  const projects = useSiteContent<PortfolioProject[]>(getPortfolioProjects);
  return <main className="portfolio-page" dir="rtl" lang="ar"><section className="portfolio-page__content"><header className="portfolio-page__header"><p className="portfolio-page__eyebrow">أعمالنا</p><h1>مشاريعنا</h1><p>مجموعة من مشاريعنا وأعمالنا المنجزة.</p></header>{projects.length ? <div className="portfolio-page__grid">{projects.map((project) => <article className="portfolio-page__card" key={project.id}>{project.image ? <img src={project.image} alt={project.name} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <div className="portfolio-page__image-placeholder">قادري للمشاتل</div>}<div className="portfolio-page__card-body">{project.category && <span className="portfolio-page__eyebrow">{project.category}</span>}<h2>{project.name}</h2>{project.description && <p>{project.description}</p>}{(project.location || project.date) && <small>{[project.location, project.date].filter(Boolean).join(" · ")}</small>}</div></article>)}</div> : <div className="portfolio-page__empty-state"><h2>لا توجد أعمال منشورة بعد</h2><p>نعمل على توثيق المشاريع والأعمال المنجزة، وستظهر هنا عند نشرها.</p><a className="portfolio-page__home-link" href="/">العودة إلى الرئيسية</a></div>}</section></main>;
}
