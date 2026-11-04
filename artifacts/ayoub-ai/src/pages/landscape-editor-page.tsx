import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Search, Sparkles, Trash2, TreePine } from 'lucide-react';
import { Link } from 'wouter';
import { getManagedPlants, type ManagedPlant } from '@/data/managed-plants';
import LandscapePlan, {
  type LandscapeAiPlant,
  type LandscapeDrawing,
  type LandscapeGlobalShape,
  type LandscapePoint,
  type LandscapeQuote,
  type LandscapeQuoteItem,
} from '@/pages/landscape-plan';
import './landscape-editor-unified.css';

const STORAGE_KEY = 'qadri-site-plan-v1';
type LegacyPlanItem = {
  id?: string;
  kind?: 'plant' | 'shape';
  name?: string;
  image?: string;
  x?: number;
  y?: number;
  size?: number;
  rotation?: number;
  width?: number;
  height?: number;
  shapeType?: 'building' | 'paving' | 'lawn' | 'parking' | 'planter' | 'pool' | 'path';
};

const emptyPlan = (): LandscapeQuote => ({
  number: 'STUDIO',
  items: [],
  showScientificNames: true,
  landscapeDefaultSize: 58,
  landscapeDefaultShape: 'circle',
  landscapeAnnotations: [],
  landscapeDrawings: [],
  landscapeShowGrid: false,
});
const pointFor = (index: number) => ({ x: 34 + (index % 4) * 11, y: 35 + (Math.floor(index / 4) % 4) * 11 });

function migrateLegacyPlan(value: unknown): LandscapeQuote {
  if (!Array.isArray(value)) return emptyPlan();
  const items: LandscapeQuoteItem[] = [];
  const drawings: LandscapeDrawing[] = [];
  const shapeMap: Record<NonNullable<LegacyPlanItem['shapeType']>, Extract<LandscapeDrawing, { kind: 'rectangle' }>['tool']> = {
    building: 'building', paving: 'paving', lawn: 'lawn', parking: 'parking', planter: 'planter', pool: 'water', path: 'path-area',
  };
  (value as LegacyPlanItem[]).forEach((legacy, index) => {
    if (legacy.kind === 'plant') {
      const point = pointFor(index);
      items.push({
        id: legacy.id || `legacy-plant-${index}`,
        name: legacy.name || 'نبات',
        category: 'نباتات',
        quantity: 1,
        image: legacy.image,
        landscapeIcon: legacy.image,
        landscapeAdded: true,
        landscapeX: legacy.x ?? point.x,
        landscapeY: legacy.y ?? point.y,
        landscapeSize: legacy.size ?? 58,
        landscapeShape: 'circle',
      });
      return;
    }
    if (legacy.kind !== 'shape') return;
    const shapeType = legacy.shapeType || 'paving';
    const tool = shapeMap[shapeType];
    const point = pointFor(index);
    drawings.push({
      id: legacy.id || `legacy-shape-${index}`,
      kind: 'rectangle',
      tool,
      x: legacy.x ?? point.x,
      y: legacy.y ?? point.y,
      width: legacy.width ?? 12,
      height: legacy.height ?? 12,
      rotation: legacy.rotation ?? 0,
    });
  });
  return { ...emptyPlan(), items, landscapeDrawings: drawings };
}

function readSavedPlan(): LandscapeQuote {
  if (typeof window === 'undefined') return emptyPlan();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return emptyPlan();
    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed)) return migrateLegacyPlan(parsed);
    if (!parsed || typeof parsed !== 'object') return emptyPlan();
    const saved = parsed as Partial<LandscapeQuote>;
    return {
      ...emptyPlan(),
      ...saved,
      number: typeof saved.number === 'string' ? saved.number : 'STUDIO',
      items: Array.isArray(saved.items) ? saved.items : [],
      landscapeAnnotations: Array.isArray(saved.landscapeAnnotations) ? saved.landscapeAnnotations : [],
      landscapeDrawings: Array.isArray(saved.landscapeDrawings) ? saved.landscapeDrawings : [],
      landscapeCustomTools: Array.isArray(saved.landscapeCustomTools) ? saved.landscapeCustomTools : [],
      landscapeCustomStamps: Array.isArray(saved.landscapeCustomStamps) ? saved.landscapeCustomStamps : [],
      landscapeTextNotes: Array.isArray(saved.landscapeTextNotes) ? saved.landscapeTextNotes : [],
    };
  } catch {
    return emptyPlan();
  }
}

