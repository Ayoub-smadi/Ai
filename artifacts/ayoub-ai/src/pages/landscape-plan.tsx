import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Circle, Download, Droplets, Flower2, Mountain, Package, Route, Sprout, TreePine, Trash2, Undo2 } from 'lucide-react';
import './landscape-plan-engineering.css';

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
  landscapeInstances?: Array<{ x: number; y: number }>;
  landscapeAdded?: boolean;
};
export type LandscapeGlobalShape = 'circle' | 'rectangle' | 'square';
export type LandscapeAnnotation =
  | { id: string; kind: 'line'; x: number; y: number; length: number; thickness: number; angle: number; color: string }
  | { id: string; kind: 'number'; x: number; y: number; value: string; size: number; color: string };
export type LandscapePoint = { x: number; y: number };
export type LandscapeDrawingTool = 'boundary' | 'building' | 'entrance' | 'path' | 'lawn' | 'parking' | 'paving' | 'water' | 'planter' | 'path-area';
export type LandscapeDrawing =
  | { id: string; kind: 'stroke'; tool: 'boundary' | 'path'; points: LandscapePoint[]; strokeWidth: number; scale?: number }
  | { id: string; kind: 'rectangle'; tool: 'building' | 'entrance' | 'lawn' | 'parking' | 'paving' | 'water' | 'planter' | 'path-area'; x: number; y: number; width: number; height: number; rotation: number };
export type LandscapeQuote = {
  number: string;
  items: LandscapeQuoteItem[];
  showScientificNames?: boolean;
  landscapeDefaultSize?: number;
  landscapeDefaultShape?: LandscapeGlobalShape | 'auto';
  landscapeAnnotations?: LandscapeAnnotation[];
  landscapeDrawings?: LandscapeDrawing[];
  landscapeShowGrid?: boolean;
};
type Props = {
  quote: LandscapeQuote;
  onItemChange: (id: string, patch: Partial<LandscapeQuoteItem>) => void;
  onShowScientificNamesChange: (value: boolean) => void;
  onGlobalSettingsChange: (size: number, shape: LandscapeGlobalShape) => void;
  onAnnotationsChange: (annotations: LandscapeAnnotation[]) => void;
  onDrawingsChange: (drawings: LandscapeDrawing[]) => void;
  onGridChange: (value: boolean) => void;
  onAddMaterial: (name: string) => void;
  onOpenPlantPicker?: () => void;
};
type LandscapeTool = 'select' | LandscapeDrawingTool;
type DrawSession = { pointerId: number; tool: LandscapeDrawingTool; start: LandscapePoint; points: LandscapePoint[] };
type ItemDrag = { id: string; instanceIndex: number; pointerId: number; positions: LandscapePoint[] };
type DrawingDrag = { id: string; pointerId: number; startClientX: number; startClientY: number; original: LandscapeDrawing };
type AnnotationDrag = { id: string; pointerId: number; startClientX: number; startClientY: number; startX: number; startY: number };
type Material = { name: string; icon: typeof Sprout };

const materials: Material[] = [
  { name: 'توف بركاني', icon: Mountain },
  { name: 'تربة حمراء', icon: Mountain },
  { name: 'نجيل', icon: Sprout },
  { name: 'شبكة ري', icon: Droplets },
  { name: 'شارع', icon: Route },
  { name: 'دوّار', icon: Circle },
];
const drawingTools: Array<{ id: LandscapeDrawingTool; label: string; mode: 'freehand' | 'rectangle' }> = [
  { id: 'boundary', label: 'حدود الأرض', mode: 'freehand' },
  { id: 'building', label: 'مبنى', mode: 'rectangle' },
  { id: 'entrance', label: 'مدخل', mode: 'rectangle' },
  { id: 'path', label: 'مسار / شارع', mode: 'freehand' },
  { id: 'lawn', label: 'مسطح أخضر', mode: 'rectangle' },
  { id: 'parking', label: 'مواقف', mode: 'rectangle' },
  { id: 'paving', label: 'ساحة', mode: 'rectangle' },
  { id: 'water', label: 'ماء', mode: 'rectangle' },
];
const rectangleTools = new Set<LandscapeDrawingTool>(['building', 'entrance', 'lawn', 'parking', 'paving', 'water']);
const drawingLabels: Record<LandscapeDrawingTool, string> = {
  boundary: 'حدود الأرض', building: 'مبنى', entrance: 'مدخل', path: 'مسار / شارع',
  lawn: 'مسطح أخضر', parking: 'مواقف', paving: 'ساحة مرصوفة', water: 'عنصر مائي', planter: 'حوض زراعة', 'path-area': 'مسار قديم',
};
const shapeRadius: Record<NonNullable<LandscapeQuoteItem['landscapeShape']>, string> = {
  auto: '50%', circle: '50%', rectangle: '8px', square: '2px', strip: '8px',
  organic: '42% 58% 55% 45% / 57% 43% 57% 43%', road: '8px', roundabout: '50%',
};
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
const toPointsAttribute = (points: LandscapePoint[]) => points.map((point) => `${point.x},${point.y}`).join(' ');
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const strokeCenter = (points: LandscapePoint[]) => {
  if (!points.length) return { x: 50, y: 50 };
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
};

