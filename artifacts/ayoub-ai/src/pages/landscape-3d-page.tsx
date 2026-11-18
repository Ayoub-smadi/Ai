import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Box, Download, Droplets, Lightbulb, Mountain, Sparkles, TreePine, Waves, X } from 'lucide-react';
import { Link } from 'wouter';
import './landscape-3d-page.css';

type SceneObject = { id: string; type: 'tree' | 'water' | 'lawn' | 'path' | 'light' | 'pergola'; label: string; x: number; y: number; scale: number; rotate: number };
const STORAGE_KEY = 'qadri-landscape-3d-v1';
const defaults: SceneObject[] = [
  { id: 'lawn-1', type: 'lawn', label: 'المسطح الأخضر', x: 50, y: 55, scale: 1.25, rotate: -8 },
  { id: 'water-1', type: 'water', label: 'عنصر مائي', x: 68, y: 42, scale: 1, rotate: 8 },
  { id: 'tree-1', type: 'tree', label: 'شجرة زينة', x: 30, y: 38, scale: 1, rotate: 0 },
  { id: 'tree-2', type: 'tree', label: 'شجرة زينة', x: 45, y: 28, scale: .82, rotate: -4 },
  { id: 'path-1', type: 'path', label: 'ممشى حجري', x: 51, y: 70, scale: 1.1, rotate: 3 },
];
const labels: Record<SceneObject['type'], string> = { tree: 'شجرة', water: 'ماء', lawn: 'مسطح أخضر', path: 'ممشى', light: 'إضاءة', pergola: 'برغولا' };
const icons = { tree: TreePine, water: Waves, lawn: Mountain, path: Box, light: Lightbulb, pergola: Box };

function readScene(): SceneObject[] {
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); return Array.isArray(value) && value.length ? value : defaults; } catch { return defaults; }
}