export default function LandscapeEditorPage() {
  const [plan, setPlan] = useState<LandscapeQuote>(readSavedPlan);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [plants] = useState<ManagedPlant[]>(getManagedPlants);
  const [search, setSearch] = useState('');
  const filteredPlants = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ar');
    return plants.filter((plant) => `${plant.nameAr} ${plant.nameEn} ${plant.scientificName}`.toLocaleLowerCase('ar').includes(query));
  }, [plants, search]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  }, [plan]);

  const addPlant = (plant: ManagedPlant) => {
    const index = plan.items.length;
    const point = pointFor(index);
    const shape = plan.landscapeDefaultShape === 'auto' ? 'circle' : plan.landscapeDefaultShape ?? 'circle';
    const item: LandscapeQuoteItem = {
      id: `studio-${plant.id}-${Date.now()}`,
      name: plant.nameAr || plant.nameEn,
      category: plant.categoryAr || 'نباتات',
      quantity: 1,
      scientificName: plant.scientificName,
      image: plant.image,
      landscapeIcon: plant.landscapeIcon,
      landscapeAdded: true,
      landscapeX: point.x,
      landscapeY: point.y,
      landscapeSize: plan.landscapeDefaultSize ?? 58,
      landscapeShape: shape,
    };
    setPlan((current) => ({ ...current, items: [...current.items, item] }));
  };

  const addAiPlant = (plantId: string, quantity: number, positions: LandscapePoint[], size?: number) => {
    const plant = plants.find((candidate) => candidate.id === plantId);
    if (!plant) return;
    const name = plant.nameAr || plant.nameEn || 'نبات';
    const safeQuantity = Math.max(1, Math.min(100, Math.round(quantity)));
    const safePositions = positions.slice(0, safeQuantity);
    if (!safePositions.length) return;
    setPlan((current) => {
      const existing = current.items.find((item) => item.name.split(' / ')[0].trim() === name.trim());
      if (existing) {
        return {
          ...current,
          items: current.items.map((item) => item.id === existing.id ? {
            ...item,
            quantity: safeQuantity,
            landscapeAdded: true,
            landscapeX: safePositions[0].x,
            landscapeY: safePositions[0].y,
            landscapeInstances: safePositions,
            ...(size ? { landscapeSize: size } : {}),
          } : item),
        };
      }
      const shape = current.landscapeDefaultShape === 'auto' ? 'circle' : current.landscapeDefaultShape ?? 'circle';
      const item: LandscapeQuoteItem = {
        id: `studio-ai-${plant.id}-${Date.now()}`,
        name,
        category: plant.categoryAr || 'نباتات',
        quantity: safeQuantity,
        scientificName: plant.scientificName,
        image: plant.image,
        landscapeIcon: plant.landscapeIcon,
        landscapeAdded: true,
        landscapeX: safePositions[0].x,
        landscapeY: safePositions[0].y,
        landscapeInstances: safePositions,
        landscapeSize: size ?? current.landscapeDefaultSize ?? 58,
        landscapeShape: shape,
      };
      return { ...current, items: [...current.items, item] };
    });
  };

  const aiAvailablePlants = useMemo<LandscapeAiPlant[]>(() => plants
    .filter((plant) => plant.source === 'plant')
    .map((plant) => ({
      id: plant.id,
      name: plant.nameAr || plant.nameEn || 'نبات',
      category: plant.categoryAr || 'نباتات',
      scientificName: plant.scientificName,
      image: plant.image,
      landscapeIcon: plant.landscapeIcon,
    })), [plants]);

  const updateItem = (id: string, patch: Partial<LandscapeQuoteItem>) => {
    setPlan((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  };
  const updateGlobalSettings = (size: number, shape: LandscapeGlobalShape) => {
    setPlan((current) => ({
      ...current,
      landscapeDefaultSize: size,
      landscapeDefaultShape: shape,
      items: current.items.map((item) => ({
        ...item,
        landscapeSize: size,
        landscapeShape: shape,
      })),
    }));
  };
  const clearPlan = () => {
    setPlan((current) => ({ ...current, items: [], landscapeDrawings: [], landscapeAnnotations: [], landscapeCustomStamps: [], landscapeTextNotes: [], landscapeShowGrid: false }));
  };

  return <main className="landscape-studio-page" dir="rtl">
    <header className="landscape-studio-header">
      <div>
        <Link href="/" className="landscape-studio-back"><ArrowRight size={15} />العودة للموقع</Link>
        <div className="eyebrow">QADRI AI / LANDSCAPE STUDIO</div>
        <h1>مخطط Landscape</h1>
        <p>ابدأ من لوحة بيضاء، وارسم حدود الأرض والعناصر بنفسك. تحفظ تغييراتك تلقائيًا.</p>
      </div>
      <div className="landscape-studio-header-actions">
        <span className="landscape-studio-save-state">يحفظ تلقائيًا</span>
        <button type="button" className="landscape-studio-ai-button" aria-expanded={aiChatOpen} onClick={() => setAiChatOpen((open) => !open)}><Sparkles size={14} />مساعد AI</button>
        <button type="button" onClick={clearPlan}><Trash2 size={14} />مسح المخطط</button>
      </div>
    </header>

    <div className="landscape-studio-layout">
      <aside className="landscape-studio-library">
        <div className="landscape-studio-library-head">
          <span className="landscape-studio-library-icon"><TreePine size={19} /></span>
          <div><span className="eyebrow">PLANT LIBRARY</span><h2>أيقونات النباتات</h2><small>اضغط إضافة ثم حرّك الأيقونة على اللوحة.</small></div>
        </div>
        <label className="landscape-studio-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث عن نبتة أو اسم علمي..." /></label>
        <div className="landscape-studio-plant-list">
          {filteredPlants.map((plant) => <button type="button" className="landscape-studio-plant" key={plant.id} onClick={() => addPlant(plant)}>
            <span className="landscape-studio-plant-image">{plant.landscapeIcon || plant.image ? <img src={plant.landscapeIcon || plant.image} alt="" /> : <TreePine size={20} />}</span>
            <span className="landscape-studio-plant-names"><strong>{plant.nameAr || plant.nameEn}</strong><small>{plant.nameEn || plant.scientificName}</small></span>
            <span className="landscape-studio-add">+</span>
          </button>)}
          {!filteredPlants.length && <p className="landscape-studio-no-results">لا توجد نباتات مطابقة للبحث.</p>}
        </div>
      </aside>

      <div className="landscape-studio-workspace">
        <LandscapePlan
          quote={plan}
          onItemChange={updateItem}
          onShowScientificNamesChange={(value) => setPlan((current) => ({ ...current, showScientificNames: value }))}
          onGlobalSettingsChange={updateGlobalSettings}
          onAnnotationsChange={(landscapeAnnotations) => setPlan((current) => ({ ...current, landscapeAnnotations }))}
          onDrawingsChange={(landscapeDrawings: LandscapeDrawing[]) => setPlan((current) => ({ ...current, landscapeDrawings }))}
          onGridChange={(landscapeShowGrid) => setPlan((current) => ({ ...current, landscapeShowGrid }))}
          onCustomToolsChange={(landscapeCustomTools) => setPlan((current) => ({ ...current, landscapeCustomTools }))}
          onCustomStampsChange={(landscapeCustomStamps) => setPlan((current) => ({ ...current, landscapeCustomStamps }))}
          onTextNotesChange={(landscapeTextNotes) => setPlan((current) => ({ ...current, landscapeTextNotes }))}
          availablePlants={aiAvailablePlants}
          onAiAddPlant={addAiPlant}
          aiChatOpen={aiChatOpen}
          onAiChatOpenChange={setAiChatOpen}
          hideAiChatToggle
        />
      </div>
    </div>
  </main>;
}