function TreePlanSymbol({ size }: { size: number }) {
  return <svg className="landscape-tree-symbol" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="28" fill="#f3f8f1" stroke="#39724a" strokeWidth="2.4" />
    <circle cx="32" cy="32" r="21" fill="none" stroke="#7fa687" strokeWidth="1.2" strokeDasharray="2.5 2.6" />
    <circle cx="32" cy="32" r="13" fill="#e8f1e7" stroke="#5b8963" strokeWidth="1.2" />
    <path d="M32 7v50M7 32h50M14.3 14.3l35.4 35.4m0-35.4L14.3 49.7" stroke="#9bb79e" strokeWidth="1" />
    <circle cx="32" cy="32" r="3.2" fill="#735a3d" />
  </svg>;
}

function makeRectangle(tool: LandscapeDrawingTool, start: LandscapePoint, end: LandscapePoint, id: string): LandscapeDrawing {
  const width = Math.max(1.2, Math.abs(end.x - start.x));
  const height = Math.max(1.2, Math.abs(end.y - start.y));
  return {
    id,
    kind: 'rectangle',
    tool: tool as Extract<LandscapeDrawingTool, 'building' | 'entrance' | 'lawn' | 'parking' | 'paving' | 'water'>,
    x: Number((Math.min(start.x, end.x) + width / 2).toFixed(1)),
    y: Number((Math.min(start.y, end.y) + height / 2).toFixed(1)),
    width: Number(width.toFixed(1)),
    height: Number(height.toFixed(1)),
    rotation: 0,
  };
}
function makeStroke(tool: 'boundary' | 'path', points: LandscapePoint[], id: string): LandscapeDrawing {
  return { id, kind: 'stroke', tool, points, strokeWidth: tool === 'boundary' ? 1.5 : 4, scale: 1 };
}