export default function Landscape3DPage() {
  const [objects, setObjects] = useState<SceneObject[]>(readScene);
  const [selected, setSelected] = useState<string | null>('lawn-1');
  const [style, setStyle] = useState<'modern' | 'jordan' | 'resort'>('modern');
  const [prompt, setPrompt] = useState('');
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(objects)); }, [objects]);
  const selectedObject = objects.find((item) => item.id === selected);
  const addObject = (type: SceneObject['type']) => {
    const id = `${type}-${Date.now()}`;
    setObjects((current) => [...current, { id, type, label: labels[type], x: 24 + Math.random() * 55, y: 26 + Math.random() * 52, scale: .8 + Math.random() * .4, rotate: -12 + Math.random() * 24 }]);
    setSelected(id);
  };
  const updateSelected = (patch: Partial<SceneObject>) => setObjects((current) => current.map((item) => item.id === selected ? { ...item, ...patch } : item));
  const removeSelected = () => { setObjects((current) => current.filter((item) => item.id !== selected)); setSelected(null); };
  const generateConcept = () => {
    const lower = prompt.toLocaleLowerCase('ar');
    const base = lower.includes('ماء') || lower.includes('بركة') ? ['water', 'tree', 'tree', 'light'] : lower.includes('مودرن') ? ['lawn', 'path', 'light', 'pergola'] : ['lawn', 'tree', 'tree', 'water', 'path'];
    setObjects(base.map((type, index) => ({ id: `ai-${type}-${Date.now()}-${index}`, type: type as SceneObject['type'], label: labels[type as SceneObject['type']], x: 24 + (index % 3) * 25, y: 32 + Math.floor(index / 3) * 27, scale: 1, rotate: index % 2 ? -5 : 5 })));
    setSelected(null);
  };
  const countText = useMemo(() => `${objects.length} عناصر في المشهد`, [objects.length]);
  return <main className="landscape-3d-page" dir="rtl">
    <header className="landscape-3d-topbar"><div><Link href="/landscape-editor" className="landscape-3d-back"><ArrowRight size={15} /> العودة لمخطط اللاندسكيب</Link><div className="eyebrow">QADRI AI / 3D LANDSCAPE STUDIO</div><h1>سكيب 3D</h1><p>حوّل فكرة الحديقة إلى مشهد ثلاثي الأبعاد قابل للتعديل، مع توزيع النباتات والماء والإضاءة قبل التنفيذ.</p></div><div className="landscape-3d-top-actions"><span className="landscape-3d-save"><span />يحفظ تلقائيًا</span><button className="btn secondary small" onClick={() => window.print()}><Download size={14} />تصدير المشهد</button></div></header>
    <div className="landscape-3d-layout"><aside className="landscape-3d-controls"><section className="landscape-3d-panel landscape-3d-ai"><div className="landscape-3d-panel-title"><Sparkles size={17} /><div><strong>مصمم AI للمشهد</strong><small>اكتب رؤيتك ودع سكيب يبني التوزيع الأولي</small></div></div><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="مثال: حديقة مودرن فيها بركة وإضاءة وممشى من الحجر..." /><button className="btn landscape-3d-generate" onClick={generateConcept}><Sparkles size={14} />توليد تصور ذكي</button></section><section className="landscape-3d-panel"><div className="landscape-3d-panel-title"><Box size={17} /><div><strong>مكتبة العناصر</strong><small>أضف عناصر للمشهد بضغطة</small></div></div><div className="landscape-3d-tool-grid">{(['tree','water','lawn','path','light','pergola'] as SceneObject['type'][]).map((type) => { const Icon = icons[type]; return <button key={type} onClick={() => addObject(type)}><Icon size={18} /><span>{labels[type]}</span><b>+</b></button>; })}</div></section><section className="landscape-3d-panel"><strong className="landscape-3d-section-label">هوية التصميم</strong><div className="landscape-3d-style-grid">{([['modern','مودرن'],['jordan','طبيعي أردني'],['resort','منتجع فاخر']] as const).map(([value, label]) => <button key={value} className={style === value ? 'active' : ''} onClick={() => setStyle(value)}>{label}</button>)}</div></section>{selectedObject && <section className="landscape-3d-panel landscape-3d-selected"><div className="landscape-3d-selected-head"><strong>العنصر المحدد</strong><button onClick={removeSelected} aria-label="حذف العنصر"><X size={14} /></button></div><span>{selectedObject.label}</span><label>الحجم <input type="range" min=".5" max="1.8" step=".05" value={selectedObject.scale} onChange={(event) => updateSelected({ scale: Number(event.target.value) })} /></label><label>الدوران <input type="range" min="-30" max="30" value={selectedObject.rotate} onChange={(event) => updateSelected({ rotate: Number(event.target.value) })} /></label></section>}</aside><section className={`landscape-3d-stage-shell style-${style}`}><div className="landscape-3d-stage-head"><div><strong>المشهد التنفيذي</strong><span>{countText} · منظور إيزومتري</span></div><div className="landscape-3d-legend"><i /> نباتات <i /> ماء <i /> إضاءة</div></div><div className="landscape-3d-stage"><div className="landscape-3d-ground"><div className="landscape-3d-grid-lines" />{objects.map((item) => { const Icon = icons[item.type]; return <button key={item.id} className={`landscape-3d-object object-${item.type}${selected === item.id ? ' selected' : ''}`} style={{ left: `${item.x}%`, top: `${item.y}%`, transform: `translate(-50%, -50%) scale(${item.scale}) rotate(${item.rotate}deg)` }} onClick={() => setSelected(item.id)} title={item.label}><span className="landscape-3d-object-art"><Icon size={item.type === 'tree' ? 42 : 34} /></span><small>{item.label}</small></button>; })}<span className="landscape-3d-axis axis-n">N</span><span className="landscape-3d-axis axis-e">E</span></div><div className="landscape-3d-sun"><SunIcon /></div></div><div className="landscape-3d-stage-footer"><span><strong>فكرة التصميم:</strong> {style === 'modern' ? 'خطوط نظيفة، ماء، وإضاءة مخفية' : style === 'jordan' ? 'حجر طبيعي ونباتات متحملة للمناخ' : 'تجربة منتجع خضراء متعددة الطبقات'}</span><span>اسحب العناصر لاحقًا من اللوحة · عدّلها من القائمة</span></div></section></div>
  </main>;
}
function SunIcon() { return <span className="landscape-3d-sun-icon">☼</span>; }
