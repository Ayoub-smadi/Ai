import { useState, type CSSProperties, type ChangeEvent } from 'react';
import { Droplets, Flower2, Mountain, Package, Sprout, TreePine, Upload } from 'lucide-react';

export type LandscapeQuoteItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  scientificName?: string;
  image?: string;
  landscapeIcon?: string;
  landscapeSize?: number;
  landscapeShape?: 'circle' | 'square' | 'strip' | 'organic';
  landscapeArea?: number;
  landscapeX?: number;
  landscapeY?: number;
};
export type LandscapeQuote = { number: string; items: LandscapeQuoteItem[]; showScientificNames?: boolean };
type Props = { quote: LandscapeQuote; onItemChange: (id: string, patch: Partial<LandscapeQuoteItem>) => void; onShowScientificNamesChange: (value: boolean) => void; onAddMaterial: (name: string) => void };
const materials = ['توف بركاني', 'تربة حمراء', 'نجيل', 'شبكة ري'];
const iconFor = (category: string) => {
  const value = category.toLocaleLowerCase();
  return value.includes('ري') || value.includes('شبك') ? Droplets : value.includes('توف') || value.includes('حصى') || value.includes('ترب') ? Mountain : value.includes('نجيل') || value.includes('زرع') ? Sprout : value.includes('ورد') ? Flower2 : value.includes('نبات') || value.includes('شجر') ? TreePine : Package;
};
const fallbackPosition = (index: number, axis: 'x' | 'y') => axis === 'x' ? 14 + ((index * 29) % 72) : 17 + ((index * 37) % 65);
const shapeRadius: Record<NonNullable<LandscapeQuoteItem['landscapeShape']>, string> = { circle: '50%', square: '10px', strip: '8px', organic: '42% 58% 55% 45% / 57% 43% 57% 43%' };

function UploadField({ label, onFile }: { label: string; onFile: (src: string) => void }) {
  const [error, setError] = useState('');
  const readImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('اختر ملف صورة.'); event.target.value = ''; return; }
    if (file.size > 2 * 1024 * 1024) { setError('الحد الأقصى للصورة 2MB.'); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => { onFile(String(reader.result)); setError(''); };
    reader.onerror = () => setError('تعذر قراءة الصورة.');
    reader.readAsDataURL(file);
    event.target.value = '';
  };
  return <label className="landscape-upload-button"><Upload size={13} />{label}<input type="file" accept="image/*" onChange={readImage} />{error && <small role="alert">{error}</small>}</label>;
}