export default function LandscapePlan({
  quote,
  onItemChange,
  onShowScientificNamesChange,
  onGlobalSettingsChange,
  onAnnotationsChange,
  onDrawingsChange,
  onGridChange,
  onAddMaterial,
  onOpenPlantPicker,
}: Props) {
  const allItems = quote.items.filter((item) => item.name.trim());
  const items = allItems.filter((item) => item.landscapeAdded || item.landscapeX !== undefined || item.landscapeY !== undefined);
  const unplacedItems = allItems.filter((item) => !items.some((placed) => placed.id === item.id));
  const globalSize = quote.landscapeDefaultSize ?? 58;
  const globalShape: LandscapeGlobalShape = quote.landscapeDefaultShape === 'rectangle' || quote.landscapeDefaultShape === 'square' ? quote.landscapeDefaultShape : 'circle';
  const materialItems = items.filter((item) => item.category.includes('مواد Landscape /'));
  const annotations = quote.landscapeAnnotations ?? [];
  const drawings = quote.landscapeDrawings ?? [];
  const canvasRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const drawSession = useRef<DrawSession | null>(null);
  const itemDrag = useRef<ItemDrag | null>(null);
  const drawingDrag = useRef<DrawingDrag | null>(null);
  const annotationDrag = useRef<AnnotationDrag | null>(null);
  const [previewDrawing, setPreviewDrawing] = useState<LandscapeDrawing | null>(null);
  const [activeTool, setActiveTool] = useState<LandscapeTool>('select');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'plan' | 'table'>('plan');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const selectedDrawing = drawings.find((drawing) => drawing.id === selectedDrawingId) ?? null;
  const selectedAnnotation = annotations.find((annotation) => annotation.id === selectedAnnotationId) ?? null;
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

  const pointFromEvent = (event: { clientX: number; clientY: number }): LandscapePoint => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return {
      x: Number(clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100).toFixed(1)),
      y: Number(clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100).toFixed(1)),
    };
  };
  const clearSelection = () => {
    setSelectedItemId(null);
    setSelectedDrawingId(null);
    setSelectedAnnotationId(null);
  };
  const updateDrawing = (id: string, changes: Partial<LandscapeDrawing>) => {
    onDrawingsChange(drawings.map((drawing) => drawing.id === id ? { ...drawing, ...changes } as LandscapeDrawing : drawing));
  };
  const removeSelectedDrawing = () => {
    if (!selectedDrawing) return;
    onDrawingsChange(drawings.filter((drawing) => drawing.id !== selectedDrawing.id));
    setSelectedDrawingId(null);
  };
  const beginDrawing = (event: PointerEvent<HTMLDivElement>) => {
    if (activeTool === 'select' || event.button !== 0 || event.target !== event.currentTarget) return;
    event.preventDefault();
    const start = pointFromEvent(event);
    const current: DrawSession = { pointerId: event.pointerId, tool: activeTool, start, points: [start] };
    drawSession.current = current;
    setPreviewDrawing(rectangleTools.has(activeTool) ? makeRectangle(activeTool, start, start, 'preview') : makeStroke(activeTool as 'boundary' | 'path', [start], 'preview'));
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrawing = (event: PointerEvent<HTMLDivElement>) => {
    const current = drawSession.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const end = pointFromEvent(event);
    if (rectangleTools.has(current.tool)) {
      setPreviewDrawing(makeRectangle(current.tool, current.start, end, 'preview'));
      return;
    }
    const last = current.points[current.points.length - 1];
    if (Math.hypot(end.x - last.x, end.y - last.y) >= 0.45) current.points = [...current.points, end];
    setPreviewDrawing(makeStroke(current.tool as 'boundary' | 'path', current.points, 'preview'));
  };
  const endDrawing = (event: PointerEvent<HTMLDivElement>) => {
    const current = drawSession.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const end = pointFromEvent(event);
    let drawing: LandscapeDrawing | null = null;
    if (rectangleTools.has(current.tool)) {
      drawing = makeRectangle(current.tool, current.start, end, `drawing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    } else {
      const points = [...current.points];
      const last = points[points.length - 1];
      if (Math.hypot(end.x - last.x, end.y - last.y) > 0.25) points.push(end);
      if (points.length >= (current.tool === 'boundary' ? 3 : 2)) {
        drawing = makeStroke(current.tool as 'boundary' | 'path', points, `drawing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
      }
    }
    if (drawing) {
      onDrawingsChange([...drawings, drawing]);
      clearSelection();
      setSelectedDrawingId(drawing.id);
    }
    drawSession.current = null;
    setPreviewDrawing(null);
    setActiveTool('select');
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const cancelDrawing = (event: PointerEvent<HTMLDivElement>) => {
    if (drawSession.current?.pointerId !== event.pointerId) return;
    drawSession.current = null;
    setPreviewDrawing(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const startItemDrag = (event: PointerEvent<HTMLDivElement>, id: string, instanceIndex: number, positions: LandscapePoint[]) => {
    event.stopPropagation();
    if (event.button !== 0 || activeTool !== 'select') return;
    event.preventDefault();
    itemDrag.current = { id, instanceIndex, pointerId: event.pointerId, positions: positions.map((position) => ({ ...position })) };
    setDraggingId(`${id}-${instanceIndex}`);
    clearSelection();
    setSelectedItemId(id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveItemDrag = (event: PointerEvent<HTMLDivElement>, id: string, instanceIndex: number) => {
    const current = itemDrag.current;
    if (!current || current.id !== id || current.instanceIndex !== instanceIndex || current.pointerId !== event.pointerId) return;
    const point = pointFromEvent(event);
    current.positions = current.positions.map((position, index) => index === instanceIndex ? point : position);
    onItemChange(id, { landscapeInstances: current.positions });
  };
  const endItemDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (itemDrag.current?.pointerId !== event.pointerId) return;
    itemDrag.current = null;
    setDraggingId(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const startDrawingDrag = (event: PointerEvent<SVGElement | HTMLDivElement>, drawing: LandscapeDrawing) => {
    event.stopPropagation();
    if (event.button !== 0 || activeTool !== 'select') return;
    event.preventDefault();
    drawingDrag.current = { id: drawing.id, pointerId: event.pointerId, startClientX: event.clientX, startClientY: event.clientY, original: drawing };
    clearSelection();
    setSelectedDrawingId(drawing.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrawingDrag = (event: PointerEvent<SVGElement | HTMLDivElement>, id: string) => {
    const active = drawingDrag.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!active || active.id !== id || active.pointerId !== event.pointerId || !rect) return;
    const dx = (event.clientX - active.startClientX) / rect.width * 100;
    const dy = (event.clientY - active.startClientY) / rect.height * 100;
    const original = active.original;
    if (original.kind === 'rectangle') {
      updateDrawing(id, {
        x: Number(clamp(original.x + dx, original.width / 2, 100 - original.width / 2).toFixed(1)),
        y: Number(clamp(original.y + dy, original.height / 2, 100 - original.height / 2).toFixed(1)),
      });
    } else {
      updateDrawing(id, { points: original.points.map((point) => ({ x: Number(clamp(point.x + dx, 0, 100).toFixed(1)), y: Number(clamp(point.y + dy, 0, 100).toFixed(1)) })) });
    }
  };
  const endDrawingDrag = (event: PointerEvent<SVGElement | HTMLDivElement>) => {
    if (drawingDrag.current?.pointerId !== event.pointerId) return;
    drawingDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const updateAnnotation = (id: string, changes: Partial<LandscapeAnnotation>) => {
    onAnnotationsChange(annotations.map((annotation) => annotation.id === id ? { ...annotation, ...changes } as LandscapeAnnotation : annotation));
  };
  const startAnnotationDrag = (event: PointerEvent<HTMLDivElement>, annotation: LandscapeAnnotation) => {
    event.stopPropagation();
    if (event.button !== 0) return;
    event.preventDefault();
    annotationDrag.current = { id: annotation.id, pointerId: event.pointerId, startClientX: event.clientX, startClientY: event.clientY, startX: annotation.x, startY: annotation.y };
    clearSelection();
    setSelectedAnnotationId(annotation.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveAnnotationDrag = (event: PointerEvent<HTMLDivElement>, id: string) => {
    const active = annotationDrag.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!active || active.id !== id || active.pointerId !== event.pointerId || !rect) return;
    updateAnnotation(id, {
      x: Number(clamp(active.startX + (event.clientX - active.startClientX) / rect.width * 100, 1, 99).toFixed(1)),
      y: Number(clamp(active.startY + (event.clientY - active.startClientY) / rect.height * 100, 1, 99).toFixed(1)),
    });
  };
  const endAnnotationDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (annotationDrag.current?.pointerId !== event.pointerId) return;
    annotationDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const addAnnotation = (kind: 'line' | 'number') => {
    const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const annotation: LandscapeAnnotation = kind === 'line'
      ? { id, kind, x: 18, y: 82, length: 34, thickness: 2, angle: 0, color: '#4b5550' }
      : { id, kind, x: 50, y: 50, value: String(annotations.filter((item) => item.kind === 'number').length + 1), size: 24, color: '#4b5550' };
    onAnnotationsChange([...annotations, annotation]);
    clearSelection();
    setSelectedAnnotationId(id);
  };
  const addItemToCanvas = (item: LandscapeQuoteItem, index: number) => {
    const columns = 4;
    const x = 32 + (index % columns) * 12;
    const y = 34 + Math.floor(index / columns) * 12;
    onItemChange(item.id, { landscapeAdded: true, landscapeX: x, landscapeY: y, landscapeSize: item.landscapeSize ?? globalSize, landscapeShape: globalShape });
  };
  const removeItemFromCanvas = (item: LandscapeQuoteItem) => {
    onItemChange(item.id, { landscapeAdded: false, landscapeX: undefined, landscapeY: undefined });
    setSelectedItemId(null);
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
      const chunks = viewMode === 'table' ? (rows.length ? Array.from({ length: Math.ceil(rows.length / 8) }, (_, index) => rows.slice(index * 8, (index + 1) * 8)) : [[]]) : [[]];
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
          clone.style.cssText += ';width:1120px!important;height:560px!important;max-width:none!important;margin:0!important;overflow:hidden!important;';
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
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageWidth - imageWidth) / 2, (pageHeight - imageHeight) / 2, imageWidth, imageHeight);
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

  const renderDrawingShape = (drawing: LandscapeDrawing, preview = false) => {
    if (drawing.kind === 'rectangle') {
      const label = drawingLabels[drawing.tool];
      const style = {
        left: `${drawing.x}%`, top: `${drawing.y}%`, width: `${drawing.width}%`, height: `${drawing.height}%`,
        transform: `translate(-50%, -50%) rotate(${drawing.rotation}deg)`,
      } as CSSProperties;
      return <div
        key={drawing.id}
        className={`landscape-drawn-area landscape-area-${drawing.tool} ${selectedDrawingId === drawing.id && !preview ? 'selected' : ''} ${preview ? 'is-preview' : ''}`}
        style={style}
        onPointerDown={preview ? undefined : (event) => startDrawingDrag(event, drawing)}
        onPointerMove={preview ? undefined : (event) => moveDrawingDrag(event, drawing.id)}
        onPointerUp={preview ? undefined : endDrawingDrag}
        onPointerCancel={preview ? undefined : endDrawingDrag}
        title={label}
      ><span>{label}</span></div>;
    }
    const points = toPointsAttribute(drawing.points);
    const center = strokeCenter(drawing.points);
    const scale = drawing.scale ?? 1;
    const transform = `translate(${center.x} ${center.y}) scale(${scale}) translate(${-center.x} ${-center.y})`;
    const isBoundary = drawing.tool === 'boundary';
    const isSelected = selectedDrawingId === drawing.id && !preview;
    const handleDown = preview ? undefined : (event: PointerEvent<SVGElement>) => startDrawingDrag(event, drawing);
    const handleMove = preview ? undefined : (event: PointerEvent<SVGElement>) => moveDrawingDrag(event, drawing.id);
    return <g key={drawing.id} transform={transform} className={`${isSelected ? 'selected' : ''} ${preview ? 'is-preview' : ''}`}>
      {isBoundary
        ? <polygon points={points} fill="#f5f8f322" stroke="#46514a" strokeWidth={drawing.strokeWidth} strokeDasharray={isSelected ? '2 1' : undefined} vectorEffect="non-scaling-stroke" />
        : <polyline points={points} fill="none" stroke="#82745f" strokeWidth={drawing.strokeWidth} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
      {!preview && <>{isBoundary
        ? <polygon points={points} fill="transparent" stroke="transparent" strokeWidth="12" vectorEffect="non-scaling-stroke" pointerEvents="stroke" onPointerDown={handleDown} onPointerMove={handleMove} onPointerUp={endDrawingDrag} onPointerCancel={endDrawingDrag} />
        : <polyline points={points} fill="none" stroke="transparent" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" pointerEvents="stroke" onPointerDown={handleDown} onPointerMove={handleMove} onPointerUp={endDrawingDrag} onPointerCancel={endDrawingDrag} />}</>}
    </g>;
  };

  return <section className="landscape-board">
    <div className="landscape-board-head">
      <div className="landscape-heading-copy">
        <div className="eyebrow">LANDSCAPE PLAN / {quote.number}</div>
        <div className="landscape-heading-actions">
          <div className="landscape-view-switch" role="tablist" aria-label="طريقة عرض عناصر Landscape">
            <button type="button" role="tab" aria-selected={viewMode === 'plan'} className={viewMode === 'plan' ? 'active' : ''} onClick={() => setViewMode('plan')}>مخطط</button>
            <button type="button" role="tab" aria-selected={viewMode === 'table'} className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>جدول</button>
          </div>
          <button type="button" className="btn secondary small landscape-pdf-button" onClick={downloadCurrentPdf} disabled={pdfBusy}><Download size={14} />{pdfBusy ? 'جارٍ تجهيز PDF…' : viewMode === 'plan' ? 'تنزيل المخطط PDF' : 'تنزيل الجدول PDF'}</button>
        </div>
        {pdfError && <small className="landscape-pdf-error" role="alert">{pdfError}</small>}
        <h2>{viewMode === 'plan' ? 'مخطط Landscape' : 'جدول عناصر المخطط'}</h2>
        <p>{viewMode === 'plan' ? 'لوحة بيضاء تبدأ فارغة. اختر أداة ثم ارسم حدود أرضك ومبانيك واسحب رموز النباتات إلى مواقعها.' : 'عرض منظم لعناصر Landscape التي أضفتها إلى الرسم.'}</p>
      </div>
      {viewMode === 'plan' && <label className="landscape-science-toggle"><input type="checkbox" checked={quote.showScientificNames !== false} onChange={(event) => onShowScientificNamesChange(event.target.checked)} />إظهار الاسم العلمي تحت الأيقونة</label>}
    </div>

    {viewMode === 'plan' && <div className="landscape-drawing-tools">
      <div className="landscape-drawing-tool-row" role="toolbar" aria-label="أدوات رسم المخطط">
        <button type="button" className={activeTool === 'select' ? 'active' : ''} aria-pressed={activeTool === 'select'} onClick={() => setActiveTool('select')}>تحديد / تحريك</button>
        {drawingTools.map((tool) => <button key={tool.id} type="button" className={activeTool === tool.id ? 'active' : ''} aria-pressed={activeTool === tool.id} onClick={() => { clearSelection(); setActiveTool(tool.id); }}>{tool.label}</button>)}
      </div>
      <div className="landscape-drawing-hints">
        <small>{activeTool === 'boundary' ? 'اسحب بالماوس حول محيط الأرض؛ يُغلق الحد تلقائيًا.' : activeTool === 'path' ? 'اسحب لرسم مسار حر، ثم حدّده لتغيير حجمه أو سماكته.' : activeTool === 'select' ? 'اسحب أي عنصر لتحريكه. اختر أداة رسم ثم اسحب على المساحة البيضاء للإنشاء.' : `اسحب على اللوحة لتحديد حجم «${drawingLabels[activeTool]}»، ويمكنك تعديله بعد الرسم.`}</small>
        <label><input type="checkbox" checked={quote.landscapeShowGrid === true} onChange={(event) => onGridChange(event.target.checked)} />شبكة مساعدة</label>
        <button type="button" className="landscape-undo-drawing" disabled={!drawings.length} onClick={() => { onDrawingsChange(drawings.slice(0, -1)); setSelectedDrawingId(null); }}><Undo2 size={13} />تراجع عن آخر رسم</button>
      </div>
    </div>}

    {viewMode === 'plan' ? <div
      ref={canvasRef}
      className={`landscape-canvas landscape-canvas-white ${quote.landscapeShowGrid ? 'has-grid' : ''} ${activeTool !== 'select' ? 'is-drawing' : ''}`}
      aria-label="لوحة Landscape بيضاء فارغة للرسم والتحرير"
      onPointerDown={beginDrawing}
      onPointerMove={moveDrawing}
      onPointerUp={endDrawing}
      onPointerCancel={cancelDrawing}
    >
      <svg className="landscape-freehand-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {[...drawings, ...(previewDrawing ? [previewDrawing] : [])].filter((drawing) => drawing.kind === 'stroke').map((drawing) => renderDrawingShape(drawing, drawing.id === 'preview'))}
      </svg>
      {[...drawings, ...(previewDrawing ? [previewDrawing] : [])].filter((drawing) => drawing.kind === 'rectangle').map((drawing) => renderDrawingShape(drawing, drawing.id === 'preview'))}
      {items.flatMap((item) => {
        const Icon = iconFor(item.category);
        const size = Math.max(24, Math.min(180, item.landscapeSize ?? globalSize));
        const quantity = Math.max(0, Math.round(Number(item.quantity) || 0));
        const iconSize = quantity > 1 ? Math.min(size, 42) : size;
        const columns = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, quantity))));
        const rows = Math.ceil(quantity / columns);
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        const xStep = canvasRect?.width ? ((iconSize + 12) / canvasRect.width) * 100 : 6;
        const yStep = canvasRect?.height ? ((iconSize + 18) / canvasRect.height) * 100 : 12;
        const centerX = item.landscapeX ?? 50;
        const centerY = item.landscapeY ?? 50;
        const defaultPositions = Array.from({ length: quantity }, (_, instanceIndex) => ({
          x: clamp(centerX + (instanceIndex % columns - (columns - 1) / 2) * xStep, 1, 99),
          y: clamp(centerY + (Math.floor(instanceIndex / columns) - (rows - 1) / 2) * yStep, 1, 99),
        }));
        const positions = defaultPositions.map((position, index) => item.landscapeInstances?.[index] ?? position);
        const kind = categoryStyle(item.category);
        const wide = kind === 'road' || kind === 'turf' || kind === 'irrigation';
        const width = wide ? Math.max(kind === 'road' ? 110 : 70, Math.round(size * (kind === 'road' ? 2.8 : 1.8))) : size;
        const shape = item.landscapeShape && item.landscapeShape !== 'auto' ? item.landscapeShape : globalShape;
        const artStyle: CSSProperties = {
          width: quantity > 1 ? iconSize : width, height: quantity > 1 ? iconSize : size, borderRadius: shapeRadius[shape],
          borderColor: kind === 'road' ? '#59605c' : kind === 'roundabout' ? '#b4c1ad' : item.landscapeIcon || item.image ? '#d9e1da' : '#3c7953',
          color: kind === 'road' ? '#fff' : '#3c7953',
        };
        return positions.map((position, instanceIndex) => {
          const instanceKey = `${item.id}-${instanceIndex}`;
          const showLabel = instanceIndex === 0;
          return <div
            className={`landscape-node landscape-node-${shape} landscape-node-instance ${draggingId === instanceKey ? 'is-dragging' : ''} ${selectedItemId === item.id && draggingId === instanceKey ? 'is-selected' : ''}`}
            key={instanceKey}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            onPointerDown={(event) => startItemDrag(event, item.id, instanceIndex, positions)}
            onPointerMove={(event) => moveItemDrag(event, item.id, instanceIndex)}
            onPointerUp={endItemDrag}
            onPointerCancel={endItemDrag}
            title={`${item.name.split(' / ')[0]} · ${instanceIndex + 1} من ${quantity}`}
            aria-label={`${item.name.split(' / ')[0]}، أيقونة ${instanceIndex + 1} من ${quantity}`}
          >
            <div className={`landscape-node-art landscape-art-${shape} landscape-kind-${kind}`} style={artStyle}>
              {item.landscapeIcon || item.image ? <img src={item.landscapeIcon || item.image} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : kind === 'plant' ? <TreePlanSymbol size={Math.max(24, iconSize - 4)} /> : <Icon size={kind === 'road' ? 24 : Math.max(18, Math.min(iconSize - 14, 42))} />}
            </div>
            {showLabel && <strong>{item.name.split(' / ')[0]}</strong>}
            {showLabel && (quote.showScientificNames !== false && item.scientificName || item.landscapeArea) && <small>{quote.showScientificNames !== false && item.scientificName ? item.scientificName : null}{item.landscapeArea ? ` · ${item.landscapeArea}م²` : ''}</small>}
          </div>;
        });
      })}
      {annotations.map((annotation) => annotation.kind === 'line'
        ? <div key={annotation.id} className={`landscape-drawn-line-hitarea ${selectedAnnotationId === annotation.id ? 'selected' : ''}`} role="button" tabIndex={0} aria-label="خط قابل للتحريك" style={{ left: `${annotation.x}%`, top: `${annotation.y}%`, width: `${annotation.length}%` }} onPointerDown={(event) => startAnnotationDrag(event, annotation)} onPointerMove={(event) => moveAnnotationDrag(event, annotation.id)} onPointerUp={endAnnotationDrag} onPointerCancel={endAnnotationDrag}><span className="landscape-drawn-line-stroke" style={{ height: annotation.thickness, backgroundColor: annotation.color, transform: `translateY(-50%) rotate(${annotation.angle}deg)` }} /></div>
        : <div key={annotation.id} className={`landscape-number-mark ${selectedAnnotationId === annotation.id ? 'selected' : ''}`} role="button" tabIndex={0} aria-label={`رقم ${annotation.value} قابل للتحريك`} style={{ left: `${annotation.x}%`, top: `${annotation.y}%`, color: annotation.color, fontSize: annotation.size }} onPointerDown={(event) => startAnnotationDrag(event, annotation)} onPointerMove={(event) => moveAnnotationDrag(event, annotation.id)} onPointerUp={endAnnotationDrag} onPointerCancel={endAnnotationDrag}>{annotation.value}</div>)}
    </div> : <div className="landscape-table-scroll"><table ref={tableRef} className="landscape-items-table"><thead><tr><th>الاسم</th><th>الكمية</th><th>الأيقونة</th></tr></thead><tbody>{items.length ? items.map((item) => { const Icon = iconFor(item.category); return <tr key={item.id}><td>{item.name.split(' / ')[0]}</td><td>{item.quantity}</td><td><span className="landscape-table-icon">{item.landscapeIcon || item.image ? <img src={item.landscapeIcon || item.image} alt="" /> : <Icon size={19} />}</span></td></tr>; }) : <tr><td colSpan={3} className="landscape-table-empty">أضف عناصر إلى المخطط ليظهر الجدول هنا.</td></tr>}</tbody></table></div>}

    {viewMode === 'plan' && selectedItem && <div className="landscape-object-properties">
      <div><strong>{selectedItem.name.split(' / ')[0]}</strong><small>خصائص الأيقونة المحددة</small></div>
      <label>حجم الأيقونة <b>{selectedItem.landscapeSize ?? globalSize}px</b><input type="range" min="24" max="180" step="2" value={selectedItem.landscapeSize ?? globalSize} onChange={(event) => onItemChange(selectedItem.id, { landscapeSize: Number(event.target.value) })} /></label>
      <button type="button" onClick={() => removeItemFromCanvas(selectedItem)}><Trash2 size={13} />إزالة من المخطط</button>
    </div>}
    {viewMode === 'plan' && selectedDrawing && <div className="landscape-object-properties">
      <div><strong>{drawingLabels[selectedDrawing.tool]}</strong><small>حرّك العنصر أو غيّر أبعاده</small></div>
      {selectedDrawing.kind === 'rectangle' ? <>
        <label>العرض <b>{selectedDrawing.width.toFixed(1)}%</b><input type="range" min="1.2" max="95" step="0.5" value={selectedDrawing.width} onChange={(event) => updateDrawing(selectedDrawing.id, { width: Number(event.target.value) })} /></label>
        <label>الارتفاع <b>{selectedDrawing.height.toFixed(1)}%</b><input type="range" min="1.2" max="95" step="0.5" value={selectedDrawing.height} onChange={(event) => updateDrawing(selectedDrawing.id, { height: Number(event.target.value) })} /></label>
        <label>الدوران <b>{selectedDrawing.rotation}°</b><input type="range" min="-180" max="180" value={selectedDrawing.rotation} onChange={(event) => updateDrawing(selectedDrawing.id, { rotation: Number(event.target.value) })} /></label>
      </> : <>
        <label>حجم الرسم <b>{Math.round((selectedDrawing.scale ?? 1) * 100)}%</b><input type="range" min="50" max="220" step="5" value={Math.round((selectedDrawing.scale ?? 1) * 100)} onChange={(event) => updateDrawing(selectedDrawing.id, { scale: Number(event.target.value) / 100 })} /></label>
        <label>سماكة الخط <b>{selectedDrawing.strokeWidth}px</b><input type="range" min="1" max="12" value={selectedDrawing.strokeWidth} onChange={(event) => updateDrawing(selectedDrawing.id, { strokeWidth: Number(event.target.value) })} /></label>
      </>}
      <button type="button" onClick={removeSelectedDrawing}><Trash2 size={13} />حذف الرسم المحدد</button>
    </div>}

    {viewMode === 'plan' && selectedAnnotation && <div className="landscape-object-properties">
      <div><strong>{selectedAnnotation.kind === 'line' ? 'خط' : `رقم ${selectedAnnotation.value}`}</strong><small>خصائص العلامة المحددة</small></div>
      {selectedAnnotation.kind === 'line' ? <>
        <label>الطول <b>{selectedAnnotation.length}%</b><input type="range" min="3" max="90" value={selectedAnnotation.length} onChange={(event) => updateAnnotation(selectedAnnotation.id, { length: Number(event.target.value) })} /></label>
        <label>السماكة <b>{selectedAnnotation.thickness}px</b><input type="range" min="1" max="12" value={selectedAnnotation.thickness} onChange={(event) => updateAnnotation(selectedAnnotation.id, { thickness: Number(event.target.value) })} /></label>
      </> : <label>الرقم<input type="number" min="0" max="99999" value={selectedAnnotation.value} onChange={(event) => updateAnnotation(selectedAnnotation.id, { value: event.target.value })} /></label>}
      <button type="button" onClick={() => { onAnnotationsChange(annotations.filter((annotation) => annotation.id !== selectedAnnotation.id)); setSelectedAnnotationId(null); }}><Trash2 size={13} />حذف العلامة</button>
    </div>}

    {viewMode === 'plan' && (unplacedItems.length > 0 || onOpenPlantPicker) && <div className="landscape-item-library">
      <div className="landscape-item-library-head"><span><strong>إضافة أيقونات للنباتات والعناصر</strong><small>أضف من كتالوج النباتات أو من بنود عرض السعر</small></span>{onOpenPlantPicker && <button type="button" className="landscape-open-plant-picker" onClick={onOpenPlantPicker}><Sprout size={14} />إضافة نبتة من الكتالوج</button>}</div>
      {unplacedItems.length > 0 && <div className="landscape-item-library-list">{unplacedItems.map((item, index) => { const Icon = iconFor(item.category); return <div className="landscape-item-library-card" key={item.id}><span className="landscape-item-library-icon">{item.landscapeIcon || item.image ? <img src={item.landscapeIcon || item.image} alt="" /> : categoryStyle(item.category) === 'plant' ? <TreePlanSymbol size={25} /> : <Icon size={18} />}</span><span><strong>{item.name.split(' / ')[0]}</strong><small>{item.category}{item.scientificName ? ` · ${item.scientificName}` : ''}</small></span><button type="button" onClick={() => addItemToCanvas(item, items.length + index)} aria-label={`إضافة ${item.name} إلى المخطط`}>إضافة</button></div>; })}</div>}
    </div>}

    {viewMode === 'plan' && <div className="landscape-material-presets">
      <strong>إضافة مادة</strong>
      {materials.map(({ name, icon: Icon }) => <button key={name} type="button" onClick={() => onAddMaterial(name)}><Icon size={14} />{name}</button>)}
    </div>}

    {viewMode === 'plan' && <div className="landscape-annotation-tools">
      <div className="landscape-annotation-tools-head"><strong>علامات إضافية</strong><div><button type="button" onClick={() => addAnnotation('line')}>إضافة خط مستقيم</button><button type="button" onClick={() => addAnnotation('number')}>إضافة رقم</button></div></div>
      <p>اسحب العلامة داخل المخطط. حدّدها لتعديل أبعادها.</p>
    </div>}

    {viewMode === 'plan' && <div className="landscape-settings-list">
      <h3>إعدادات موحّدة للأيقونات</h3>
      <p className="landscape-global-help">يطبّق الحجم الموحد على جميع الأيقونات الحالية، وتُضاف العناصر الجديدة بالحجم نفسه. يمكنك تعديل أي عنصر منفرد بعد ذلك.</p>
      <div className="landscape-global-controls">
        <label className="landscape-global-control landscape-global-size">الحجم الموحد <b>{globalSize}px</b><input type="range" min="24" max="160" step="2" value={globalSize} onChange={(event) => onGlobalSettingsChange(Number(event.target.value), globalShape)} /></label>
        <label className="landscape-global-control">شكل الأيقونات<select value={globalShape} onChange={(event) => onGlobalSettingsChange(globalSize, event.target.value as LandscapeGlobalShape)}><option value="circle">دائري</option><option value="rectangle">مستطيل</option><option value="square">مربع</option></select></label>
        <button type="button" className="landscape-unify-icons" onClick={() => onGlobalSettingsChange(globalSize, globalShape)}>توحيد حجم الأيقونات</button>
      </div>
    </div>}

    {materialItems.length > 0 && viewMode === 'plan' && <div className="landscape-material-size-list"><h3>حجم المواد على المخطط</h3><p>عدّل حجم أي مادة منفردة دون تغيير بقية الأيقونات.</p>{materialItems.map((item) => <label className="landscape-material-size-row" key={item.id}><span><strong>{item.name.split(' / ')[0]}</strong><b>{item.landscapeSize || globalSize}px</b></span><input type="range" min="24" max="180" step="2" value={item.landscapeSize || globalSize} onChange={(event) => onItemChange(item.id, { landscapeSize: Number(event.target.value) })} /></label>)}</div>}
  </section>;
}
