import { useEffect, useMemo, useState, useRef, createContext, useContext, type ChangeEvent, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignUp, Show, useAuth, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import {
  Activity, ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, Bot, Building2, Camera, Check,
  ChevronRight, CircleHelp, Code2, Download, FileText, Globe2, Languages, LayoutDashboard, LifeBuoy,
  BrainCircuit, Calculator, CalendarDays, Database, Facebook, FileArchive, FileDown, FileSpreadsheet, Image as ImageIcon, Instagram, Linkedin, Link2, LoaderCircle,
  LogOut, Mail, Menu, MessageCircle, MessageSquareText, Mic, Package, Paperclip, Play, Plus, Phone, Receipt, Save, SaveAll, Search, Send, Settings2, ShieldCheck,
  ShoppingBag, SlidersHorizontal, Sparkles, Store, Trash2, Upload, Video, Wifi, X, Youtube, ImagePlus, MapPinned, RotateCcw, TreePine, Flower2, Droplets, Mountain, Sprout, Cloud, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, Wind, Clock3
} from 'lucide-react';
import { Link, Redirect, Route, Switch, Router as WouterRouter, useLocation, useRoute } from 'wouter';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  useCreateAgent, useCreateFaq, useCreateProduct, useCreateWorkspace, useDeleteAgent, useDeleteFaq,
  useDeleteProduct, useGetAgent, useGetBusinessProfile, useGetDashboard, useListAgents, useListChannels,
  useListFaqs, useListProducts, useListWorkspaces, useSaveBusinessProfile, useSendAgentTestMessage,
  useSetAgentActivation, useUpdateAgent, useUpdateFaq, useUpdateProduct,
  getGetAgentQueryKey, getGetBusinessProfileQueryKey, getGetDashboardQueryKey, getListAgentsQueryKey,
  getListChannelsQueryKey, getListFaqsQueryKey, getListProductsQueryKey, getListWorkspacesQueryKey
} from '@workspace/api-client-react';
import type { Agent, BusinessProfileInput, Faq, Product } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { exportProductsCsv, parseProductCsv, PRODUCT_CSV_TEMPLATE } from '@/lib/product-csv';
import readXlsxFile from 'read-excel-file/browser';
import './index.css';
import { quoteCatalog, quoteCatalogItems, type QuoteCatalogCategory, type QuoteCatalogItem } from '@/data/quote-catalog';
import ManagedCatalogPage from '@/pages/managed-catalog-page';
import { getManagedPlants } from '@/data/managed-plants';
import { getStoreProducts, type StoreProduct } from '@/data/site-content';
import PlantTreatmentPage from '@/pages/plant-treatment-page';
import PublicQuoteRequestPage from '@/pages/public-quote-request-page';
import AdminQuoteRequestsPage from '@/pages/admin-quote-requests-page';
import AdminStoreOrdersPage from '@/pages/admin-store-orders-page';
import AdminProjectsPage from '@/pages/admin-projects-page';
import AdminStorePage from '@/pages/admin-store-page';
import OrderAlertControl, { activateOrderAlertsFromUserGesture } from '@/components/order-alert-control';
import { getQuoteRequests, saveQuoteRequests } from '@/data/quote-requests';
import LandscapePlan, { type LandscapeAnnotation, type LandscapeGlobalShape, type LandscapeQuoteItem } from '@/pages/landscape-plan';
import { ProjectsPage, StorePage } from '@/pages/public-showcase-pages';
import StoreCartPage from '@/pages/store-cart-page';
import StoreCheckoutPage from '@/pages/store-checkout-page';
import AboutUsPage from '@/pages/about-us-page';
import LandscapeEditorPage from '@/pages/landscape-editor-page';
import { exportQuotePdf } from '@/lib/quote-pdf';

const queryClient = new QueryClient();
const configuredClerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkPubKey = configuredClerkPubKey
  ? publishableKeyFromHost(window.location.hostname, configuredClerkPubKey)
  : undefined;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
function stripBase(path: string) { return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path; }

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#020618', colorForeground: '#020618', colorMutedForeground: 'rgba(2, 6, 24, .58)',
    colorBackground: '#FFFFFF', colorInput: '#FFFFFF', colorInputForeground: '#020618',
    colorDanger: '#020618', colorNeutral: '#020618', fontFamily: "'DM Sans', 'Noto Sans Arabic', sans-serif",
  },
  elements: {
    cardBox: 'w-[440px] max-w-full !bg-white border border-[#020618]/15 rounded-2xl shadow-none',
    card: '!bg-transparent shadow-none',
    footer: '!bg-transparent',
    headerTitle: 'text-[#020618] tracking-[-.04em]',
    headerSubtitle: 'text-[#020618]/60',
    socialButtonsBlockButtonText: 'text-[#020618]',
    formFieldLabel: 'text-[#020618]',
    formFieldInput: 'text-[#020618] border-[#020618]/20 focus:border-[#020618]',
    footerActionLink: 'text-[#020618] font-semibold',
    footerActionText: 'text-[#020618]/65',
    dividerText: 'text-[#020618]/55',
    formButtonPrimary: 'bg-[#020618] text-white hover:bg-[#020618]/90',
  },
};

type Lang = 'en' | 'ar';
const LanguageContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void }>({ lang: 'en', setLang: () => undefined });
function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('ayoub-language') as Lang) || 'en');
  useEffect(() => { localStorage.setItem('ayoub-language', lang); document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; }, [lang]);
  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}
