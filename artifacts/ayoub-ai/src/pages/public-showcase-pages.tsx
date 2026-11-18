import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, CalendarDays, Images, MapPin, ShoppingCart, X } from "lucide-react";
import { useStoreCart } from "@/hooks/use-store-cart";
import { getPortfolioProjects, getStoreProducts, type PortfolioProject, type StoreProduct } from "../data/site-content";
import "./store-image-size.css";
import "./project-showcase-gallery.css";

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
  const { items: cartItems, addProduct } = useStoreCart();
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
  return <main className="public-store-page" dir="rtl" lang="ar"><header className="public-store-page__header"><p className="public-store-page__eyebrow">المتجر الزراعي</p><h1>منتجاتنا</h1><p>تصفّح المنتجات المتاحة في المتجر وابحث عنها حسب الاسم أو الوصف أو الفئة.</p><Link className="public-store-page__cart-link" href="/cart"><ShoppingCart size={17} />السلة <span>{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</span></Link></header>
    {products.length > 0 ? <section className="public-store-page__catalog" aria-label="كتالوج المنتجات"><div className="public-store-page__filters"><label><span>بحث</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث عن منتج..." aria-label="ابحث في المنتجات" /></label><label><span>الفئة</span><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="تصفية حسب الفئة"><option value="all">كل الفئات</option>{categories.map((item) => <option key={item} value={item}>{categoryNames[item] || item}</option>)}</select></label></div>
      {visibleProducts.length > 0 ? <div className="public-store-page__grid">{visibleProducts.map((product) => { const name = textOrEmpty(product.nameAr) || textOrEmpty(product.nameEn) || "منتج"; const description = textOrEmpty(product.descriptionAr) || textOrEmpty(product.descriptionEn); const image = textOrEmpty(product.image); const hasPrice = product.price !== "" && product.price !== undefined && product.price !== null; return <article className="public-store-page__product" key={product.id}>{image ? <img className="public-store-page__image" src={image} alt={name} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}<div className="public-store-page__product-body">{textOrEmpty(product.category) ? <p className="public-store-page__category">{categoryNames[textOrEmpty(product.category)] || textOrEmpty(product.category)}</p> : null}<h2>{name}</h2>{description ? <p className="public-store-page__description">{description}</p> : null}{hasPrice ? <p className="public-store-page__price">{product.price} <span>د.أ</span></p> : null}<button className="public-store-page__add-button" type="button" onClick={() => addProduct(product)}><ShoppingCart size={15} />أضف إلى السلة</button></div></article>; })}</div> : <p className="public-store-page__empty" role="status">لا توجد منتجات تطابق البحث أو الفئة المحددة.</p>}</section> : <section className="public-store-page__empty-state" role="status"><h2>المخزون فارغ حاليًا</h2><p>أضف منتجات من لوحة الإدارة لعرضها هنا.</p></section>}
  </main>;
}

