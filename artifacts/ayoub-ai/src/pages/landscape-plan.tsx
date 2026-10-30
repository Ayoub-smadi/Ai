import { useRef, useState, type CSSProperties, type ChangeEvent, type PointerEvent } from 'react';
import { Circle, Download, Droplets, Flower2, Mountain, Package, Route, Sprout, TreePine, Upload } from 'lucide-react';

export type LandscapeQuoteItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  scientificName?: string;
  image?: string;
  landscapeIcon?: string;
  landscapeSize?: number;
  landscapeShape?: 'auto' | 'circle' | 'rectangle' | 'square' | 'strip' | 'organic' | 'road' | 'roundabout';
  landscapeArea?: number;
  landscapeX?: number;
  landscapeY?: number;
};
export type LandscapeGlobalShape = 'circle' | 'rectangle' | 'square';
export type LandscapeAnnotation =
  | { id: string; kind: 'line'; x: number; y: number; length: number; thickness: number; angle: number; color: string }
  | { id: string; kind: 'number'; x: number; y: number; value: string; size: number; color: string };
export type LandscapeQuote = { number: string; items: LandscapeQuoteItem[]; showScientificNames?: boolean; landscapeDefaultSize?: number; landscapeDefaultShape?: LandscapeGlobalShape | 'auto'; landscapeAnnotations?: LandscapeAnnotation[] };
type Props = {
  quote: LandscapeQuote;
  onItemChange: (id: string, patch: Partial<LandscapeQuoteItem>) => void;
  onShowScientificNamesChange: (value: boolean) => void;
  onGlobalSettingsChange: (size: number, shape: LandscapeGlobalShape) => void;
  onAnnotationsChange: (annotations: LandscapeAnnotation[]) => void;
  onAddMaterial: (name: string) => void;
};
type Material = { name: string; icon: typeof Sprout };
const materials: Material[] = [
  { name: 'توف بركاني', icon: Mountain },
  { name: 'تربة حمراء', icon: Mountain },
  { name: 'نجيل', icon: Sprout },
  { name: 'شبكة ري', icon: Droplets },
  { name: 'شارع', icon: Route },
  { name: 'دوّار', icon: Circle },
];
const iconFor = (category: string) => {
  const value = category.toLocaleLowerCase();
  if (value.includes('شارع') || value.includes('طريق')) return Route;
  if (value.includes('دوار') || value.includes('دوّار')) return Circle;
  if (value.includes('ري') || value.includes('شبك')) return Droplets;
  if (value.includes('توف') || value.includes('حصى') || value.includes('ترب')) return Mountain;
  if (value.includes('نجيل') || value.includes('زرع')) return Sprout;
  if (value.includes('ورد')) return Flower2;
  if (value.includes('نبات') || value.includes('شجر')) return TreePine;
  return Package;
};
const categoryStyle = (category: string) => {
  const value = category.toLocaleLowerCase();
  if (value.includes('شارع') || value.includes('طريق')) return 'road';
  if (value.includes('دوار') || value.includes('دوّار')) return 'roundabout';
  if (value.includes('ري') || value.includes('شبك')) return 'irrigation';
  if (value.includes('نجيل') || value.includes('زرع')) return 'turf';
  if (value.includes('توف') || value.includes('حصى')) return 'tuff';
  if (value.includes('ترب')) return 'soil';
  return 'plant';
};
const fallbackPosition = (index: number, axis: 'x' | 'y') => axis === 'x' ? 14 + ((index * 29) % 72) : 17 + ((index * 37) % 65);
const shapeRadius: Record<NonNullable<LandscapeQuoteItem['landscapeShape']>, string> = {
  auto: '50%', circle: '50%', rectangle: '8px', square: '2px', strip: '8px', organic: '42% 58% 55% 45% / 57% 43% 57% 43%', road: '8px', roundabout: '50%',
};
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
export default function LandscapePlan({ quote, onItemChange, onShowScientificNamesChange, onGlobalSettingsChange, onAnnotationsChange, onAddMaterial }: Props) {
  const items = quote.items.filter((item) => item.name.trim());
  const globalSize = quote.landscapeDefaultSize ?? 58;
  const globalShape: LandscapeGlobalShape = quote.landscapeDefaultShape === 'rectangle' || quote.landscapeDefaultShape === 'square' ? quote.landscapeDefaultShape : 'circle';
  const materialItems = items.filter((item) => item.category.includes('مواد Landscape /'));
  const annotations = quote.landscapeAnnotations ?? [];
  const canvasRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const activeDrag = useRef<{ id: string; pointerId: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'plan' | 'table'>('plan');
  const activeAnnotationDrag = useRef<{ id: string; pointerId: number; startClientX: number; startClientY: number; startX: number; startY: number } | null>(null);
  const selectedAnnotation = annotations.find((annotation) => annotation.id === selectedAnnotationId) ?? null;
  const startDrag = (event: PointerEvent<HTMLDivElement>, id: string) => {
    if (event.button !== 0) return;
    event.preventDefault();
    activeDrag.current = { id, pointerId: event.pointerId };
    setDraggingId(id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>, id: string) => {
    if (!activeDrag.current || activeDrag.current.id !== id || activeDrag.current.pointerId !== event.pointerId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(3, Math.min(97, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((event.clientY - rect.top) / rect.height) * 100));
    onItemChange(id, { landscapeX: Number(x.toFixed(1)), landscapeY: Number(y.toFixed(1)) });
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (activeDrag.current?.pointerId === event.pointerId) {
      activeDrag.current = null;
      setDraggingId(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };
  const addAnnotation = (kind: 'line' | 'number') => {
    const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const annotation: LandscapeAnnotation = kind === 'line'
      ? { id, kind, x: 18, y: 82, length: 34, thickness: 4, angle: 0, color: '#315c3c' }
      : { id, kind, x: 50, y: 50, value: String(annotations.filter((item) => item.kind === 'number').length + 1), size: 34, color: '#315c3c' };
    onAnnotationsChange([...annotations, annotation]);
    setSelectedAnnotationId(id);
  };
  const updateAnnotation = (id: string, changes: Partial<LandscapeAnnotation>) => onAnnotationsChange(annotations.map((annotation) => annotation.id === id ? { ...annotation, ...changes } as LandscapeAnnotation : annotation));
  const startAnnotationDrag = (event: PointerEvent<HTMLDivElement>, annotation: LandscapeAnnotation) => {
    if (event.button !== 0 || !canvasRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    activeAnnotationDrag.current = { id: annotation.id, pointerId: event.pointerId, startClientX: event.clientX, startClientY: event.clientY, startX: annotation.x, startY: annotation.y };
    setSelectedAnnotationId(annotation.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveAnnotationDrag = (event: PointerEvent<HTMLDivElement>, id: string) => {
    const active = activeAnnotationDrag.current;
    if (!active || active.id !== id || active.pointerId !== event.pointerId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, active.startX + (event.clientX - active.startClientX) / rect.width * 100));
    const y = Math.max(3, Math.min(97, active.startY + (event.clientY - active.startClientY) / rect.height * 100));
    updateAnnotation(id, { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) });
  };
  const endAnnotationDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (activeAnnotationDrag.current?.pointerId === event.pointerId) {
      activeAnnotationDrag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };
  const downloadCurrentPdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    setPdfError('');
    let wrapper: HTMLDivElement | null = null;
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      const rows = viewMode === 'table' ? Array.from(tableRef.current?.tBodies[0]?.rows ?? []) : [];
      const chunks: HTMLTableRowElement[][] = viewMode === 'table' ? (rows.length ? Array.from({ length: Math.ceil(rows.length / 8) }, (_, index) => rows.slice(index * 8, (index + 1) * 8)) : [[]]) : [[]];
      wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:fixed;left:-20000px;top:0;width:1120px;z-index:-1;padding:36px;box-sizing:border-box;background:#fff;color:#1e2e21;direction:rtl;font-family:Arial,sans-serif;';
      document.body.appendChild(wrapper);
      await document.fonts.ready;

      for (let pageIndex = 0; pageIndex < chunks.length; pageIndex++) {
        wrapper.replaceChildren();
        const heading = document.createElement('div');
        heading.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #315c3c;padding:0 0 14px;margin:0 0 18px;';
        const title = document.createElement('div');
        const eyebrow = document.createElement('div');
        eyebrow.style.cssText = 'font-size:12px;color:#607564;letter-spacing:.08em';
        eyebrow.textContent = `LANDSCAPE PLAN / ${quote.number}`;
        const pdfTitle = document.createElement('h1');
        pdfTitle.style.cssText = 'font-size:24px;margin:7px 0 0;color:#203a29';
        pdfTitle.textContent = viewMode === 'plan' ? 'مخطط تنسيق مقترح' : 'جدول عناصر المخطط';
        title.append(eyebrow, pdfTitle);
        const meta = document.createElement('div');
        meta.style.cssText = 'font-size:12px;color:#526354;text-align:left;';
        meta.textContent = viewMode === 'table' ? `صفحة ${pageIndex + 1} من ${chunks.length}` : `${items.length} عناصر`;
        heading.append(title, meta);
        wrapper.appendChild(heading);

        if (viewMode === 'plan') {
          if (!canvasRef.current) throw new Error('المخطط غير ظاهر للتنزيل.');
          const clone = canvasRef.current.cloneNode(true) as HTMLDivElement;
          clone.style.cssText += ';width:1120px!important;height:500px!important;max-width:none!important;margin:0!important;overflow:hidden!important;';
          clone.querySelectorAll('.selected').forEach((element) => element.classList.remove('selected'));
          wrapper.appendChild(clone);
        } else {
          if (!tableRef.current) throw new Error('الجدول غير ظاهر للتنزيل.');
          const table = tableRef.current.cloneNode(false) as HTMLTableElement;
          table.style.cssText += ';width:100%!important;min-width:0!important;';
          table.appendChild(tableRef.current.tHead?.cloneNode(true) ?? document.createElement('thead'));
          const body = document.createElement('tbody');
          chunks[pageIndex].forEach((row) => body.appendChild(row.cloneNode(true)));
          table.appendChild(body);
          wrapper.appendChild(table);
        }

        const images = Array.from(wrapper.querySelectorAll('img'));
        await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
        const canvas = await html2canvas(wrapper, { scale: 2, backgroundColor: '#ffffff', useCORS: true, allowTaint: false, logging: false, windowWidth: 1280 });
        if (pageIndex > 0) pdf.addPage('a4', 'landscape');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const scale = Math.min((pageWidth - margin * 2) / canvas.width, (pageHeight - margin * 2) / canvas.height);
        const imageWidth = canvas.width * scale;
        const imageHeight = canvas.height * scale;
        const imageX = (pageWidth - imageWidth) / 2;
        const imageY = (pageHeight - imageHeight) / 2;
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', imageX, imageY, imageWidth, imageHeight);
      }
      const safeNumber = quote.number.replace(/[^a-zA-Z0-9-]/g, '-');
      pdf.save(`landscape-${viewMode}-${safeNumber || 'plan'}.pdf`);
    } catch (error) {
      console.error('Landscape PDF export failed:', error);
      setPdfError('تعذر إنشاء ملف PDF. حاول مرة أخرى، أو أعد تحميل الصفحة.');
    } finally {
      wrapper?.remove();
      setPdfBusy(false);
    }
  };

  return <section className="landscape-board">
    <div className="landscape-board-head">
      <div className="landscape-heading-copy"><div className="eyebrow">LANDSCAPE PLAN / {quote.number}</div><div className="landscape-heading-actions"><div className="landscape-view-switch" role="tablist" aria-label="طريقة عرض عناصر Landscape"><button type="button" role="tab" aria-selected={viewMode === 'plan'} className={viewMode === 'plan' ? 'active' : ''} onClick={() => setViewMode('plan')}>مخطط</button><button type="button" role="tab" aria-selected={viewMode === 'table'} className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>جدول</button></div><button type="button" className="btn secondary small landscape-pdf-button" onClick={downloadCurrentPdf} disabled={pdfBusy}><Download size={14} />{pdfBusy ? 'جارٍ تجهيز PDF…' : viewMode === 'plan' ? 'تنزيل المخطط PDF' : 'تنزيل الجدول PDF'}</button></div>{pdfError && <small className="landscape-pdf-error" role="alert">{pdfError}</small>}<h2>{viewMode === 'plan' ? 'مخطط تنسيق مقترح' : 'جدول عناصر المخطط'}</h2><p>{viewMode === 'plan' ? 'اسحب النباتات والمواد مباشرةً داخل المخطط لتحريكها، أو عدّل موقعها وحجمها من الإعدادات.' : 'عرض منظم للنباتات والمواد المضافة إلى مخطط Landscape.'}</p></div>
      {viewMode === 'plan' && <label className="landscape-science-toggle"><input type="checkbox" checked={quote.showScientificNames !== false} onChange={(event) => onShowScientificNamesChange(event.target.checked)} />إظهار الاسم العلمي تحت الأيقونة</label>}
    </div>

    {viewMode === 'plan' ? <div ref={canvasRef} className="landscape-canvas landscape-canvas-white" aria-label="مخطط Landscape بخلفية بيضاء">
      {items.map((item, index) => {
        const Icon = iconFor(item.category);
        const size = Math.max(24, Math.min(180, item.category.includes('مواد Landscape /') ? (item.landscapeSize ?? globalSize) : globalSize));
        const shape = globalShape;
        const kind = categoryStyle(item.category);
        const isWide = kind === 'road' || kind === 'turf' || kind === 'irrigation';
        const width = isWide ? Math.max(kind === 'road' ? 110 : 70, Math.round(size * (kind === 'road' ? 2.8 : 1.8))) : size;
        const artStyle: CSSProperties = {
          width, height: size, borderRadius: shapeRadius[shape],
          borderColor: kind === 'road' ? '#5a6060' : kind === 'roundabout' ? '#b4c1ad' : item.landscapeIcon || item.image ? '#d9e1da' : '#3c7953',
          color: kind === 'road' ? '#fff' : kind === 'roundabout' ? '#f7f8f4' : '#3c7953',
        };
        const x = item.landscapeX ?? fallbackPosition(index, 'x');
        const y = item.landscapeY ?? fallbackPosition(index, 'y');
        return <div
          className={`landscape-node landscape-node-${shape} ${draggingId === item.id ? 'is-dragging' : ''}`}
          key={item.id}
          style={{ left: `${x}%`, top: `${y}%`, '--node-color': '#3c7953' } as CSSProperties}
          onPointerDown={(event) => startDrag(event, item.id)}
          onPointerMove={(event) => moveDrag(event, item.id)}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          title="اسحب العنصر لتغيير موقعه"
        >
          <div className={`landscape-node-art landscape-art-${shape} landscape-kind-${kind}`} style={artStyle}>
            {item.landscapeIcon || item.image ? <img src={item.landscapeIcon || item.image} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <Icon size={kind === 'road' ? 24 : Math.max(18, Math.min(size - 14, 42))} />}
          </div>
          <strong>{item.name.split(' / ')[0]}</strong>
          <small>{quote.showScientificNames !== false && item.scientificName ? <>{item.scientificName} · </> : null}{item.quantity} ×{item.landscapeArea ? ` · ${item.landscapeArea}م²` : ''}</small>
        </div>;
      })}
      {annotations.map((annotation) => annotation.kind === 'line' ? <div key={annotation.id} className={`landscape-drawn-line-hitarea ${selectedAnnotationId === annotation.id ? 'selected' : ''}`} role="button" tabIndex={0} aria-label="خط قابل للتحريك" style={{ left: `${annotation.x}%`, top: `${annotation.y}%`, width: `${annotation.length}%` }} onPointerDown={(event) => startAnnotationDrag(event, annotation)} onPointerMove={(event) => moveAnnotationDrag(event, annotation.id)} onPointerUp={endAnnotationDrag} onPointerCancel={endAnnotationDrag}><span className="landscape-drawn-line-stroke" style={{ height: annotation.thickness, backgroundColor: annotation.color, transform: `translateY(-50%) rotate(${annotation.angle}deg)` }} /></div> : <div key={annotation.id} className={`landscape-number-mark ${selectedAnnotationId === annotation.id ? 'selected' : ''}`} role="button" tabIndex={0} aria-label={`رقم ${annotation.value} قابل للتحريك`} style={{ left: `${annotation.x}%`, top: `${annotation.y}%`, color: annotation.color, fontSize: annotation.size }} onPointerDown={(event) => startAnnotationDrag(event, annotation)} onPointerMove={(event) => moveAnnotationDrag(event, annotation.id)} onPointerUp={endAnnotationDrag} onPointerCancel={endAnnotationDrag}>{annotation.value}</div>)}
      {!items.length && !annotations.length && <p className="landscape-empty">أضف نباتات أو مواد لتظهر هنا.</p>}
    </div> : <div className="landscape-table-scroll"><table ref={tableRef} className="landscape-items-table"><thead><tr><th>الاسم</th><th>الكمية</th><th>الأيقونة</th></tr></thead><tbody>{items.length ? items.map((item) => { const Icon = iconFor(item.category); return <tr key={item.id}><td>{item.name.split(' / ')[0]}</td><td>{item.quantity}</td><td><span className="landscape-table-icon">{item.landscapeIcon || item.image ? <img src={item.landscapeIcon || item.image} alt="" /> : <Icon size={19} />}</span></td></tr>; }) : <tr><td colSpan={3} className="landscape-table-empty">أضف نباتات أو مواد ليظهر الجدول هنا.</td></tr>}</tbody></table></div>}

    <div className="landscape-material-presets">
      <strong>إضافة مادة أو شكل للمخطط</strong>
      {materials.map(({ name, icon: Icon }) => <button key={name} type="button" onClick={() => onAddMaterial(name)}><Icon size={14} />{name}</button>)}
    </div>

    <div className="landscape-annotation-tools">
      <div className="landscape-annotation-tools-head"><strong>إضافات على المخطط</strong><div><button type="button" onClick={() => addAnnotation('line')}>إضافة خط</button><button type="button" onClick={() => addAnnotation('number')}>إضافة رقم</button></div></div>
      <p>اسحب الخط أو الرقم داخل المخطط. حدّد العنصر لتعديل حجمه أو امتداده.</p>
      {selectedAnnotation && <div className="landscape-annotation-editor">
        {selectedAnnotation.kind === 'line' ? <><label>طول الخط / شدّ <b>{selectedAnnotation.length}%</b><input type="range" min="3" max="90" value={selectedAnnotation.length} onChange={(event) => updateAnnotation(selectedAnnotation.id, { length: Number(event.target.value) })} /></label><label>سماكة الخط <b>{selectedAnnotation.thickness}px</b><input type="range" min="1" max="16" value={selectedAnnotation.thickness} onChange={(event) => updateAnnotation(selectedAnnotation.id, { thickness: Number(event.target.value) })} /></label><label>زاوية الخط <b>{selectedAnnotation.angle}°</b><input type="range" min="-180" max="180" value={selectedAnnotation.angle} onChange={(event) => updateAnnotation(selectedAnnotation.id, { angle: Number(event.target.value) })} /></label></> : <><label>الرقم<input type="number" min="0" max="99999" value={selectedAnnotation.value} onChange={(event) => updateAnnotation(selectedAnnotation.id, { value: event.target.value })} /></label><label>حجم الرقم <b>{selectedAnnotation.size}px</b><input type="range" min="12" max="96" value={selectedAnnotation.size} onChange={(event) => updateAnnotation(selectedAnnotation.id, { size: Number(event.target.value) })} /></label></>}
        <label className="landscape-annotation-color">اللون<input type="color" value={selectedAnnotation.color} onChange={(event) => updateAnnotation(selectedAnnotation.id, { color: event.target.value })} /></label>
        <button type="button" className="landscape-annotation-delete" onClick={() => { onAnnotationsChange(annotations.filter((item) => item.id !== selectedAnnotation.id)); setSelectedAnnotationId(null); }}>حذف العنصر المحدد</button>
      </div>}
    </div>

    <div className="landscape-settings-list">
      <h3>إعدادات موحّدة للأيقونات</h3>
      <p className="landscape-global-help">الحجم الموحد يطبّق على النباتات. اختر شكلًا موحدًا لجميع العناصر، ويمكنك تعديل حجم كل مادة مضافة بشكل مستقل أسفل هذه الإعدادات.</p>
      <div className="landscape-global-controls">
        <label className="landscape-global-control landscape-global-size">حجم موحّد للأيقونات النباتية <b>{globalSize}px</b><input type="range" min="24" max="160" step="2" value={globalSize} onChange={(event) => onGlobalSettingsChange(Number(event.target.value), globalShape)} /></label>
        <label className="landscape-global-control">شكل موحّد<select value={globalShape} onChange={(event) => onGlobalSettingsChange(globalSize, event.target.value as LandscapeGlobalShape)}><option value="circle">دائري</option><option value="rectangle">مستطيل</option><option value="square">مربع</option></select></label>
      </div>
    </div>
    {materialItems.length > 0 && <div className="landscape-material-size-list"><h3>حجم كل مادة مضافة</h3><p>غيّر حجم المادة التي تريدها دون التأثير على بقية المواد أو الأيقونات.</p>{materialItems.map((item) => <label className="landscape-material-size-row" key={item.id}><span><strong>{item.name.split(' / ')[0]}</strong><b>{item.landscapeSize || globalSize}px</b></span><input type="range" min="24" max="180" step="2" value={item.landscapeSize || globalSize} onChange={(event) => onItemChange(item.id, { landscapeSize: Number(event.target.value) })} /></label>)}</div>}
    <p className="landscape-storage-note">رفع الصور هنا يظهرها في مخطط عرض السعر؛ مزامنتها بشكل دائم بين الأجهزة تتطلب ربط Neon، وهو غير مضبوط حاليًا في نسخة التطوير.</p>
  </section>;
}
