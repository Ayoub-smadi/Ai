import { useEffect, useMemo, useState, useRef, createContext, useContext, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignUp, Show, useAuth, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import {
  Activity, ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, Bot, Building2, Check,
  ChevronRight, CircleHelp, Code2, Download, Droplets, FileText, Flower2, Globe2, HeartPulse, Languages, LayoutDashboard, Leaf, LifeBuoy, LoaderCircle,
  Facebook, Instagram, Linkedin, LogOut, Menu, MessageCircle, MessageSquareText, Package, Plus, Save, Search, Settings2, ShieldCheck,
  Shovel, SlidersHorizontal, Sparkles, Sprout, Store, Trash2, Upload, Wifi, X, Youtube
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
type HeroMotionIcon = 'sprout' | 'garden' | 'care';
type HeroMotionScene = { id: string; icon: HeroMotionIcon; titleEn: string; titleAr: string; descriptionEn: string; descriptionAr: string };
const defaultHeroMotionScenes: HeroMotionScene[] = [
  { id: 'project', icon: 'sprout', titleEn: 'Starting an agricultural project?', titleAr: 'عندك مشروع زراعي؟', descriptionEn: 'Let’s turn your idea into a clear growing plan.', descriptionAr: 'نحوّل فكرتك إلى بداية واضحة وخطة نموّ.' },
  { id: 'garden', icon: 'garden', titleEn: 'Ready to plant your garden?', titleAr: 'عندك حديقة وبدك تزرعها؟', descriptionEn: 'Choose the right plants and make every corner bloom.', descriptionAr: 'نختار معك النباتات المناسبة ونرتّب خطوات الزراعة.' },
  { id: 'care', icon: 'care', titleEn: 'Is your plant looking unwell?', titleAr: 'نبتتك تعبانة وبدها عناية؟', descriptionEn: 'Understand what it needs and help it thrive again.', descriptionAr: 'نساعدك تعرف احتياجها وتعتني فيها بطريقة أفضل.' },
];
type AdminSettings = { brandNameEn: string; brandNameAr: string; phone: string; primaryColor: string; logoUrl: string; heroTitleEn: string; heroTitleAr: string; heroDescriptionEn: string; heroDescriptionAr: string; heroMotionEnabled: boolean; heroMotionScenes: HeroMotionScene[]; socialLinks: SocialLink[] };
const defaultAdminSettings: AdminSettings = { brandNameEn: 'QADRI AI', brandNameAr: 'قادري AI', phone: '0777772211', primaryColor: '#020618', logoUrl: '/chatbot.png', heroTitleEn: 'Customer care\nthat knows\nyour business.', heroTitleAr: 'خدمة عملاء\nتعرف عملك.', heroDescriptionEn: 'Build a bilingual AI agent that answers from your real products, policies, and approved answers.', heroDescriptionAr: 'أنشئ وكيلاً ذكياً ثنائي اللغة يجيب من منتجاتك وسياساتك وإجاباتك المعتمدة.', heroMotionEnabled: true, heroMotionScenes: defaultHeroMotionScenes, socialLinks: [] };
const AdminSettingsContext = createContext<{ settings: AdminSettings; update: (patch: Partial<AdminSettings>) => void }>({ settings: defaultAdminSettings, update: () => undefined });
function AdminSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AdminSettings>(() => { try { return { ...defaultAdminSettings, ...JSON.parse(localStorage.getItem('qadri-admin-settings') || '{}') }; } catch { return defaultAdminSettings; } });
  const update = (patch: Partial<AdminSettings>) => setSettings((current) => { const next = { ...current, ...patch }; localStorage.setItem('qadri-admin-settings', JSON.stringify(next)); return next; });
  return <AdminSettingsContext.Provider value={{ settings, update }}>{children}</AdminSettingsContext.Provider>;
}
function useAdminSettings() { return useContext(AdminSettingsContext); }
function HeroMotionGraphic({ scenes, enabled, lang }: { scenes: HeroMotionScene[]; enabled: boolean; lang: Lang }) {
  const activeScenes = scenes.length ? scenes : defaultHeroMotionScenes;
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => setReducedMotion(preference.matches);
    syncPreference();
    preference.addEventListener('change', syncPreference);
    return () => preference.removeEventListener('change', syncPreference);
  }, []);
  useEffect(() => {
    if (!enabled || reducedMotion || activeScenes.length < 2) { setActiveIndex(0); return; }
    const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % activeScenes.length), 5000);
    return () => window.clearInterval(timer);
  }, [enabled, reducedMotion, activeScenes.length]);
  const sceneIndex = activeIndex % activeScenes.length;
  const scene = activeScenes[sceneIndex];
  const MotionIcon = scene.icon === 'garden' ? Flower2 : scene.icon === 'care' ? HeartPulse : Sprout;
  const sceneCount = String(activeScenes.length).padStart(2, '0');
  const sceneNumber = String(sceneIndex + 1).padStart(2, '0');
  return <div className={`hero-motion-board ${enabled ? 'is-playing' : 'is-paused'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'} data-testid="hero-motion-board" aria-label={tr(lang, 'A 15-second animated gardening story', 'موشن جرافيك زراعي مدته 15 ثانية')}>
    <div className="hero-motion-grid" aria-hidden="true" />
    <div className="hero-motion-orbit hero-motion-orbit-outer" aria-hidden="true" />
    <div className="hero-motion-orbit hero-motion-orbit-inner" aria-hidden="true" />
    <div className="hero-motion-topbar"><span className="hero-motion-brandline"><Sprout size={14} aria-hidden="true" />{tr(lang, 'GROW WITH CONFIDENCE', 'ازرع بثقة')}</span><span className="hero-motion-duration">15 SEC · LOOP</span></div>
    <div className="hero-motion-message" key={`${scene.id}-${sceneIndex}`}>
      <span className="hero-motion-message-icon"><MotionIcon size={20} aria-hidden="true" /></span>
      <div className="hero-motion-message-copy"><span className="hero-motion-caption">{tr(lang, `SCENE ${sceneNumber}`, `المشهد ${sceneNumber}`)}</span><h2>{lang === 'ar' ? scene.titleAr : scene.titleEn}</h2><p>{lang === 'ar' ? scene.descriptionAr : scene.descriptionEn}</p></div>
    </div>
    <div className="hero-motion-illustration" key={`illustration-${scene.id}-${sceneIndex}`} aria-hidden="true">
      <div className="hero-motion-sun" />
      <div className="hero-motion-core"><MotionIcon size={43} strokeWidth={1.45} /></div>
      <span className="hero-motion-spark hero-motion-spark-one" /><span className="hero-motion-spark hero-motion-spark-two" />
    </div>
    <div className="hero-motion-tag hero-motion-tag-left"><Leaf size={13} aria-hidden="true" />{tr(lang, 'نموّ صحي', 'نموّ صحي')}</div>
    <div className="hero-motion-tag hero-motion-tag-right"><Droplets size={13} aria-hidden="true" />{tr(lang, 'عناية أذكى', 'عناية أذكى')}</div>
    <div className="hero-motion-footer"><div className="hero-motion-progress" aria-hidden="true">{activeScenes.map((item, index) => <span key={item.id} className={`hero-motion-progress-segment ${index < sceneIndex ? 'is-complete' : ''} ${index === sceneIndex ? 'is-current' : ''}`}><i style={{ animationPlayState: enabled && !reducedMotion ? 'running' : 'paused' }} /></span>)}</div><span className="hero-motion-count">{sceneNumber} / {sceneCount}</span></div>
  </div>;
}
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
function HomePage() {
  const { lang } = useLang();
  const { settings } = useAdminSettings();
  return <main className="public-home">
    <header className="public-header"><div className="public-topline"><a className="nav-phone" href={`tel:${settings.phone}`} aria-label={tr(lang, `Call ${settings.phone}`, `اتصل على ${settings.phone}`)}><span className="nav-phone-label">{tr(lang, 'Call us', 'اتصل بنا')}</span><span dir="ltr">{settings.phone}</span></a></div><nav className="public-nav" style={{ background: settings.primaryColor }} aria-label={tr(lang, 'Main navigation', 'التنقل الرئيسي')}><SiteBrand inverse /><div className="public-nav-links"><a className="public-nav-link" href="#about-us">{tr(lang, 'About us', 'من نحن')}</a><a className="public-nav-link" href="#how-it-works">{tr(lang, 'How it works', 'كيف نعمل')}</a></div><div className="public-nav-actions"><LanguageButton /><Link href="/sign-in" className="btn secondary small">{tr(lang, 'Sign in', 'تسجيل الدخول')}</Link></div></nav></header>
    <section className="public-hero">
      <div className="hero-copy reveal"><div className="eyebrow">{tr(lang, 'CUSTOMER SERVICE, GROUNDED', 'خدمة عملاء تستند إلى معلوماتك')}</div>
        <h1>{(lang === 'ar' ? settings.heroTitleAr : settings.heroTitleEn).split('\n').map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</h1>
        <p>{lang === 'ar' ? settings.heroDescriptionAr : settings.heroDescriptionEn}</p>
        <div className="hero-actions"><Link href="/sign-up" className="btn">{tr(lang, 'Build your first agent', 'أنشئ وكيلك الأول')} <ArrowRight size={15} /></Link><a href="#how-it-works" className="btn secondary">{tr(lang, 'See how it works', 'كيف يعمل')} <ArrowDownLeft size={14} /></a></div>
        <div className="hero-note">{tr(lang, 'BUILT FOR THE DETAILS THAT MATTER', 'مصمم للتفاصيل المهمة')}</div>
      </div>
      <div className="hero-art hero-video-art reveal"><HeroMotionGraphic scenes={settings.heroMotionScenes ?? defaultHeroMotionScenes} enabled={settings.heroMotionEnabled !== false} lang={lang} /></div>
    </section>
    <section className="public-section" id="about-us"><div className="public-section-inner" id="how-it-works">
      <div className="section-heading"><div><div className="eyebrow">{tr(lang, 'A SIMPLE FOUNDATION', 'بداية واضحة')}</div><h2>{tr(lang, 'Give your agent the right things to know.', 'امنح وكيلك المعرفة التي يحتاجها.')}</h2></div><p>{tr(lang, 'AYOUB AI turns the knowledge your team already has into practical, dependable customer conversations—in Arabic and English.', 'يحوّل AYOUB AI معرفة فريقك إلى محادثات عملية وموثوقة مع العملاء، بالعربية والإنجليزية.')}</p></div>
      <div className="steps-row"><article className="step"><div className="step-num">01 / KNOWLEDGE</div><h3>{tr(lang, 'Save what is true', 'أضف المعلومات الصحيحة')}</h3><p>{tr(lang, 'Organize product details, approved FAQs, store hours, and business policies in one place.', 'نظّم تفاصيل المنتجات والأسئلة المعتمدة وساعات العمل والسياسات في مكان واحد.')}</p></article>
        <article className="step"><div className="step-num">02 / AGENT</div><h3>{tr(lang, 'Shape the conversation', 'صمّم أسلوب المحادثة')}</h3><p>{tr(lang, 'Choose a language, tone, greeting, and the boundaries your customer assistant follows.', 'اختر اللغة والنبرة والتحية والحدود التي يتبعها مساعد خدمة العملاء.')}</p></article>
        <article className="step"><div className="step-num">03 / PROVE IT</div><h3>{tr(lang, 'Test every answer', 'اختبر كل إجابة')}</h3><p>{tr(lang, 'Try real questions and see which saved sources support each response before you go live.', 'جرّب أسئلة حقيقية وتحقق من المصادر التي تدعم كل إجابة قبل التشغيل.')}</p></article></div>
    </div></section>
    <section className="quote-band"><div className="quote-content"><div className="quote-glyph">“</div><blockquote>{tr(lang, 'A useful answer is one your customer can trust—and your team can stand behind.', 'الإجابة المفيدة هي ما يثق به عميلك ويستطيع فريقك الاعتماد عليه.')}</blockquote></div></section>
    <section className="trust-row"><div className="trust-stat"><strong>01</strong><span>{tr(lang, 'source-backed knowledge base', 'قاعدة معرفة موثوقة')}</span></div><div className="trust-stat"><strong>02</strong><span>{tr(lang, 'languages, one workspace', 'لغتان في مساحة واحدة')}</span></div><div className="trust-stat"><strong>100%</strong><span>{tr(lang, 'your business, your boundaries', 'عملك، وحدودك')}</span></div><div className="eyebrow">{tr(lang, 'CLEAR ANSWERS. HUMAN OVERSIGHT.', 'إجابات واضحة. وإشراف بشري.')}</div></section>
    <section className="cta-section"><div className="eyebrow" style={{ color: '#ffffff75' }}>{tr(lang, 'START WITH WHAT YOU KNOW', 'ابدأ بما تعرفه')}</div><h2>{tr(lang, 'Make every answer feel like yours.', 'اجعل كل إجابة تعبّر عن عملك.')}</h2><p>{tr(lang, 'A practical AI assistant begins with real business knowledge.', 'يبدأ المساعد العملي بمعرفة حقيقية عن عملك.')}</p><Link className="btn" href="/sign-up">{tr(lang, 'Create your workspace', 'أنشئ مساحة عملك')} <ArrowRight size={15} /></Link></section>
    <footer className="public-footer" style={{ background: settings.primaryColor }}><div className="footer-brand"><SiteBrand inverse /><p>© {new Date().getFullYear()} {tr(lang, settings.brandNameEn, settings.brandNameAr)}. {tr(lang, 'Built for better service.', 'لخدمة أفضل.')}</p></div><div className="footer-links"><a href="#how-it-works">{tr(lang, 'How it works', 'كيف يعمل')}</a><Link href="/sign-in">{tr(lang, 'Sign in', 'تسجيل الدخول')}</Link>{(settings.socialLinks ?? []).map((social) => <a key={social.id} className="footer-social-link" href={social.url} target="_blank" rel="noreferrer" aria-label={social.label} title={social.label}><SocialIconMark icon={social.icon} /></a>)}</div></footer>
  </main>;
}
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
function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('');
  const submit = (event: FormEvent) => { event.preventDefault(); if (username === 'Ayoub' && password === 'Ayoub123') { localStorage.setItem('qadri-admin-session', 'active'); setLocation('/admin'); } else setError('اسم المستخدم أو كلمة السر غير صحيحة.'); };
  return <main className="admin-login-page"><form className="panel admin-login-card" onSubmit={submit}><div className="admin-login-brand"><SiteBrand /></div><div className="eyebrow">QADRI AI / ADMIN</div><h1>تسجيل دخول الإدارة</h1><p className="page-desc">ادخل إلى لوحة التحكم لإدارة هوية الموقع ومحتواه.</p><div className="field"><label htmlFor="admin-username">اسم المستخدم</label><input id="admin-username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></div><div className="field"><label htmlFor="admin-password">كلمة السر</label><input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></div>{error && <p className="admin-error" role="alert">{error}</p>}<button className="btn" type="submit">دخول لوحة التحكم <ArrowRight size={15} /></button><Link className="admin-back-link" href="/">العودة إلى الموقع</Link></form></main>;
}
function AdminGuard({ children }: { children: ReactNode }) { return localStorage.getItem('qadri-admin-session') === 'active' ? <>{children}</> : <Redirect to="/admin/login" />; }
function HeroMotionAdminEditor({ scenes, enabled, onToggle, onUpdate }: { scenes: HeroMotionScene[]; enabled: boolean; onToggle: () => void; onUpdate: (id: string, patch: Partial<HeroMotionScene>) => void }) {
  return <section className="panel admin-editor hero-admin-editor">
    <div className="panel-head hero-admin-panel-head"><div><h2 className="panel-title">موشن جرافيك الصفحة الرئيسية</h2><div className="panel-kicker">ثلاثة مشاهد متحركة؛ خمس ثوانٍ لكل مشهد، ثم تبدأ الدورة من جديد (15 ثانية).</div></div><button type="button" className={`btn small ${enabled ? 'secondary' : ''}`} onClick={onToggle} aria-pressed={enabled} data-testid="button-toggle-hero-motion">{enabled ? 'إيقاف الحركة' : 'تشغيل الحركة'}</button></div>
    <div className="hero-admin-scenes">{scenes.map((scene, index) => <article className="panel hero-admin-scene" key={scene.id}>
      <div className="hero-admin-scene-head"><span>المشهد {String(index + 1).padStart(2, '0')} / {String(scenes.length).padStart(2, '0')}</span><label className="field hero-admin-icon-field" htmlFor={`hero-scene-icon-${scene.id}`}>الأيقونة<select id={`hero-scene-icon-${scene.id}`} value={scene.icon} onChange={(event) => onUpdate(scene.id, { icon: event.target.value as HeroMotionIcon })}><option value="sprout">شتلة</option><option value="garden">حديقة</option><option value="care">عناية بالنبتة</option></select></label></div>
      <div className="form-grid hero-admin-fields"><label className="field full">النص بالعربية<input maxLength={80} value={scene.titleAr} onChange={(event) => onUpdate(scene.id, { titleAr: event.target.value })} /></label><label className="field full">الوصف بالعربية<textarea maxLength={150} value={scene.descriptionAr} onChange={(event) => onUpdate(scene.id, { descriptionAr: event.target.value })} /></label><label className="field">Text in English<input maxLength={80} dir="ltr" value={scene.titleEn} onChange={(event) => onUpdate(scene.id, { titleEn: event.target.value })} /></label><label className="field">Description in English<textarea maxLength={150} dir="ltr" value={scene.descriptionEn} onChange={(event) => onUpdate(scene.id, { descriptionEn: event.target.value })} /></label></div>
    </article>)}</div>
    <p className="admin-save-note" role="status">يتم حفظ النصوص والأيقونات تلقائيًا في متصفح الأدمن الحالي.</p>
  </section>;
}
function AdminDashboardPage() {
  const { settings, update } = useAdminSettings(); const [, setLocation] = useLocation();
  const chartData = [{ name: 'Jan', visits: 420, leads: 32 }, { name: 'Feb', visits: 610, leads: 46 }, { name: 'Mar', visits: 540, leads: 41 }, { name: 'Apr', visits: 830, leads: 68 }, { name: 'May', visits: 760, leads: 59 }, { name: 'Jun', visits: 980, leads: 84 }];
  const set = (key: keyof AdminSettings, value: string) => update({ [key]: value });
  const [draftSocial, setDraftSocial] = useState<{ label: string; url: string; icon: SocialIcon }>({ label: '', url: '', icon: 'instagram' });
  const socialLinks = settings.socialLinks ?? [];
  const updateSocial = (id: string, patch: Partial<SocialLink>) => update({ socialLinks: socialLinks.map((social) => social.id === id ? { ...social, ...patch } : social) });
  const addSocial = () => {
    const label = draftSocial.label.trim(); const url = draftSocial.url.trim();
    if (!label || !/^https?:\/\//i.test(url)) return;
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    update({ socialLinks: [...socialLinks, { id, label, url, icon: draftSocial.icon }] });
    setDraftSocial({ label: '', url: '', icon: 'instagram' });
  };
  const removeSocial = (id: string) => update({ socialLinks: socialLinks.filter((social) => social.id !== id) });
  const motionScenes = settings.heroMotionScenes?.length ? settings.heroMotionScenes : defaultHeroMotionScenes;
  const updateMotionScene = (id: string, patch: Partial<HeroMotionScene>) => update({ heroMotionScenes: motionScenes.map((scene) => scene.id === id ? { ...scene, ...patch } : scene) });
  const toggleHeroMotion = () => update({ heroMotionEnabled: !settings.heroMotionEnabled });
  const logout = () => { localStorage.removeItem('qadri-admin-session'); setLocation('/'); };
  return <main className="admin-page"><div className="admin-head"><div><div className="eyebrow">QADRI AI / ADMIN DASHBOARD</div><h1>لوحة تحكم الأدمن</h1><p className="page-desc">تحليلات الموقع وإدارة الهوية والمحتوى من مكان واحد.</p></div><div className="admin-head-actions"><Link className="btn secondary small" href="/">مشاهدة الموقع</Link><button className="btn small" onClick={logout}>تسجيل الخروج</button></div></div><div className="admin-metrics"><section className="panel admin-metric"><span>زيارات الموقع</span><strong>4,140</strong><small>+18.4% هذا الشهر</small></section><section className="panel admin-metric"><span>طلبات التواصل</span><strong>330</strong><small>+12.1% هذا الشهر</small></section><section className="panel admin-metric"><span>معدل التحويل</span><strong>8.1%</strong><small>قابل للربط بالبيانات لاحقًا</small></section><section className="panel admin-metric"><span>آخر تحديث</span><strong>الآن</strong><small>إعدادات محفوظة محليًا</small></section></div><div className="admin-chart-grid"><section className="panel admin-chart-card"><div className="panel-head"><div><h2 className="panel-title">أداء الموقع</h2><div className="panel-kicker">زيارات العملاء والطلبات خلال الأشهر الأخيرة</div></div></div><div className="admin-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={settings.primaryColor} stopOpacity={0.28} /><stop offset="95%" stopColor={settings.primaryColor} stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#02061812" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} /><Tooltip /><Area type="monotone" dataKey="visits" stroke={settings.primaryColor} fill="url(#visitsFill)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></section><section className="panel admin-chart-card"><div className="panel-head"><div><h2 className="panel-title">طلبات التواصل</h2><div className="panel-kicker">بيانات تجريبية جاهزة للربط مع التحليلات</div></div></div><div className="admin-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid stroke="#02061812" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="leads" fill={settings.primaryColor} radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></section></div><section className="panel admin-editor"><div className="panel-head"><div><h2 className="panel-title">تعديل الموقع</h2><div className="panel-kicker">أي تغيير تحفظه هنا يظهر مباشرة على الصفحة الرئيسية في هذا المتصفح.</div></div></div><div className="admin-editor-grid"><div className="field"><label>اسم الموقع بالإنجليزية</label><input value={settings.brandNameEn} onChange={(event) => set('brandNameEn', event.target.value)} /></div><div className="field"><label>اسم الموقع بالعربية</label><input value={settings.brandNameAr} onChange={(event) => set('brandNameAr', event.target.value)} /></div><div className="field"><label>رقم الهاتف</label><input dir="ltr" value={settings.phone} onChange={(event) => set('phone', event.target.value.replace(/[^0-9+]/g, ''))} /></div><div className="field"><label>رابط الشعار</label><input dir="ltr" value={settings.logoUrl} onChange={(event) => set('logoUrl', event.target.value)} /></div><div className="field"><label>اللون الرئيسي</label><div className="admin-color-field"><input type="color" value={settings.primaryColor} onChange={(event) => set('primaryColor', event.target.value)} /><code>{settings.primaryColor}</code></div></div><div className="field"><label>عنوان الصفحة بالإنجليزية</label><textarea value={settings.heroTitleEn} onChange={(event) => set('heroTitleEn', event.target.value)} /></div><div className="field"><label>عنوان الصفحة بالعربية</label><textarea value={settings.heroTitleAr} onChange={(event) => set('heroTitleAr', event.target.value)} /></div><div className="field full"><label>وصف الصفحة بالإنجليزية</label><textarea value={settings.heroDescriptionEn} onChange={(event) => set('heroDescriptionEn', event.target.value)} /></div><div className="field full"><label>وصف الصفحة بالعربية</label><textarea value={settings.heroDescriptionAr} onChange={(event) => set('heroDescriptionAr', event.target.value)} /></div></div><p className="admin-save-note" role="status">يتم الحفظ تلقائيًا في المتصفح.</p></section><HeroMotionAdminEditor scenes={motionScenes} enabled={settings.heroMotionEnabled !== false} onToggle={toggleHeroMotion} onUpdate={updateMotionScene} />
    <section className="panel admin-editor admin-social-editor"><div className="panel-head"><div><h2 className="panel-title">روابط السوشيال ميديا</h2><div className="panel-kicker">أضف الروابط التي ستظهر في الفوتر. التعديل والحذف يتمان مباشرة.</div></div></div><div className="admin-social-list">{socialLinks.length ? socialLinks.map((social) => <div className="admin-social-row" key={social.id}><div className="admin-social-icon"><SocialIconMark icon={social.icon} /></div><div className="field"><label>الاسم</label><input value={social.label} onChange={(event) => updateSocial(social.id, { label: event.target.value })} /></div><div className="field"><label>الرابط</label><input dir="ltr" type="url" value={social.url} onChange={(event) => updateSocial(social.id, { url: event.target.value })} /></div><div className="field"><label>المنصة</label><select value={social.icon} onChange={(event) => updateSocial(social.id, { icon: event.target.value as SocialIcon })}><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="linkedin">LinkedIn</option><option value="youtube">YouTube</option><option value="website">Website</option></select></div><button type="button" className="icon-button admin-delete-social" onClick={() => removeSocial(social.id)} aria-label={`حذف ${social.label}`} title="حذف الرابط"><Trash2 size={15} /></button></div>) : <p className="admin-social-empty">لا توجد روابط مضافة بعد. أضف أول رابط ليظهر في الفوتر.</p>}</div><div className="admin-social-add"><div className="field"><label>اسم الرابط</label><input value={draftSocial.label} onChange={(event) => setDraftSocial((current) => ({ ...current, label: event.target.value }))} placeholder="Instagram" /></div><div className="field"><label>الرابط الكامل</label><input dir="ltr" type="url" value={draftSocial.url} onChange={(event) => setDraftSocial((current) => ({ ...current, url: event.target.value }))} placeholder="https://instagram.com/..." /></div><div className="field"><label>المنصة</label><select value={draftSocial.icon} onChange={(event) => setDraftSocial((current) => ({ ...current, icon: event.target.value as SocialIcon }))}><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="linkedin">LinkedIn</option><option value="youtube">YouTube</option><option value="website">Website</option></select></div><button type="button" className="btn small" onClick={addSocial} disabled={!draftSocial.label.trim() || !/^https?:\/\//i.test(draftSocial.url.trim())}><Plus size={14} />إضافة رابط</button></div><p className="admin-save-note" role="status">تظهر التغييرات فوراً في الفوتر وتحفظ تلقائياً في إعدادات الأدمن.</p></section></main>;
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
    <Route path="/sign-in/*?" component={AdminLoginPage} />
    <Route path="/admin/login" component={AdminLoginPage} />
    <Route path="/admin"><AdminGuard><AdminDashboardPage /></AdminGuard></Route>
    <Route path="/sign-up/*?" component={AuthSetupPage} />
    <Route component={NotFound} />
  </Switch></ErrorBoundary>;
}
function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/" component={RootRoute} />
    <Route path="/sign-in/*?" component={AdminLoginPage} />
    <Route path="/sign-up/*?"><SignUp routing="path" path={`${basePath}/sign-up`} /></Route>
    <Route path="/admin/login" component={AdminLoginPage} />
    <Route path="/admin"><AdminGuard><AdminDashboardPage /></AdminGuard></Route>
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