export default function LandscapePlan({ quote, onItemChange, onShowScientificNamesChange, onAddMaterial }: Props) {
  const items = quote.items.filter((item) => item.name.trim());
  return <section className="landscape-board"><div className="landscape-board-head"><div><div className="eyebrow">LANDSCAPE PLAN / {quote.number}</div><h2>مخطط تنسيق مقترح</h2><p>حرّك كل عنصر بتحريك مؤشري الموقع، واضبط الأيقونة والمساحة والشكل من الإعدادات أسفل المخطط.</p></div><label className="landscape-science-toggle"><input type="checkbox" checked={quote.showScientificNames !== false} onChange={(event) => onShowScientificNamesChange(event.target.checked)} />إظهار الاسم العلمي تحت الأيقونة</label></div>
    <div className="landscape-canvas landscape-canvas-white" aria-label="مخطط Landscape بخلفية بيضاء">{items.map((item, index) => { const Icon = iconFor(item.category); const size = Math.max(24, Math.min(160, item.landscapeSize || 58)); const isStrip = item.landscapeShape === 'strip'; const shape = item.landscapeShape || 'circle'; const artStyle: CSSProperties = { width: isStrip ? Math.round(size * 1.8) : size, height: size, borderRadius: shapeRadius[shape], borderColor: item.landscapeIcon || item.image ? '#d9e1da' : '#3c7953', color: '#3c7953' }; return <div className={`landscape-node landscape-node-${shape}`} key={item.id} style={{ left: `${item.landscapeX ?? fallbackPosition(index, 'x')}%`, top: `${item.landscapeY ?? fallbackPosition(index, 'y')}%`, '--node-color': '#3c7953' } as CSSProperties}><div className={`landscape-node-art landscape-art-${shape}`} style={artStyle}>{item.landscapeIcon || item.image ? <img src={item.landscapeIcon || item.image} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <Icon size={Math.max(18, Math.min(size - 14, 42))} />}</div><strong>{item.name.split(' / ')[0]}</strong><small>{quote.showScientificNames !== false && item.scientificName ? <>{item.scientificName} · </> : null}{item.quantity} ×{item.landscapeArea ? ` · ${item.landscapeArea}م²` : ''}</small></div>; })}{!items.length && <p className="landscape-empty">أضف نباتات أو مواد لتظهر هنا.</p>}</div>
    <div className="landscape-material-presets"><strong>إضافة مادة للمخطط</strong>{materials.map((name) => <button key={name} type="button" onClick={() => onAddMaterial(name)}><PlusIcon />{name}</button>)}</div>
    <div className="landscape-settings-list"><h3>خصائص عناصر المخطط</h3>{items.map((item, index) => <article className="landscape-item-settings" key={item.id}><header><span className="landscape-setting-number">{index + 1}</span><div><strong>{item.name}</strong><small>{item.scientificName || item.category}</small></div><span className="landscape-area-badge">{item.landscapeArea || 0} م²</span></header><div className="landscape-setting-controls"><div className="landscape-control landscape-size-control"><label>حجم الأيقونة <b>{item.landscapeSize || 58}px</b><input type="range" min="24" max="160" step="2" value={item.landscapeSize || 58} onChange={(event) => onItemChange(item.id, { landscapeSize: Number(event.target.value) })} /></label></div><label className="landscape-control">شكل العنصر<select value={item.landscapeShape || 'circle'} onChange={(event) => onItemChange(item.id, { landscapeShape: event.target.value as LandscapeQuoteItem['landscapeShape'] })}><option value="circle">دائري</option><option value="square">مربع</option><option value="strip">شريطي / مساحة</option><option value="organic">طبيعي / غير منتظم</option></select></label><label className="landscape-control">المساحة (م²)<input type="number" min="0" step="0.5" value={item.landscapeArea || 0} onChange={(event) => onItemChange(item.id, { landscapeArea: Number(event.target.value) })} /></label><label className="landscape-control">الموقع الأفقي X <b>{item.landscapeX ?? fallbackPosition(index, 'x')}%</b><input type="range" min="5" max="95" value={item.landscapeX ?? fallbackPosition(index, 'x')} onChange={(event) => onItemChange(item.id, { landscapeX: Number(event.target.value) })} /></label><label className="landscape-control">الموقع العمودي Y <b>{item.landscapeY ?? fallbackPosition(index, 'y')}%</b><input type="range" min="8" max="92" value={item.landscapeY ?? fallbackPosition(index, 'y')} onChange={(event) => onItemChange(item.id, { landscapeY: Number(event.target.value) })} /></label><div className="landscape-control landscape-media-control"><span>صورة أو أيقونة العنصر</span><div className="landscape-upload-row"><UploadField label="رفع أيقونة" onFile={(src) => onItemChange(item.id, { landscapeIcon: src })} /><UploadField label="رفع صورة" onFile={(src) => onItemChange(item.id, { image: src })} />{(item.landscapeIcon || item.image) && <button type="button" className="landscape-clear-media" onClick={() => onItemChange(item.id, { landscapeIcon: '', image: '' })}>إزالة الصور</button>}</div></div></div></article>)}</div><p className="landscape-storage-note">رفع الصور هنا يظهرها في مخطط عرض السعر؛ مزامنتها بشكل دائم بين الأجهزة تتطلب ربط Neon، وهو غير مضبوط حاليًا في نسخة التطوير.</p></section>;
}
function PlusIcon() { return <span aria-hidden="true">+</span>; }