function useLang() { return useContext(LanguageContext); }
function tr(lang: Lang, en: string, ar: string) { return lang === 'ar' ? ar : en; }
type SocialIcon = 'facebook' | 'instagram' | 'linkedin' | 'youtube' | 'website';
type SocialLink = { id: string; label: string; url: string; icon: SocialIcon };
type HeroSlide = { id: string; src: string; alt: string };
type SitePageFlags = { projects: boolean; quoteRequest: boolean; store: boolean };
type AdminSettings = { brandNameEn: string; brandNameAr: string; phone: string; primaryColor: string; logoUrl: string; heroTitleEn: string; heroTitleAr: string; heroDescriptionEn: string; heroDescriptionAr: string; socialLinks: SocialLink[]; heroSlides: HeroSlide[]; sitePages: SitePageFlags };
const defaultAdminSettings: AdminSettings = { brandNameEn: 'QADRI AI', brandNameAr: 'قادري AI', phone: '0777772211', primaryColor: '#020618', logoUrl: '/chatbot.png', heroTitleEn: 'A smarter\npartner for\nhealthier crops.', heroTitleAr: 'مهندس زراعي ذكي\nيساعدك على\nرعاية نباتاتك.', heroDescriptionEn: 'Photograph a plant, keep its image ready, and get crop-care guidance when AI analysis is connected.', heroDescriptionAr: 'صوّر نبتتك واحتفظ بصورتها جاهزة، واستعد لإرشادات العناية بالمحاصيل عند ربط التحليل الذكي.', socialLinks: [], heroSlides: [{ id: 'default-hero-slide', src: '/hero-slide-1.png', alt: 'QADRI AI visual' }], sitePages: { projects: true, quoteRequest: true, store: true } };
const AdminSettingsContext = createContext<{ settings: AdminSettings; update: (patch: Partial<AdminSettings>) => void }>({ settings: defaultAdminSettings, update: () => undefined });
function AdminSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AdminSettings>(() => { try { return { ...defaultAdminSettings, ...JSON.parse(localStorage.getItem('qadri-admin-settings') || '{}') }; } catch { return defaultAdminSettings; } });
  const update = (patch: Partial<AdminSettings>) => setSettings((current) => { const next = { ...current, ...patch }; localStorage.setItem('qadri-admin-settings', JSON.stringify(next)); return next; });
  return <AdminSettingsContext.Provider value={{ settings, update }}>{children}</AdminSettingsContext.Provider>;
}
function useAdminSettings() { return useContext(AdminSettingsContext); }
function SocialIconMark({ icon }: { icon: SocialIcon }) {
  const Icon = icon === 'facebook' ? Facebook : icon === 'instagram' ? Instagram : icon === 'linkedin' ? Linkedin : icon === 'youtube' ? Youtube : Globe2;
  return <Icon size={15} aria-hidden="true" />;
}
type WorkspaceCtx = { id: number | null; workspace: { id: number; name: string } | null; workspaces: { id: number; name: string; createdAt: string }[]; headers: { headers: { 'X-Workspace-Id': string } } | undefined; select: (id: number) => void };
const WorkspaceContext = createContext<WorkspaceCtx>({ id: null, workspace: null, workspaces: [], headers: undefined, select: () => undefined });
function useWorkspace() { return useContext(WorkspaceContext); }
function WorkspaceProvider({ children }: { children: ReactNode }) {
  const workspacesQuery = useListWorkspaces({ query: { queryKey: getListWorkspacesQueryKey() } });
  const createWorkspace = useCreateWorkspace();
  const [selected, setSelected] = useState<number | null>(() => {
    const id = Number(localStorage.getItem('ayoub-workspace'));
    return Number.isFinite(id) && id > 0 ? id : null;
  });
  const workspaces = workspacesQuery.data ?? [];
  const workspace = workspaces.find((item) => item.id === selected) ?? workspaces[0] ?? null;
  useEffect(() => {
    if (workspace && workspace.id !== selected) setSelected(workspace.id);
  }, [workspace, selected]);
  useEffect(() => { if (workspace) localStorage.setItem('ayoub-workspace', String(workspace.id)); }, [workspace]);
  const headers = workspace ? { headers: { 'X-Workspace-Id': String(workspace.id) } } : undefined;
  if (workspacesQuery.isLoading) return <LoadingScreen label="Loading your workspace" />;
  if (workspacesQuery.isError) return <ErrorState title="Workspace unavailable" detail="We couldn't load your workspace. Check your connection and try again." retry={() => void workspacesQuery.refetch()} />;
  if (!workspace) return <CreateWorkspaceScreen busy={createWorkspace.isPending} onCreate={(name) => createWorkspace.mutate({ data: { name } }, { onSuccess: async (newWorkspace) => { await queryClient.invalidateQueries({ queryKey: getListWorkspacesQueryKey() }); setSelected(newWorkspace.id); } })} />;
  return <WorkspaceContext.Provider value={{ id: workspace.id, workspace, workspaces, headers, select: setSelected }}>{children}</WorkspaceContext.Provider>;
}
function CreateWorkspaceScreen({ busy, onCreate }: { busy: boolean; onCreate: (name: string) => void }) {
  const [name, setName] = useState('');
  const { lang } = useLang();
  return <div className="min-h-[100dvh] grid place-items-center p-5"><div className="panel form-card w-full max-w-lg">
    <div className="eyebrow">AYOUB AI / FIRST SETUP</div><h1>{tr(lang, 'Create your workspace', 'أنشئ مساحة عملك')}</h1>
    <p className="page-desc mb-6">{tr(lang, 'A workspace keeps your business knowledge and agents together.', 'تجمع مساحة العمل معلومات نشاطك التجاري ووكلاءك في مكان واحد.')}</p>
    <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onCreate(name.trim()); }} className="field">
      <label htmlFor="workspace-name">{tr(lang, 'Business or workspace name', 'اسم النشاط التجاري أو مساحة العمل')}</label>
      <input id="workspace-name" data-testid="input-workspace-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} placeholder="e.g. Layali Home" />
      <button className="btn mt-3" disabled={busy || !name.trim()} data-testid="button-create-workspace">{busy ? 'Creating…' : 'Create workspace'} <ArrowRight size={15} /></button>
    </form>
  </div></div>;
}
function LoadingScreen({ label = 'Loading workspace' }: { label?: string }) {
  return <div className="min-h-[100dvh] grid place-items-center p-5"><div className="w-full max-w-md grid gap-3" aria-label={label}>
    <div className="skeleton h-8 w-1/2" /><div className="skeleton h-3 w-4/5" /><div className="skeleton-card mt-5"><div className="skeleton w-2/5" /><div className="skeleton h-20" /><div className="skeleton w-3/5" /></div>
  </div></div>;
}
function ErrorState({ title, detail, retry }: { title: string; detail: string; retry?: () => void }) {
  return <div className="error-state panel"><div className="empty-mark"><Wifi size={18} /></div><h3>{title}</h3><p>{detail}</p>{retry && <button className="btn secondary small" onClick={retry} data-testid="button-retry">Try again</button>}</div>;
}
function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-mark"><Sparkles /></div><h3>{title}</h3><p>{detail}</p>{action}</div>;
}
function LanguageButton() {
  const { lang, setLang } = useLang();
  return <button className="lang-toggle" data-testid="button-language" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} aria-label="Switch language"><Languages size={14} /> {lang === 'en' ? 'العربية' : 'English'}</button>;
}
function SiteBrand({ inverse = false }: { inverse?: boolean }) {
  const { lang } = useLang();
  const { settings } = useAdminSettings();
  return <Link href="/" className="brand" style={inverse ? { color: '#fff', padding: 0 } : undefined}><span className="brand-mark"><img src={settings.logoUrl || '/chatbot.png'} alt="" /></span><span className="brand-name">{tr(lang, settings.brandNameEn, settings.brandNameAr)}</span></Link>;
}
function HeroSlideshow() {
  const { lang } = useLang(); const { settings } = useAdminSettings(); const slides = settings.heroSlides?.length ? settings.heroSlides : [{ id: 'fallback', src: '/hero-slide-1.png', alt: 'QADRI AI visual' }]; const [active, setActive] = useState(0);
  useEffect(() => { if (slides.length < 2) return; const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 2200); return () => window.clearInterval(timer); }, [slides.length]);
  return <div className="hero-art hero-slideshow reveal"><div className="hero-slides">{slides.map((slide, index) => <img key={slide.id} className={`hero-slide ${index === active ? 'active' : ''}`} src={slide.src} alt={slide.alt || tr(lang, 'QADRI AI visual', 'صورة تعريفية')} />)}</div><div className="hero-slide-overlay"><span>{tr(lang, 'LIVE VISUAL SYSTEM', 'نظام بصري متحرك')}</span><div className="hero-slide-dots">{slides.map((slide, index) => <button key={slide.id} className={index === active ? 'active' : ''} onClick={() => setActive(index)} aria-label={`${tr(lang, 'Show image', 'عرض الصورة')} ${index + 1}`} />)}</div></div></div>;
}
type WeatherSnapshot = { temperature: number; apparent: number; humidity: number; wind: number; code: number; isDay: number; high: number; low: number; location: string };
const WEATHER_FALLBACK = { latitude: 32.2800, longitude: 35.9000, label: 'جرش' };
function jordanLocationLabel(latitude: number, longitude: number) {
  const places = [
    { label: 'جرش', latitude: 32.2800, longitude: 35.9000 },
    { label: 'عمّان', latitude: 31.9539, longitude: 35.9106 },
    { label: 'إربد', latitude: 32.5556, longitude: 35.8500 },
    { label: 'الزرقاء', latitude: 32.0728, longitude: 36.0880 },
    { label: 'السلط', latitude: 32.0392, longitude: 35.7272 },
    { label: 'عجلون', latitude: 32.3326, longitude: 35.7528 },
  ];
  const nearest = places.reduce((best, place) => {
    const distance = Math.hypot(latitude - place.latitude, longitude - place.longitude);
    return distance < best.distance ? { label: place.label, distance } : best;
  }, { label: 'موقعك الحالي', distance: Number.POSITIVE_INFINITY });
  return nearest.distance < 0.35 ? nearest.label : 'موقعك الحالي';
}
function weatherMeta(code: number, isDay: number) {
  if (code === 0) return { label: 'سماء صافية', icon: isDay ? Sun : CloudSun, tone: 'sunny', motion: 'weather-float' };
  if ([1, 2].includes(code)) return { label: 'غائم جزئيًا', icon: CloudSun, tone: 'cloudy', motion: 'weather-drift' };
  if (code === 3) return { label: 'غائم', icon: Cloud, tone: 'cloudy', motion: 'weather-drift' };
  if ([45, 48].includes(code)) return { label: 'ضباب', icon: Cloud, tone: 'misty', motion: 'weather-drift' };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: 'أمطار', icon: CloudRain, tone: 'rainy', motion: 'weather-rain' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'ثلوج', icon: CloudSnow, tone: 'snowy', motion: 'weather-snow' };
  if ([95, 96, 99].includes(code)) return { label: 'عواصف رعدية', icon: CloudLightning, tone: 'stormy', motion: 'weather-pulse' };
  return { label: 'رياح', icon: Wind, tone: 'windy', motion: 'weather-drift' };
}
function WeatherBar() {
  const { lang } = useLang();
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const loadWeather = (latitude = WEATHER_FALLBACK.latitude, longitude = WEATHER_FALLBACK.longitude, label = WEATHER_FALLBACK.label) => {
    setLoading(true);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`;
    fetch(url).then((response) => { if (!response.ok) throw new Error('weather'); return response.json(); }).then((data) => setWeather({ temperature: data.current.temperature_2m, apparent: data.current.apparent_temperature, humidity: data.current.relative_humidity_2m, wind: data.current.wind_speed_10m, code: data.current.weather_code, isDay: data.current.is_day, high: data.daily.temperature_2m_max[0], low: data.daily.temperature_2m_min[0], location: label })).catch(() => setWeather(null)).finally(() => setLoading(false));
  };
  useEffect(() => {
    const loadFallback = () => loadWeather();
    if (!navigator.geolocation) { loadFallback(); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => loadWeather(position.coords.latitude, position.coords.longitude, jordanLocationLabel(position.coords.latitude, position.coords.longitude)),
      loadFallback,
      { enableHighAccuracy: true, maximumAge: 15 * 60 * 1000, timeout: 7000 },
    );
  }, []);
  if (loading) return <div className="weather-bar weather-loading" aria-live="polite"><span className="weather-loader" />{tr(lang, 'Reading today’s sky…', 'نقرأ حالة السماء اليوم…')}</div>;
  if (!weather) return <div className="weather-bar weather-error"><Cloud size={20} />{tr(lang, 'Weather is temporarily unavailable', 'الطقس غير متاح مؤقتًا')}<button onClick={() => loadWeather()}>{tr(lang, 'Retry', 'إعادة المحاولة')}</button></div>;
  const meta = weatherMeta(weather.code, weather.isDay); const Icon = meta.icon;
  return <section className={`weather-bar weather-${meta.tone}`} aria-label="حالة الطقس اليوم"><div className={`weather-main-icon ${meta.motion}`}><Icon size={31} strokeWidth={1.7} /></div><div className="weather-copy"><div className="weather-location"><span>{weather.location}</span><small>{tr(lang, 'TODAY / LIVE WEATHER', 'الطقس اليوم / مباشر')}</small></div><strong>{meta.label}</strong></div><div className="weather-temperature"><b>{Math.round(weather.temperature)}°</b><span>{Math.round(weather.low)}° / {Math.round(weather.high)}°</span></div><div className="weather-facts"><span><Droplets size={14} />{weather.humidity}%</span><span><Wind size={14} />{Math.round(weather.wind)} كم/س</span><span>المحسوس {Math.round(weather.apparent)}°</span></div></section>;
}
function WorkdayTimer() {
  const { lang } = useLang();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  const timeParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Amman', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const values = Object.fromEntries(timeParts.map((part) => [part.type, Number(part.value)]));
  const secondsOfDay = values.hour * 3600 + values.minute * 60 + values.second;
  const start = 9 * 3600;
  const end = 17 * 3600;
  const isActive = secondsOfDay >= start && secondsOfDay < end;
  const remaining = secondsOfDay < start ? end - start : isActive ? end - secondsOfDay : 0;
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  const countdown = [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
  const status = secondsOfDay < start ? tr(lang, 'Starts at 9:00 AM', 'يبدأ الساعة 9 صباحًا') : isActive ? tr(lang, 'Until 5:00 PM', 'حتى الساعة 5 مساءً') : tr(lang, 'Finished for today', 'انتهى دوام اليوم');
  return <section className={`workday-timer ${isActive ? 'is-active' : ''}`} aria-label={tr(lang, 'Daily workday countdown', 'العد التنازلي اليومي للدوام')}>
    <div className="workday-timer-heading"><Clock3 size={14} /><span>{tr(lang, 'DAILY / 9 AM–5 PM', 'يومي / 9 ص–5 م')}</span></div>
    <strong className="workday-timer-count" dir="ltr" aria-live="off">{countdown}</strong>
    <small>{status}</small>
  </section>;
}
function FounderBiographyTicker() {
  const biography = 'يُعتبر المهندس ثامر القادري أحد أبرز رواد القطاع الزراعي في الأردن، حيث نجح من خلال إدارته لمؤسسة القادري في تحويل العمل الزراعي التقليدي إلى منظومة متكاملة. يشتهر القادري بنشاطه الواسع في إدخال وتوطين أصناف فريدة ونادرة من الأشجار المثمرة والحمضيات في البيئة الأردنية، إلى جانب تميزه في تقديم الاستشارات الفنية لتأسيس المزارع الكبرى وتنسيق الحدائق. ولم يقتصر دوره على الإنتاج فقط، بل برز كوجه توعوي ملهم على منصات التواصل الاجتماعي، حيث يتابعه آلاف المزارعين والهواة للاستفادة من نصائحه وإرشاداته العملية المبسطة التي تسهم بشكل ملموس في رفع الوعي الزراعي وتطوير هذا القطاع الحيوي في المملكة.';
  const words = biography.split(/\s+/);
  const [visibleWords, setVisibleWords] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisibleWords(words.length);
      return;
    }
    const delay = deleting
      ? (visibleWords === 0 ? 650 : 90)
      : (visibleWords === words.length ? 2200 : 300);
    const timer = window.setTimeout(() => {
      if (deleting) {
        if (visibleWords === 0) setDeleting(false);
        else setVisibleWords((count) => count - 1);
      } else if (visibleWords === words.length) {
        setDeleting(true);
      } else {
        setVisibleWords((count) => count + 1);
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [deleting, visibleWords, words.length]);

  return <section className="founder-bio-ticker" dir="rtl" lang="ar" aria-label="نبذة عن المهندس ثامر القادري">
    <p aria-hidden="true">{words.slice(0, visibleWords).join(' ')}<span className="founder-bio-cursor" /></p>
    <span className="sr-only">{biography}</span>
  </section>;
}

function HomePage() {
  const { lang } = useLang();
  const { settings } = useAdminSettings();
  const oldTitle = lang === 'ar' ? 'خدمة عملاء\nتعرف عملك.' : 'Customer care\nthat knows\nyour business.';
  const oldDescription = lang === 'ar' ? 'أنشئ وكيلاً ذكياً ثنائي اللغة يجيب من منتجاتك وسياساتك وإجاباتك المعتمدة.' : 'Build a bilingual AI agent that answers from your real products, policies, and approved answers.';
  const heroTitle = (lang === 'ar' ? settings.heroTitleAr : settings.heroTitleEn) === oldTitle ? (lang === 'ar' ? defaultAdminSettings.heroTitleAr : defaultAdminSettings.heroTitleEn) : (lang === 'ar' ? settings.heroTitleAr : settings.heroTitleEn);
  const heroDescription = (lang === 'ar' ? settings.heroDescriptionAr : settings.heroDescriptionEn) === oldDescription ? (lang === 'ar' ? defaultAdminSettings.heroDescriptionAr : defaultAdminSettings.heroDescriptionEn) : (lang === 'ar' ? settings.heroDescriptionAr : settings.heroDescriptionEn);
  return <main className="public-home">
    <header className="public-header"><div className="public-topline"><a className="nav-phone" href={`tel:${settings.phone}`} aria-label={tr(lang, `Call ${settings.phone}`, `اتصل على ${settings.phone}`)}><span className="nav-phone-label">{tr(lang, 'Call us', 'اتصل بنا')}</span><span dir="ltr">{settings.phone}</span></a><div className="weather-above-logo"><WeatherBar /><WorkdayTimer /></div></div><nav className="public-nav" style={{ background: settings.primaryColor }} aria-label={tr(lang, 'Main navigation', 'التنقل الرئيسي')}><SiteBrand inverse /><div className="public-nav-links"><a className="public-nav-link" href="#about-us">{tr(lang, 'Crop care', 'الرعاية الزراعية')}</a>{(settings.sitePages?.projects ?? true) && <Link className="public-nav-link" href="/projects">{tr(lang, 'Projects & Work', 'مشاريعنا وأعمالنا')}</Link>}<Link className="public-nav-link" href="/about">{tr(lang, 'About us', 'من نحن')}</Link>{(settings.sitePages?.quoteRequest ?? true) && <Link className="public-nav-link public-nav-quote-link" href="/quotes">{tr(lang, 'Request a Quote', 'طلب عرض سعر')}</Link>}{(settings.sitePages?.store ?? true) && <Link className="public-nav-link" href="/store">{tr(lang, 'Store', 'المتجر')}</Link>}<Link className="public-nav-link" href="/landscape-editor">{tr(lang, 'Landscape', 'لاندسكيب')}</Link><Link className="public-nav-link plant-treatment-nav-link" href="/plant-treatment"><Camera size={14} />{tr(lang, 'Plant treatment', 'معالجة النباتات')}</Link></div><div className="public-nav-actions"><LanguageButton /><Link href="/sign-in" className="btn secondary small">{tr(lang, 'Sign in', 'تسجيل الدخول')}</Link></div></nav></header>
    <section className="public-hero">
      <div className="hero-copy reveal"><div className="eyebrow">{tr(lang, 'SMART AGRONOMY, GROUNDED IN YOUR PLANTS', 'مساعدة زراعية ذكية تبدأ من نبتتك')}</div>
        <h1>{heroTitle.split('\n').map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</h1>
        <p>{heroDescription}</p>
        <div className="hero-actions"><Link href="/chat" className="btn">{tr(lang, 'Talk to the AI', 'تحدث مع الـAI')} <ArrowRight size={15} /></Link><a href="#how-it-works" className="btn secondary">{tr(lang, 'How to take a clear photo', 'كيف تلتقط صورة واضحة')} <ArrowDownLeft size={14} /></a></div>
        <div className="hero-note">{tr(lang, 'A CLEAR PHOTO IS THE FIRST STEP', 'الصورة الواضحة هي الخطوة الأولى')}</div>
      </div>
      <HeroSlideshow />
    </section>
    <FounderBiographyTicker />
    <section className="public-section" id="about-us"><div className="public-section-inner" id="how-it-works">
      <div className="section-heading"><div><div className="eyebrow">{tr(lang, 'CARE STARTS WITH OBSERVATION', 'العناية تبدأ بالملاحظة')}</div><h2>{tr(lang, 'Start with what you can see.', 'ابدأ بما تراه في نبتتك.')}</h2></div><p>{tr(lang, 'A plant photo prepares the ground for practical crop-care guidance. Automated diagnosis will be available after the AI service is connected.', 'صورة النبتة تمهّد لإرشادات عملية للعناية بالمحاصيل. سيتاح التشخيص الآلي بعد ربط خدمة الذكاء الاصطناعي.')}</p></div>
      <div className="steps-row"><article className="step"><div className="step-num">{tr(lang, '01 / PHOTO', '01 / الصورة')}</div><h3>{tr(lang, 'Photograph the plant', 'صوّر النبتة')}</h3><p>{tr(lang, 'Capture the whole plant or a close-up of the affected leaf in good light.', 'التقط صورة كاملة للنبتة أو قرّب الكاميرا من الورقة المتأثرة مع إضاءة جيدة.')}</p></article>
        <article className="step"><div className="step-num">{tr(lang, '02 / PLANT CARE', '02 / رعاية النبات')}</div><h3>{tr(lang, 'Keep useful details', 'احتفظ بالتفاصيل المهمة')}</h3><p>{tr(lang, 'A clear image helps you share the plant and its visible symptoms with an agronomist.', 'الصورة الواضحة تساعدك على مشاركة شكل النبتة وأعراضها الظاهرة مع المهندس الزراعي.')}</p></article>
        <article className="step"><div className="step-num">03 / SMART CARE</div><h3>{tr(lang, 'Get AI guidance soon', 'إرشادات ذكية قريبًا')}</h3><p>{tr(lang, 'Plant-image analysis and care suggestions will be activated when the AI API is connected.', 'سيتم تفعيل تحليل صور النباتات واقتراحات العناية عند ربط واجهة الذكاء الاصطناعي.')}</p></article></div>
    </div></section>
    <section className="quote-band"><div className="quote-content"><div className="quote-glyph">“</div><blockquote>{tr(lang, 'A thoughtful plant-care decision begins with a clear look at the symptoms.', 'قرار العناية بالنبتة يبدأ بملاحظة واضحة للأعراض.')}</blockquote></div></section>
    <section className="trust-row"><div className="trust-stat"><strong>01</strong><span>{tr(lang, 'Photograph the visible symptoms', 'صوّر الأعراض الظاهرة')}</span></div><div className="trust-stat"><strong>02</strong><span>{tr(lang, 'Keep the image on your device', 'الصورة تبقى على جهازك')}</span></div><div className="trust-stat"><strong>100%</strong><span>{tr(lang, 'AI analysis after API connection', 'التحليل الذكي بعد ربط الخدمة')}</span></div><div className="eyebrow">{tr(lang, 'OBSERVE FIRST. GET GUIDANCE NEXT.', 'راقب الأعراض أولًا. والإرشاد الذكي لاحقًا.')}</div></section>
    <section className="cta-section"><div className="eyebrow" style={{ color: '#ffffff75' }}>{tr(lang, 'START WITH A PHOTO', 'ابدأ بصورة واضحة')}</div><h2>{tr(lang, 'Your plant-care workspace starts here.', 'مساحتك لرعاية النباتات تبدأ من هنا.')}</h2><p>{tr(lang, 'Open the camera or choose a plant photo. AI diagnosis will follow when its service is connected.', 'افتح الكاميرا أو اختر صورة للنبتة. يتاح التشخيص الذكي بعد ربط خدمته.')}</p><Link className="btn" href="/plant-treatment">{tr(lang, 'Photograph a plant', 'صوّر نبتتك')} <ArrowRight size={15} /></Link></section>
    <footer className="public-footer" style={{ background: settings.primaryColor }}><div className="footer-brand"><SiteBrand inverse /><p>© {new Date().getFullYear()} {tr(lang, settings.brandNameEn, settings.brandNameAr)}. {tr(lang, 'Smart support for plant care.', 'مساندة ذكية لرعاية النباتات.')}</p></div><div className="footer-links"><Link href="/plant-treatment">{tr(lang, 'Plant treatment', 'معالجة النباتات')}</Link>{(settings.sitePages?.projects ?? true) && <Link href="/projects">{tr(lang, 'Projects & Work', 'مشاريعنا وأعمالنا')}</Link>}{(settings.sitePages?.quoteRequest ?? true) && <Link href="/quotes">{tr(lang, 'Request a Quote', 'طلب عرض سعر')}</Link>}{(settings.sitePages?.store ?? true) && <Link href="/store">{tr(lang, 'Store', 'المتجر')}</Link>}<Link href="/sign-in">{tr(lang, 'Sign in', 'تسجيل الدخول')}</Link>{(settings.socialLinks ?? []).map((social) => <a key={social.id} className="footer-social-link" href={social.url} target="_blank" rel="noreferrer" aria-label={social.label} title={social.label}><SocialIconMark icon={social.icon} /></a>)}</div></footer>
  </main>;
}
function PublicPageNav() {
  const { lang } = useLang(); const { settings } = useAdminSettings();
  return <header className="public-header"><nav className="public-nav" style={{ background: settings.primaryColor }} aria-label={tr(lang, 'Main navigation', 'التنقل الرئيسي')}><SiteBrand inverse /><div className="public-nav-links"><Link className="public-nav-link" href="/">{tr(lang, 'Home', 'الرئيسية')}</Link>{(settings.sitePages?.projects ?? true) && <Link className="public-nav-link" href="/projects">{tr(lang, 'Projects & Work', 'مشاريعنا وأعمالنا')}</Link>}{(settings.sitePages?.quoteRequest ?? true) && <Link className="public-nav-link public-nav-quote-link" href="/quotes">{tr(lang, 'Request a Quote', 'طلب عرض سعر')}</Link>}{(settings.sitePages?.store ?? true) && <Link className="public-nav-link" href="/store">{tr(lang, 'Store', 'المتجر')}</Link>}<Link className="public-nav-link" href="/landscape-editor">{tr(lang, 'Landscape', 'لاندسكيب')}</Link><Link className="public-nav-link plant-treatment-nav-link" href="/plant-treatment"><Camera size={14} />{tr(lang, 'Plant treatment', 'معالجة النباتات')}</Link></div><div className="public-nav-actions"><LanguageButton /><Link href="/sign-in" className="btn secondary small">{tr(lang, 'Sign in', 'تسجيل الدخول')}</Link></div></nav></header>;
}
function PublicPlantTreatmentRoute() { const { lang } = useLang(); return <><PublicPageNav /><PlantTreatmentPage lang={lang} /></>; }
function PublicLandscapeEditorRoute() { return <><PublicPageNav /><LandscapeEditorPage /></>; }
function PublicProjectsRoute() { return <><PublicPageNav /><ProjectsPage /></>; }
function PublicStoreRoute() { return <><PublicPageNav /><StorePage /></>; }
function Protected({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingScreen label="Checking your session" />;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <WorkspaceProvider><AppShell>{children}</AppShell></WorkspaceProvider>;
}
function AppShell({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  const { workspace, workspaces, select } = useWorkspace();
  const { user } = useUser();
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = [
    { label: tr(lang, 'Overview', 'نظرة عامة'), href: '/dashboard', icon: LayoutDashboard },
    { label: tr(lang, 'Agents', 'الوكلاء'), href: '/agents', icon: Bot },
    { label: tr(lang, 'Products', 'المنتجات'), href: '/knowledge/products', icon: Package },
    { label: tr(lang, 'FAQs', 'الأسئلة الشائعة'), href: '/knowledge/faqs', icon: CircleHelp },
    { label: tr(lang, 'Business profile', 'ملف النشاط'), href: '/knowledge/business', icon: Store },
    { label: tr(lang, 'Channels', 'القنوات'), href: '/channels', icon: Globe2 },
  ];
  const current = [...nav, { label: tr(lang, 'Settings', 'الإعدادات'), href: '/settings', icon: Settings2 }].find((item) => location.startsWith(item.href))?.label ?? 'Workspace';
  const initials = user?.firstName?.slice(0, 1) || 'A';
  return <div className="app-shell">
    <aside className="sidebar"><SiteBrand inverse />
      <div className="nav-caption">{tr(lang, 'WORKSPACE', 'مساحة العمل')}</div>{nav.map((item) => <Link key={item.href} href={item.href} className={`nav-link ${location.startsWith(item.href) ? 'active' : ''}`} data-testid={`link-nav-${item.href.replaceAll('/', '-').replace(/^-/, '')}`}><item.icon />{item.label}</Link>)}
      <div className="nav-caption" style={{ marginTop: 14 }}>{tr(lang, 'PREFERENCES', 'التفضيلات')}</div><Link href="/settings" className={`nav-link ${location.startsWith('/settings') ? 'active' : ''}`} data-testid="link-nav-settings"><Settings2 />{tr(lang, 'Settings', 'الإعدادات')}</Link>
      <div className="sidebar-bottom"><div className="workspace-chip"><div className="workspace-avatar">{workspace?.name?.slice(0, 1).toUpperCase() || initials}</div><div className="workspace-label"><strong>{workspace?.name}</strong><span>{workspaces.length > 1 ? <select aria-label="Select workspace" value={workspace?.id} onChange={(e) => select(Number(e.target.value))} style={{ background: 'transparent', color: '#ffffffa6', border: 0, fontSize: 10 }}>{workspaces.map((item) => <option style={{ color: '#020618' }} value={item.id} key={item.id}>{item.name}</option>)}</select> : tr(lang, 'Business workspace', 'مساحة عمل تجارية')}</span></div></div>
        <div className="nav-link" style={{ cursor: 'default' }}><div className="workspace-avatar" style={{ width: 24, height: 24 }}>{initials}</div><span>{user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Account'}</span></div>
      </div>
    </aside>
    {menuOpen && <div className="dialog-backdrop" onClick={() => setMenuOpen(false)}><aside className="sidebar" onClick={(e) => e.stopPropagation()}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}><SiteBrand inverse /><button className="icon-button" onClick={() => setMenuOpen(false)}><X size={16} /></button></div>{nav.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={`nav-link ${location.startsWith(item.href) ? 'active' : ''}`}><item.icon />{item.label}</Link>)}<Link href="/settings" className="nav-link"><Settings2 />{tr(lang, 'Settings', 'الإعدادات')}</Link></aside></div>}
    <div className="main-area"><header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={17} /></button><div className="crumb">{workspace?.name} <ChevronRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>{current}</strong></div></div><div className="topbar-right"><LanguageButton /><UserMenu /></div></header>{children}</div>
  </div>;
}
function UserMenu() {
  const { signOut } = useAuth();
  return <button className="icon-button" title="Sign out" aria-label="Sign out" data-testid="button-sign-out" onClick={() => void signOut({ redirectUrl: '/' })}><LogOut size={15} /></button>;
}
function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p className="page-desc">{description}</p>}</div>{action}</div>;
}
function DashboardPage() {
  const { headers, workspace } = useWorkspace();
  const { lang } = useLang();
  const dashboard = useGetDashboard({ ...headers, query: { queryKey: getGetDashboardQueryKey(), enabled: !!headers } });
  const agents = useListAgents({ ...headers, query: { queryKey: getListAgentsQueryKey(), enabled: !!headers } });
  if (dashboard.isLoading || agents.isLoading) return <main className="page"><div className="skeleton h-10 w-1/3 mb-6" /><div className="metrics-grid">{[1, 2, 3, 4].map((n) => <div className="skeleton-card" key={n}><div className="skeleton w-1/2" /><div className="skeleton h-8 w-1/3" /></div>)}</div></main>;
  if (dashboard.isError) return <main className="page"><PageTitle eyebrow="WORKSPACE" title={tr(lang, 'Your workspace', 'مساحة عملك')} /><ErrorState title="Dashboard unavailable" detail="We couldn't retrieve workspace metrics." retry={() => void dashboard.refetch()} /></main>;
  const data = dashboard.data!;
  const metrics = [
    { label: tr(lang, 'AI agents', 'وكلاء الذكاء الاصطناعي'), value: data.agents, note: `${data.activeAgents} ${tr(lang, 'active', 'نشط')}`, icon: Bot },
    { label: tr(lang, 'Saved products', 'المنتجات المحفوظة'), value: data.products, note: tr(lang, 'In your knowledge base', 'في قاعدة المعرفة'), icon: Package },
    { label: tr(lang, 'Approved answers', 'الإجابات المعتمدة'), value: data.faqs, note: tr(lang, 'Ready for customer questions', 'جاهزة لأسئلة العملاء'), icon: CircleHelp },
    { label: tr(lang, 'Test conversations', 'محادثات الاختبار'), value: data.testSessions, note: `${data.aiMessages} ${tr(lang, 'agent replies', 'إجابة من الوكيل')}`, icon: MessageCircle },
  ];
  return <main className="page"><PageTitle eyebrow={`${workspace?.name} / OVERVIEW`} title={tr(lang, 'A clearer view of service.', 'نظرة أوضح على خدمة العملاء.')} description={tr(lang, 'Your business knowledge, your agents, and the conversations in between.', 'معرفة نشاطك ووكلاؤك والمحادثات التي تربط بينهم.')} action={<Link href="/agents/new" className="btn" data-testid="link-create-agent"><Plus size={15} />{tr(lang, 'Create an agent', 'أنشئ وكيلاً')}</Link>} />
    <div className="metrics-grid">{metrics.map(({ label, value, note, icon: Icon }) => <section className="panel metric reveal" key={label} data-testid={`metric-${label.replaceAll(' ', '-')}`}><div className="metric-label">{label}<Icon /></div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></section>)}</div>
    <div className="dashboard-grid"><section className="panel"><div className="panel-head"><div><h2 className="panel-title">{tr(lang, 'Recent activity', 'النشاط الأخير')}</h2><div className="panel-kicker">{tr(lang, 'A live record of workspace changes', 'سجل مباشر لتغييرات مساحة العمل')}</div></div><Activity size={16} /></div>
      {data.recentActivity.length ? <div className="activity-list">{data.recentActivity.map((item) => <article key={item.id} className="activity-row" data-testid={`activity-${item.id}`}><div className="activity-dot" /><div><strong>{item.title}</strong><p>{item.detail}</p></div><time className="activity-time">{new Date(item.createdAt).toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { month: 'short', day: 'numeric' })}</time></article>)}</div> : <EmptyState title={tr(lang, 'A fresh start', 'بداية جديدة')} detail={tr(lang, 'Your latest changes and conversations will appear here.', 'ستظهر هنا آخر التغييرات والمحادثات.')} />}</section>
      <section className="panel"><div className="panel-head"><div><h2 className="panel-title">{tr(lang, 'Build your foundation', 'ابدأ ببناء أساسك')}</h2><div className="panel-kicker">{tr(lang, 'A few useful next steps', 'خطوات تالية مفيدة')}</div></div><ArrowUpRight size={16} /></div>
        <div className="quick-list"><QuickLink href="/knowledge/products" icon={<Package />} title={tr(lang, 'Add your products', 'أضف منتجاتك')} detail={tr(lang, 'Save names, prices, and stock', 'احفظ الأسماء والأسعار والمخزون')} /><QuickLink href="/knowledge/faqs" icon={<CircleHelp />} title={tr(lang, 'Approve common answers', 'اعتمد الإجابات الشائعة')} detail={tr(lang, 'Keep answers consistent', 'وحّد إجابات فريقك')} /><QuickLink href="/knowledge/business" icon={<Building2 />} title={tr(lang, 'Set business policies', 'أضف سياسات نشاطك')} detail={tr(lang, 'Hours, delivery, and more', 'ساعات العمل والتوصيل وغيرها')} /></div></section></div>
    <div className="section-label">{tr(lang, 'YOUR AGENTS', 'وكلاؤك')}</div>{agents.isError ? <ErrorState title="Agents unavailable" detail="Agent list could not be loaded." retry={() => void agents.refetch()} /> : agents.data?.length ? <div className="agent-grid">{agents.data.slice(0, 3).map((agent) => <AgentCard agent={agent} key={agent.id} />)}</div> : <section className="panel"><EmptyState title={tr(lang, 'No agents yet', 'لا يوجد وكلاء بعد')} detail={tr(lang, 'Create an agent, add your knowledge, and test its answers.', 'أنشئ وكيلاً، وأضف معرفتك، واختبر إجاباته.')} action={<Link className="btn small" href="/agents/new"><Plus size={14} />{tr(lang, 'Create an agent', 'أنشئ وكيلاً')}</Link>} /></section>}
  </main>;
}
function QuickLink({ href, icon, title, detail }: { href: string; icon: ReactNode; title: string; detail: string }) { return <Link className="quick-link" href={href}><span className="quick-icon">{icon}</span><span className="quick-copy"><strong>{title}</strong><span>{detail}</span></span><ChevronRight /></Link>; }
function statusLabel(status: string) { return status.replaceAll('_', ' '); }
function downloadCsv(filename: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
function AgentCard({ agent }: { agent: Agent }) {
  return <article className="panel agent-card" data-testid={`card-agent-${agent.id}`}><div className="agent-card-top"><div className="agent-symbol"><Bot /></div><span className={`pill ${agent.status === 'active' ? 'active' : 'muted'}`}>{agent.status}</span></div><h3>{agent.name}</h3><p>{agent.description || 'A customer-service agent grounded in your business knowledge.'}</p><div className="agent-card-foot"><span className="cell-secondary">{agent.language} · {agent.tone}</span><Link href={`/agents/${agent.id}`} className="icon-button" aria-label={`Configure ${agent.name}`}><ArrowUpRight size={14} /></Link></div></article>;
}
function AgentsPage() {
  const { headers } = useWorkspace();
  const [search, setSearch] = useState('');
  const query = useListAgents({ ...headers, query: { queryKey: getListAgentsQueryKey(), enabled: !!headers } });
  const agents = (query.data ?? []).filter((item) => `${item.name} ${item.description ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  return <main className="page"><PageTitle eyebrow="AGENT STUDIO" title="Agents" description="Configure practical customer-service assistants for your business." action={<Link href="/agents/new" className="btn"><Plus size={15} />New agent</Link>} />
    <div className="toolbar"><div className="searchbox"><Search /><input aria-label="Search agents" data-testid="input-search-agents" placeholder="Search agents…" value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
    {query.isLoading ? <div className="agent-grid">{[1, 2, 3].map((x) => <div className="skeleton-card" key={x}><div className="skeleton w-1/3" /><div className="skeleton h-8 w-2/3" /><div className="skeleton w-4/5" /></div>)}</div> : query.isError ? <ErrorState title="Agents didn't load" detail="Your agents could not be retrieved." retry={() => void query.refetch()} /> : agents.length ? <div className="agent-grid">{agents.map((agent) => <AgentCard key={agent.id} agent={agent} />)}</div> : <section className="panel"><EmptyState title={search ? 'No matching agents' : 'Your first agent starts here'} detail={search ? 'Try another name or clear your search.' : 'Create an assistant with a clear voice, helpful boundaries, and your saved business knowledge.'} action={!search && <Link className="btn small" href="/agents/new"><Plus size={14} />Create an agent</Link>} /></section>}
  </main>;
}
const emptyAgent = { name: '', description: '', language: 'Arabic and English', tone: 'Helpful and concise', greeting: 'Hello. How can I help you today?', fallback: 'I do not have enough information to answer that confidently. Let me connect you with our team.', instructions: '' };
function AgentBuilderPage() {
  const [, createParams] = useRoute('/agents/new');
  const [, setupParams] = useRoute<{ agentId: string }>('/agents/:agentId/setup');
  const id = Number(setupParams?.agentId);
  const isResume = !!setupParams?.agentId;
  const { lang } = useLang();
  const { headers } = useWorkspace();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const agentQuery = useGetAgent(id, { ...headers, query: { queryKey: getGetAgentQueryKey(id), enabled: isResume && Number.isFinite(id) && !!headers } });
  const [step, setStep] = useState(isResume ? 2 : 1);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [form, setForm] = useState(emptyAgent);
  const [productForm, setProductForm] = useState({ name: '', price: '', currency: 'JOD', availability: 'in_stock' as 'in_stock' | 'out_of_stock' | 'unknown' });
  const [phone, setPhone] = useState('');
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<{ question: string; answer: string; sources: string[]; handoff: boolean }[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [imported, setImported] = useState(0);
  const [fileBusy, setFileBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const createAgent = useCreateAgent({ request: headers });
  const createProduct = useCreateProduct({ request: headers });
  const sendTest = useSendAgentTestMessage({ request: headers });
  const activate = useSetAgentActivation({ request: headers });
  const profileQuery = useGetBusinessProfile({ ...headers, query: { queryKey: getGetBusinessProfileQueryKey(), enabled: step === 4 && !!headers } });
  const saveProfile = useSaveBusinessProfile({ request: headers });
  const productQuery = useListProducts({}, { ...headers, query: { queryKey: getListProductsQueryKey(), enabled: step === 2 && !!headers } });
  const products = productQuery.data ?? [];
  useEffect(() => {
    if (isResume && agentQuery.data) setAgent(agentQuery.data);
  }, [isResume, agentQuery.data]);
  const copy = (en: string, ar: string) => tr(lang, en, ar);
  const setAgentField = (key: keyof typeof emptyAgent, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const saveStepOne = (event: FormEvent) => {
    event.preventDefault();
    createAgent.mutate({ data: { ...form, name: form.name.trim() } }, {
      onSuccess: async (created) => {
        setAgent(created);
        await Promise.all([
          qc.invalidateQueries({ queryKey: getListAgentsQueryKey() }),
          qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
          qc.invalidateQueries({ queryKey: getGetAgentQueryKey(created.id) }),
        ]);
        setStep(2);
        setLocation(`/agents/${created.id}/setup`);
      },
    });
  };
  const addProduct = async (event: FormEvent) => {
    event.preventDefault();
    if (!productForm.name.trim()) return;
    const [nameArabic, nameEnglish] = /[\u0600-\u06ff]/.test(productForm.name)
      ? [productForm.name.trim(), undefined] as const
      : [undefined, productForm.name.trim()] as const;
    await createProduct.mutateAsync({ data: {
      nameArabic, nameEnglish, price: productForm.price || undefined,
      currency: productForm.currency.toUpperCase(), availability: productForm.availability,
    } });
    setProductForm({ name: '', price: '', currency: productForm.currency, availability: 'in_stock' });
    await Promise.all([
      qc.invalidateQueries({ queryKey: getListProductsQueryKey() }),
      qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
    ]);
  };
  const readImportFile = async (file: File) => {
    setFileBusy(true);
    setImportErrors([]);
    setImported(0);
    try {
      let csvText = '';
      if (file.name.toLowerCase().endsWith('.csv')) {
        csvText = await file.text();
      } else {
        if (file.name.toLowerCase().endsWith('.xls')) {
          throw new Error(copy('Legacy .xls workbooks are not supported by the browser XLSX reader. Save this workbook as .xlsx or .csv, then import it again.', 'قارئ Excel في المتصفح لا يدعم ملفات .xls القديمة. احفظ الملف بصيغة .xlsx أو .csv ثم أعد استيراده.'));
        }
        const workbook = await readXlsxFile(file);
        const sheet = workbook[0];
        if (!sheet) throw new Error(copy('The workbook has no readable sheet.', 'لا يحتوي ملف Excel على ورقة قابلة للقراءة.'));
        csvText = sheet.data.map((row) => row.map((cell) => {
          const value = cell instanceof Date ? cell.toISOString() : cell == null ? '' : String(cell);
          return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        }).join(',')).join('\r\n');
      }
      const parsed = parseProductCsv(csvText);
      const errors = [...parsed.errors];
      if (!parsed.products.length) {
        setImportErrors(errors.length ? errors : [copy('No valid product rows were found.', 'لم يتم العثور على صفوف منتجات صالحة.')]);
        return;
      }
      const knownNames = new Set(products.flatMap((item) => [item.nameArabic, item.nameEnglish].filter(Boolean).map((name) => name!.trim().toLocaleLowerCase())));
      const knownSkus = new Set(products.map((item) => item.sku?.trim().toLocaleLowerCase()).filter(Boolean));
      let count = 0;
      for (const row of parsed.products) {
        const inputNames = [row.product.nameArabic, row.product.nameEnglish].filter(Boolean).map((name) => name!.trim().toLocaleLowerCase());
        const sku = row.product.sku?.trim().toLocaleLowerCase();
        if (inputNames.some((name) => knownNames.has(name)) || (!!sku && knownSkus.has(sku))) {
          errors.push(copy(`Row ${row.rowNumber}: skipped because this product name or SKU is already saved.`, `الصف ${row.rowNumber}: تم تخطيه لأن اسم المنتج أو رمزه محفوظ مسبقاً.`));
          continue;
        }
        try {
          await createProduct.mutateAsync({ data: row.product });
          count += 1;
          inputNames.forEach((name) => knownNames.add(name));
          if (sku) knownSkus.add(sku);
        } catch {
          errors.push(copy(`Row ${row.rowNumber}: could not be saved. No retry was attempted.`, `الصف ${row.rowNumber}: تعذر حفظه. لم تتم إعادة المحاولة.`));
        }
      }
      setImported(count);
      setImportErrors(errors);
      if (count) await Promise.all([
        qc.invalidateQueries({ queryKey: getListProductsQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
      ]);
    } catch (error) {
      setImportErrors([error instanceof Error ? error.message : copy('The workbook could not be read.', 'تعذرت قراءة ملف Excel.')]);
    } finally {
      setFileBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const askAgent = (event: FormEvent) => {
    event.preventDefault();
    const content = question.trim();
    if (!agent || !content) return;
    sendTest.mutate({ agentId: agent.id, data: { content, conversationId } }, {
      onSuccess: (result) => {
        setTurns((current) => [...current, { question: content, answer: result.assistantMessage, sources: result.sources, handoff: result.handoff }]);
        setConversationId(result.conversationId);
        setQuestion('');
      },
    });
  };
  const finishActivation = async (event: FormEvent) => {
    event.preventDefault();
    if (!agent || !profileQuery.data || !phone.trim()) return;
    const currentProfile = profileQuery.data;
    const line = `WhatsApp Business: ${phone.trim()}`;
    const existing = currentProfile.contactInfo.split(/\r?\n/);
    const labelPattern = /^\s*(?:WhatsApp Business|واتساب للأعمال)\s*:/i;
    const matchingIndex = existing.findIndex((part) => labelPattern.test(part));
    const contactInfo = matchingIndex >= 0
      ? existing.map((part, index) => index === matchingIndex ? line : part).join('\n')
      : [...existing.filter((part) => part.trim()), line].join('\n');
    const payload: BusinessProfileInput = {
      introduction: currentProfile.introduction, branches: currentProfile.branches, contactInfo,
      workingHours: currentProfile.workingHours, deliveryPolicy: currentProfile.deliveryPolicy,
      paymentMethods: currentProfile.paymentMethods, returnPolicy: currentProfile.returnPolicy,
      exchangePolicy: currentProfile.exchangePolicy, warrantyPolicy: currentProfile.warrantyPolicy,
      promotions: currentProfile.promotions, terms: currentProfile.terms,
    };
    try {
      await saveProfile.mutateAsync({ data: payload });
      await qc.invalidateQueries({ queryKey: getGetBusinessProfileQueryKey() });
      await activate.mutateAsync({ agentId: agent.id, data: { status: 'active' } });
      await Promise.all([
        qc.invalidateQueries({ queryKey: getGetAgentQueryKey(agent.id) }),
        qc.invalidateQueries({ queryKey: getListAgentsQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
      ]);
      setLocation(`/agents/${agent.id}`);
    } catch {
      // Mutation states below surface the actual API failure without implying activation succeeded.
    }
  };
  if (isResume && agentQuery.isLoading) return <main className="page"><div className="skeleton h-10 w-1/3 mb-6" /><div className="skeleton-card"><div className="skeleton h-32" /></div></main>;
  if (isResume && (agentQuery.isError || !agentQuery.data)) return <main className="page"><ErrorState title={copy('Setup could not be resumed', 'تعذر استئناف الإعداد')} detail={copy('We could not load this saved agent.', 'لم نتمكن من تحميل هذا الوكيل المحفوظ.')} retry={() => void agentQuery.refetch()} /></main>;
  const steps = [copy('Agent', 'الوكيل'), copy('Products', 'المنتجات'), copy('Test', 'الاختبار'), copy('Activate', 'التفعيل')];
  return <main className="page agent-builder" data-testid="agent-builder">
    <PageTitle eyebrow={copy('AGENT STUDIO / SETUP', 'استوديو الوكلاء / الإعداد')} title={copy('Build an agent that knows your business.', 'أنشئ وكيلاً يعرف نشاطك.')} description={copy('Four practical steps. Every answer starts with what you have actually saved.', 'أربع خطوات عملية. كل إجابة تستند إلى معلوماتك المحفوظة فعلياً.')} />
    <div className="builder-progress" aria-label={copy(`Step ${step} of 4`, `الخطوة ${step} من ٤`)}>{steps.map((label, index) => <button type="button" key={label} className={`builder-step ${step === index + 1 ? 'current' : ''} ${step > index + 1 ? 'complete' : ''}`} onClick={() => { if (agent && index > 0) setStep(index + 1); }} disabled={index > 0 && !agent} data-testid={`button-builder-step-${index + 1}`}><span>{step > index + 1 ? <Check size={13} /> : `0${index + 1}`}</span>{label}</button>)}</div>
    {step === 1 && <section className="builder-card reveal"><div className="builder-intro"><span className="builder-index">01 / IDENTITY</span><h2>{copy('Give your assistant a name and a point of view.', 'اختر اسماً لمساعدك وحدد أسلوبه.')}</h2><p>{copy('This is the customer-facing identity. The rest sets the voice and boundaries it follows.', 'هذا هو الاسم الذي سيظهر للعملاء. وتحدد الإعدادات التالية أسلوبه وحدوده.')}</p></div>
      <form onSubmit={saveStepOne}><div className="form-grid">
        <Field label={copy('Name customers will see', 'الاسم الذي سيظهر للعملاء')} required><input value={form.name} onChange={(event) => setAgentField('name', event.target.value)} required maxLength={120} placeholder={copy('e.g. Layali Customer Care', 'مثال: خدمة عملاء ليالي')} data-testid="input-builder-agent-name" /></Field>
        <Field label={copy('Response languages', 'لغات الرد')}><select value={form.language} onChange={(event) => setAgentField('language', event.target.value)} data-testid="select-builder-language"><option>Arabic and English</option><option>Arabic</option><option>English</option></select></Field>
        <Field label={copy('What it helps with', 'ما الذي يساعد فيه')} className="full"><input value={form.description} onChange={(event) => setAgentField('description', event.target.value)} placeholder={copy('Product questions, store information, and more', 'الاستفسارات عن المنتجات ومعلومات المتجر وغيرها')} data-testid="input-builder-description" /></Field>
        <Field label={copy('Tone', 'النبرة')}><input value={form.tone} onChange={(event) => setAgentField('tone', event.target.value)} required data-testid="input-builder-tone" /></Field>
        <Field label={copy('First greeting', 'التحية الأولى')}><input value={form.greeting} onChange={(event) => setAgentField('greeting', event.target.value)} required data-testid="input-builder-greeting" /></Field>
        <Field label={copy('When it does not know', 'عندما لا يعرف الإجابة')} className="full"><textarea value={form.fallback} onChange={(event) => setAgentField('fallback', event.target.value)} required data-testid="input-builder-fallback" /></Field>
        <Field label={copy('Additional instructions', 'تعليمات إضافية')} className="full"><textarea value={form.instructions} onChange={(event) => setAgentField('instructions', event.target.value)} data-testid="input-builder-instructions" placeholder={copy('Optional boundaries or preferences', 'حدود أو تفضيلات اختيارية')} /></Field>
      </div>{createAgent.isError && <p role="alert" className="builder-error">{copy('The agent could not be saved. Your entries are still here; try again.', 'تعذر حفظ الوكيل. لا تزال بياناتك هنا؛ حاول مرة أخرى.')}</p>}
      <div className="builder-actions"><span>{copy('Saved as a real workspace agent before continuing.', 'سيُحفظ كوكيل فعلي في مساحة العمل قبل المتابعة.')}</span><button className="btn" disabled={createAgent.isPending || !form.name.trim()} data-testid="button-builder-save-agent">{createAgent.isPending ? copy('Saving agent…', 'جارٍ حفظ الوكيل…') : copy('Save agent & continue', 'احفظ الوكيل وتابع')}<ArrowRight size={15} /></button></div></form>
    </section>}
    {step === 2 && <section className="builder-card reveal"><div className="builder-intro"><span className="builder-index">02 / KNOWLEDGE</span><h2>{copy('Start with the products you actually sell.', 'ابدأ بالمنتجات التي تبيعها فعلياً.')}</h2><p>{copy('Saved products become grounded facts the agent can use in its answers.', 'تتحول المنتجات المحفوظة إلى معلومات موثوقة يستخدمها الوكيل في إجاباته.')}</p></div>
      <div className="builder-product-columns"><form className="builder-product-form" onSubmit={(event) => { void addProduct(event).catch(() => undefined); }}><h3>{copy('Add one product', 'أضف منتجاً')}</h3><Field label={copy('Product name', 'اسم المنتج')} required><input value={productForm.name} onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))} required data-testid="input-builder-product-name" /></Field><div className="form-grid"><Field label={copy('Price', 'السعر')}><input type="number" min="0" step="0.0001" value={productForm.price} onChange={(event) => setProductForm((prev) => ({ ...prev, price: event.target.value }))} data-testid="input-builder-product-price" /></Field><Field label={copy('Currency', 'العملة')}><input value={productForm.currency} onChange={(event) => setProductForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))} pattern="[A-Za-z]{3}" minLength={3} maxLength={3} required data-testid="input-builder-product-currency" /></Field></div><Field label={copy('Availability', 'التوفر')}><select value={productForm.availability} onChange={(event) => setProductForm((prev) => ({ ...prev, availability: event.target.value as typeof prev.availability }))} data-testid="select-builder-product-availability"><option value="in_stock">{copy('In stock', 'متوفر')}</option><option value="out_of_stock">{copy('Out of stock', 'غير متوفر')}</option><option value="unknown">{copy('Not specified', 'غير محدد')}</option></select></Field><button className="btn small" disabled={createProduct.isPending || fileBusy} data-testid="button-builder-add-product"><Plus size={14} />{createProduct.isPending || fileBusy ? copy('Saving…', 'جارٍ الحفظ…') : copy('Save product', 'احفظ المنتج')}</button>{createProduct.isError && <p role="alert" className="builder-error">{copy('Product could not be saved. Please check the details and retry.', 'تعذر حفظ المنتج. تحقق من البيانات وحاول مجدداً.')}</p>}</form>
        <div className="builder-import"><div className="builder-import-title"><Upload size={16} /><div><h3>{copy('Bring in a catalog', 'استورد قائمة المنتجات')}</h3><p>{copy('Import a .xlsx or .csv workbook using the product catalog columns. Legacy .xls files must first be saved as .xlsx.', 'استورد ملف .xlsx أو .csv باستخدام أعمدة كتالوج المنتجات. يجب حفظ ملفات .xls القديمة بصيغة .xlsx أولاً.')}</p></div></div><input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="builder-file-input" aria-label={copy('Choose product file', 'اختر ملف المنتجات')} onChange={(event) => { const file = event.target.files?.[0]; if (file) void readImportFile(file); }} data-testid="input-builder-import-file" /><button type="button" className="btn secondary small" onClick={() => fileRef.current?.click()} disabled={fileBusy || createProduct.isPending || productQuery.isLoading || productQuery.isError} data-testid="button-builder-import">{fileBusy ? copy('Reading and saving…', 'جارٍ القراءة والحفظ…') : copy('Choose file', 'اختر ملفاً')}<Upload size={14} /></button>{imported > 0 && <p className="builder-success" role="status">{copy(`${imported} product${imported === 1 ? '' : 's'} saved from this file.`, `تم حفظ ${imported} منتج من هذا الملف.`)}</p>}{importErrors.length > 0 && <ul className="builder-row-errors" role="alert">{importErrors.map((error, index) => <li key={`${index}-${error}`}>{lang === 'ar' ? `مشكلة في الاستيراد: ${error}` : error}</li>)}</ul>}</div></div>
      <div className="builder-saved-products"><div className="builder-list-head"><div><h3>{copy('Saved products', 'المنتجات المحفوظة')}</h3><span>{productQuery.isLoading ? copy('Loading catalog…', 'جارٍ تحميل الكتالوج…') : copy(`${products.length} in this workspace`, `${products.length} في مساحة العمل`)}</span></div><Package size={18} /></div>{productQuery.isError ? <ErrorState title={copy('Products unavailable', 'تعذر تحميل المنتجات')} detail={copy('Saved products could not be loaded.', 'تعذر تحميل المنتجات المحفوظة.')} retry={() => void productQuery.refetch()} /> : productQuery.isLoading ? <div className="skeleton h-16" /> : products.length ? <div className="builder-product-list">{products.map((product) => <div className="builder-product-row" key={product.id} data-testid={`row-builder-product-${product.id}`}><strong>{product.nameArabic || product.nameEnglish}</strong><span>{product.price ? `${product.price} ${product.currency}` : copy('Price not set', 'السعر غير محدد')}</span><span className="pill muted">{copy(product.availability.replaceAll('_', ' '), product.availability === 'in_stock' ? 'متوفر' : product.availability === 'out_of_stock' ? 'غير متوفر' : 'غير محدد')}</span></div>)}</div> : <p className="builder-empty">{copy('No products yet. Add one here or import your catalog.', 'لا توجد منتجات بعد. أضف منتجاً أو استورد كتالوجك.')}</p>}</div>
      <div className="builder-actions"><span>{copy('You can add more products later from Knowledge.', 'يمكنك إضافة المزيد لاحقاً من قاعدة المعرفة.')}</span><button className="btn" onClick={() => setStep(3)} data-testid="button-builder-to-test">{copy('Continue to test', 'تابع إلى الاختبار')}<ArrowRight size={15} /></button></div>
    </section>}
    {step === 3 && <section className="builder-card reveal"><div className="builder-intro"><span className="builder-index">03 / PROOF</span><h2>{copy('Ask a real question. Inspect the real answer.', 'اسأل سؤالاً حقيقياً وافحص الإجابة.')}</h2><p>{copy('This sends your message to the saved agent test endpoint. Replies and sources below come from the configured service.', 'يرسل هذا رسالتك إلى نقطة اختبار الوكيل المحفوظ. الإجابات والمصادر أدناه من الخدمة الفعلية.')}</p></div>
      <div className="builder-chat" aria-live="polite">{turns.length ? turns.map((turn, index) => <article className="builder-turn" key={`${index}-${turn.question}`} data-testid={`turn-builder-${index}`}><div className="builder-question">{turn.question}</div><div className="builder-answer"><strong>{agent?.name}</strong><p>{turn.answer}</p>{turn.handoff && <span className="pill muted">{copy('Human handoff suggested', 'يُنصح بالتواصل مع الفريق')}</span>}{turn.sources.length > 0 && <div className="builder-sources"><span>{copy('Sources returned', 'المصادر المستخدمة')}</span>{turn.sources.map((source) => <small key={source}>{source}</small>)}</div>}{!turn.sources.length && <small className="builder-no-sources">{copy('No saved source was returned for this answer.', 'لم يتم إرجاع مصدر محفوظ لهذه الإجابة.')}</small>}</div></article>) : <div className="builder-chat-empty"><MessageSquareText size={22} /><p>{copy('Your live test conversation will appear here.', 'ستظهر هنا محادثة الاختبار الفعلية.')}</p></div>}</div>
      <form className="builder-chat-form" onSubmit={askAgent}><input value={question} onChange={(event) => setQuestion(event.target.value)} required maxLength={4000} placeholder={copy('Ask about a product, price, or policy…', 'اسأل عن منتج أو سعر أو سياسة…')} disabled={!agent || sendTest.isPending} data-testid="input-builder-test-question" /><button className="btn" disabled={!agent || sendTest.isPending || !question.trim()} data-testid="button-builder-send-question">{sendTest.isPending ? <LoaderCircle size={15} className="builder-spinner" /> : <ArrowRight size={15} />}{sendTest.isPending ? copy('Waiting for answer…', 'بانتظار الإجابة…') : copy('Send question', 'أرسل السؤال')}</button></form>
      {sendTest.isError && <p role="alert" className="builder-error">{copy('The test service did not return an answer. Your question was not added to the conversation.', 'لم تُرجع خدمة الاختبار إجابة. لم تتم إضافة السؤال إلى المحادثة.')}</p>}
      <div className="builder-actions"><span>{copy('Test again or continue when you are ready.', 'اختبر مرة أخرى أو تابع عندما تكون مستعداً.')}</span><button className="btn" onClick={() => { setStep(4); void profileQuery.refetch(); }} data-testid="button-builder-to-activate">{copy('Continue to activation', 'تابع إلى التفعيل')}<ArrowRight size={15} /></button></div>
    </section>}
    {step === 4 && <section className="builder-card reveal"><div className="builder-intro"><span className="builder-index">04 / WORKSPACE</span><h2>{copy('Put the agent to work in your workspace.', 'فعّل الوكيل في مساحة عملك.')}</h2><p>{copy('Activation makes this agent active in AYOUB AI. It does not connect WhatsApp or enable automatic replies.', 'يؤدي التفعيل إلى تشغيل الوكيل في AYOUB AI، لكنه لا يربطه بواتساب ولا يفعّل الردود التلقائية.')}</p></div>
      <div className="builder-whatsapp"><div className="builder-whatsapp-mark"><MessageCircle size={20} /></div><div><strong>{copy('WhatsApp Business', 'واتساب للأعمال')}</strong><span className="pill muted" data-testid="status-builder-whatsapp">{copy('Not connected', 'غير متصل')}</span><p>{copy('Add the business number to your profile. Automated WhatsApp replies still require a verified Meta/WhatsApp connection.', 'أضف رقم النشاط إلى ملفك. ما زالت الردود التلقائية عبر واتساب تتطلب اتصالاً موثقاً مع Meta/WhatsApp.')}</p></div></div>
      {profileQuery.isLoading ? <div className="skeleton h-12" /> : profileQuery.isError ? <ErrorState title={copy('Business profile unavailable', 'تعذر تحميل ملف النشاط')} detail={copy('We cannot safely update the contact number until the saved profile is available.', 'لا يمكننا تحديث رقم التواصل بأمان قبل تحميل ملف النشاط المحفوظ.')} retry={() => void profileQuery.refetch()} /> : <form onSubmit={finishActivation}><Field label={copy('WhatsApp Business number', 'رقم واتساب للأعمال')} hint={copy('Include country code. This is saved to Business profile contact info.', 'أضف رمز الدولة. سيتم حفظه ضمن معلومات التواصل في ملف النشاط.')} required><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required placeholder="+962 7X XXX XXXX" data-testid="input-builder-whatsapp-number" /></Field>
        {(saveProfile.isError || activate.isError) && <p role="alert" className="builder-error">{saveProfile.isError ? copy('The phone number could not be saved to Business profile.', 'تعذر حفظ رقم الهاتف في ملف النشاط.') : copy('The contact number was saved, but workspace activation failed. Retry activation after checking the agent.', 'تم حفظ رقم التواصل، لكن تعذر تفعيل الوكيل في مساحة العمل. تحقق من الوكيل وحاول مجدداً.')}</p>}
        <div className="builder-activation-note"><ShieldCheck size={18} /><p>{copy('Automated WhatsApp replies are not enabled. A verified Meta/WhatsApp connection is still required.', 'الردود التلقائية عبر واتساب غير مفعلة. ما زال الاتصال الموثق مع Meta/WhatsApp مطلوباً.')}</p></div>
        <div className="builder-actions"><span>{copy('This activates the agent in your AYOUB AI workspace only.', 'هذا يفعّل الوكيل في مساحة AYOUB AI فقط.')}</span><button className="btn" disabled={saveProfile.isPending || activate.isPending || !phone.trim() || !profileQuery.data} data-testid="button-builder-activate">{activate.isPending || saveProfile.isPending ? copy('Saving and activating…', 'جارٍ الحفظ والتفعيل…') : copy('Activate my agent', 'فعّل وكيلي')}<Check size={15} /></button></div>
      </form>}
    </section>}
  </main>;
}
function AgentFormPage({ editing = false }: { editing?: boolean }) {
  const [, params] = useRoute<{ agentId: string }>(editing ? '/agents/:agentId/edit' : '/agents/new');
  const id = Number(params?.agentId);
  const { headers } = useWorkspace();
  const { setLocation } = { setLocation: useLocation()[1] };
  const query = useGetAgent(id, { ...headers, query: { queryKey: getGetAgentQueryKey(id), enabled: editing && Number.isFinite(id) && !!headers } });
  const [form, setForm] = useState(emptyAgent);
  const [initialized, setInitialized] = useState(false);
  useEffect(() => { if (query.data && !initialized) { setForm({ name: query.data.name, description: query.data.description ?? '', language: query.data.language, tone: query.data.tone, greeting: query.data.greeting, fallback: query.data.fallback, instructions: query.data.instructions }); setInitialized(true); } }, [query.data, initialized]);
  const create = useCreateAgent({ request: headers });
  const update = useUpdateAgent({ request: headers });
  const qc = useQueryClient();
  const submitting = create.isPending || update.isPending;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input = { ...form, name: form.name.trim() };
    const onSuccess = async (agent: Agent) => { await Promise.all([qc.invalidateQueries({ queryKey: getListAgentsQueryKey() }), qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() })]); setLocation(`/agents/${agent.id}`); };
    if (editing) update.mutate({ agentId: id, data: input }, { onSuccess });
    else create.mutate({ data: input }, { onSuccess });
  };
  const set = (key: keyof typeof emptyAgent, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  if (editing && query.isLoading) return <main className="page"><div className="skeleton h-10 w-1/3 mb-6" /><div className="skeleton-card"><div className="skeleton h-28" /><div className="skeleton h-20" /></div></main>;
  if (editing && query.isError) return <main className="page"><ErrorState title="Agent unavailable" detail="This agent could not be loaded." retry={() => void query.refetch()} /></main>;
  return <main className="page"><PageTitle eyebrow={editing ? 'AGENT SETTINGS' : 'AGENT STUDIO / NEW'} title={editing ? 'Configure your agent.' : 'Create an agent.'} description="Give your assistant a clear voice and dependable boundaries." />
    <form className="panel form-card" onSubmit={submit}><div className="form-grid">
      <Field label="Agent name" required><input data-testid="input-agent-name" value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={120} required placeholder="e.g. Ayoub — Customer Care" /></Field>
      <Field label="Response language"><select data-testid="select-agent-language" value={form.language} onChange={(e) => set('language', e.target.value)}><option>Arabic and English</option><option>Arabic</option><option>English</option></select></Field>
      <Field label="Description" className="full"><input data-testid="input-agent-description" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What this agent helps your customers with" /></Field>
      <Field label="Tone"><input data-testid="input-agent-tone" value={form.tone} onChange={(e) => set('tone', e.target.value)} placeholder="Helpful and concise" /></Field>
      <Field label="First greeting"><input data-testid="input-agent-greeting" value={form.greeting} onChange={(e) => set('greeting', e.target.value)} required /></Field>
      <Field label="When the answer is not known" className="full"><textarea data-testid="input-agent-fallback" value={form.fallback} onChange={(e) => set('fallback', e.target.value)} required /></Field>
      <Field label="Additional instructions" className="full" hint="Tell your agent how to use your saved knowledge. It should never invent product or policy details."><textarea data-testid="input-agent-instructions" value={form.instructions} onChange={(e) => set('instructions', e.target.value)} placeholder="Be accurate. If a detail is missing, say so and offer to connect the customer with the team." /></Field>
    </div>{(create.isError || update.isError) && <p className="page-desc" role="alert">Could not save this agent. Please check the fields and retry.</p>}<div className="form-actions"><Link href="/agents" className="btn secondary">Cancel</Link><button className="btn" disabled={submitting || !form.name.trim()} data-testid="button-save-agent"><Save size={14} />{submitting ? 'Saving…' : editing ? 'Save changes' : 'Create agent'}</button></div></form>
  </main>;
}
function AgentDetailsPage() {
  const [, params] = useRoute<{ agentId: string }>('/agents/:agentId');
  const id = Number(params?.agentId);
  const [location, setLocation] = useLocation();
  const { headers } = useWorkspace();
  const query = useGetAgent(id, { ...headers, query: { queryKey: getGetAgentQueryKey(id), enabled: !!headers && Number.isFinite(id) } });
  const activate = useSetAgentActivation({ request: headers });
  const remove = useDeleteAgent({ request: headers });
  const qc = useQueryClient();
  if (query.isLoading) return <main className="page"><div className="skeleton h-10 w-1/3 mb-6" /><div className="skeleton-card"><div className="skeleton h-32" /></div></main>;
  if (query.isError || !query.data) return <main className="page"><ErrorState title="Agent unavailable" detail="This agent could not be loaded." retry={() => void query.refetch()} /></main>;
  const agent = query.data;
  const onActivation = (status: 'active' | 'paused' | 'draft') => activate.mutate({ agentId: id, data: { status } }, { onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: getGetAgentQueryKey(id) }), qc.invalidateQueries({ queryKey: getListAgentsQueryKey() }), qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() })]); } });
  const onDelete = () => { if (window.confirm(`Delete "${agent.name}" and its test data?`)) remove.mutate({ agentId: id }, { onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: getListAgentsQueryKey() }), qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() })]); setLocation('/agents'); } }); };
  return <main className="page"><PageTitle eyebrow="AGENT STUDIO" title={agent.name} description={agent.description || 'Customer-service assistant'} action={<div className="flex gap-2 flex-wrap"><Link href={`/agents/${id}/test`} className="btn secondary"><MessageCircle size={15} />Test agent</Link><Link href={`/agents/${id}/edit`} className="btn"><SlidersHorizontal size={15} />Configure</Link></div>} />
    <section className="panel form-card"><div className="agent-card-top"><div className="flex items-center gap-3"><div className="agent-symbol"><Bot /></div><div><strong>{agent.name}</strong><div className="cell-secondary">{agent.language} · {agent.tone}</div></div></div><span className={`pill ${agent.status === 'active' ? 'active' : 'muted'}`}>{agent.status}</span></div>
      <div className="section-label">VOICE & BOUNDARIES</div><div className="form-grid"><InfoBlock label="Greeting" value={agent.greeting} /><InfoBlock label="Fallback" value={agent.fallback} /><InfoBlock label="Instructions" value={agent.instructions || 'No additional instructions set.'} wide /></div>
      <div className="section-label">WORKFLOW</div><div className="flex gap-2 flex-wrap">{agent.status !== 'active' ? <button className="btn" disabled={activate.isPending} onClick={() => onActivation('active')} data-testid="button-activate-agent"><Check size={14} />Activate</button> : <button className="btn secondary" disabled={activate.isPending} onClick={() => onActivation('paused')} data-testid="button-pause-agent">Pause agent</button>}{agent.status !== 'draft' && <button className="btn secondary" disabled={activate.isPending} onClick={() => onActivation('draft')}>Return to draft</button>}<button className="btn ghost" disabled={remove.isPending} onClick={onDelete} data-testid="button-delete-agent"><Trash2 size={14} />Delete</button></div>
    </section><div className="section-label">GROUND YOUR AGENT</div><div className="channel-grid"><QuickLink href="/knowledge/products" icon={<Package />} title="Products" detail="Product facts and availability" /><QuickLink href="/knowledge/faqs" icon={<CircleHelp />} title="Approved answers" detail="FAQs your team stands behind" /><QuickLink href="/knowledge/business" icon={<Building2 />} title="Business policies" detail="Hours, delivery, and terms" /></div>
  </main>;
}
function InfoBlock({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) { return <div className={`field ${wide ? 'full' : ''}`}><label>{label}</label><div className="panel" style={{ padding: 13, fontSize: 12, lineHeight: 1.65 }}>{value}</div></div>; }
function AgentTestPage() {
  const [, params] = useRoute<{ agentId: string }>('/agents/:agentId/test');
  const id = Number(params?.agentId);
  const { headers } = useWorkspace();
  const agentQuery = useGetAgent(id, { ...headers, query: { queryKey: getGetAgentQueryKey(id), enabled: !!headers } });
  const send = useSendAgentTestMessage({ request: headers });
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'agent'; text: string; sources?: string[]; handoff?: boolean }[]>([]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || send.isPending) return;
    setInput('');
    setMessages((old) => [...old, { role: 'user', text: content }]);
    send.mutate({ agentId: id, data: { content, conversationId } }, { onSuccess: (result) => { setConversationId(result.conversationId); setMessages((old) => [...old, { role: 'agent', text: result.assistantMessage, sources: result.sources, handoff: result.handoff }]); }, onError: () => setMessages((old) => [...old, { role: 'agent', text: 'I could not get a response from the test service. Please try again.' }]) });
  };
  if (agentQuery.isLoading) return <main className="page"><div className="skeleton h-10 w-1/3 mb-6" /><div className="skeleton-card"><div className="skeleton h-60" /></div></main>;
  if (agentQuery.isError || !agentQuery.data) return <main className="page"><ErrorState title="Agent unavailable" detail="The selected agent could not be loaded." retry={() => void agentQuery.refetch()} /></main>;
  const agent = agentQuery.data;
  return <main className="page"><PageTitle eyebrow="AGENT STUDIO / TEST" title="Try a real question." description="Messages go to your agent using your saved business knowledge." action={<Link href={`/agents/${id}`} className="btn secondary"><ArrowLeft size={14} />Agent details</Link>} />
    <div className="chat-layout"><section className="panel chat-panel"><header className="chat-head"><div className="agent-symbol"><Bot /></div><div><strong>{agent.name}</strong><span>Grounded test conversation · {agent.language}</span></div><span className={`pill ${agent.status === 'active' ? 'active' : 'muted'}`}>{agent.status}</span></header>
      <div className="chat-messages">{!messages.length && <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 300 }}><div className="empty-mark"><MessageCircle /></div><h3 style={{ fontSize: 14, marginBottom: 6 }}>{agent.greeting}</h3><p className="page-desc">Ask about a product, delivery, payment, or another saved business detail.</p></div>}
        {messages.map((message, i) => <div key={`${i}-${message.role}`} className={`message ${message.role}`} data-testid={`chat-message-${i}`}><div>{message.text}</div>{message.sources && message.sources.length > 0 && <div className="message-meta">Sources: {message.sources.join(' · ')}</div>}{message.handoff && <div className="message-meta">Needs a team member</div>}</div>)}
        {send.isPending && <div className="message agent"><div className="skeleton w-36" /><div className="skeleton w-24 mt-2" /></div>}
      </div><form className="chat-composer" onSubmit={submit}><input data-testid="input-test-message" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask your agent a question…" maxLength={4000} /><button className="btn" disabled={!input.trim() || send.isPending} data-testid="button-send-test-message">{send.isPending ? <LoaderCircle size={15} /> : <ArrowUpRight size={15} />}<span className="sr-only">Send message</span></button></form>
    </section>
      <aside className="panel chat-aside"><h3>Answer grounding</h3><p>Every message is sent to the real test endpoint. Check the returned source references to see which saved information supports the answer.</p><div className="source-label">LAST RESPONSE SOURCES</div>{[...messages].reverse().find((m) => m.role === 'agent' && m.sources)?.sources?.length ? [...messages].reverse().find((m) => m.role === 'agent')!.sources!.map((source, i) => <div className="source-item" key={`${source}-${i}`}><FileText size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />{source}</div>) : <div className="source-item">Sources appear here after your agent responds.</div>}{[...messages].reverse().find((m) => m.role === 'agent')?.handoff && <div className="handoff"><LifeBuoy size={13} style={{ verticalAlign: 'middle', marginRight: 7 }} />This response recommends a handoff to your team.</div>}</aside></div>
  </main>;
}
function Field({ label, children, required = false, hint, className = '' }: { label: string; children: ReactNode; required?: boolean; hint?: string; className?: string }) { return <div className={`field ${className}`}><label>{label}{required && <span aria-hidden="true"> *</span>}</label>{children}{hint && <span className="hint">{hint}</span>}</div>; }
type ModalProps = { title: string; description?: string; onClose: () => void; children: ReactNode };
function Modal({ title, description, onClose, children }: ModalProps) { return <div className="dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className="dialog" role="dialog" aria-modal="true" aria-label={title}><header className="dialog-head"><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={16} /></button></header>{children}</div></div>; }
function ProductsPage() {
  const { headers } = useWorkspace();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [availability, setAvailability] = useState<'in_stock' | 'out_of_stock' | 'unknown' | ''>('');
  const [modal, setModal] = useState<Product | 'new' | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const productFilters = { search: search || undefined, category: category || undefined, availability: availability || undefined };
  const catalogQuery = useListProducts({}, { ...headers, query: { queryKey: getListProductsQueryKey(), enabled: !!headers } });
  const query = useListProducts(productFilters, { ...headers, query: { queryKey: getListProductsQueryKey(productFilters), enabled: !!headers } });
  const qc = useQueryClient();
  const create = useCreateProduct({ request: headers }); const update = useUpdateProduct({ request: headers }); const remove = useDeleteProduct({ request: headers });
  const save = (input: ProductInputValue, existing?: Product) => {
    const clean = { ...input, aliases: input.aliases.split(',').map((x) => x.trim()).filter(Boolean), price: input.price || undefined, stockQuantity: input.stockQuantity === '' ? undefined : Number(input.stockQuantity) };
    const done = async () => { await Promise.all([qc.invalidateQueries({ queryKey: getListProductsQueryKey() }), qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() })]); setModal(null); };
    if (existing) update.mutate({ productId: existing.id, data: clean }, { onSuccess: done }); else create.mutate({ data: clean }, { onSuccess: done });
  };
  const deleteProduct = (product: Product) => { if (window.confirm(`Delete ${product.nameEnglish || product.nameArabic || 'this product'}?`)) remove.mutate({ productId: product.id }, { onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: getListProductsQueryKey() }), qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() })]); } }); };
  const importCsv = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('CSV files must be 2 MB or smaller.');
      const parsed = parseProductCsv(await file.text());
      const errors = [...parsed.errors];
      const normalize = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
      const keysFor = (product: { nameArabic?: string | null; nameEnglish?: string | null; aliases?: string[]; sku?: string | null }) => [
        ...[product.nameArabic, product.nameEnglish, ...(product.aliases ?? [])].filter((value): value is string => Boolean(value?.trim())).map((value) => `name:${normalize(value)}`),
        ...(product.sku?.trim() ? [`sku:${normalize(product.sku)}`] : []),
      ];
      const existingKeys = new Set((catalogQuery.data ?? []).flatMap((product) => keysFor(product)));
      let imported = 0;
      for (const { rowNumber, product } of parsed.products) {
        const keys = keysFor(product);
        if (keys.some((key) => existingKeys.has(key))) {
          errors.push(`Row ${rowNumber}: a product with the same name, alias, or SKU already exists; skipped.`);
          continue;
        }
        try {
          await create.mutateAsync({ data: product });
          imported += 1;
          keys.forEach((key) => existingKeys.add(key));
        } catch {
          errors.push(`Row ${rowNumber}: the product could not be saved. Check the row and try again.`);
        }
      }
      if (imported > 0) await Promise.all([qc.invalidateQueries({ queryKey: getListProductsQueryKey() }), qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() })]);
      setImportResult({ imported, errors });
    } catch (error) {
      setImportResult({ imported: 0, errors: [error instanceof Error ? error.message : 'The CSV file could not be read.'] });
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };
  return <main className="page"><PageTitle eyebrow="KNOWLEDGE BASE / CATALOG" title="Products" description="Give your agent exact product names, prices, and availability." action={<div className="flex gap-2 flex-wrap"><button className="btn secondary" onClick={() => downloadCsv('ayoub-products.csv', exportProductsCsv(catalogQuery.data ?? []))} disabled={catalogQuery.isLoading || !catalogQuery.data?.length}><Download size={15} />Export CSV</button><button className="btn secondary" onClick={() => fileInput.current?.click()} disabled={importing || catalogQuery.isLoading || catalogQuery.isError} title={catalogQuery.isError ? 'Load the catalog before importing.' : undefined}><Upload size={15} />{importing ? 'Importing…' : 'Import CSV'}</button><button className="btn" onClick={() => setModal('new')} data-testid="button-add-product"><Plus size={15} />Add product</button></div>} />
    <div className="toolbar"><div className="searchbox"><Search /><input placeholder="Search product names, categories…" data-testid="input-search-products" value={search} onChange={(e) => setSearch(e.target.value)} /></div><select className="btn secondary small" aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{[...new Set((catalogQuery.data ?? []).map((product) => product.category).filter((value): value is string => Boolean(value)))].sort().map((value) => <option key={value} value={value}>{value}</option>)}</select><select className="btn secondary small" aria-label="Filter by availability" value={availability} onChange={(e) => setAvailability(e.target.value as typeof availability)}><option value="">All availability</option><option value="in_stock">In stock</option><option value="out_of_stock">Out of stock</option><option value="unknown">Unknown</option></select><div className="flex gap-2 items-center flex-wrap"><button className="btn secondary small" onClick={() => downloadCsv('ayoub-products-template.csv', PRODUCT_CSV_TEMPLATE)}><FileText size={13} />CSV template</button><div className="pill"><Package size={12} />{query.data?.length ?? '—'} products</div></div></div>
    <input ref={fileInput} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Choose a product CSV file" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void importCsv(file); }} />
    {importResult && <section className="panel form-card mb-4" role="status"><strong>{importResult.imported} product{importResult.imported === 1 ? '' : 's'} imported.</strong>{importResult.errors.length > 0 ? <><p className="page-desc">{importResult.errors.length} row or file issue{importResult.errors.length === 1 ? '' : 's'} need attention.</p><ul className="page-desc" style={{ paddingInlineStart: 20 }}>{importResult.errors.slice(0, 20).map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul>{importResult.errors.length > 20 && <p className="page-desc">Showing the first 20 issues.</p>}</> : <p className="page-desc">All product rows were saved successfully.</p>}<button className="btn secondary small" onClick={() => setImportResult(null)}>Dismiss</button></section>}
    <section className="panel">{query.isLoading ? <LoadingTable /> : query.isError ? <ErrorState title="Products unavailable" detail="Your product catalog could not be loaded." retry={() => void query.refetch()} /> : query.data?.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Availability</th><th aria-label="Actions" /></tr></thead><tbody>{query.data.map((p) => <tr key={p.id} data-testid={`row-product-${p.id}`}><td><div className="cell-primary">{p.nameEnglish || p.nameArabic || 'Unnamed product'}</div><div className="cell-secondary">{p.nameArabic && p.nameEnglish ? p.nameArabic : (p.sku ? `SKU ${p.sku}` : p.aliases.join(', '))}</div></td><td>{p.category || '—'}</td><td>{p.price ? `${p.currency} ${p.price}` : '—'}</td><td><span className={`pill ${p.availability === 'in_stock' ? 'active' : 'muted'}`}>{statusLabel(p.availability)}</span></td><td><div className="row-actions"><button className="icon-button" onClick={() => setModal(p)} aria-label={`Edit ${p.nameEnglish || 'product'}`}><SlidersHorizontal size={14} /></button><button className="icon-button" onClick={() => deleteProduct(p)} aria-label={`Delete ${p.nameEnglish || 'product'}`}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div> : <EmptyState title={search ? 'No products match' : 'Your catalog is empty'} detail={search ? 'Try another search term.' : 'Add the products customers ask about. Your agent will only use saved details.'} action={!search && <button className="btn small" onClick={() => setModal('new')}><Plus size={14} />Add product</button>} />}</section>
    {modal && <ProductModal product={modal === 'new' ? undefined : modal} saving={create.isPending || update.isPending} onClose={() => setModal(null)} onSave={save} />}
  </main>;
}
type ProductInputValue = { nameEnglish: string; nameArabic: string; aliases: string; description: string; category: string; price: string; currency: string; unit: string; packageSize: string; availability: 'in_stock' | 'out_of_stock' | 'unknown'; stockQuantity: string; sku: string; notes: string };
function ProductModal({ product, saving, onClose, onSave }: { product?: Product; saving: boolean; onClose: () => void; onSave: (input: ProductInputValue, existing?: Product) => void }) {
  const [form, setForm] = useState<ProductInputValue>({ nameEnglish: product?.nameEnglish ?? '', nameArabic: product?.nameArabic ?? '', aliases: product?.aliases.join(', ') ?? '', description: product?.description ?? '', category: product?.category ?? '', price: product?.price ?? '', currency: product?.currency ?? 'USD', unit: product?.unit ?? '', packageSize: product?.packageSize ?? '', availability: product?.availability ?? 'unknown', stockQuantity: product?.stockQuantity?.toString() ?? '', sku: product?.sku ?? '', notes: product?.notes ?? '' });
  const set = (key: keyof ProductInputValue, value: string) => setForm((x) => ({ ...x, [key]: value }));
  return <Modal title={product ? 'Edit product' : 'Add product'} description="Keep customer-facing details accurate and specific." onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); if (form.nameEnglish || form.nameArabic) onSave(form, product); }}>
    <div className="form-grid"><Field label="Name in English"><input value={form.nameEnglish} onChange={(e) => set('nameEnglish', e.target.value)} placeholder="Product name" /></Field><Field label="Name in Arabic"><input dir="rtl" value={form.nameArabic} onChange={(e) => set('nameArabic', e.target.value)} placeholder="اسم المنتج" /></Field><Field label="Aliases" className="full" hint="Separate alternate names with commas"><input value={form.aliases} onChange={(e) => set('aliases', e.target.value)} placeholder="Short name, common spelling" /></Field><Field label="Category"><input value={form.category} onChange={(e) => set('category', e.target.value)} /></Field><Field label="Price"><div className="flex gap-2"><input style={{ width: 80 }} maxLength={3} value={form.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} /><input value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0.00" pattern="[0-9]+(\\.[0-9]{1,4})?" /></div></Field><Field label="Availability"><select value={form.availability} onChange={(e) => set('availability', e.target.value)}><option value="unknown">Unknown</option><option value="in_stock">In stock</option><option value="out_of_stock">Out of stock</option></select></Field><Field label="Stock quantity"><input type="number" min="0" value={form.stockQuantity} onChange={(e) => set('stockQuantity', e.target.value)} /></Field><Field label="Unit"><input value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="piece, box…" /></Field><Field label="Package size"><input value={form.packageSize} onChange={(e) => set('packageSize', e.target.value)} /></Field><Field label="SKU"><input value={form.sku} onChange={(e) => set('sku', e.target.value)} /></Field><Field label="Description" className="full"><textarea value={form.description} onChange={(e) => set('description', e.target.value)} /></Field><Field label="Internal notes" className="full"><textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field></div>
    <div className="form-actions"><button type="button" className="btn secondary" onClick={onClose}>Cancel</button><button className="btn" disabled={saving || (!form.nameEnglish.trim() && !form.nameArabic.trim())} data-testid="button-save-product">{saving ? 'Saving…' : product ? 'Save product' : 'Add product'}</button></div>
  </form></Modal>;
}
function LoadingTable() { return <div className="p-5 grid gap-4">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-7 w-full" />)}</div>; }
function FaqsPage() {
  const { headers } = useWorkspace();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<Faq | 'new' | null>(null);
  const query = useListFaqs({ ...headers, query: { queryKey: getListFaqsQueryKey(), enabled: !!headers } });
  const qc = useQueryClient(); const create = useCreateFaq({ request: headers }); const update = useUpdateFaq({ request: headers }); const remove = useDeleteFaq({ request: headers });
  const filtered = (query.data ?? []).filter((f) => `${f.question} ${f.answer} ${f.category ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  const save = (input: FaqFormValue, existing?: Faq) => { const data = { ...input, alternatives: input.alternatives.split('\n').map((x) => x.trim()).filter(Boolean) }; const done = async () => { await Promise.all([qc.invalidateQueries({ queryKey: getListFaqsQueryKey() }), qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() })]); setModal(null); }; if (existing) update.mutate({ faqId: existing.id, data }, { onSuccess: done }); else create.mutate({ data }, { onSuccess: done }); };
  const deleteFaq = (faq: Faq) => { if (window.confirm('Delete this approved answer?')) remove.mutate({ faqId: faq.id }, { onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: getListFaqsQueryKey() }), qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() })]); } }); };
  const toggleFaq = (faq: Faq) => update.mutate({ faqId: faq.id, data: { enabled: !faq.enabled } }, { onSuccess: () => void qc.invalidateQueries({ queryKey: getListFaqsQueryKey() }) });
  return <main className="page"><PageTitle eyebrow="KNOWLEDGE BASE / ANSWERS" title="Approved answers" description="Keep common customer questions consistent and on-message." action={<button className="btn" data-testid="button-add-faq" onClick={() => setModal('new')}><Plus size={15} />Add answer</button>} />
    <div className="toolbar"><div className="searchbox"><Search /><input data-testid="input-search-faqs" placeholder="Search questions and answers…" value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="pill"><CircleHelp size={12} />{query.data?.length ?? '—'} saved</div></div>
    <section className="panel">{query.isLoading ? <LoadingTable /> : query.isError ? <ErrorState title="Answers unavailable" detail="Your FAQ list could not be retrieved." retry={() => void query.refetch()} /> : filtered.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Customer question</th><th>Language</th><th>Category</th><th>State</th><th aria-label="Actions" /></tr></thead><tbody>{filtered.map((faq) => <tr key={faq.id} data-testid={`row-faq-${faq.id}`}><td><div className="cell-primary">{faq.question}</div><div className="cell-secondary" style={{ maxWidth: 410, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{faq.answer}</div></td><td>{faq.language}</td><td>{faq.category || '—'}</td><td><span className={`pill ${faq.enabled ? 'active' : 'muted'}`}>{faq.enabled ? 'enabled' : 'disabled'}</span></td><td><div className="row-actions"><button className="icon-button" onClick={() => toggleFaq(faq)} aria-label={faq.enabled ? 'Disable answer' : 'Enable answer'}><Check size={14} /></button><button className="icon-button" onClick={() => setModal(faq)} aria-label="Edit answer"><SlidersHorizontal size={14} /></button><button className="icon-button" onClick={() => deleteFaq(faq)} aria-label="Delete answer"><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div> : <EmptyState title={search ? 'No answers found' : 'No answers saved yet'} detail={search ? 'Try different keywords.' : 'Save reviewed answers to the questions your team hears most.'} action={!search && <button className="btn small" onClick={() => setModal('new')}><Plus size={14} />Add an answer</button>} />}</section>
    {modal && <FaqModal faq={modal === 'new' ? undefined : modal} saving={create.isPending || update.isPending} onClose={() => setModal(null)} onSave={save} />}
  </main>;
}
type FaqFormValue = { question: string; answer: string; alternatives: string; language: string; category: string; enabled: boolean };
function FaqModal({ faq, saving, onClose, onSave }: { faq?: Faq; saving: boolean; onClose: () => void; onSave: (value: FaqFormValue, existing?: Faq) => void }) {
  const [form, setForm] = useState<FaqFormValue>({ question: faq?.question ?? '', answer: faq?.answer ?? '', alternatives: faq?.alternatives.join('\n') ?? '', language: faq?.language ?? 'Arabic and English', category: faq?.category ?? '', enabled: faq?.enabled ?? true });
  const set = (key: keyof FaqFormValue, value: string | boolean) => setForm((x) => ({ ...x, [key]: value }));
  return <Modal title={faq ? 'Edit approved answer' : 'Add approved answer'} description="Write a response your team is comfortable standing behind." onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); onSave(form, faq); }}><div className="form-grid"><Field label="Customer question" className="full" required><input value={form.question} onChange={(e) => set('question', e.target.value)} required /></Field><Field label="Approved answer" className="full" required><textarea value={form.answer} onChange={(e) => set('answer', e.target.value)} required /></Field><Field label="Alternative phrasings" className="full" hint="One alternative question per line"><textarea value={form.alternatives} onChange={(e) => set('alternatives', e.target.value)} /></Field><Field label="Language"><select value={form.language} onChange={(e) => set('language', e.target.value)}><option>Arabic and English</option><option>Arabic</option><option>English</option></select></Field><Field label="Category"><input value={form.category} onChange={(e) => set('category', e.target.value)} /></Field><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} />Approved and available to agents</label></div><div className="form-actions"><button type="button" className="btn secondary" onClick={onClose}>Cancel</button><button className="btn" disabled={saving || !form.question.trim() || !form.answer.trim()} data-testid="button-save-faq">{saving ? 'Saving…' : faq ? 'Save answer' : 'Add answer'}</button></div></form></Modal>;
}
const profileFields: { key: keyof BusinessProfileInput; label: string; description: string }[] = [
  { key: 'introduction', label: 'Business introduction', description: 'What you do and who you serve' },
  { key: 'branches', label: 'Branches', description: 'Locations and branch details' },
  { key: 'contactInfo', label: 'Contact information', description: 'Phone, email, or other contact methods' },
  { key: 'workingHours', label: 'Working hours', description: 'Opening hours and days' },
  { key: 'deliveryPolicy', label: 'Delivery policy', description: 'Areas, timelines, and fees' },
  { key: 'paymentMethods', label: 'Payment methods', description: 'Accepted payment options' },
  { key: 'returnPolicy', label: 'Return policy', description: 'Conditions and time windows' },
  { key: 'exchangePolicy', label: 'Exchange policy', description: 'How exchanges are handled' },
  { key: 'warrantyPolicy', label: 'Warranty policy', description: 'Coverage and exclusions' },
  { key: 'promotions', label: 'Promotions', description: 'Current offers and eligibility' },
  { key: 'terms', label: 'Terms', description: 'Important business terms' },
];
function BusinessPage() {
  const { headers } = useWorkspace();
  const query = useGetBusinessProfile({ ...headers, query: { queryKey: getGetBusinessProfileQueryKey(), enabled: !!headers } });
  const save = useSaveBusinessProfile({ request: headers });
  const qc = useQueryClient();
  const initial = useMemo<BusinessProfileInput>(() => ({
    introduction: query.data?.introduction ?? '',
    branches: query.data?.branches ?? '',
    contactInfo: query.data?.contactInfo ?? '',
    workingHours: query.data?.workingHours ?? '',
    deliveryPolicy: query.data?.deliveryPolicy ?? '',
    paymentMethods: query.data?.paymentMethods ?? '',
    returnPolicy: query.data?.returnPolicy ?? '',
    exchangePolicy: query.data?.exchangePolicy ?? '',
    warrantyPolicy: query.data?.warrantyPolicy ?? '',
    promotions: query.data?.promotions ?? '',
    terms: query.data?.terms ?? '',
  }), [query.data]);
  const [form, setForm] = useState<BusinessProfileInput>(initial);
  const [initialized, setInitialized] = useState(false);
  useEffect(() => { if (query.data && !initialized) { setForm(initial); setInitialized(true); } }, [query.data, initial, initialized]);
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate({ data: form }, { onSuccess: async () => { await qc.invalidateQueries({ queryKey: getGetBusinessProfileQueryKey() }); await qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); } }); };
  if (query.isLoading) return <main className="page"><div className="skeleton h-10 w-1/3 mb-6" /><div className="skeleton-card"><div className="skeleton h-40" /><div className="skeleton h-24" /></div></main>;
  if (query.isError) return <main className="page"><PageTitle eyebrow="KNOWLEDGE BASE" title="Business profile" /><ErrorState title="Profile unavailable" detail="We couldn't load your saved business details." retry={() => void query.refetch()} /></main>;
  return <main className="page"><PageTitle eyebrow="KNOWLEDGE BASE / BUSINESS" title="Business profile" description="Policies and details your agent can use to answer with confidence." />
    <form className="panel form-card" onSubmit={submit}><div className="form-grid">{profileFields.map((field) => <Field key={field.key} label={field.label} className={['introduction', 'branches', 'deliveryPolicy', 'returnPolicy', 'exchangePolicy', 'warrantyPolicy', 'terms'].includes(field.key) ? 'full' : ''} hint={field.description}><textarea data-testid={`input-business-${field.key}`} value={form[field.key]} onChange={(e) => setForm((x) => ({ ...x, [field.key]: e.target.value }))} /></Field>)}</div>{save.isError && <p role="alert" className="page-desc mt-4">Your business profile could not be saved. Please try again.</p>}{save.isSuccess && <p className="page-desc mt-4" role="status">Business profile saved.</p>}<div className="form-actions"><span className="cell-secondary mr-auto">{query.data?.updatedAt ? `Last saved ${new Date(query.data.updatedAt).toLocaleString()}` : 'Not saved yet'}</span><button className="btn" disabled={save.isPending} data-testid="button-save-business"><Save size={14} />{save.isPending ? 'Saving…' : 'Save profile'}</button></div></form>
  </main>;
}
function ChannelsPage() {
  const { headers } = useWorkspace();
  const query = useListChannels({ ...headers, query: { queryKey: getListChannelsQueryKey(), enabled: !!headers } });
  const iconMap: Record<string, ReactNode> = { website: <Code2 />, whatsapp: <MessageCircle />, instagram: <Globe2 />, messenger: <MessageSquareText /> };
  return <main className="page"><PageTitle eyebrow="DEPLOYMENT" title="Channels" description="See where your agents are configured to meet customers." />
    {query.isLoading ? <div className="channel-grid">{[1, 2, 3, 4].map((i) => <div className="skeleton-card" key={i}><div className="skeleton h-10 w-1/2" /><div className="skeleton w-4/5" /></div>)}</div> : query.isError ? <ErrorState title="Channels unavailable" detail="Channel configuration could not be loaded." retry={() => void query.refetch()} /> : query.data?.length ? <div className="channel-grid">{query.data.map((channel) => <article className="panel channel-card" key={channel.id} data-testid={`card-channel-${channel.id}`}><div className="channel-mark">{iconMap[channel.id] || <Globe2 />}</div><div className="channel-content"><h3>{channel.name}</h3><p>{channel.detail || 'No additional configuration details.'}</p><span className={`pill ${channel.status === 'connected' ? 'active' : 'muted'}`}>{statusLabel(channel.status)}</span></div></article>)}</div> : <section className="panel"><EmptyState title="No channels listed" detail="Channel states will appear here when they are available for this workspace." /></section>}
    <div className="section-label">CONNECTION STATE IS LIVE</div><p className="page-desc">This view reflects the channel configuration returned by your workspace. Connection setup actions are not available unless the backend provides them.</p>
  </main>;
}
function AiChatPage() {
  const { lang } = useLang(); const { settings } = useAdminSettings(); const [, setLocation] = useLocation();
  const [message, setMessage] = useState(''); const [showAttachments, setShowAttachments] = useState(false); const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const sendMessage = (event: FormEvent) => { event.preventDefault(); if (!message.trim()) return; const text = message.trim(); setMessages((current) => [...current, { role: 'user', text }, { role: 'assistant', text: 'واجهة المحادثة جاهزة. اربط مفتاح ChatGPT أو Gemini من الإعدادات حتى يبدأ الوكيل بالرد على رسائلك.' }]); setMessage(''); };
  const attachmentOptions = [{ label: 'ملف', icon: FileArchive, accept: '.pdf,.doc,.docx,.txt,.csv' }, { label: 'صورة', icon: ImageIcon, accept: 'image/*' }, { label: 'صوت', icon: Mic, accept: 'audio/*' }, { label: 'فيديو', icon: Video, accept: 'video/*' }];
  return <main className="ai-chat-page"><header className="ai-chat-header"><button className="ai-back-button" onClick={() => setLocation('/')} aria-label={tr(lang, 'Back to website', 'العودة للموقع')}><ArrowLeft size={17} /></button><SiteBrand /><div className="ai-chat-status"><span className="status-dot" />{tr(lang, 'Design mode · API not connected', 'وضع التصميم · مفتاح API غير مربوط')}</div></header><div className="ai-chat-layout"><aside className="ai-chat-sidebar"><button className="ai-new-chat"><Plus size={16} />{tr(lang, 'New conversation', 'محادثة جديدة')}</button><div className="ai-sidebar-label">{tr(lang, 'YOUR ASSISTANT', 'مساعدك الذكي')}</div><div className="ai-assistant-card"><div className="ai-assistant-avatar"><BrainCircuit size={19} /></div><div><strong>{tr(lang, settings.brandNameEn, settings.brandNameAr)}</strong><span>{tr(lang, 'Ready to learn your business', 'جاهز ليتعلم عن عملك')}</span></div><span className="ai-online-dot" /></div><div className="ai-sidebar-note"><Sparkles size={15} /><p>{tr(lang, 'Connect an API key later to turn this beautiful interface into a live AI assistant.', 'اربط مفتاح API لاحقًا لتحويل هذه الواجهة إلى مساعد AI فعلي.')}</p></div><button className="ai-sidebar-link" onClick={() => setLocation('/admin/training')}><Database size={15} />{tr(lang, 'Train your agent', 'تدريب الوكيل')}<ChevronRight size={14} /></button></aside><section className="ai-chat-workspace"><div className="ai-chat-title"><div><div className="eyebrow">{tr(lang, 'PRIVATE AI WORKSPACE', 'مساحة AI الخاصة')}</div><h1>{tr(lang, 'Talk to your business assistant.', 'احكِ مع مساعد عملك.')}</h1><p>{tr(lang, 'Ask anything, attach context, and keep the conversation grounded.', 'اسأل أي شيء، أرفق المعلومات، وخلي المحادثة مبنية على بياناتك.')}</p></div><div className="ai-model-chip"><span className="ai-model-pulse" />{tr(lang, 'Awaiting API key', 'بانتظار مفتاح API')}</div></div><div className="ai-messages">{messages.length === 0 ? <div className="ai-empty-chat"><div className="ai-empty-orbit"><BrainCircuit size={34} /></div><h2>{tr(lang, 'How can I help you today?', 'كيف أقدر أساعدك اليوم؟')}</h2><p>{tr(lang, 'Start a conversation or attach a file to give your assistant more context.', 'ابدأ محادثة أو أرفق ملفًا لتعطي مساعدك مزيدًا من المعلومات.')}</p><div className="ai-suggestion-grid"><button onClick={() => setMessage('لخص لي معلومات نشاطي التجاري')}><span>✦</span>{tr(lang, 'Summarize my business knowledge', 'لخّص معلومات نشاطي')}</button><button onClick={() => setMessage('اكتب إجابة احترافية لعميل')}><span>↗</span>{tr(lang, 'Write a customer reply', 'اكتب ردًا لعميل')}</button></div></div> : messages.map((item, index) => <div className={`ai-message-row ${item.role}`} key={`${item.role}-${index}`}><div className="ai-message-avatar">{item.role === 'assistant' ? <BrainCircuit size={15} /> : 'A'}</div><div className="ai-message-bubble">{item.text}</div></div>)}</div><form className="ai-composer" onSubmit={sendMessage}><div className="ai-composer-top"><div className="ai-attachment-wrap"><button type="button" className={`ai-icon-button ${showAttachments ? 'active' : ''}`} onClick={() => setShowAttachments((value) => !value)} aria-label={tr(lang, 'Add attachment', 'إضافة مرفق')}><Plus size={19} /></button>{showAttachments && <div className="ai-attachment-menu">{attachmentOptions.map(({ label, icon: Icon, accept }) => <label className="ai-attachment-option" key={label}><input type="file" accept={accept} /><Icon size={16} /><span>{label}</span></label>)}</div>}</div><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={tr(lang, 'Message your AI assistant...', 'اكتب رسالتك لمساعدك الذكي...')} rows={1} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(event); } }} /><button type="button" className="ai-icon-button" aria-label={tr(lang, 'Voice input', 'إدخال صوتي')}><Mic size={18} /></button><button type="submit" className="ai-send-button" aria-label={tr(lang, 'Send message', 'إرسال الرسالة')} disabled={!message.trim()}><Send size={16} /></button></div><div className="ai-composer-footer"><span><Paperclip size={12} />{tr(lang, 'Attach files, images, audio or video', 'أرفق ملفات أو صور أو صوت أو فيديو')}</span><span>{tr(lang, 'Your data stays in your workspace', 'بياناتك تبقى داخل مساحة عملك')}</span></div></form></section></div></main>;
}
function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('');
  const submit = (event: FormEvent) => { event.preventDefault(); if (username === 'Ayoub' && password === 'Ayoub123') { localStorage.setItem('qadri-admin-session', 'active'); sessionStorage.removeItem('qadri-admin-order-summary-shown-v1'); activateOrderAlertsFromUserGesture(); setLocation('/admin'); } else setError('اسم المستخدم أو كلمة السر غير صحيحة.'); };
  return <main className="admin-login-page"><form className="panel admin-login-card" onSubmit={submit}><div className="admin-login-brand"><SiteBrand /></div><div className="eyebrow">QADRI AI / ADMIN</div><h1>تسجيل دخول الإدارة</h1><p className="page-desc">ادخل إلى لوحة التحكم لإدارة هوية الموقع ومحتواه.</p><div className="field"><label htmlFor="admin-username">اسم المستخدم</label><input id="admin-username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></div><div className="field"><label htmlFor="admin-password">كلمة السر</label><input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></div>{error && <p className="admin-error" role="alert">{error}</p>}<button className="btn" type="submit">دخول لوحة التحكم <ArrowRight size={15} /></button><Link className="admin-back-link" href="/">العودة إلى الموقع</Link></form></main>;
}
function AdminGuard({ children }: { children: ReactNode }) { return localStorage.getItem('qadri-admin-session') === 'active' ? <>{children}<OrderAlertControl /></> : <Redirect to="/admin/login" />; }
type TrainingSource = { id: string; name: string; type: string; detail: string; status: 'ready' | 'training' | 'trained' };
function AdminTrainingPage() {
  const [, setLocation] = useLocation(); const [sources, setSources] = useState<TrainingSource[]>(() => { try { return JSON.parse(localStorage.getItem('qadri-training-sources') || '[]'); } catch { return []; } }); const [text, setText] = useState(''); const [url, setUrl] = useState(''); const [isTraining, setIsTraining] = useState(false);
  const persist = (next: TrainingSource[]) => { setSources(next); localStorage.setItem('qadri-training-sources', JSON.stringify(next)); };
  const addSource = (source: TrainingSource) => persist([...sources, source]);
  const addTextSource = () => { if (!text.trim()) return; addSource({ id: `${Date.now()}`, name: 'نص معرفة جديد', type: 'نص', detail: `${text.trim().length} حرف`, status: 'ready' }); setText(''); };
  const addUrlSource = () => { if (!url.trim()) return; addSource({ id: `${Date.now()}`, name: url.trim(), type: 'رابط', detail: 'مصدر ويب', status: 'ready' }); setUrl(''); };
  const addFiles = (event: React.ChangeEvent<HTMLInputElement>) => { Array.from(event.target.files || []).forEach((file, index) => addSource({ id: `${Date.now()}-${index}`, name: file.name, type: file.type.startsWith('video') ? 'فيديو' : file.type.startsWith('audio') ? 'صوت' : file.type.startsWith('image') ? 'صورة' : 'ملف', detail: `${Math.max(1, Math.round(file.size / 1024))} KB`, status: 'ready' })); event.target.value = ''; };
  const train = () => { if (!sources.length || isTraining) return; setIsTraining(true); persist(sources.map((source) => ({ ...source, status: 'training' }))); window.setTimeout(() => { setIsTraining(false); persist(sources.map((source) => ({ ...source, status: 'trained' }))); }, 900); };
  return <main className="training-page"><div className="training-head"><button className="ai-back-button" onClick={() => setLocation('/admin')}><ArrowLeft size={17} /></button><div><div className="eyebrow">QADRI AI / KNOWLEDGE LAB</div><h1>تدريب الوكيل</h1><p className="page-desc">أضف المعرفة التي سيعتمد عليها الوكيل عند الإجابة على أسئلة العملاء.</p></div><button className="btn" onClick={train} disabled={!sources.length || isTraining}><BrainCircuit size={15} />{isTraining ? 'جارٍ التدريب...' : 'تدريب الوكيل'}</button></div><div className="training-progress"><div className="training-progress-icon"><Database size={20} /></div><div><strong>{sources.length ? `${sources.length} مصادر معرفة جاهزة` : 'ابدأ بإضافة مصادر المعرفة'}</strong><p>هذه واجهة تصميمية الآن. بعد ربط API سيتم تحليل المحتوى وبناء قاعدة معرفة فعلية.</p></div><span className={`training-status ${isTraining ? 'busy' : sources.length ? 'ready' : ''}`}>{isTraining ? 'PROCESSING' : sources.length ? 'READY' : 'EMPTY'}</span></div><div className="training-grid"><section className="panel training-add-card"><div className="panel-head"><div><h2 className="panel-title">أضف بيانات الوكيل</h2><div className="panel-kicker">اختر الطريقة التي تناسب محتوى نشاطك التجاري</div></div></div><div className="training-input-card"><div className="training-card-icon"><FileArchive size={18} /></div><div className="training-card-body"><h3>ارفع ملفات</h3><p>PDF، Word، CSV، صور، تسجيلات صوتية أو فيديوهات.</p><label className="btn secondary small training-upload"><Upload size={14} />اختيار الملفات<input type="file" multiple accept=".pdf,.doc,.docx,.csv,.txt,image/*,audio/*,video/*" onChange={addFiles} /></label></div></div><div className="training-input-card"><div className="training-card-icon"><FileArchive size={18} /></div><div className="training-card-body"><h3>أضف نصًا مباشرًا</h3><p>اكتب سياساتك، الأسئلة الشائعة، معلومات المنتجات أو أي تعليمات.</p><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="مثال: سياسة الاستبدال خلال 14 يومًا..." /><button className="btn secondary small" onClick={addTextSource} disabled={!text.trim()}><Plus size={14} />إضافة النص</button></div></div><div className="training-input-card"><div className="training-card-icon"><Link2 size={18} /></div><div className="training-card-body"><h3>أضف رابطًا</h3><p>أدخل رابط موقعك أو صفحة المنتجات ليتم تحليلها لاحقًا.</p><div className="training-url-row"><input dir="ltr" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://yourwebsite.com" /><button className="btn secondary small" onClick={addUrlSource} disabled={!url.trim()}>إضافة</button></div></div></div></section><section className="panel training-sources-card"><div className="panel-head"><div><h2 className="panel-title">مصادر المعرفة</h2><div className="panel-kicker">المصادر التي سيتعلم منها الوكيل</div></div><span className="training-count">{sources.length}</span></div>{sources.length ? <div className="training-source-list">{sources.map((source) => <div className="training-source-row" key={source.id}><div className="training-source-icon">{source.type === 'رابط' ? <Link2 size={15} /> : source.type === 'نص' ? <FileArchive size={15} /> : source.type === 'فيديو' ? <Video size={15} /> : source.type === 'صوت' ? <Mic size={15} /> : <FileArchive size={15} />}</div><div className="training-source-info"><strong>{source.name}</strong><span>{source.type} · {source.detail}</span></div><span className={`training-source-status ${source.status}`}>{source.status === 'trained' ? 'تم التدريب' : source.status === 'training' ? 'جارٍ...' : 'جاهز'}</span><button className="icon-button" onClick={() => persist(sources.filter((item) => item.id !== source.id))} aria-label="حذف المصدر"><Trash2 size={14} /></button></div>)}</div> : <div className="training-empty"><Database size={28} /><h3>قاعدة المعرفة فارغة</h3><p>أضف أول ملف أو نص أو رابط حتى يبدأ وكيلك بالتعلم.</p></div>}</section></div></main>;
}
type QuoteItem = LandscapeQuoteItem & { code: string; description: string; price: number };
type QuoteDraft = { number: string; date: string; title: string; customer: string; customerPhone: string; customerLocation?: string; website: string; logoUrl: string; companyNameEn: string; companyLocationEn: string; companyNameAr: string; companyLocationAr: string; currency: string; discount: number; taxEnabled: boolean; taxRate: number; notes: string; accent: string; items: QuoteItem[]; showScientificNames?: boolean; landscapeDefaultSize?: number; landscapeDefaultShape?: LandscapeGlobalShape | 'auto'; landscapeAnnotations?: LandscapeAnnotation[]; documentType?: 'quote' | 'invoice'; invoiceKinds?: InvoiceKind[]; invoiceCompanyName?: string; invoiceCompanyLocation?: string; invoiceCompanyPhone?: string };
type InvoiceKind = 'purchase' | 'sales' | 'receivable' | 'paid' | 'online';
type SavedQuote = QuoteDraft & { savedAt: string };
const emptyQuoteItem = (): QuoteItem => ({ id: `${Date.now()}-${Math.random()}`, code: '', name: '', description: '', category: '', quantity: 1, price: 0, image: '', landscapeSize: 58, landscapeShape: 'circle', landscapeArea: 0 });
const quoteMoney = (value: number, currency = 'JOD') => `${value.toFixed(2)} ${currency}`;
const quoteEscape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] || char));
function quoteExportMarkup(quote: QuoteDraft, settings: AdminSettings) {
  const subtotal = quote.items.reduce((sum, item) => sum + item.quantity * item.price, 0); const discount = Math.min(subtotal, Math.max(0, Number(quote.discount) || 0)); const taxable = subtotal - discount; const tax = quote.taxEnabled ? taxable * (quote.taxRate / 100) : 0; const total = taxable + tax;
  const rows = quote.items.map((item, index) => `<tr><td></td><td>${index + 1}</td><td>${quoteEscape(item.name)}<br><small>${quoteEscape(item.description)}</small></td><td>${quoteEscape(item.category)}</td><td>${item.quantity}</td><td>${quoteMoney(item.price, quote.currency)}</td><td>${quoteMoney(item.quantity * item.price, quote.currency)}</td><td>${item.image ? `<img src="${item.image}" alt="" style="width:70px;height:70px;object-fit:cover">` : ''}</td></tr>`).join('');
  return `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#111;padding:28px}.quote-export-logo{width:88px;height:88px;object-fit:contain;float:right;margin-left:16px}h1{margin:0 0 4px;color:${quote.accent}}table{width:100%;border-collapse:collapse;margin-top:24px}th{background:${quote.accent};color:#fff}th,td{border:1px solid #d8dce2;padding:9px;text-align:right;font-size:11px}small{color:#687080}.meta{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid ${quote.accent};padding-bottom:18px}.totals{margin:0 0 0 auto;width:280px}.totals p{display:flex;justify-content:space-between}.grand{font-size:17px;font-weight:bold;color:${quote.accent};border-top:2px solid ${quote.accent};padding-top:10px}.export-below{direction:ltr;display:grid;grid-template-columns:1fr 280px;align-items:start;gap:20px;margin-top:18px}.export-establishment{display:grid;grid-template-columns:1fr 1fr;gap:16px}.export-establishment div{display:grid;gap:5px}.export-establishment [dir="ltr"]{text-align:left}.export-establishment [dir="rtl"]{text-align:right}.export-notes{margin-top:14px;min-height:52px;padding:10px;border:1px solid #d8dce2}.export-notes p{margin:8px 0;white-space:pre-wrap}.export-signoff{display:flex;flex-direction:column;gap:18px;margin:24px 0 16px}.export-signoff>p{text-align:center;margin:0}.export-signature{width:220px;display:grid;justify-items:center;gap:5px;text-align:center}.export-signature img{width:210px;height:auto;object-fit:contain}.export-footer{display:flex;justify-content:space-between;gap:12px;border-top:1px solid #d8dce2;padding-top:12px;margin-top:25px;font-size:10px}</style></head><body><div class="meta"><div><img class="quote-export-logo" src="${quoteEscape(quote.logoUrl || settings.logoUrl || '/chatbot.png')}" alt="شعار العرض"><h1>${quoteEscape(quote.title)}</h1><div class="export-establishment"><div dir="ltr"><strong>${quoteEscape(quote.companyNameEn || 'Al-Qadri Agricultural Establishment')}</strong><span>${quoteEscape(quote.companyLocationEn || 'Jerash - AlRashaidah')}</span></div><div dir="rtl"><strong>${quoteEscape(quote.companyNameAr || 'مؤسسة القادري الزراعية')}</strong><span>${quoteEscape(quote.companyLocationAr || 'جرش – الرشايدة')}</span></div></div></div><div><p><b>رقم العرض:</b> ${quoteEscape(quote.number)}</p><p><b>التاريخ:</b> ${quoteEscape(quote.date)}</p><p><b>الزبون:</b> ${quoteEscape(quote.customer)}</p></div></div><table><thead><tr><th></th><th>#</th><th>الاسم والوصف</th><th>القسم</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th><th>الصورة</th></tr></thead><tbody>${rows}</tbody></table><div class="export-below"><div class="totals"><p><span>المجموع الفرعي</span><b>${quoteMoney(subtotal, quote.currency)}</b></p><p><span>الخصم</span><b>-${quoteMoney(discount, quote.currency)}</b></p><p><span>الضريبة (${quote.taxEnabled ? quote.taxRate : 0}%)</span><b>${quoteMoney(tax, quote.currency)}</b></p><p class="grand"><span>الإجمالي النهائي</span><b>${quoteMoney(total, quote.currency)}</b></p></div></div><div class="export-notes"><b>ملاحظات</b><p>${quoteEscape(quote.notes || ' ' )}</p></div><div class="export-signoff"><p>وتفضلوا بقبول فائق الاحترام والتقدير</p><div class="export-signature"><strong>المدير العام/ ثامر احمد القادري</strong><img src="/quote-signature-stamp.png" alt="ختم مؤسسة القادري الزراعية"></div></div><footer class="export-footer">📞 00962777772211　 ✉️ tamerqadri@gmail.com　 🌐 https://www.alqadrioffers.online</footer></body></html>`;
}
function CatalogIcon({ type }: { type: QuoteCatalogCategory['icon'] }) {
  const Icon = type === 'tree' ? TreePine : type === 'flower' ? Flower2 : type === 'water' ? Droplets : type === 'stone' ? Mountain : type === 'pot' ? Sprout : type === 'tools' ? Package : Sprout;
  return <Icon size={18} />;
}
function QuoteCatalogPage() { return <PublicQuoteRequestPage />; }
type OperationsLine = { id: string; item: string; quantity: string; price: string };
type OperationsRecord = Record<string, string> & { items?: OperationsLine[] };
const emptyOperationsLine = (): OperationsLine => ({ id: `${Date.now()}-${Math.random()}`, item: '', quantity: '1', price: '' });
function AdminOperationsPage({ kind }: { kind: 'purchase' | 'letter' }) {
  const purchase = kind === 'purchase';
  const key = purchase ? 'qadri-purchase-orders' : 'qadri-official-letters';
  const { settings } = useAdminSettings();
  const [saved, setSaved] = useState<OperationsRecord[]>(() => { try { return JSON.parse(localStorage.getItem(key) || '[]') as OperationsRecord[]; } catch { return []; } });
  const previewRef = useRef<HTMLElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ number: `${purchase ? 'PO' : 'LTR'}-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`, date: new Date().toISOString().slice(0, 10), supplier: '', item: '', quantity: '1', price: '', recipient: '', subject: '', body: '', notes: '' });
  const [items, setItems] = useState<OperationsLine[]>([emptyOperationsLine()]);
  const updateItem = (id: string, patch: Partial<OperationsLine>) => setItems((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  const addItem = () => setItems((current) => [...current, emptyOperationsLine()]);
  const removeItem = (id: string) => setItems((current) => current.length === 1 ? current : current.filter((line) => line.id !== id));
  const set = (name: string, value: string) => setForm((current) => ({ ...current, [name]: value }));
  const save = () => { const record: OperationsRecord = { ...form, savedAt: new Date().toISOString(), ...(purchase ? { items } : {}) }; const next = [record, ...saved]; setSaved(next); localStorage.setItem(key, JSON.stringify(next)); };
  const downloadOperationsPdf = async () => {
    const page = previewRef.current;
    if (!page) return;
    setPdfBusy(true);
    try {
      await document.fonts?.ready;
      await Promise.all(Array.from(page.querySelectorAll('img')).map((image) => image.decode().catch(() => undefined)));
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const canvas = await html2canvas(page, { scale: 2, backgroundColor: '#fff', useCORS: true, logging: false });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const imageWidth = 190;
      const imageHeight = canvas.height * imageWidth / canvas.width;
      const fit = Math.min(1, 277 / imageHeight);
      const finalWidth = imageWidth * fit;
      const finalHeight = imageHeight * fit;
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', (210 - finalWidth) / 2, 10, finalWidth, finalHeight);
      pdf.save(`${form.number || (purchase ? 'purchase-order' : 'official-letter')}.pdf`);
    } catch (error) {
      console.error('Operations PDF generation failed', error);
      window.alert('تعذر إنشاء ملف PDF. تأكد من تحميل الصور ثم أعد المحاولة.');
    } finally { setPdfBusy(false); }
  };
  const dateLabel = form.date ? new Intl.DateTimeFormat('ar-JO', { dateStyle: 'long' }).format(new Date(`${form.date}T12:00:00`)) : '';
  const total = items.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.price) || 0), 0);
  const header = <div className="official-preview-header"><div className="official-preview-brand"><img src={settings.logoUrl || '/chatbot.png'} alt="شعار مؤسسة القادري الزراعية" /><div><strong>مؤسسة القادري الزراعية</strong><span>Al-Qadri Agricultural Establishment</span><small>جرش – الرشايدة | الأردن</small></div></div><div className="official-preview-contact"><span>هاتف: {settings.phone || '0777772211'}</span><span>alqadri.agri@gmail.com</span><span>www.alqadrioffers.online</span></div></div>;
  const footer = <footer className="official-preview-footer"><div><strong>مؤسسة القادري الزراعية</strong><span>لخدمتكم في كل ما يخص الزراعة والمستلزمات الزراعية</span></div><img src="/quote-signature-stamp.png" alt="ختم مؤسسة القادري الزراعية" /><div className="official-preview-footer-contact"><span>📞 {settings.phone || '0777772211'}</span><span>✉️ alqadri.agri@gmail.com</span><span>🌐 www.alqadrioffers.online</span></div></footer>;
  return <main className="admin-page operations-page" dir="rtl"><div className="admin-head"><div><div className="eyebrow">QADRI AI / {purchase ? 'PURCHASE ORDERS' : 'OFFICIAL LETTERS'}</div><h1>{purchase ? 'طلبات الشراء' : 'الكتب الرسمية'}</h1><p className="page-desc">{purchase ? 'عبّئ البيانات وشاهد طلب الشراء الرسمي مباشرة قبل حفظه أو طباعته.' : 'اكتب الكتاب الرسمي وشاهد تنسيقه النهائي مباشرة قبل حفظه أو طباعته.'}</p></div><div className="admin-head-actions"><button className="btn secondary" onClick={downloadOperationsPdf} disabled={pdfBusy}><FileDown size={14} />{pdfBusy ? 'جاري تجهيز PDF...' : 'تنزيل PDF'}</button><Link className="btn secondary" href="/admin"><LayoutDashboard size={14} />لوحة التحكم</Link></div></div><div className="operations-workspace"><section className="panel official-preview-panel"><div className="official-preview-toolbar"><span>المعاينة الرسمية</span><small>تتحدث تلقائيًا مع كل تعديل</small></div><article ref={previewRef} className="official-document-preview">{header}<div className="official-preview-rule" />{purchase ? <><div className="official-document-title"><span>طلب شراء</span><small>Purchase Order</small></div><div className="official-meta-grid"><div><b>رقم الطلب</b><span>{form.number || '—'}</span></div><div><b>التاريخ</b><span>{dateLabel || '—'}</span></div><div><b>المورد / الجهة</b><span>{form.supplier || '—'}</span></div></div><div className="official-preview-intro">يرجى التكرم بتوفير المواد والمستلزمات الموضحة أدناه حسب المواصفات والكمية المطلوبة.</div><table className="official-purchase-table"><thead><tr><th>الصنف أو المادة</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>{items.map((line) => <tr key={line.id}><td>{line.item || 'اسم الصنف أو المادة'}</td><td>{line.quantity || '—'}</td><td>{line.price ? `${line.price} د.أ` : '—'}</td><td>{Number(line.quantity) * Number(line.price) ? `${(Number(line.quantity) * Number(line.price)).toFixed(2)} د.أ` : '—'}</td></tr>)}</tbody></table><div className="official-notes-box"><b>ملاحظات</b><p>{form.notes || 'لا توجد ملاحظات إضافية.'}</p></div></> : <><div className="official-document-title"><span>{form.subject || 'موضوع الكتاب الرسمي'}</span><small>Official Correspondence</small></div><div className="official-meta-grid"><div><b>الرقم</b><span>{form.number || '—'}</span></div><div><b>التاريخ</b><span>{dateLabel || '—'}</span></div><div><b>الجهة الموجّه إليها</b><span>{form.recipient || '—'}</span></div></div><div className="official-letter-greeting">تحية طيبة وبعد،</div><p className="official-letter-body">{form.body || 'سيظهر نص الكتاب هنا بطريقة مرتبة وواضحة أثناء الكتابة.'}</p><div className="official-letter-closing">وتفضلوا بقبول فائق الاحترام والتقدير</div></>}<div className="official-signature"><span>المدير العام</span><strong>ثامر أحمد القادري</strong></div>{footer}</article></section><div className="operations-side"><form className="panel operations-form" onSubmit={(event) => { event.preventDefault(); save(); }}><div className="operations-form-heading"><div><span className="eyebrow">DOCUMENT BUILDER</span><h2>{purchase ? 'بيانات طلب الشراء' : 'بيانات الكتاب الرسمي'}</h2></div><span className="operations-live-dot">مباشر</span></div><div className="operations-fields"><label>الرقم<input value={form.number} onChange={(e) => set('number', e.target.value)} /></label><label>التاريخ<input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></label>{purchase ? <><label className="operations-wide">المورد / الجهة<input required value={form.supplier} onChange={(e) => set('supplier', e.target.value)} placeholder="اسم المورد أو الجهة" /></label><div className="operations-wide operations-items-editor"><div className="operations-items-heading"><span>بنود طلب الشراء</span><button type="button" className="btn secondary small" onClick={addItem}><Plus size={13} />إضافة بند</button></div><div className="operations-item-labels"><span>الصنف أو المادة</span><span>الكمية</span><span>سعر الوحدة</span><span /></div>{items.map((line, index) => <div className="operations-item-row" key={line.id}><input required value={line.item} onChange={(e) => updateItem(line.id, { item: e.target.value })} placeholder={`اسم البند ${index + 1}`} /><input type="number" min="1" required value={line.quantity} onChange={(e) => updateItem(line.id, { quantity: e.target.value })} /><input type="number" min="0" step="0.01" value={line.price} onChange={(e) => updateItem(line.id, { price: e.target.value })} placeholder="د.أ" /><button type="button" className="icon-button operations-remove-item" onClick={() => removeItem(line.id)} disabled={items.length === 1} aria-label="حذف البند"><Trash2 size={14} /></button></div>)}</div><label className="operations-wide">ملاحظات<textarea rows={5} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="أي شروط أو ملاحظات على الطلب..." /></label></> : <><label className="operations-wide">الجهة الموجّه إليها<input required value={form.recipient} onChange={(e) => set('recipient', e.target.value)} placeholder="اسم الجهة أو المؤسسة" /></label><label className="operations-wide">موضوع الكتاب<input required value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="موضوع المخاطبة" /></label><label className="operations-wide">نص الكتاب<textarea required rows={12} value={form.body} onChange={(e) => set('body', e.target.value)} placeholder="اكتب نص الكتاب هنا..." /></label></>}</div><button className="btn operations-save-button" type="submit"><Save size={14} />حفظ {purchase ? 'طلب الشراء' : 'الكتاب'}</button></form><section className="panel operations-history"><div className="operations-history-heading"><h2>السجل المحفوظ</h2><span>{saved.length}</span></div>{saved.length ? saved.map((record, index) => <article className="operations-record" key={`${record.number}-${index}`}><div><small>{record.number} · {record.date}</small><strong>{purchase ? (record.items?.length ? `${record.items[0].item || 'بنود متعددة'}${record.items.length > 1 ? ` + ${record.items.length - 1} بنود` : ''}` : record.item) : record.subject}</strong><p>{purchase ? `المورد: ${record.supplier} · البنود: ${record.items?.length || 1}` : `إلى: ${record.recipient}`}</p></div></article>) : <p className="operations-empty">لا توجد سجلات محفوظة بعد.</p>}</section></div></div></main>;
}
function AdminInvoicesPage() {
  const [, setLocation] = useLocation();
  const [records, setRecords] = useState<SavedQuote[]>(() => { try { return (JSON.parse(localStorage.getItem('qadri-quotes') || '[]') as SavedQuote[]).filter((record) => record.documentType === 'invoice').sort((a, b) => b.savedAt.localeCompare(a.savedAt)); } catch { return []; } });
  const [active, setActive] = useState<SavedQuote | null>(() => { try { if (new URLSearchParams(window.location.search).has('convert')) { const draft = sessionStorage.getItem('qadri-invoice-conversion-draft'); sessionStorage.removeItem('qadri-invoice-conversion-draft'); return draft ? JSON.parse(draft) as SavedQuote : null; } } catch { /* Ignore an unavailable temporary browser draft. */ } return null; });
  const [savingPdf, setSavingPdf] = useState(false);
  const blankInvoice = (): SavedQuote => ({ number: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`, date: new Date().toISOString().slice(0, 10), title: 'فاتورة', customer: '', customerPhone: '', customerLocation: '', website: 'https://www.alqadrioffers.online', logoUrl: '', companyNameEn: '', companyLocationEn: '', companyNameAr: 'مؤسسة القادري الزراعية', companyLocationAr: 'جرش - الأردن', currency: 'JOD', discount: 0, taxEnabled: false, taxRate: 0, notes: '', accent: '#285f3d', items: [{ ...emptyQuoteItem(), image: '', name: '', quantity: 1, price: 0 }], documentType: 'invoice', invoiceKinds: [], invoiceCompanyName: 'مؤسسة القادري الزراعية', invoiceCompanyLocation: 'جرش - الأردن', invoiceCompanyPhone: '0777772211 - 0778111155', savedAt: new Date().toISOString() });
  const openNew = () => setActive(blankInvoice());
  const openEdit = (record: SavedQuote) => setActive({ ...record, items: (record.items || []).map((item) => ({ ...item, image: '' })) });
  const patchInvoice = (patch: Partial<SavedQuote>) => setActive((current) => current ? { ...current, ...patch } : current);
  const patchItem = (id: string, patch: Partial<QuoteItem>) => setActive((current) => current ? { ...current, items: current.items.map((item) => item.id === id ? { ...item, ...patch, image: '' } : item) } : current);
  const subtotal = active?.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0) || 0;
  const total = Math.max(0, subtotal - (Number(active?.discount) || 0)) + (active?.taxEnabled ? Math.max(0, subtotal - (Number(active.discount) || 0)) * (Number(active.taxRate) || 0) / 100 : 0);
  const saveInvoice = () => {
    if (!active) return;
    const saved = { ...active, documentType: 'invoice' as const, items: active.items.map((item) => ({ ...item, image: '' })), savedAt: new Date().toISOString() };
    const all: SavedQuote[] = (() => { try { return JSON.parse(localStorage.getItem('qadri-quotes') || '[]'); } catch { return []; } })();
    const next = [...all.filter((record) => record.number !== saved.number), saved];
    localStorage.setItem('qadri-quotes', JSON.stringify(next));
    setRecords(next.filter((record) => record.documentType === 'invoice').sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
    setActive(saved);
  };
  const deleteInvoice = (number: string) => {
    const next = records.filter((record) => record.number !== number);
    const all: SavedQuote[] = (() => { try { return JSON.parse(localStorage.getItem('qadri-quotes') || '[]'); } catch { return []; } })();
    localStorage.setItem('qadri-quotes', JSON.stringify(all.filter((record) => record.number !== number)));
    setRecords(next); if (active?.number === number) setActive(null);
  };
  const downloadInvoicePdf = async () => {
    const page = document.querySelector<HTMLElement>('.invoice-print-sheet'); if (!page) return;
    setSavingPdf(true);
    try {
      await document.fonts?.ready;
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const canvas = await html2canvas(page, { scale: 2, backgroundColor: '#fff', useCORS: true });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const fitScale = Math.min(190 / canvas.width, 277 / canvas.height), imageWidth = canvas.width * fitScale, imageHeight = canvas.height * fitScale;
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', (210 - imageWidth) / 2, 10, imageWidth, imageHeight);
      pdf.save(`${active?.number || 'invoice'}.pdf`);
    } finally { setSavingPdf(false); }
  };
  const kinds: { id: InvoiceKind; label: string; group: string }[] = [{ id: 'purchase', label: 'مشتريات', group: 'نوع الفاتورة' }, { id: 'sales', label: 'مبيعات', group: 'نوع الفاتورة' }, { id: 'receivable', label: 'ذمم', group: 'حالة السداد' }, { id: 'paid', label: 'مدفوع', group: 'حالة السداد' }, { id: 'online', label: 'أونلاين', group: 'طريقة الدفع' }];
  const toggleKind = (kind: InvoiceKind) => patchInvoice({ invoiceKinds: active?.invoiceKinds?.includes(kind) ? active.invoiceKinds.filter((item) => item !== kind) : [...(active?.invoiceKinds || []), kind] });
  return <main className="admin-page invoice-workspace">
    <div className="admin-head"><div><div className="eyebrow">QADRI AI / FINANCE DESK</div><h1>{active ? 'محرر الفواتير' : 'مركز الفواتير'}</h1><p className="page-desc">{active ? 'أنشئ فاتورة مستقلة، أضف بنودها، واحفظها أو صدّرها PDF.' : 'إدارة الفواتير وإنشاؤها ومتابعة حالاتها من مساحة مخصصة.'}</p></div><div className="admin-head-actions"><Link className="btn secondary" href="/admin"><LayoutDashboard size={14} />لوحة التحكم</Link>{active ? <button className="btn secondary" onClick={() => setActive(null)}><ArrowLeft size={14} />سجل الفواتير</button> : <button className="btn" onClick={openNew}><Plus size={15} />إنشاء فاتورة</button>}</div></div>
    {!active ? <section className="invoice-workspace-list">{records.length ? records.map((invoice) => <article className="invoice-workspace-card" key={invoice.number}><div className="invoice-workspace-mark"><Receipt size={20} /></div><div className="invoice-workspace-info"><small>{invoice.number} · {invoice.date}</small><h2>{invoice.customer || 'فاتورة دون اسم زبون'}</h2><p>{(invoice.invoiceKinds || []).map((kind) => kinds.find((item) => item.id === kind)?.label).filter(Boolean).join(' · ') || 'لم تحدد الحالة'}{invoice.customerPhone ? ` · ${invoice.customerPhone}` : ''}</p></div><div className="invoice-workspace-total"><span>الإجمالي</span><strong>{quoteMoney(invoice.items.reduce((sum, item) => sum + item.quantity * item.price, 0) - (invoice.discount || 0), invoice.currency)}</strong></div><button className="btn secondary small" onClick={() => openEdit(invoice)}>فتح الفاتورة <ArrowLeft size={14} /></button><button className="icon-button invoice-delete" aria-label="حذف الفاتورة" onClick={() => deleteInvoice(invoice.number)}><Trash2 size={16} /></button></article>) : <div className="invoice-workspace-empty"><Receipt size={32} /><h2>لا توجد فواتير بعد</h2><p>ابدأ فاتورة جديدة؛ ستُحفظ ضمن هذا السجل فقط.</p><button className="btn" onClick={openNew}><Plus size={15} />إنشاء فاتورة</button></div>}</section> : <div className="invoice-editor-layout">
      <section className="invoice-editor-panel"><div className="invoice-panel-title"><div><span className="eyebrow">INVOICE DETAILS</span><h2>بيانات الفاتورة</h2></div><Receipt size={22} /></div>
        <div className="invoice-form-grid"><label>رقم الفاتورة<input dir="ltr" value={active.number} onChange={(e) => patchInvoice({ number: e.target.value })} /></label><label>التاريخ<input type="date" value={active.date} onChange={(e) => patchInvoice({ date: e.target.value })} /></label><label>اسم الزبون<input value={active.customer} onChange={(e) => patchInvoice({ customer: e.target.value })} /></label><label>رقم الهاتف<input dir="ltr" value={active.customerPhone} onChange={(e) => patchInvoice({ customerPhone: e.target.value })} /></label><label className="invoice-field-wide">الموقع / العنوان<input value={active.customerLocation || ''} onChange={(e) => patchInvoice({ customerLocation: e.target.value })} /></label></div>
        <div className="invoice-kind-groups">{['نوع الفاتورة','حالة السداد','طريقة الدفع'].map((group) => <div className="invoice-kind-group" key={group}><strong>{group}</strong><div>{kinds.filter((kind) => kind.group === group).map((kind) => <button type="button" key={kind.id} className={active.invoiceKinds?.includes(kind.id) ? 'selected' : ''} onClick={() => toggleKind(kind.id)}>{active.invoiceKinds?.includes(kind.id) ? <Check size={15} /> : <span className="invoice-check-empty" />}{kind.label}</button>)}</div></div>)}</div>
        <div className="invoice-line-editor"><div className="invoice-line-heading"><div><span className="eyebrow">LINE ITEMS</span><h2>بنود الفاتورة</h2></div><button className="btn secondary small" onClick={() => patchInvoice({ items: [...active.items, { ...emptyQuoteItem(), image: '', name: '', quantity: 1, price: 0 }] })}><Plus size={14} />إضافة بند</button></div><div className="invoice-lines-scroll"><table className="invoice-lines-table"><thead><tr><th>البند</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th><th></th></tr></thead><tbody>{active.items.map((item) => <tr key={item.id}><td><input value={item.name} placeholder="اسم البند" onChange={(e) => patchItem(item.id, { name: e.target.value })} /></td><td><input type="number" min="0" value={item.quantity} onChange={(e) => patchItem(item.id, { quantity: Number(e.target.value) })} /></td><td><input type="number" min="0" step="0.01" value={item.price} onChange={(e) => patchItem(item.id, { price: Number(e.target.value) })} /></td><td className="invoice-line-total">{quoteMoney(item.quantity * item.price, active.currency)}</td><td><button className="icon-button invoice-delete" aria-label="حذف البند" onClick={() => patchInvoice({ items: active.items.filter((line) => line.id !== item.id) })}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div></div>
        <div className="invoice-bottom-fields"><label>ملاحظات<textarea rows={3} value={active.notes} onChange={(e) => patchInvoice({ notes: e.target.value })} placeholder="أضف ملاحظات أو شروط الدفع..." /></label><div className="invoice-adjustments"><label>الخصم<input type="number" min="0" value={active.discount} onChange={(e) => patchInvoice({ discount: Number(e.target.value) })} /></label><label>الضريبة %<input type="number" min="0" value={active.taxRate} onChange={(e) => patchInvoice({ taxRate: Number(e.target.value) })} /></label><label className="invoice-tax-check"><input type="checkbox" checked={active.taxEnabled} onChange={(e) => patchInvoice({ taxEnabled: e.target.checked })} />تطبيق الضريبة</label></div></div>
        <div className="invoice-editor-actions"><button className="btn secondary" onClick={() => setActive(null)}>إلغاء</button><button className="btn secondary" onClick={downloadInvoicePdf} disabled={savingPdf}><Download size={15} />{savingPdf ? 'جارٍ تجهيز PDF...' : 'تنزيل PDF'}</button><button className="btn" onClick={saveInvoice}><Save size={15} />حفظ الفاتورة</button></div>
      </section>
      <aside className="invoice-preview-column"><div className="invoice-preview-label"><span>معاينة الفاتورة</span><span className="invoice-live-badge">مباشر</span></div><article className="invoice-print-sheet" dir="rtl"><header className="invoice-print-head"><div><span className="invoice-print-kicker">فاتورة رسمية</span><h2>{active.invoiceCompanyName || 'مؤسسة القادري الزراعية'}</h2><p>{active.invoiceCompanyLocation || 'جرش - الأردن'}<br /><span dir="ltr">{active.invoiceCompanyPhone || '0777772211 - 0778111155'}</span></p></div><div className="invoice-print-number"><Receipt size={26} /><small>رقم الفاتورة</small><strong dir="ltr">{active.number}</strong><span>{active.date}</span></div></header><div className="invoice-print-customer"><div><small>فاتورة إلى</small><strong>{active.customer || 'اسم الزبون'}</strong></div><div><small>رقم الهاتف</small><strong dir="ltr">{active.customerPhone || '—'}</strong></div><div><small>الموقع</small><strong>{active.customerLocation || '—'}</strong></div></div><table className="invoice-print-table"><thead><tr><th>#</th><th>البيان</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>{active.items.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td>{item.name || 'بند جديد'}</td><td>{item.quantity}</td><td>{quoteMoney(item.price, active.currency)}</td><td>{quoteMoney(item.quantity * item.price, active.currency)}</td></tr>)}</tbody></table><div className="invoice-print-summary"><div className="invoice-print-kinds">{(active.invoiceKinds || []).map((kind) => <span key={kind}>{kinds.find((item) => item.id === kind)?.label}</span>)}</div><div className="invoice-print-totals"><p><span>المجموع</span><strong>{quoteMoney(subtotal, active.currency)}</strong></p>{active.discount > 0 && <p><span>الخصم</span><strong>− {quoteMoney(active.discount, active.currency)}</strong></p>}{active.taxEnabled && <p><span>الضريبة ({active.taxRate}%)</span><strong>{quoteMoney(Math.max(0, subtotal - active.discount) * active.taxRate / 100, active.currency)}</strong></p>}<p className="invoice-grand-total"><span>الإجمالي النهائي</span><strong>{quoteMoney(total, active.currency)}</strong></p></div></div>{active.notes && <div className="invoice-print-notes"><strong>ملاحظات</strong><p>{active.notes}</p></div>}<footer className="invoice-print-footer"><span>مؤسسة القادري الزراعية · جرش - الأردن</span><span>فاتورة إلكترونية · {active.number}</span></footer></article></aside>
    </div>}
  </main>;
}

function AdminQuotePage() {
  const { settings } = useAdminSettings(); const [, setLocation] = useLocation(); const [showLandscape, setShowLandscape] = useState(false); const [showPlantPicker, setShowPlantPicker] = useState(false); const [plantSearch, setPlantSearch] = useState(''); const [managedPlants, setManagedPlants] = useState(getManagedPlants); const [showStorePicker, setShowStorePicker] = useState(false); const [storeSearch, setStoreSearch] = useState(''); const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]); const [history, setHistory] = useState<SavedQuote[]>(() => { try { return JSON.parse(localStorage.getItem('qadri-quotes') || '[]'); } catch { return []; } }); const [analysis, setAnalysis] = useState(''); const [smartBatchInput, setSmartBatchInput] = useState(''); const [showSmartBatch, setShowSmartBatch] = useState(false); const [showQuoteTableSettings, setShowQuoteTableSettings] = useState(false); const [deleteMode, setDeleteMode] = useState(false); const [hiddenQuoteParts, setHiddenQuoteParts] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('qadri-quote-hidden-parts') || '[]'); } catch { return []; } }); const [quoteTableStyle, setQuoteTableStyle] = useState<{ fontFamily: string; fontSize: number; bold: boolean; color: string }>(() => { try { return { fontFamily: 'Arial, sans-serif', fontSize: 10, bold: false, color: '#202820', ...JSON.parse(localStorage.getItem('qadri-quote-table-style') || '{}') }; } catch { return { fontFamily: 'Arial, sans-serif', fontSize: 10, bold: false, color: '#202820' }; } });
  const newQuote = (): QuoteDraft => ({ number: `Q-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`, date: new Date().toISOString().slice(0, 10), title: 'عرض سعر', customer: '', customerPhone: '', customerLocation: '', website: window.location.origin, logoUrl: settings.logoUrl, companyNameEn: 'Al-Qadri Agricultural Establishment', companyLocationEn: 'Jerash - AlRashaidah', companyNameAr: 'مؤسسة القادري الزراعية', companyLocationAr: 'جرش – الرشايدة', currency: 'JOD', discount: 0, taxEnabled: false, taxRate: 16, notes: '', accent: settings.primaryColor, showScientificNames: true, landscapeDefaultSize: 58, landscapeDefaultShape: 'circle', landscapeAnnotations: [], items: [emptyQuoteItem()] });
  const [quote, setQuote] = useState<QuoteDraft>(newQuote);
  const invoiceMode = quote.documentType === 'invoice';
  const [invoiceRecord] = useState(() => new URLSearchParams(window.location.search).get('invoice'));
  const requestId = new URLSearchParams(window.location.search).get('request');
  useEffect(() => {
    if (invoiceRecord && invoiceRecord !== 'new') { const savedInvoice = (JSON.parse(localStorage.getItem('qadri-quotes') || '[]') as SavedQuote[]).find((entry) => entry.documentType === 'invoice' && entry.number === invoiceRecord); if (savedInvoice) { setQuote(savedInvoice); return; } }
    if (invoiceRecord === 'new') { setQuote((current) => ({ ...current, number: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`, documentType: 'invoice', title: 'فاتورة', companyNameAr: 'مؤسسة القادري الزراعية', companyLocationAr: 'جرش - الأردن', invoiceCompanyName: 'مؤسسة القادري الزراعية', invoiceCompanyLocation: 'جرش - الأردن', invoiceCompanyPhone: '0777772211 - 0778111155' })); }
    if (requestId) {
      const request = getQuoteRequests().find((entry) => entry.id === requestId);
      if (request) {
        setQuote((current) => ({ ...current, title: 'عرض سعر', customer: request.customerName, customerPhone: request.phone, notes: `طريقة الاستلام: ${request.fulfillment === 'delivery' ? `توصيل إلى ${request.region}` : 'استلام من المشتل'}`, items: request.items.map((entry) => ({ ...emptyQuoteItem(), code: '', name: entry.name, description: `الحجم: ${entry.size}`, category: entry.category, quantity: entry.quantity, price: 0, image: entry.image || '' })) }));
        return;
      }
    }
    const itemId = new URLSearchParams(window.location.search).get('item');
    const catalogItem = itemId ? getManagedPlants().find((item) => item.id === itemId) || quoteCatalogItems.find((item) => item.id === itemId) : undefined;
    if (!catalogItem) return;
    setQuote((current) => current.items.some((item) => item.name === catalogItem.nameAr) ? current : { ...current, items: [...current.items.filter((item) => item.name.trim()), { ...emptyQuoteItem(), name: catalogItem.source === 'plant' && 'scientificName' in catalogItem && catalogItem.scientificName ? `${catalogItem.nameAr} / ${catalogItem.scientificName}` : catalogItem.nameAr, scientificName: 'scientificName' in catalogItem && typeof catalogItem.scientificName === 'string' ? catalogItem.scientificName : '', description: '', category: catalogItem.categoryAr, image: catalogItem.image, landscapeIcon: 'landscapeIcon' in catalogItem && typeof catalogItem.landscapeIcon === 'string' ? catalogItem.landscapeIcon : '', landscapeSize: quote.landscapeDefaultSize ?? 58, landscapeShape: quote.landscapeDefaultShape && quote.landscapeDefaultShape !== 'auto' ? quote.landscapeDefaultShape : 'circle' }] });
  }, [requestId, invoiceRecord]);
  const subtotal = quote.items.reduce((sum, item) => sum + item.quantity * item.price, 0); const discountValue = Math.min(subtotal, Math.max(0, Number(quote.discount) || 0)); const taxValue = quote.taxEnabled ? (subtotal - discountValue) * quote.taxRate / 100 : 0; const grandTotal = subtotal - discountValue + taxValue;
  const patch = (next: Partial<QuoteDraft>) => setQuote((current) => ({ ...current, ...next }));
  const convertQuoteToInvoice = () => { const now = new Date(); const invoice: SavedQuote = { ...quote, number: `INV-${now.getFullYear()}-${String(now.getTime()).slice(-6)}`, date: now.toISOString().slice(0, 10), title: 'فاتورة', documentType: 'invoice', invoiceKinds: [], invoiceCompanyName: 'مؤسسة القادري الزراعية', invoiceCompanyLocation: 'جرش - الأردن', invoiceCompanyPhone: '0777772211 - 0778111155', items: quote.items.map((item) => ({ ...item, image: '' })), savedAt: now.toISOString() }; sessionStorage.setItem('qadri-invoice-conversion-draft', JSON.stringify(invoice)); setLocation('/admin/invoices?convert=1'); }; const patchItem = (id: string, next: Partial<QuoteItem>) => patch({ items: quote.items.map((item) => item.id === id ? { ...item, ...next } : item) });
  const addManagedPlant = (plant: ReturnType<typeof getManagedPlants>[number]) => {
    const name = plant.scientificName ? `${plant.nameAr} / ${plant.scientificName}` : plant.nameAr;
    patch({ items: [...quote.items.filter((item) => item.name.trim()), { ...emptyQuoteItem(), name, scientificName: plant.scientificName, description: '', category: plant.categoryAr, image: plant.image, landscapeIcon: plant.landscapeIcon, landscapeSize: 58 }] });
    setShowPlantPicker(false); setPlantSearch('');
  };
  const filteredPlants = managedPlants.filter((plant) => `${plant.nameAr} ${plant.scientificName} ${plant.categoryAr}`.toLocaleLowerCase().includes(plantSearch.trim().toLocaleLowerCase()));
  const filteredStoreProducts = storeProducts.filter((product) => `${product.nameAr} ${product.nameEn} ${product.category} ${product.descriptionAr}`.toLocaleLowerCase().includes(storeSearch.trim().toLocaleLowerCase()));
  const addStoreProduct = (product: StoreProduct) => { const storeCategoryLabels: Record<string, string> = { irrigation: 'شبكات الري', 'garden-decor': 'ديكور الحديقة', pots: 'أحواض وأصص', tools: 'أدوات زراعية', fertilizers: 'أسمدة ومحسنات تربة', pesticides: 'مبيدات ومعالجات', seeds: 'بذور', 'seedling-supplies': 'مستلزمات المشاتل' }; const categoryKey = product.category.trim(); const category = storeCategoryLabels[categoryKey.toLocaleLowerCase()] || (/^[\u0600-\u06FF\s]+$/.test(categoryKey) ? categoryKey : 'منتجات المتجر'); patch({ items: [...quote.items.filter((item) => item.name.trim()), { ...emptyQuoteItem(), code: product.id, name: product.nameAr || product.nameEn, description: product.descriptionAr || product.descriptionEn || '', category, quantity: 1, price: Number(product.price) || 0, image: product.image || '' }] }); };
  const addLandscapeMaterial = (name: string) => { const labels: Record<string, string> = { 'توف بركاني': 'مواد Landscape / توف بركاني', 'تربة حمراء': 'مواد Landscape / تربة حمراء', 'نجيل': 'مواد Landscape / نجيل', 'شبكة ري': 'مواد Landscape / شبكة ري', 'شارع': 'مواد Landscape / شارع', 'دوّار': 'مواد Landscape / دوّار' }; const selectedShape = quote.landscapeDefaultShape === 'auto' ? 'circle' : quote.landscapeDefaultShape ?? 'circle'; patch({ items: [...quote.items.filter((item) => item.name.trim()), { ...emptyQuoteItem(), name, category: labels[name] || 'مواد Landscape', landscapeSize: quote.landscapeDefaultSize ?? 58, landscapeShape: selectedShape, landscapeArea: 1 }] }); };
  const updateLandscapeItem = (id: string, changes: Partial<LandscapeQuoteItem>) => patchItem(id, changes);
  const updateLandscapeGlobalSettings = (size: number, shape: LandscapeGlobalShape) => patch({ landscapeDefaultSize: size, landscapeDefaultShape: shape, items: quote.items.map((item) => ({ ...item, landscapeSize: item.category.includes('مواد Landscape /') ? item.landscapeSize ?? size : size, landscapeShape: shape })) });
  const addSmartBatchItems = () => {
    const normalizePlantName = (value: string) => value.normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    const plants = getManagedPlants().filter((plant) => plant.source === 'plant');
    const findPlantImage = (name: string) => {
      const normalized = normalizePlantName(name);
      if (!normalized) return '';
      const match = plants.find((plant) => [plant.nameAr, plant.nameEn, plant.scientificName, `${plant.nameAr} / ${plant.scientificName}`]
        .filter(Boolean)
        .some((candidate) => normalizePlantName(candidate) === normalized));
      return match?.image || '';
    };
    const parsed = smartBatchInput.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const [quantity, name, description, category, price] = line.split('/').map((part) => part.trim());
      return { ...emptyQuoteItem(), quantity: Math.max(1, Number(quantity) || 1), name: name || '', description: description || '', category: category || '', price: Math.max(0, Number((price || '').replace(/[^0-9.]/g, '')) || 0), image: findPlantImage(name || '') };
    }).filter((item) => item.name);
    if (!parsed.length) return;
    patch({ items: [...quote.items.filter((item) => item.name.trim()), ...parsed] });
    setSmartBatchInput('');
    setShowSmartBatch(false);
  };
  const updateQuoteTableStyle = (next: Partial<typeof quoteTableStyle>) => setQuoteTableStyle((current) => { const value = { ...current, ...next }; localStorage.setItem('qadri-quote-table-style', JSON.stringify(value)); return value; }); const hideQuotePart = (event: React.MouseEvent<HTMLDivElement>) => { if (!deleteMode) return; const element = (event.target as HTMLElement).closest<HTMLElement>('[data-quote-part]'); const part = element?.dataset.quotePart; if (!part) return; event.preventDefault(); event.stopPropagation(); setHiddenQuoteParts((current) => { const value = current.includes(part) ? current : [...current, part]; localStorage.setItem('qadri-quote-hidden-parts', JSON.stringify(value)); return value; }); }; const restoreQuoteParts = () => { setHiddenQuoteParts([]); localStorage.removeItem('qadri-quote-hidden-parts'); setDeleteMode(false); };
  const saveQuote = () => { const next = [{ ...quote, savedAt: new Date().toISOString() }, ...history.filter((item) => item.number !== quote.number)]; setHistory(next); localStorage.setItem('qadri-quotes', JSON.stringify(next)); if (requestId) { const requests = getQuoteRequests(); saveQuoteRequests(requests.map((request) => request.id === requestId ? { ...request, status: 'priced', quoteNumber: quote.number, quoteTotal: grandTotal } : request)); } };
  const loadQuote = (saved: SavedQuote) => setQuote(saved);
  const analyze = () => { const average = quote.items.length ? subtotal / quote.items.length : 0; setAnalysis(average > 1000 ? 'العرض مرتفع نسبيًا لأن متوسط قيمة البند كبير. راجع الوصف والكميات وقارن تكلفة كل قسم قبل الإرسال.' : quote.discount > 15 ? 'الخصم مرتفع نسبيًا وقد يقلل هامش الربح. تأكد أن الخصم مبرر بحجم الطلب أو استراتيجية البيع.' : 'التسعير يبدو متوازنًا مبدئيًا. راجع تكلفة البنود، الكمية، والضريبة قبل اعتماد العرض النهائي.'); };
  const downloadQuotePdf = async () => {
    const source = document.querySelector<HTMLElement>('.quote-sheet');
    if (!source) return;
    try {
      await exportQuotePdf(source, quote.number || 'quote');
    } catch (error) {
      console.error('PDF generation failed', error);
      window.alert('تعذر إنشاء ملف PDF. يرجى إعادة المحاولة.');
    }
  };

  return <main className="quote-page"><header className="quote-page-head"><div className="quote-head-left"><button className="ai-back-button" onClick={() => setLocation('/admin')}><ArrowLeft size={17} /></button><div><div className="eyebrow">QADRI AI / SALES STUDIO</div><h1>{invoiceMode ? (quote.number.startsWith('Q-') ? 'فاتورة' : 'تعديل فاتورة') : 'محرر العروض'}</h1><p className="page-desc">{invoiceMode ? 'أنشئ فاتورة مشتريات أو مبيعات، احفظها في السجل ونزّلها PDF.' : 'أنشئ عرضًا أنيقًا، احفظه في السجل، ونزّله بالصيغة التي تناسبك.'}</p></div></div><div className="quote-tools"><button className="btn secondary small" onClick={downloadQuotePdf}><FileDown size={14} />تنزيل PDF</button><button className="btn secondary small" onClick={() => setShowLandscape(true)}><MapPinned size={14} />إنشاء Landscape</button><button className="btn secondary small quote-smart-batch-button" onClick={() => setShowSmartBatch(true)}><Sparkles size={14} />التحليل الذكي</button><button className={`btn secondary small ${deleteMode ? 'quote-delete-active' : ''}`} onClick={() => setDeleteMode((value) => !value)}><Trash2 size={14} />{deleteMode ? 'انقر على الجزء لحذفه' : 'حذف الأجزاء'}</button>{hiddenQuoteParts.length > 0 && <button className="btn secondary small" onClick={restoreQuoteParts}><RotateCcw size={14} />استعادة المحذوف</button>}<button className="btn secondary small" onClick={() => setShowQuoteTableSettings(true)}><Settings2 size={14} />إعدادات الجدول</button><button className="btn small" onClick={saveQuote}><SaveAll size={14} />{invoiceMode ? 'حفظ الفاتورة' : 'حفظ في السجل'}</button></div></header><div className="quote-workbench"><aside className="quote-workbench-sidebar"><section className="panel quote-side-panel"><div className="quote-side-title"><span>السجل المحفوظ</span><button onClick={() => setQuote(newQuote())}><Plus size={14} />جديد</button></div>{history.length ? history.map((saved) => <button className={`quote-history-row ${saved.number === quote.number ? 'active' : ''}`} key={saved.number} onClick={() => loadQuote(saved)}><strong>{saved.number}</strong><span>{saved.customer || 'بدون اسم زبون'}</span><small>{saved.date}</small></button>) : <p className="quote-side-empty">لا توجد عروض محفوظة بعد.</p>}</section><section className="panel quote-side-panel quote-analysis-panel"><div className="quote-side-title"><span>تحليل مالي</span><Calculator size={15} /></div><p>{analysis || 'اضغط تحليل مالي للحصول على قراءة سريعة للتسعير والخصم والهامش.'}</p><button className="btn secondary small" onClick={analyze}><Calculator size={14} />تحليل العرض ماليًا</button></section></aside><section className="quote-canvas-area"><div className="quote-canvas-toolbar"><button className="btn secondary small" onClick={convertQuoteToInvoice}>تحويل إلى فاتورة</button><button className="btn secondary small quote-plant-picker-button" onClick={() => { setManagedPlants(getManagedPlants()); setShowPlantPicker(true); }}><Sprout size={15} />اختيار من النباتات</button><button className="btn secondary small quote-store-picker-button" onClick={() => { setStoreProducts(getStoreProducts()); setShowStorePicker(true); }}><Store size={15} />اختيار من المتجر</button><label className="quote-color-picker">لون الجدول <input type="color" value={quote.accent} onChange={(event) => patch({ accent: event.target.value })} /></label></div><div className={`quote-sheet ${invoiceMode ? 'invoice-sheet' : ''} ${deleteMode ? 'quote-delete-mode' : ''}`} onClick={hideQuotePart} style={{ '--quote-accent': quote.accent, '--quote-table-font': quoteTableStyle.fontFamily, '--quote-table-size': `${quoteTableStyle.fontSize}px`, '--quote-table-weight': quoteTableStyle.bold ? 700 : 400, '--quote-table-color': quoteTableStyle.color } as CSSProperties}><style>{hiddenQuoteParts.map((part) => `.quote-sheet [data-quote-part="${part}"]{display:none!important}`).join('\n')}</style><div className="quote-sheet-header"><label data-quote-part="logo" className="quote-logo-box quote-logo-picker" title="انقر لاختيار شعار العرض"><img src={quote.logoUrl || settings.logoUrl || '/chatbot.png'} alt="شعار عرض السعر" /><span className="quote-logo-edit-hint">تغيير الشعار</span><input type="file" accept="image/*" aria-label="رفع شعار عرض السعر" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => patch({ logoUrl: String(reader.result) }); reader.readAsDataURL(file); event.target.value = ''; }} /></label><div data-quote-part="company-en" className="quote-company quote-company-en" dir="ltr"><input aria-label="اسم المؤسسة بالإنجليزية" value={quote.companyNameEn ?? 'Al-Qadri Agricultural Establishment'} onChange={(event) => patch({ companyNameEn: event.target.value })} /><input aria-label="موقع المؤسسة بالإنجليزية" value={quote.companyLocationEn ?? 'Jerash - AlRashaidah'} onChange={(event) => patch({ companyLocationEn: event.target.value })} /></div><div data-quote-part="company-ar" className="quote-company quote-company-ar" dir="rtl"><input aria-label="اسم المؤسسة بالعربية" value={invoiceMode ? (quote.invoiceCompanyName || 'مؤسسة القادري الزراعية') : (quote.companyNameAr ?? 'مؤسسة القادري الزراعية')} onChange={(event) => patch(invoiceMode ? { invoiceCompanyName: event.target.value } : { companyNameAr: event.target.value })} /><input aria-label="موقع المؤسسة بالعربية" value={invoiceMode ? (quote.invoiceCompanyLocation || 'جرش - الأردن') : (quote.companyLocationAr ?? 'جرش – الرشايدة')} onChange={(event) => patch(invoiceMode ? { invoiceCompanyLocation: event.target.value } : { companyLocationAr: event.target.value })} />{invoiceMode && <input aria-label="هاتف المؤسسة" value={quote.invoiceCompanyPhone || '0777772211 - 0778111155'} onChange={(event) => patch({ invoiceCompanyPhone: event.target.value })} />}</div><div data-quote-part="quote-title" className="quote-title-block"><input value={invoiceMode ? (quote.title === 'عرض سعر' ? 'فاتورة' : quote.title) : quote.title} onChange={(event) => patch({ title: event.target.value })} /></div></div><div data-quote-part="quote-meta" className="quote-meta-grid"><label data-quote-part="meta-number"><CalendarDays size={13} />{invoiceMode ? 'رقم الفاتورة' : 'رقم العرض'}<input value={quote.number} onChange={(event) => patch({ number: event.target.value })} /></label><label data-quote-part="meta-date"><CalendarDays size={13} />التاريخ<input type="date" value={quote.date} onChange={(event) => patch({ date: event.target.value })} /></label><label data-quote-part="meta-customer"><UserRoundIcon />اسم الزبون<input value={quote.customer} onChange={(event) => patch({ customer: event.target.value })} placeholder="اسم العميل أو الشركة" /></label><label data-quote-part="meta-phone"><Phone size={13} />هاتف الزبون<input type="tel" value={quote.customerPhone} onChange={(event) => patch({ customerPhone: event.target.value })} placeholder="رقم الهاتف" /></label>{invoiceMode && <label data-quote-part="meta-location">الموقع<input value={quote.customerLocation || ''} onChange={(event) => patch({ customerLocation: event.target.value })} placeholder="موقع الزبون" /></label>}</div><div data-quote-part="quote-items" className="quote-items-wrap"><table className="quote-items-table" dir="rtl"><thead><tr><th data-quote-part="col-delete" />{!invoiceMode && <th data-quote-part="col-number">#</th>}<th data-quote-part="col-name">{invoiceMode ? 'الاسم' : 'الاسم والوصف'}</th>{!invoiceMode && <th data-quote-part="col-category">القسم</th>}<th data-quote-part="col-quantity">الكمية</th><th data-quote-part="col-price">السعر</th><th data-quote-part="col-total">الإجمالي</th>{!invoiceMode && <th data-quote-part="col-image">الصورة</th>}</tr></thead><tbody>{quote.items.map((item, index) => <tr key={item.id}><td data-quote-part="col-delete"><button className="quote-remove" onClick={() => patch({ items: quote.items.filter((row) => row.id !== item.id) })} aria-label="حذف البند">×</button></td>{!invoiceMode && <td data-quote-part="col-number">{index + 1}</td>}<td data-quote-part="col-name" className="quote-item-description-cell"><input value={item.name} onChange={(event) => patchItem(item.id, { name: event.target.value })} placeholder="اسم المنتج" />{!invoiceMode && <textarea value={item.description} onChange={(event) => patchItem(item.id, { description: event.target.value })} placeholder="الوصف" />}</td>{!invoiceMode && <td data-quote-part="col-category"><input value={item.category} onChange={(event) => patchItem(item.id, { category: event.target.value })} placeholder="قسم" /></td>}<td data-quote-part="col-quantity" className="quote-centered-cell"><input type="number" min="1" value={item.quantity} onChange={(event) => patchItem(item.id, { quantity: Number(event.target.value) })} /></td><td data-quote-part="col-price" className="quote-centered-cell"><input type="number" min="0" value={item.price} onChange={(event) => patchItem(item.id, { price: Number(event.target.value) })} /></td><td data-quote-part="col-total" className="quote-line-total quote-centered-cell">{quoteMoney(item.quantity * item.price, quote.currency)}</td><td data-quote-part="col-image" className="quote-image-cell"><label className="quote-item-image quote-image-picker" title="اضغط لاختيار صورة">{item.image ? <img src={item.image} alt="صورة المنتج" /> : <><ImagePlus size={22} /><span>الصورة</span></>}<input type="file" accept="image/*" aria-label="اختيار صورة المنتج" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => patchItem(item.id, { image: String(reader.result) }); reader.readAsDataURL(file); event.target.value = ''; }} /></label></td></tr>)}</tbody></table><button className="quote-add-row" onClick={() => patch({ items: [...quote.items, emptyQuoteItem()] })}><Plus size={14} />إضافة بند جديد</button></div><div data-quote-part="quote-totals" className="quote-below-table-grid"><div className="quote-totals"><div><span>المجموع الفرعي</span><strong>{quoteMoney(subtotal, quote.currency)}</strong></div><div><span>الخصم</span><input type="number" min="0" max={subtotal} value={quote.discount} onChange={(event) => patch({ discount: Number(event.target.value) })} /><strong>-{quoteMoney(discountValue, quote.currency)}</strong></div><div className="quote-tax-row"><label><input type="checkbox" checked={quote.taxEnabled} onChange={(event) => patch({ taxEnabled: event.target.checked })} /> ضريبة {quote.taxRate}%</label><strong>{quoteMoney(taxValue, quote.currency)}</strong></div><div className="quote-grand-total"><span>الإجمالي النهائي</span><strong>{quoteMoney(grandTotal, quote.currency)}</strong></div></div></div><section data-quote-part="quote-notes" className="quote-notes quote-notes-under-table"><label>ملاحظات<textarea value={quote.notes} onChange={(event) => patch({ notes: event.target.value })} placeholder="اكتب الملاحظات هنا..." /></label></section>{invoiceMode && <div className="invoice-kind-panel" data-quote-part="invoice-kinds"><strong>نوع الفاتورة / الحالة</strong><div>{([['purchase','مشتريات'],['sales','مبيعات'],['receivable','ذمم'],['paid','مدفوع'],['online','أونلاين']] as [InvoiceKind,string][]).map(([kind,label]) => { const checked = (quote.invoiceKinds ?? []).includes(kind); return <button type="button" key={kind} className={checked ? 'checked' : ''} aria-pressed={checked} onClick={() => patch({ invoiceKinds: checked ? (quote.invoiceKinds ?? []).filter((value) => value !== kind) : [...(quote.invoiceKinds ?? []), kind] })}>{checked && <Check size={14} />}<span>{label}</span></button>; })}</div></div>}<div data-quote-part="quote-signoff" className="quote-signoff"><div className="quote-signoff-message">وتفضلوا بقبول فائق الاحترام والتقدير</div><div className="quote-signature"><strong>المدير العام/ ثامر احمد القادري</strong><img src="/quote-signature-stamp.png" alt="ختم مؤسسة القادري الزراعية" /></div></div><footer data-quote-part="quote-contact-footer" className="quote-sheet-footer">{invoiceMode ? <span>📞 {quote.invoiceCompanyPhone || '0777772211 - 0778111155'}</span> : <><span data-quote-part="contact-phone">📞 00962777772211</span><span data-quote-part="contact-email">✉️ tamerqadri@gmail.com</span><span data-quote-part="contact-website">🌐 https://www.alqadrioffers.online</span></>}</footer></div>{showSmartBatch && <div className="managed-editor-backdrop" onClick={() => setShowSmartBatch(false)}><section className="managed-editor quote-smart-modal" onClick={(event) => event.stopPropagation()}><header><div><div className="eyebrow">SMART LINE ANALYSIS</div><h2>التحليل الذكي</h2><p>كل سطر: الكمية / الاسم / الوصف / القسم / السعر</p></div><button className="icon-button" onClick={() => setShowSmartBatch(false)} aria-label="إغلاق"><X size={17} /></button></header><textarea dir="rtl" value={smartBatchInput} onChange={(event) => setSmartBatchInput(event.target.value)} placeholder="3 / نخيل تمري / صحراوي / نخيل / 150&#10;2 / زيتون / بلدي / أشجار / 80" /><footer><button className="btn secondary" onClick={() => setShowSmartBatch(false)}>إلغاء</button><button className="btn" onClick={addSmartBatchItems} disabled={!smartBatchInput.trim()}><Plus size={14} />إضافة البنود</button></footer></section></div>}{showQuoteTableSettings && <div className="managed-editor-backdrop" onClick={() => setShowQuoteTableSettings(false)}><section className="managed-editor quote-settings-modal" onClick={(event) => event.stopPropagation()}><header><div><div className="eyebrow">TABLE STYLE</div><h2>إعدادات الجدول</h2></div><button className="icon-button" onClick={() => setShowQuoteTableSettings(false)} aria-label="إغلاق"><X size={17} /></button></header><label>نوع الخط<select value={quoteTableStyle.fontFamily} onChange={(event) => updateQuoteTableStyle({ fontFamily: event.target.value })}><option value="Arial, sans-serif">Arial</option><option value="Tahoma, sans-serif">Tahoma</option><option value="'Noto Sans Arabic', sans-serif">Noto Sans Arabic</option><option value="'DM Sans', sans-serif">DM Sans</option><option value="Georgia, serif">Georgia</option></select></label><label>حجم الخط: {quoteTableStyle.fontSize}px<input type="range" min="8" max="18" value={quoteTableStyle.fontSize} onChange={(event) => updateQuoteTableStyle({ fontSize: Number(event.target.value) })} /></label><label className="quote-settings-bold"><input type="checkbox" checked={quoteTableStyle.bold} onChange={(event) => updateQuoteTableStyle({ bold: event.target.checked })} /> خط عريض (Bold)</label><label>لون الخط<input type="color" value={quoteTableStyle.color} onChange={(event) => updateQuoteTableStyle({ color: event.target.value })} /></label><footer><button className="btn secondary" onClick={() => updateQuoteTableStyle({ fontFamily: 'Arial, sans-serif', fontSize: 10, bold: false, color: '#202820' })}>إعادة ضبط</button><button className="btn" onClick={() => setShowQuoteTableSettings(false)}>تم</button></footer></section></div>}{showPlantPicker && <div className="managed-editor-backdrop" onClick={() => setShowPlantPicker(false)}><section className="managed-editor plant-picker-modal" onClick={(event) => event.stopPropagation()}><header><div><div className="eyebrow">PLANT LIBRARY</div><h2>اختيار نبتة لعرض السعر</h2></div><button className="icon-button" onClick={() => setShowPlantPicker(false)} aria-label="إغلاق"><X size={17} /></button></header><label className="managed-search picker-search"><Search size={16} /><input value={plantSearch} onChange={(event) => setPlantSearch(event.target.value)} placeholder="ابحث بالاسم أو الاسم العلمي..." /></label><div className="plant-picker-list">{filteredPlants.length ? filteredPlants.map((plant) => <button className="plant-picker-row" key={plant.id} onClick={() => addManagedPlant(plant)}><span className="plant-picker-thumb">{plant.image ? <img src={plant.image} alt="" /> : <Sprout size={18} />}</span><span><strong>{plant.nameAr}</strong><small>{plant.scientificName || plant.nameEn} · {plant.categoryAr}</small><em>{plant.descriptionAr || 'لا يوجد وصف مضاف'}</em></span><Plus size={16} /></button>) : <p className="managed-catalog-empty">لا توجد نباتات مطابقة. أضف النباتات من إدارة الكتالوج.</p>}</div><footer><Link className="btn secondary" href="/admin/catalog">إدارة الكتالوج</Link><button className="btn" onClick={() => setShowPlantPicker(false)}>إغلاق</button></footer></section></div>}{showStorePicker && <div className="managed-editor-backdrop" onClick={() => setShowStorePicker(false)}><section className="managed-editor plant-picker-modal store-picker-modal" onClick={(event) => event.stopPropagation()}><header><div><div className="eyebrow">STORE INVENTORY</div><h2>اختيار منتج من المتجر</h2><p>اضغط على المنتج لإضافته إلى بنود عرض السعر.</p></div><button className="icon-button" onClick={() => setShowStorePicker(false)} aria-label="إغلاق"><X size={17} /></button></header><label className="managed-search picker-search"><Search size={16} /><input value={storeSearch} onChange={(event) => setStoreSearch(event.target.value)} placeholder="ابحث باسم المنتج أو الفئة..." /></label><div className="plant-picker-list">{filteredStoreProducts.length ? filteredStoreProducts.map((product) => <button className="plant-picker-row store-picker-row" key={product.id} onClick={() => addStoreProduct(product)}><span className="plant-picker-thumb">{product.image ? <img src={product.image} alt="" /> : <Store size={18} />}</span><span><strong>{product.nameAr || product.nameEn}</strong><small>{product.category || 'منتج متجر'}{product.price !== '' ? ` · ${product.price} د.أ` : ''}</small><em>{product.descriptionAr || product.descriptionEn || 'لا يوجد وصف مضاف'}</em></span><Plus size={16} /></button>) : <div className="managed-catalog-empty"><p>{storeProducts.length ? 'لا توجد منتجات مطابقة للبحث.' : 'لا توجد منتجات في المتجر بعد. أضف المنتجات من صفحة إدارة المتجر.'}</p>{!storeProducts.length && <Link className="btn secondary small" href="/admin/store"><Store size={14} />إدارة المتجر</Link>}</div>}</div><footer><button className="btn secondary" onClick={() => setShowStorePicker(false)}>تم</button></footer></section></div>}{showLandscape && <div className="landscape-preview-wrap"><div className="landscape-preview-actions"><strong>Landscape حسب عرض السعر</strong><button className="btn secondary small" onClick={() => setShowLandscape(false)}>إغلاق المعاينة</button></div><LandscapePlan quote={quote} onItemChange={updateLandscapeItem} onShowScientificNamesChange={(value) => patch({ showScientificNames: value })} onGlobalSettingsChange={updateLandscapeGlobalSettings} onAnnotationsChange={(landscapeAnnotations) => patch({ landscapeAnnotations })} onAddMaterial={addLandscapeMaterial} /></div>}</section></div></main>;
}
function UserRoundIcon() { return <span className="quote-user-icon">●</span>; }
function AdminDashboardPage() {
  const { settings, update } = useAdminSettings(); const [, setLocation] = useLocation();
  const chartData = [{ name: 'Jan', visits: 420, leads: 32 }, { name: 'Feb', visits: 610, leads: 46 }, { name: 'Mar', visits: 540, leads: 41 }, { name: 'Apr', visits: 830, leads: 68 }, { name: 'May', visits: 760, leads: 59 }, { name: 'Jun', visits: 980, leads: 84 }];
  const set = (key: keyof AdminSettings, value: string) => update({ [key]: value });
  const [draftSocial, setDraftSocial] = useState<{ label: string; url: string; icon: SocialIcon }>({ label: '', url: '', icon: 'instagram' });
  const socialLinks = settings.socialLinks ?? [];
  const heroSlides = settings.heroSlides ?? []; const [heroSlideUrl, setHeroSlideUrl] = useState('');
  const updateSocial = (id: string, patch: Partial<SocialLink>) => update({ socialLinks: socialLinks.map((social) => social.id === id ? { ...social, ...patch } : social) });
  const addSocial = () => {
    const label = draftSocial.label.trim(); const url = draftSocial.url.trim();
    if (!label || !/^https?:\/\//i.test(url)) return;
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    update({ socialLinks: [...socialLinks, { id, label, url, icon: draftSocial.icon }] });
    setDraftSocial({ label: '', url: '', icon: 'instagram' });
  };
  const removeSocial = (id: string) => update({ socialLinks: socialLinks.filter((social) => social.id !== id) });
  const removeHeroSlide = (id: string) => update({ heroSlides: heroSlides.filter((slide) => slide.id !== id) });
  const addHeroSlideUrl = () => { const src = heroSlideUrl.trim(); if (!src) return; update({ heroSlides: [...heroSlides, { id: `${Date.now()}`, src, alt: 'QADRI AI visual' }] }); setHeroSlideUrl(''); };
  const addHeroSlideFiles = (event: ChangeEvent<HTMLInputElement>) => { Array.from(event.target.files || []).forEach((file, index) => { const reader = new FileReader(); reader.onload = () => update({ heroSlides: [...(settings.heroSlides ?? []), { id: `${Date.now()}-${index}`, src: String(reader.result), alt: file.name }] }); reader.readAsDataURL(file); }); event.target.value = ''; };
  const logout = () => { localStorage.removeItem('qadri-admin-session'); setLocation('/'); };
  return <main className="admin-page admin-dashboard-page"><aside className="admin-dashboard-sidebar"><div className="admin-sidebar-brand"><span className="admin-sidebar-brand-mark"><img src={settings.logoUrl || '/chatbot.png'} alt="شعار الموقع" onError={(event) => { event.currentTarget.src = '/chatbot.png'; }} /></span><div><strong>القادري</strong><small>لوحة الإدارة</small></div></div><div className="admin-sidebar-caption">إدارة المؤسسة</div><nav className="admin-sidebar-nav"><Link href="/admin/quotes/new"><FileSpreadsheet size={17} />إنشاء عرض سعر</Link><Link href="/admin/invoices"><Receipt size={17} />فواتير</Link><Link href="/admin/purchase-orders"><Package size={17} />طلب شراء</Link><Link href="/admin/official-letters"><FileText size={17} />كتب رسمية</Link><Link href="/admin/quote-requests"><FileText size={17} />طلبات عروض الأسعار</Link><Link href="/admin/store-orders"><ShoppingBag size={17} />طلبات المتجر</Link><Link href="/admin/catalog"><Sprout size={17} />إدارة كتالوج النباتات والمواد</Link><Link href="/admin/projects"><FileText size={17} />إدارة المشاريع</Link><Link href="/admin/store"><Store size={17} />إدارة المتجر</Link><Link href="/admin/training"><BrainCircuit size={17} />تدريب الوكيل</Link><Link href="/"><Globe2 size={17} />مشاهدة الموقع</Link></nav><button className="admin-sidebar-logout" onClick={logout}><LogOut size={17} />تسجيل الخروج</button></aside><div className="admin-dashboard-content"><div className="admin-head"><div><div className="eyebrow">QADRI AI / ADMIN DASHBOARD</div><h1>لوحة تحكم الأدمن</h1><p className="page-desc">تحليلات الموقع وإدارة الهوية والمحتوى من مكان واحد.</p></div></div><div className="admin-metrics"><section className="panel admin-metric"><span>زيارات الموقع</span><strong>4,140</strong><small>+18.4% هذا الشهر</small></section><section className="panel admin-metric"><span>طلبات التواصل</span><strong>330</strong><small>+12.1% هذا الشهر</small></section><section className="panel admin-metric"><span>معدل التحويل</span><strong>8.1%</strong><small>قابل للربط بالبيانات لاحقًا</small></section><section className="panel admin-metric"><span>آخر تحديث</span><strong>الآن</strong><small>إعدادات محفوظة محليًا</small></section></div><div className="admin-chart-grid"><section className="panel admin-chart-card"><div className="panel-head"><div><h2 className="panel-title">أداء الموقع</h2><div className="panel-kicker">زيارات العملاء والطلبات خلال الأشهر الأخيرة</div></div></div><div className="admin-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={settings.primaryColor} stopOpacity={0.28} /><stop offset="95%" stopColor={settings.primaryColor} stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#02061812" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} /><Tooltip /><Area type="monotone" dataKey="visits" stroke={settings.primaryColor} fill="url(#visitsFill)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></section><section className="panel admin-chart-card"><div className="panel-head"><div><h2 className="panel-title">طلبات التواصل</h2><div className="panel-kicker">بيانات تجريبية جاهزة للربط مع التحليلات</div></div></div><div className="admin-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid stroke="#02061812" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="leads" fill={settings.primaryColor} radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></section></div><section className="panel admin-editor"><div className="panel-head"><div><h2 className="panel-title">تعديل الموقع</h2><div className="panel-kicker">أي تغيير تحفظه هنا يظهر مباشرة على الصفحة الرئيسية في هذا المتصفح.</div></div></div><div className="admin-editor-grid"><div className="field"><label>اسم الموقع بالإنجليزية</label><input value={settings.brandNameEn} onChange={(event) => set('brandNameEn', event.target.value)} /></div><div className="field"><label>اسم الموقع بالعربية</label><input value={settings.brandNameAr} onChange={(event) => set('brandNameAr', event.target.value)} /></div><div className="field"><label>رقم الهاتف</label><input dir="ltr" value={settings.phone} onChange={(event) => set('phone', event.target.value.replace(/[^0-9+]/g, ''))} /></div><div className="field"><label>رابط الشعار</label><input dir="ltr" value={settings.logoUrl} onChange={(event) => set('logoUrl', event.target.value)} /></div><div className="field"><label>اللون الرئيسي</label><div className="admin-color-field"><input type="color" value={settings.primaryColor} onChange={(event) => set('primaryColor', event.target.value)} /><code>{settings.primaryColor}</code></div></div><div className="field"><label>عنوان الصفحة بالإنجليزية</label><textarea value={settings.heroTitleEn} onChange={(event) => set('heroTitleEn', event.target.value)} /></div><div className="field"><label>عنوان الصفحة بالعربية</label><textarea value={settings.heroTitleAr} onChange={(event) => set('heroTitleAr', event.target.value)} /></div><div className="field full"><label>وصف الصفحة بالإنجليزية</label><textarea value={settings.heroDescriptionEn} onChange={(event) => set('heroDescriptionEn', event.target.value)} /></div><div className="field full"><label>وصف الصفحة بالعربية</label><textarea value={settings.heroDescriptionAr} onChange={(event) => set('heroDescriptionAr', event.target.value)} /></div></div><p className="admin-save-note" role="status">يتم الحفظ تلقائيًا في المتصفح.</p></section>
    <section className="panel admin-editor admin-page-controls"><div className="panel-head"><div><h2 className="panel-title">صلاحيات ظهور صفحات الموقع</h2><div className="panel-kicker">تحكم بما يظهر في النافبار، وافتح كل صفحة لمراجعتها.</div></div></div><div className="admin-page-control-grid"><label><span><strong>مشاريعنا وأعمالنا</strong><small>صفحة المعرض /projects</small></span><input type="checkbox" checked={settings.sitePages?.projects ?? true} onChange={(event) => update({ sitePages: { ...(settings.sitePages || defaultAdminSettings.sitePages), projects: event.target.checked } })} /><Link className="btn secondary small" href="/projects">فتح الصفحة</Link></label><label><span><strong>طلب عرض سعر</strong><small>كتالوج النباتات والمواد /quotes</small></span><input type="checkbox" checked={settings.sitePages?.quoteRequest ?? true} onChange={(event) => update({ sitePages: { ...(settings.sitePages || defaultAdminSettings.sitePages), quoteRequest: event.target.checked } })} /><Link className="btn secondary small" href="/quotes">فتح الصفحة</Link></label><label><span><strong>المتجر</strong><small>منتجات المخزون المسجلة /store</small></span><input type="checkbox" checked={settings.sitePages?.store ?? true} onChange={(event) => update({ sitePages: { ...(settings.sitePages || defaultAdminSettings.sitePages), store: event.target.checked } })} /><Link className="btn secondary small" href="/store">فتح الصفحة</Link></label></div><p className="admin-save-note">تغيير الإظهار محفوظ في إعدادات الأدمن لهذا المتصفح. مزامنته بين الأجهزة تحتاج اتصال Neon للمشروع.</p></section>
    <section className="panel admin-editor admin-social-editor"><div className="panel-head"><div><h2 className="panel-title">روابط السوشيال ميديا</h2><div className="panel-kicker">أضف الروابط التي ستظهر في الفوتر. التعديل والحذف يتمان مباشرة.</div></div></div><div className="admin-social-list">{socialLinks.length ? socialLinks.map((social) => <div className="admin-social-row" key={social.id}><div className="admin-social-icon"><SocialIconMark icon={social.icon} /></div><div className="field"><label>الاسم</label><input value={social.label} onChange={(event) => updateSocial(social.id, { label: event.target.value })} /></div><div className="field"><label>الرابط</label><input dir="ltr" type="url" value={social.url} onChange={(event) => updateSocial(social.id, { url: event.target.value })} /></div><div className="field"><label>المنصة</label><select value={social.icon} onChange={(event) => updateSocial(social.id, { icon: event.target.value as SocialIcon })}><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="linkedin">LinkedIn</option><option value="youtube">YouTube</option><option value="website">Website</option></select></div><button type="button" className="icon-button admin-delete-social" onClick={() => removeSocial(social.id)} aria-label={`حذف ${social.label}`} title="حذف الرابط"><Trash2 size={15} /></button></div>) : <p className="admin-social-empty">لا توجد روابط مضافة بعد. أضف أول رابط ليظهر في الفوتر.</p>}</div><div className="admin-social-add"><div className="field"><label>اسم الرابط</label><input value={draftSocial.label} onChange={(event) => setDraftSocial((current) => ({ ...current, label: event.target.value }))} placeholder="Instagram" /></div><div className="field"><label>الرابط الكامل</label><input dir="ltr" type="url" value={draftSocial.url} onChange={(event) => setDraftSocial((current) => ({ ...current, url: event.target.value }))} placeholder="https://instagram.com/..." /></div><div className="field"><label>المنصة</label><select value={draftSocial.icon} onChange={(event) => setDraftSocial((current) => ({ ...current, icon: event.target.value as SocialIcon }))}><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="linkedin">LinkedIn</option><option value="youtube">YouTube</option><option value="website">Website</option></select></div><button type="button" className="btn small" onClick={addSocial} disabled={!draftSocial.label.trim() || !/^https?:\/\//i.test(draftSocial.url.trim())}><Plus size={14} />إضافة رابط</button></div><p className="admin-save-note" role="status">تظهر التغييرات فوراً في الفوتر وتحفظ تلقائياً في إعدادات الأدمن.</p></section><section className="panel admin-editor admin-slides-editor"><div className="panel-head"><div><h2 className="panel-title">صور الصفحة الرئيسية</h2><div className="panel-kicker">أضف الصور التي ستظهر مكان المربع السابق. تتغير تلقائيًا كل 2.2 ثانية بحركة نبض ناعمة.</div></div><span className="training-count">{heroSlides.length}</span></div><div className="admin-slide-grid">{heroSlides.map((slide, index) => <div className="admin-slide-card" key={slide.id}><img src={slide.src} alt={slide.alt} /><span>الصورة {index + 1}</span><button type="button" onClick={() => removeHeroSlide(slide.id)} aria-label="حذف الصورة"><Trash2 size={14} /></button></div>)}</div><div className="admin-slide-add"><label className="btn secondary small"><Upload size={14} />رفع صور من الجهاز<input type="file" accept="image/*" multiple onChange={addHeroSlideFiles} /></label><div className="admin-slide-url"><input dir="ltr" value={heroSlideUrl} onChange={(event) => setHeroSlideUrl(event.target.value)} placeholder="https://example.com/image.jpg" /><button className="btn secondary small" onClick={addHeroSlideUrl} disabled={!heroSlideUrl.trim()}><Plus size={14} />إضافة بالرابط</button></div></div><p className="admin-save-note" role="status">تُحفظ الصور والإعدادات تلقائيًا في هذا المتصفح، ويمكن حذف أي صورة من زر سلة المهملات.</p></section></div></main>;
}
function SettingsPage() {
  const { workspace } = useWorkspace(); const { user } = useUser(); const { lang, setLang } = useLang();
  const [tab, setTab] = useState<'account' | 'workspace' | 'language'>('account');
  return <main className="page"><PageTitle eyebrow="PREFERENCES" title="Settings" description="Manage your account, workspace context, and language." />
    <section className="panel form-card"><div className="settings-nav"><button onClick={() => setTab('account')} className={`settings-tab ${tab === 'account' ? 'active' : ''}`}>Account</button><button onClick={() => setTab('workspace')} className={`settings-tab ${tab === 'workspace' ? 'active' : ''}`}>Workspace</button><button onClick={() => setTab('language')} className={`settings-tab ${tab === 'language' ? 'active' : ''}`}>Language</button></div>
      {tab === 'account' && <div className="form-grid"><InfoBlock label="Name" value={user?.fullName || '—'} /><InfoBlock label="Email" value={user?.primaryEmailAddress?.emailAddress || '—'} /><div className="field full"><label>Authentication</label><div className="panel p-4 text-xs leading-relaxed">Your account is secured by Clerk. Sign-in and session state use your browser's secure session cookie.</div></div></div>}
      {tab === 'workspace' && <div className="form-grid"><InfoBlock label="Workspace name" value={workspace?.name || '—'} /><InfoBlock label="Workspace ID" value={String(workspace?.id ?? '—')} /><div className="field full"><label>Knowledge and agent ownership</label><div className="panel p-4 text-xs leading-relaxed">Agents, products, approved answers, business policies, and channel states belong to this workspace.</div></div></div>}
      {tab === 'language' && <div className="form-grid"><Field label="Interface language"><select value={lang} onChange={(e) => setLang(e.target.value as Lang)}><option value="en">English · Left to right</option><option value="ar">العربية · من اليمين إلى اليسار</option></select></Field><div className="field"><label>Direction</label><div className="panel p-3 text-xs">{lang === 'ar' ? 'RTL — من اليمين إلى اليسار' : 'LTR — Left to right'}</div></div><div className="field full"><p className="page-desc">The workspace interface direction updates immediately. Agent response language is configured for each agent.</p></div></div>}
    </section></main>;
}
function RootRoute() {
  return <><Show when="signed-out"><HomePage /></Show><Show when="signed-in"><Redirect to="/dashboard" /></Show></>;
}
function ProtectedRoute({ children }: { children: ReactNode }) { return <Protected>{children}</Protected>; }
function AuthSetupPage() {
  const { lang } = useLang();
  return <main className="public-home"><nav className="public-nav"><SiteBrand /><LanguageButton /></nav><section className="public-section"><div className="panel form-card" style={{ maxWidth: 620, margin: '40px auto' }}><div className="eyebrow">AYOUB AI / ACCOUNT SETUP</div><h1>{tr(lang, 'Account access is not configured yet', 'لم يتم إعداد الدخول إلى الحساب بعد')}</h1><p className="page-desc">{tr(lang, 'The public site is available, but sign-up and sign-in need the project owner to configure Clerk keys for the frontend and API. No demo account or simulated authentication is being used.', 'الموقع العام متاح، لكن التسجيل وتسجيل الدخول يحتاجان إلى إعداد مفاتيح Clerk للواجهة والخادم. لن نستخدم حسابًا تجريبيًا أو دخولًا وهميًا.')}</p><Link className="btn secondary small" href="/">{tr(lang, 'Back to home', 'العودة إلى الرئيسية')} <ArrowLeft size={14} /></Link></div></section></main>;
}
function PublicPreviewRouter() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/" component={HomePage} />
    <Route path="/chat" component={AiChatPage} />
    <Route path="/quotes" component={QuoteCatalogPage} />
    <Route path="/about" component={AboutUsPage} />
    <Route path="/projects" component={PublicProjectsRoute} />
    <Route path="/store" component={PublicStoreRoute} />
    <Route path="/cart" component={StoreCartPage} />
    <Route path="/checkout" component={StoreCheckoutPage} />
    <Route path="/plant-treatment" component={PublicPlantTreatmentRoute} />
    <Route path="/landscape-editor" component={PublicLandscapeEditorRoute} />
    <Route path="/sign-in/*?" component={AdminLoginPage} />
    <Route path="/admin/login" component={AdminLoginPage} />
    <Route path="/admin"><AdminGuard><AdminDashboardPage /></AdminGuard></Route>
    <Route path="/admin/training"><AdminGuard><AdminTrainingPage /></AdminGuard></Route>
    <Route path="/admin/quote-requests"><AdminGuard><AdminQuoteRequestsPage /></AdminGuard></Route>
    <Route path="/admin/store-orders"><AdminGuard><AdminStoreOrdersPage /></AdminGuard></Route>
    <Route path="/admin/projects"><AdminGuard><AdminProjectsPage /></AdminGuard></Route>
    <Route path="/admin/store"><AdminGuard><AdminStorePage /></AdminGuard></Route>
    <Route path="/admin/quotes/new"><AdminGuard><AdminQuotePage /></AdminGuard></Route>
    <Route path="/admin/invoices"><AdminGuard><AdminInvoicesPage /></AdminGuard></Route>
    <Route path="/admin/purchase-orders"><AdminGuard><AdminOperationsPage kind="purchase" /></AdminGuard></Route>
    <Route path="/admin/official-letters"><AdminGuard><AdminOperationsPage kind="letter" /></AdminGuard></Route>
    <Route path="/admin/catalog"><AdminGuard><ManagedCatalogPage /></AdminGuard></Route>
    <Route path="/sign-up/*?" component={AuthSetupPage} />
    <Route component={NotFound} />
  </Switch></ErrorBoundary>;
}
function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/" component={RootRoute} />
    <Route path="/chat" component={AiChatPage} />
    <Route path="/quotes" component={QuoteCatalogPage} />
    <Route path="/projects" component={PublicProjectsRoute} />
    <Route path="/store" component={PublicStoreRoute} />
    <Route path="/cart" component={StoreCartPage} />
    <Route path="/checkout" component={StoreCheckoutPage} />
    <Route path="/plant-treatment" component={PublicPlantTreatmentRoute} />
    <Route path="/landscape-editor" component={PublicLandscapeEditorRoute} />
    <Route path="/sign-in/*?" component={AdminLoginPage} />
    <Route path="/sign-up/*?"><SignUp routing="path" path={`${basePath}/sign-up`} /></Route>
    <Route path="/admin/login" component={AdminLoginPage} />
    <Route path="/admin"><AdminGuard><AdminDashboardPage /></AdminGuard></Route>
    <Route path="/admin/training"><AdminGuard><AdminTrainingPage /></AdminGuard></Route>
    <Route path="/admin/quote-requests"><AdminGuard><AdminQuoteRequestsPage /></AdminGuard></Route>
    <Route path="/admin/store-orders"><AdminGuard><AdminStoreOrdersPage /></AdminGuard></Route>
    <Route path="/admin/projects"><AdminGuard><AdminProjectsPage /></AdminGuard></Route>
    <Route path="/admin/store"><AdminGuard><AdminStorePage /></AdminGuard></Route>
    <Route path="/admin/quotes/new"><AdminGuard><AdminQuotePage /></AdminGuard></Route>
    <Route path="/admin/invoices"><AdminGuard><AdminInvoicesPage /></AdminGuard></Route>
    <Route path="/admin/catalog"><AdminGuard><ManagedCatalogPage /></AdminGuard></Route>
    <Route path="/dashboard"><ProtectedRoute><DashboardPage /></ProtectedRoute></Route>
    <Route path="/agents"><ProtectedRoute><AgentsPage /></ProtectedRoute></Route>
    <Route path="/agents/new"><ProtectedRoute><AgentBuilderPage /></ProtectedRoute></Route>
    <Route path="/agents/:agentId/setup"><ProtectedRoute><AgentBuilderPage /></ProtectedRoute></Route>
    <Route path="/agents/:agentId/test"><ProtectedRoute><AgentTestPage /></ProtectedRoute></Route>
    <Route path="/agents/:agentId/edit"><ProtectedRoute><AgentFormPage editing /></ProtectedRoute></Route>
    <Route path="/agents/:agentId"><ProtectedRoute><AgentDetailsPage /></ProtectedRoute></Route>
    <Route path="/knowledge/products"><ProtectedRoute><ProductsPage /></ProtectedRoute></Route>
    <Route path="/knowledge/faqs"><ProtectedRoute><FaqsPage /></ProtectedRoute></Route>
    <Route path="/knowledge/business"><ProtectedRoute><BusinessPage /></ProtectedRoute></Route>
    <Route path="/channels"><ProtectedRoute><ChannelsPage /></ProtectedRoute></Route>
    <Route path="/settings"><ProtectedRoute><SettingsPage /></ProtectedRoute></Route>
    <Route component={NotFound} />
  </Switch></ErrorBoundary>;
}
function App() {
  if (!clerkPubKey) {
    return <AdminSettingsProvider><QueryClientProvider client={queryClient}><TooltipProvider><LanguageProvider><WouterRouter base={basePath}><PublicPreviewRouter /></WouterRouter><Toaster /></LanguageProvider></TooltipProvider></QueryClientProvider></AdminSettingsProvider>;
  }
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} routerPush={(to) => { window.history.pushState(null, '', stripBase(to)); window.dispatchEvent(new PopStateEvent('popstate')); }} routerReplace={(to) => { window.history.replaceState(null, '', stripBase(to)); window.dispatchEvent(new PopStateEvent('popstate')); }}>
    <AdminSettingsProvider><QueryClientProvider client={queryClient}><TooltipProvider><LanguageProvider><WouterRouter base={basePath}><Router /></WouterRouter><Toaster /></LanguageProvider></TooltipProvider></QueryClientProvider></AdminSettingsProvider>
  </ClerkProvider>;
}

export default App;