export function ProjectsPage() {
  const projects = useSiteContent<PortfolioProject[]>(getPortfolioProjects);
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const projectImages = selectedProject ? Array.from(new Set([...(selectedProject.images ?? []), selectedProject.image].filter(Boolean))) : [];
  const closeProject = () => { setSelectedProject(null); setSelectedImageIndex(0); };
  useEffect(() => {
    if (!selectedProject) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeProject();
      if (event.key === "ArrowLeft") setSelectedImageIndex((index) => (index + 1) % Math.max(1, projectImages.length));
      if (event.key === "ArrowRight") setSelectedImageIndex((index) => (index - 1 + Math.max(1, projectImages.length)) % Math.max(1, projectImages.length));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedProject, projectImages.length]);
  return <main className="portfolio-page" dir="rtl" lang="ar"><section className="portfolio-page__content"><header className="portfolio-page__header"><p className="portfolio-page__eyebrow">أعمالنا</p><h1>مشاريعنا</h1><p>مجموعة من مشاريعنا وأعمالنا المنجزة.</p></header>{projects.length ? <div className="portfolio-page__grid">{projects.map((project) => { const images = Array.from(new Set([...(project.images ?? []), project.image].filter(Boolean))); return <article className="portfolio-page__card" key={project.id} role="button" tabIndex={0} aria-label={`فتح تفاصيل مشروع ${project.name}`} onClick={() => { setSelectedProject(project); setSelectedImageIndex(0); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedProject(project); setSelectedImageIndex(0); } }}>{images[0] ? <img src={images[0]} alt={project.name} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <div className="portfolio-page__image-placeholder">قادري للمشاتل</div>}{images.length > 1 && <span className="portfolio-card__photo-count"><Images size={13} />{images.length} صور</span>}<div className="portfolio-page__card-body">{project.category && <span className="portfolio-page__eyebrow">{project.category}</span>}<h2>{project.name}</h2>{project.description && <p>{project.description}</p>}{(project.location || project.date) && <small>{[project.location, project.date].filter(Boolean).join(" · ")}</small>}<span className="portfolio-card__open-hint">اكتشف المشروع <ArrowLeft size={14} /></span></div></article>; })}</div> : <div className="portfolio-page__empty-state"><h2>لا توجد أعمال منشورة بعد</h2><p>نعمل على توثيق المشاريع والأعمال المنجزة، وستظهر هنا عند نشرها.</p><a className="portfolio-page__home-link" href="/">العودة إلى الرئيسية</a></div>}</section>
    {selectedProject && <div className="project-detail-backdrop" role="presentation" onClick={closeProject}><section className="project-detail" role="dialog" aria-modal="true" aria-label={`تفاصيل مشروع ${selectedProject.name}`} onClick={(event) => event.stopPropagation()}><button type="button" className="project-detail__close" onClick={closeProject} aria-label="إغلاق"><X size={20} /></button><div className="project-detail__visual">{projectImages.length ? <><img className="project-detail__hero" src={projectImages[selectedImageIndex] || projectImages[0]} alt={`${selectedProject.name} — صورة ${selectedImageIndex + 1}`} /><span className="project-detail__counter">{selectedImageIndex + 1} / {projectImages.length}</span>{projectImages.length > 1 && <><button type="button" className="project-detail__nav project-detail__nav--previous" aria-label="الصورة السابقة" onClick={() => setSelectedImageIndex((index) => (index - 1 + projectImages.length) % projectImages.length)}><ArrowRight size={18} /></button><button type="button" className="project-detail__nav project-detail__nav--next" aria-label="الصورة التالية" onClick={() => setSelectedImageIndex((index) => (index + 1) % projectImages.length)}><ArrowLeft size={18} /></button></>}</> : <div className="project-detail__empty-visual"><Images size={38} /><span>صور المشروع ستظهر هنا</span></div>}</div><div className="project-detail__content"><div className="project-detail__eyebrow">{selectedProject.category || "من أعمالنا"}</div><h2>{selectedProject.name}</h2><div className="project-detail__meta">{selectedProject.location && <span><MapPin size={15} />{selectedProject.location}</span>}{selectedProject.date && <span><CalendarDays size={15} />{selectedProject.date}</span>}</div><p className="project-detail__description">{selectedProject.description || "تفاصيل هذا المشروع قريبًا."}</p>{projectImages.length > 1 && <div className="project-detail__gallery"><div className="project-detail__gallery-heading"><strong>لحظات من المشروع</strong><span>{projectImages.length} صور</span></div><div className="project-detail__thumbnails">{projectImages.map((image, index) => <button type="button" key={`${index}-${image.slice(-20)}`} className={selectedImageIndex === index ? "is-active" : ""} onClick={() => setSelectedImageIndex(index)} aria-label={`عرض صورة ${index + 1}`}><img src={image} alt="" /></button>)}</div></div>}</div></section></div>}
  </main>;
}
