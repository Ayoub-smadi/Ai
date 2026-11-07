import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent } from 'react';
import { Circle, Download, Droplets, Flower2, ImagePlus, Maximize2, Mountain, Move, Package, Route, Sparkles, Sprout, TreePine, Trash2, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import LandscapeAiChat from './landscape-ai-chat';
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
export type LandscapeCustomTool = { id: string; name: string; icon?: string };
export type LandscapeTextNote = { id: string; text: string; x: number; y: number; fontSize: number };
export type LandscapeCustomStamp = { id: string; toolId: string; x: number; y: number; size?: number };
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
  landscapeCustomTools?: LandscapeCustomTool[];
  landscapeCustomStamps?: LandscapeCustomStamp[];
  landscapeTextNotes?: LandscapeTextNote[];
};
export type LandscapeAiPlant = { id: string; name: string; category: string; scientificName?: string; image?: string; landscapeIcon?: string };
type Props = {
  quote: LandscapeQuote;
  onItemChange: (id: string, patch: Partial<LandscapeQuoteItem>) => void;
  onGlobalSettingsChange: (size: number, shape: LandscapeGlobalShape) => void;
  onAnnotationsChange: (annotations: LandscapeAnnotation[]) => void;
  onDrawingsChange: (drawings: LandscapeDrawing[]) => void;
  onGridChange: (value: boolean) => void;
  onCustomToolsChange: (tools: LandscapeCustomTool[]) => void;
  onCustomStampsChange: (stamps: LandscapeCustomStamp[]) => void;
  onTextNotesChange: (notes: LandscapeTextNote[]) => void;
  onOpenPlantPicker?: () => void;
  availablePlants?: LandscapeAiPlant[];
  onAiAddPlant?: (plantId: string, quantity: number, positions: LandscapePoint[], size?: number) => void;
  aiChatOpen?: boolean;
  onAiChatOpenChange?: (open: boolean) => void;
  hideAiChatToggle?: boolean;
};
type LandscapeTool = 'select' | LandscapeDrawingTool;
type DrawSession = { pointerId: number; tool: LandscapeDrawingTool; start: LandscapePoint; points: LandscapePoint[] };
type ItemDrag = { id: string; instanceIndex: number; pointerId: number; positions: LandscapePoint[] };
type CustomStampDrag = { id: string; pointerId: number; startClientX: number; startClientY: number; startX: number; startY: number };
type TextNoteDrag = { id: string; pointerId: number; startClientX: number; startClientY: number; startX: number; startY: number };
type DrawingDrag = { id: string; pointerId: number; startClientX: number; startClientY: number; original: LandscapeDrawing };
type AnnotationDrag = { id: string; pointerId: number; startClientX: number; startClientY: number; startX: number; startY: number };
type CanvasPanDrag = { pointerId: number; startClientX: number; startClientY: number; startOffsetX: number; startOffsetY: number };
const CANVAS_WORLD_WIDTH = 8400;
const CANVAS_WORLD_HEIGHT = CANVAS_WORLD_WIDTH * 210 / 297;
const CANVAS_ART_SCALE = 8;
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
  onGlobalSettingsChange,
  onAnnotationsChange,
  onDrawingsChange,
  onGridChange,
  onCustomToolsChange,
  onCustomStampsChange,
  onTextNotesChange,
  onOpenPlantPicker,
  availablePlants,
  onAiAddPlant,
  aiChatOpen,
  onAiChatOpenChange,
  hideAiChatToggle,
}: Props) {
  const allItems = quote.items.filter((item) => item.name.trim());
  const items = allItems.filter((item) => item.landscapeAdded || item.landscapeX !== undefined || item.landscapeY !== undefined);
  const scheduleItems = items.reduce<LandscapeQuoteItem[]>((grouped, item) => {
    const identity = (item.scientificName || item.name.split(' / ')[0]).trim().toLocaleLowerCase('ar').replace(/\s+/g, ' ');
    const existing = grouped.find((candidate) => (candidate.scientificName || candidate.name.split(' / ')[0]).trim().toLocaleLowerCase('ar').replace(/\s+/g, ' ') === identity);
    if (existing) existing.quantity += Math.max(0, Math.round(Number(item.quantity) || 0));
    else grouped.push({ ...item, quantity: Math.max(0, Math.round(Number(item.quantity) || 0)) });
    return grouped;
  }, []);
  const unplacedItems = allItems.filter((item) => !items.some((placed) => placed.id === item.id));
  const globalSize = quote.landscapeDefaultSize ?? 58;
  const globalShape: LandscapeGlobalShape = quote.landscapeDefaultShape === 'rectangle' || quote.landscapeDefaultShape === 'square' ? quote.landscapeDefaultShape : 'circle';
  const materialItems = items.filter((item) => item.category.includes('مواد Landscape /'));
  const annotations = quote.landscapeAnnotations ?? [];
  const drawings = quote.landscapeDrawings ?? [];
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const planExportRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const drawSession = useRef<DrawSession | null>(null);
  const canvasPanDrag = useRef<CanvasPanDrag | null>(null);
  const manualCanvasView = useRef(false);
  const itemDrag = useRef<ItemDrag | null>(null);
  const drawingDrag = useRef<DrawingDrag | null>(null);
  const annotationDrag = useRef<AnnotationDrag | null>(null);
  const customStampDrag = useRef<CustomStampDrag | null>(null);
  const textNoteDrag = useRef<TextNoteDrag | null>(null);
  const [boundaryPoints, setBoundaryPoints] = useState<LandscapePoint[]>([]);
  const [previewDrawing, setPreviewDrawing] = useState<LandscapeDrawing | null>(null);
  const [activeTool, setActiveTool] = useState<LandscapeTool>('select');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [viewMode] = useState<'plan' | 'table'>('plan');
  const [localAiChatOpen, setLocalAiChatOpen] = useState(false);
  const isAiChatOpen = aiChatOpen ?? localAiChatOpen;
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [canvasZoom, setCanvasZoom] = useState(0.18);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [canvasViewportSize, setCanvasViewportSize] = useState({ width: 0, height: 0 });
  const [isCanvasPanMode, setIsCanvasPanMode] = useState(false);
  const [activeCustomToolId, setActiveCustomToolId] = useState<string | null>(null);
  const [showCustomToolForm, setShowCustomToolForm] = useState(false);
  const [customToolName, setCustomToolName] = useState('');
  const [customToolIcon, setCustomToolIcon] = useState('');
  const [customToolError, setCustomToolError] = useState('');
  const [selectedCustomStampId, setSelectedCustomStampId] = useState<string | null>(null);
  const [showTextComposer, setShowTextComposer] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [isPlacingText, setIsPlacingText] = useState(false);
  const [selectedTextNoteId, setSelectedTextNoteId] = useState<string | null>(null);
  const customTools = quote.landscapeCustomTools ?? [];
  const customStamps = quote.landscapeCustomStamps ?? [];
  const textNotes = quote.landscapeTextNotes ?? [];
  const selectedCustomStamp = customStamps.find((stamp) => stamp.id === selectedCustomStampId) ?? null;
  const selectedTextNote = textNotes.find((note) => note.id === selectedTextNoteId) ?? null;
  const selectedDrawing = drawings.find((drawing) => drawing.id === selectedDrawingId) ?? null;
  const selectedAnnotation = annotations.find((annotation) => annotation.id === selectedAnnotationId) ?? null;
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  useEffect(() => {
    const viewport = canvasViewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => {
      const rect = viewport.getBoundingClientRect();
      setCanvasViewportSize({ width: rect.width, height: rect.height });
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const { width, height } = canvasViewportSize;
    if (manualCanvasView.current || !width || !height) return;
    const zoom = Math.max(0.04, Math.min(1, (width - 48) / CANVAS_WORLD_WIDTH, (height - 48) / CANVAS_WORLD_HEIGHT));
    setCanvasZoom(zoom);
    setCanvasPan({ x: (width - CANVAS_WORLD_WIDTH * zoom) / 2, y: (height - CANVAS_WORLD_HEIGHT * zoom) / 2 });
  }, [canvasViewportSize]);
  const setAiChatVisibility = (open: boolean) => {
    setLocalAiChatOpen(open);
    onAiChatOpenChange?.(open);
  };
  const fitCanvasToViewport = () => {
    const rect = canvasViewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    manualCanvasView.current = false;
    const zoom = Math.max(0.04, Math.min(1, (rect.width - 48) / CANVAS_WORLD_WIDTH, (rect.height - 48) / CANVAS_WORLD_HEIGHT));
    setCanvasZoom(zoom);
    setCanvasPan({ x: (rect.width - CANVAS_WORLD_WIDTH * zoom) / 2, y: (rect.height - CANVAS_WORLD_HEIGHT * zoom) / 2 });
  };
  const changeCanvasZoom = (factor: number) => {
    const nextZoom = Math.max(0.04, Math.min(1.35, canvasZoom * factor));
    const centerX = canvasViewportSize.width / 2;
    const centerY = canvasViewportSize.height / 2;
    const worldX = (centerX - canvasPan.x) / canvasZoom;
    const worldY = (centerY - canvasPan.y) / canvasZoom;
    manualCanvasView.current = true;
    setCanvasZoom(nextZoom);
    setCanvasPan({ x: centerX - worldX * nextZoom, y: centerY - worldY * nextZoom });
  };

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
    setSelectedCustomStampId(null);
    setSelectedTextNoteId(null);
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
    if (isCanvasPanMode) {
      if (event.button !== 0 || event.target !== event.currentTarget) return;
      event.preventDefault();
      manualCanvasView.current = true;
      canvasPanDrag.current = { pointerId: event.pointerId, startClientX: event.clientX, startClientY: event.clientY, startOffsetX: canvasPan.x, startOffsetY: canvasPan.y };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (isPlacingText && event.button === 0 && event.target === event.currentTarget && draftText.trim()) {
      event.preventDefault();
      const point = pointFromEvent(event);
      const note = { id: `text-note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: draftText.trim(), x: point.x, y: point.y, fontSize: 20 };
      clearSelection();
      onTextNotesChange([...textNotes, note]);
      setSelectedTextNoteId(note.id); setDraftText(''); setIsPlacingText(false); setShowTextComposer(false);
      return;
    }
    if (activeCustomToolId && event.button === 0 && event.target === event.currentTarget) { addCustomStampAt(event); return; }
    if (activeTool === 'select' || event.button !== 0 || event.target !== event.currentTarget) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    const start = activeTool === 'boundary' && boundaryPoints.length ? boundaryPoints[boundaryPoints.length - 1] : point;
    const current: DrawSession = { pointerId: event.pointerId, tool: activeTool, start, points: [start] };
    drawSession.current = current;
    setPreviewDrawing(rectangleTools.has(activeTool) ? makeRectangle(activeTool, start, start, 'preview') : makeStroke('path', activeTool === 'boundary' && boundaryPoints.length ? [...boundaryPoints, point] : [start], 'preview'));
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrawing = (event: PointerEvent<HTMLDivElement>) => {
    const panDrag = canvasPanDrag.current;
    if (panDrag?.pointerId === event.pointerId) {
      setCanvasPan({ x: panDrag.startOffsetX + event.clientX - panDrag.startClientX, y: panDrag.startOffsetY + event.clientY - panDrag.startClientY });
      return;
    }
    const current = drawSession.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const end = pointFromEvent(event);
    if (rectangleTools.has(current.tool)) {
      setPreviewDrawing(makeRectangle(current.tool, current.start, end, 'preview'));
      return;
    }
    if (current.tool === 'boundary') {
      const points = boundaryPoints.length ? [...boundaryPoints, end] : [current.start, end];
      setPreviewDrawing(points.length > 1 ? makeStroke('path', points, 'preview') : null);
      return;
    }
    const last = current.points[current.points.length - 1];
    if (Math.hypot(end.x - last.x, end.y - last.y) >= 0.45) current.points = [...current.points, end];
    setPreviewDrawing(makeStroke(current.tool as 'boundary' | 'path', current.points, 'preview'));
  };
  const endDrawing = (event: PointerEvent<HTMLDivElement>) => {
    if (canvasPanDrag.current?.pointerId === event.pointerId) {
      canvasPanDrag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    const current = drawSession.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const end = pointFromEvent(event);
    let drawing: LandscapeDrawing | null = null;
    if (rectangleTools.has(current.tool)) {
      drawing = makeRectangle(current.tool, current.start, end, `drawing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    } else if (current.tool === 'boundary') {
      const points = boundaryPoints.length ? [...boundaryPoints] : [current.start];
      const last = points[points.length - 1];
      if (Math.hypot(end.x - last.x, end.y - last.y) > 0.25) points.push(end);
      setBoundaryPoints(points);
      setPreviewDrawing(points.length > 1 ? makeStroke('path', points, 'preview') : null);
    } else {
      const points = [...current.points];
      const last = points[points.length - 1];
      if (Math.hypot(end.x - last.x, end.y - last.y) > 0.25) points.push(end);
      if (points.length >= 2) {
        drawing = makeStroke(current.tool as 'boundary' | 'path', points, `drawing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
      }
    }
    if (drawing) {
      onDrawingsChange([...drawings, drawing]);
      clearSelection();
      setSelectedDrawingId(drawing.id);
    }
    drawSession.current = null;
    if (current.tool !== 'boundary') {
      setPreviewDrawing(null);
      setActiveTool('select');
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const finishBoundary = () => {
    if (boundaryPoints.length >= 3) {
      const drawing = makeStroke('boundary', boundaryPoints, `drawing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
      onDrawingsChange([...drawings, drawing]);
      clearSelection();
      setSelectedDrawingId(drawing.id);
    }
    setBoundaryPoints([]);
    setPreviewDrawing(null);
    setActiveTool('select');
  };
  const cancelBoundary = () => {
    drawSession.current = null;
    setBoundaryPoints([]);
    setPreviewDrawing(null);
    setActiveTool('select');
  };
  const cancelDrawing = (event: PointerEvent<HTMLDivElement>) => {
    if (canvasPanDrag.current?.pointerId === event.pointerId) {
      canvasPanDrag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (drawSession.current?.pointerId !== event.pointerId) return;
    drawSession.current = null;
    setPreviewDrawing(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const startItemDrag = (event: PointerEvent<HTMLDivElement>, id: string, instanceIndex: number, positions: LandscapePoint[]) => {
    event.stopPropagation();
    if (event.button !== 0 || activeTool !== 'select' || isCanvasPanMode) return;
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
    if (event.button !== 0 || activeTool !== 'select' || isCanvasPanMode) return;
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
    if (event.button !== 0 || isCanvasPanMode) return;
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
  const handleCustomToolIconChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setCustomToolError('اختر ملف صورة صالحًا.'); return; }
    if (file.size > 2 * 1024 * 1024) { setCustomToolError('حجم الصورة يجب ألا يتجاوز 2 ميغابايت.'); return; }
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 256 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) { URL.revokeObjectURL(objectUrl); setCustomToolError('تعذر تجهيز الصورة. حاول مرة أخرى.'); return; }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      setCustomToolIcon(canvas.toDataURL('image/png'));
      setCustomToolError('');
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); setCustomToolError('تعذرت قراءة الصورة. حاول مرة أخرى.'); };
    image.src = objectUrl;
  };
  const saveCustomTool = () => {
    const name = customToolName.trim();
    if (!name || !customToolIcon) { setCustomToolError('اكتب اسم الزر وأرفق أيقونة.'); return; }
    const tool: LandscapeCustomTool = { id: `custom-tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name, icon: customToolIcon };
    onCustomToolsChange([...customTools, tool]);
    setCustomToolName(''); setCustomToolIcon(''); setCustomToolError(''); setShowCustomToolForm(false);
  };
  const removeCustomTool = (id: string) => {
    onCustomToolsChange(customTools.filter((tool) => tool.id !== id));
    onCustomStampsChange(customStamps.filter((stamp) => stamp.toolId !== id));
    if (activeCustomToolId === id) setActiveCustomToolId(null);
  };
  const addCustomStampAt = (event: PointerEvent<HTMLDivElement>) => {
    if (!activeCustomToolId || event.button !== 0) return false;
    event.preventDefault();
    const point = pointFromEvent(event);
    const stamp = { id: `custom-stamp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, toolId: activeCustomToolId, x: point.x, y: point.y, size: 44 };
    onCustomStampsChange([...customStamps, stamp]);
    setSelectedCustomStampId(stamp.id);
    return true;
  };
  const startCustomStampDrag = (event: PointerEvent<HTMLDivElement>, stamp: LandscapeCustomStamp) => {
    event.stopPropagation();
    if (event.button !== 0 || activeTool !== 'select' || isCanvasPanMode) return;
    event.preventDefault();
    customStampDrag.current = { id: stamp.id, pointerId: event.pointerId, startClientX: event.clientX, startClientY: event.clientY, startX: stamp.x, startY: stamp.y };
    setActiveCustomToolId(null);
    clearSelection();
    setSelectedCustomStampId(stamp.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveCustomStampDrag = (event: PointerEvent<HTMLDivElement>, id: string) => {
    const active = customStampDrag.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!active || active.id !== id || active.pointerId !== event.pointerId || !rect) return;
    onCustomStampsChange(customStamps.map((stamp) => stamp.id === id ? {
      ...stamp,
      x: Number(clamp(active.startX + (event.clientX - active.startClientX) / rect.width * 100, 1, 99).toFixed(1)),
      y: Number(clamp(active.startY + (event.clientY - active.startClientY) / rect.height * 100, 1, 99).toFixed(1)),
    } : stamp));
  };
  const endCustomStampDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (customStampDrag.current?.pointerId !== event.pointerId) return;
    customStampDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const removeSelectedCustomStamp = () => {
    if (!selectedCustomStampId) return;
    onCustomStampsChange(customStamps.filter((stamp) => stamp.id !== selectedCustomStampId));
    setSelectedCustomStampId(null);
  };
  const updateTextNote = (id: string, changes: Partial<LandscapeTextNote>) => {
    onTextNotesChange(textNotes.map((note) => note.id === id ? { ...note, ...changes } : note));
  };
  const startTextNoteDrag = (event: PointerEvent<HTMLDivElement>, note: LandscapeTextNote) => {
    event.stopPropagation();
    if (event.button !== 0 || activeTool !== 'select' || isCanvasPanMode) return;
    event.preventDefault();
    textNoteDrag.current = { id: note.id, pointerId: event.pointerId, startClientX: event.clientX, startClientY: event.clientY, startX: note.x, startY: note.y };
    setActiveCustomToolId(null);
    clearSelection();
    setSelectedTextNoteId(note.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveTextNoteDrag = (event: PointerEvent<HTMLDivElement>, id: string) => {
    const active = textNoteDrag.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!active || active.id !== id || active.pointerId !== event.pointerId || !rect) return;
    updateTextNote(id, {
      x: Number(clamp(active.startX + (event.clientX - active.startClientX) / rect.width * 100, 1, 99).toFixed(1)),
      y: Number(clamp(active.startY + (event.clientY - active.startClientY) / rect.height * 100, 1, 99).toFixed(1)),
    });
  };
  const endTextNoteDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (textNoteDrag.current?.pointerId !== event.pointerId) return;
    textNoteDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const removeSelectedTextNote = () => {
    if (!selectedTextNoteId) return;
    onTextNotesChange(textNotes.filter((note) => note.id !== selectedTextNoteId));
    setSelectedTextNoteId(null);
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
        heading.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr) auto;gap:22px;align-items:end;width:100%;direction:rtl;border-bottom:2px solid #315c3c;padding:0 0 14px;margin:0 0 18px;box-sizing:border-box;';
        const title = document.createElement('div');
        title.style.cssText = 'min-width:0;overflow:visible;text-align:right;';
        const eyebrow = document.createElement('div');
        eyebrow.style.cssText = 'font-size:12px;color:#607564;letter-spacing:.08em';
        eyebrow.textContent = `LANDSCAPE PLAN / ${quote.number}`;
        const pdfTitle = document.createElement('div');
        pdfTitle.style.cssText = 'display:block;width:100%;height:42px;min-height:42px;overflow:visible;font-family:Arial,sans-serif;font-size:19px;line-height:42px;white-space:nowrap;margin:0;color:#203a29;direction:rtl;text-align:right;';
        pdfTitle.textContent = viewMode === 'plan' ? 'مخطط تنسيق مقترح' : 'جدول عناصر المخطط';
        title.append(eyebrow, pdfTitle);
        const meta = document.createElement('div');
        meta.style.cssText = 'font-size:11px;color:#526354;text-align:left;white-space:nowrap;direction:rtl;';
        meta.textContent = viewMode === 'table' ? `صفحة ${pageIndex + 1} من ${chunks.length}` : `${scheduleItems.reduce((total, item) => total + item.quantity, 0)} وحدة · ${scheduleItems.length} أصناف`;
        heading.append(title, meta);
        wrapper.appendChild(heading);
        if (viewMode === 'plan') {
          if (!planExportRef.current) throw new Error('المخطط غير ظاهر للتنزيل.');
          const clone = planExportRef.current.cloneNode(true) as HTMLDivElement;
          clone.style.cssText += ';width:1120px!important;height:auto!important;max-width:none!important;margin:0!important;overflow:visible!important;';
          wrapper.appendChild(clone);
          clone.querySelector('.landscape-canvas-viewport-controls')?.remove();
          const clonedViewport = clone.querySelector('.landscape-plan-canvas-viewport') as HTMLDivElement | null;
          const canvasColumn = clone.querySelector('.landscape-plan-canvas-column') as HTMLDivElement | null;
          const exportScale = (canvasColumn?.clientWidth || 880) / CANVAS_WORLD_WIDTH;
          if (clonedViewport) clonedViewport.style.cssText += `;position:relative!important;width:100%!important;height:${CANVAS_WORLD_HEIGHT * exportScale}px!important;min-height:0!important;overflow:hidden!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;`;
          const clonedCanvas = clone.querySelector('.landscape-canvas') as HTMLDivElement | null;
          if (clonedCanvas) clonedCanvas.style.cssText += `;position:absolute!important;left:0!important;top:0!important;transform:translate(0,0) scale(${exportScale})!important;transform-origin:top left!important;width:${CANVAS_WORLD_WIDTH}px!important;height:${CANVAS_WORLD_HEIGHT}px!important;aspect-ratio:unset!important;max-width:none!important;overflow:hidden!important;`;
          const clonedSchedule = clone.querySelector('.landscape-plan-schedule') as HTMLDivElement | null;
          if (clonedSchedule) clonedSchedule.style.cssText += ';height:100%!important;max-height:none!important;overflow:visible!important;';
          const clonedScheduleScroll = clone.querySelector('.landscape-schedule-scroll') as HTMLDivElement | null;
          if (clonedScheduleScroll) clonedScheduleScroll.style.cssText += ';max-height:none!important;overflow:visible!important;';
          clone.querySelectorAll('.selected').forEach((element) => element.classList.remove('selected'));
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
        await Promise.all(images.map(async (image) => {
          await image.decode().catch(() => undefined);
          if (image.naturalWidth > 0) return;
          const fallbackCanvas = document.createElement('canvas');
          fallbackCanvas.width = 96;
          fallbackCanvas.height = 96;
          const context = fallbackCanvas.getContext('2d');
          if (!context) return;
          context.fillStyle = '#f1f7ee'; context.strokeStyle = '#8eaf87'; context.lineWidth = 3;
          context.beginPath(); context.arc(48, 48, 45, 0, Math.PI * 2); context.fill(); context.stroke();
          context.strokeStyle = '#92714f'; context.lineWidth = 6; context.lineCap = 'round';
          context.beginPath(); context.moveTo(48, 72); context.lineTo(48, 40); context.stroke();
          context.fillStyle = '#5a9155';
          context.beginPath(); context.ellipse(37, 38, 13, 8, -0.6, 0, Math.PI * 2); context.fill();
          context.beginPath(); context.ellipse(58, 30, 12, 8, -0.65, 0, Math.PI * 2); context.fill();
          image.style.display = 'block';
          image.src = fallbackCanvas.toDataURL('image/png');
          await image.decode().catch(() => undefined);
        }));
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
          {!hideAiChatToggle && <button type="button" className="landscape-ai-toggle" aria-expanded={isAiChatOpen} onClick={() => setAiChatVisibility(!isAiChatOpen)}><Sparkles size={14} />مساعد AI</button>}
          <button type="button" className="btn secondary small landscape-pdf-button" onClick={downloadCurrentPdf} disabled={pdfBusy}><Download size={14} />{pdfBusy ? 'جارٍ تجهيز PDF…' : 'تنزيل المخطط PDF'}</button>
        </div>
        {pdfError && <small className="landscape-pdf-error" role="alert">{pdfError}</small>}
        <h2>مخطط Landscape</h2>
        <p>مساحة عمل واسعة قابلة للتكبير والتحريك؛ استخدم «عرض كامل» لمشاهدة المساحة كلها، ويصدّر PDF المخطط كاملًا.</p>
      </div>
    </div>

    {viewMode === 'plan' && <div className="landscape-drawing-tools">
      <div className="landscape-drawing-tool-row" role="toolbar" aria-label="أدوات رسم المخطط">
        <button type="button" className={activeTool === 'select' && !activeCustomToolId ? 'active' : ''} aria-pressed={activeTool === 'select' && !activeCustomToolId} onClick={() => { if (activeTool === 'boundary' && boundaryPoints.length) finishBoundary(); setIsCanvasPanMode(false); setIsPlacingText(false); setActiveTool('select'); setActiveCustomToolId(null); }}>تحديد / تحريك</button>
        {drawingTools.map((tool) => <button key={tool.id} type="button" className={activeTool === tool.id ? 'active' : ''} aria-pressed={activeTool === tool.id} onClick={() => { if (activeTool === 'boundary' && boundaryPoints.length) finishBoundary(); if (tool.id === 'boundary') { setBoundaryPoints([]); setPreviewDrawing(null); } setIsCanvasPanMode(false); setIsPlacingText(false); clearSelection(); setActiveCustomToolId(null); setActiveTool(tool.id); }}>{tool.label}</button>)}
        <button type="button" className={showTextComposer || isPlacingText ? 'active' : ''} aria-pressed={showTextComposer || isPlacingText} onClick={() => { setIsCanvasPanMode(false); setShowTextComposer((value) => !value); setIsPlacingText(false); setActiveTool('select'); setActiveCustomToolId(null); clearSelection(); }}>إضافة نص</button>
      </div>
      <div className="landscape-custom-tool-manager">
        <div className="landscape-custom-tool-heading"><strong>أدوات مخصصة</strong><button type="button" onClick={() => { setShowCustomToolForm((value) => !value); setCustomToolError(''); }}>+ إضافة زر</button></div>
        {!!customTools.some((tool) => tool.icon) && <div className="landscape-custom-tool-list">{customTools.filter((tool) => tool.icon).map((tool) => <div className="landscape-custom-tool" key={tool.id}><button type="button" className={activeCustomToolId === tool.id ? 'active' : ''} aria-pressed={activeCustomToolId === tool.id} onClick={() => { setIsCanvasPanMode(false); setIsPlacingText(false); clearSelection(); setActiveTool('select'); setActiveCustomToolId(activeCustomToolId === tool.id ? null : tool.id); }}>{tool.icon && <img src={tool.icon} alt="" />}<span>{tool.name}</span></button><button type="button" className="landscape-custom-tool-remove" title="حذف الأداة" aria-label={`حذف أداة ${tool.name}`} onClick={() => removeCustomTool(tool.id)}>×</button></div>)}</div>}
        {showCustomToolForm && <div className="landscape-custom-tool-form"><label>اسم الزر<input value={customToolName} onChange={(event) => setCustomToolName(event.target.value)} placeholder="مثال: نافورة" /></label><label className="landscape-custom-tool-upload"><ImagePlus size={16} />إرفاق الأيقونة<input type="file" accept="image/*" onChange={handleCustomToolIconChange} /></label>{customToolIcon && <img className="landscape-custom-tool-preview" src={customToolIcon} alt="معاينة الأيقونة" />}{customToolError && <small role="alert">{customToolError}</small>}<div><button type="button" onClick={() => { setShowCustomToolForm(false); setCustomToolError(''); }}>إلغاء</button><button type="button" disabled={!customToolName.trim() || !customToolIcon} onClick={saveCustomTool}>حفظ الزر</button></div></div>}
      </div>
      {showTextComposer && <div className="landscape-text-note-creator"><label>اكتب النص الذي تريد وضعه على المخطط<textarea rows={2} value={draftText} onChange={(event) => setDraftText(event.target.value)} placeholder="مثال: المسافة 3 م" /></label><div><button type="button" disabled={!draftText.trim()} onClick={() => { setIsPlacingText(true); setActiveTool('select'); setActiveCustomToolId(null); }}>{isPlacingText ? 'انقر على المخطط لوضع النص' : 'اختيار مكان النص'}</button>{isPlacingText && <button type="button" onClick={() => setIsPlacingText(false)}>إلغاء</button>}</div>{isPlacingText && <small>انقر في المكان المطلوب على اللوحة؛ بعد ذلك يمكنك سحب النص وتغيير حجمه.</small>}</div>}
      <div className="landscape-drawing-hints">
        <small>{isPlacingText ? 'انقر في المكان المطلوب لوضع النص.' : activeCustomToolId ? `انقر على اللوحة لوضع «${customTools.find((tool) => tool.id === activeCustomToolId)?.name || 'الأيقونة'}»، ثم اسحب كل نسخة لموقعها.` : activeTool === 'boundary' ? 'اسحب من نقطة البداية إلى نهاية الضلع ثم أفلت؛ كرر لكل ضلع مستقيم، ثم اضغط إنهاء حدود الأرض.' : activeTool === 'path' ? 'اسحب لرسم مسار حر، ثم حدّده لتغيير حجمه أو سماكته.' : activeTool === 'select' ? 'اسحب أي عنصر لتحريكه. اختر أداة رسم ثم اسحب على المساحة البيضاء للإنشاء.' : `اسحب على اللوحة لتحديد حجم «${drawingLabels[activeTool]}»، ويمكنك تعديله بعد الرسم.`}</small>
        {activeTool === 'boundary' && <><button type="button" className="landscape-finish-boundary" disabled={boundaryPoints.length < 3 || !!drawSession.current} onClick={finishBoundary}>إنهاء حدود الأرض{boundaryPoints.length > 0 ? ` (${boundaryPoints.length} نقاط)` : ''}</button><button type="button" className="landscape-cancel-boundary" onClick={cancelBoundary}>إلغاء</button></>}
        <label><input type="checkbox" checked={quote.landscapeShowGrid === true} onChange={(event) => onGridChange(event.target.checked)} />شبكة مساعدة</label>
        <button type="button" className="landscape-undo-drawing" disabled={!drawings.length} onClick={() => { onDrawingsChange(drawings.slice(0, -1)); setSelectedDrawingId(null); }}><Undo2 size={13} />تراجع عن آخر رسم</button>
      </div>
    </div>}

    {viewMode === 'plan' ? <div className="landscape-plan-composition" ref={planExportRef}><div className="landscape-plan-canvas-column"><div className={`landscape-plan-canvas-viewport${isCanvasPanMode ? ' is-pan-mode' : ''}`} ref={canvasViewportRef}>
      <div className="landscape-canvas-viewport-controls" aria-label="التحكم في مساحة المخطط">
        <button type="button" aria-label="تصغير مساحة العمل" title="تصغير" onClick={() => changeCanvasZoom(0.8)}><ZoomOut size={15} /></button>
        <strong>{Math.round(canvasZoom * 100)}%</strong>
        <button type="button" aria-label="تكبير مساحة العمل" title="تكبير" onClick={() => changeCanvasZoom(1.25)}><ZoomIn size={15} /></button>
        <button type="button" className="landscape-canvas-fit-button" title="عرض كامل المساحة" onClick={fitCanvasToViewport}><Maximize2 size={14} />عرض كامل</button>
        <button type="button" className={isCanvasPanMode ? 'active' : ''} aria-pressed={isCanvasPanMode} title="فعّل التحريك ثم اسحب مساحة فارغة" onClick={() => { const next = !isCanvasPanMode; if (next) { if (activeTool === 'boundary' && boundaryPoints.length) finishBoundary(); setActiveTool('select'); setActiveCustomToolId(null); setIsPlacingText(false); } setIsCanvasPanMode(next); }}><Move size={14} />تحريك</button>
      </div>
      <div
      ref={canvasRef}
      className={`landscape-canvas landscape-canvas-white ${quote.landscapeShowGrid ? 'has-grid' : ''} ${activeTool !== 'select' || activeCustomToolId || isPlacingText ? 'is-drawing' : ''} ${isCanvasPanMode ? 'is-pan-mode' : ''}`}
      style={{ width: CANVAS_WORLD_WIDTH, height: CANVAS_WORLD_HEIGHT, transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})` }}
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
      {customStamps.map((stamp) => {
        const tool = customTools.find((candidate) => candidate.id === stamp.toolId);
        if (!tool?.icon) return null;
        const size = (stamp.size ?? 44) * CANVAS_ART_SCALE;
        return <div key={stamp.id} className={`landscape-custom-stamp ${selectedCustomStampId === stamp.id ? 'selected' : ''}`} style={{ left: `${stamp.x}%`, top: `${stamp.y}%`, width: size, height: size }} title={tool.name} aria-label={tool.name} onPointerDown={(event) => startCustomStampDrag(event, stamp)} onPointerMove={(event) => moveCustomStampDrag(event, stamp.id)} onPointerUp={endCustomStampDrag} onPointerCancel={endCustomStampDrag}><img src={tool.icon} alt="" /></div>;
      })}
      {items.flatMap((item) => {
        const Icon = iconFor(item.category);
        const size = Math.max(24, Math.min(180, item.landscapeSize ?? globalSize)) * CANVAS_ART_SCALE;
        const quantity = Math.max(0, Math.round(Number(item.quantity) || 0));
        const iconSize = quantity > 1 ? Math.min(size, 42 * CANVAS_ART_SCALE) : size;
        const columns = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, quantity))));
        const rows = Math.ceil(quantity / columns);
        const xStep = ((iconSize + 12 * CANVAS_ART_SCALE) / CANVAS_WORLD_WIDTH) * 100;
        const yStep = ((iconSize + 18 * CANVAS_ART_SCALE) / CANVAS_WORLD_HEIGHT) * 100;
        const centerX = item.landscapeX ?? 50;
        const centerY = item.landscapeY ?? 50;
        const defaultPositions = Array.from({ length: quantity }, (_, instanceIndex) => ({
          x: clamp(centerX + (instanceIndex % columns - (columns - 1) / 2) * xStep, 1, 99),
          y: clamp(centerY + (Math.floor(instanceIndex / columns) - (rows - 1) / 2) * yStep, 1, 99),
        }));
        const positions = defaultPositions.map((position, index) => item.landscapeInstances?.[index] ?? position);
        const kind = categoryStyle(item.category);
        const wide = kind === 'road' || kind === 'turf' || kind === 'irrigation';
        const width = wide ? Math.max((kind === 'road' ? 110 : 70) * CANVAS_ART_SCALE, Math.round(size * (kind === 'road' ? 2.8 : 1.8))) : size;
        const shape = item.landscapeShape && item.landscapeShape !== 'auto' ? item.landscapeShape : globalShape;
        const artStyle: CSSProperties = {
          width: quantity > 1 ? iconSize : width, height: quantity > 1 ? iconSize : size, borderRadius: shapeRadius[shape],
          borderColor: kind === 'road' ? '#59605c' : kind === 'roundabout' ? '#b4c1ad' : item.landscapeIcon || item.image ? '#d9e1da' : '#3c7953',
          color: kind === 'road' ? '#fff' : '#3c7953',
        };
        return positions.map((position, instanceIndex) => {
          const instanceKey = `${item.id}-${instanceIndex}`;
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
              {item.landscapeIcon || item.image ? <img src={item.landscapeIcon || item.image} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : kind === 'plant' ? <TreePlanSymbol size={Math.max(24 * CANVAS_ART_SCALE, iconSize - 4 * CANVAS_ART_SCALE)} /> : <Icon size={kind === 'road' ? 24 * CANVAS_ART_SCALE : Math.max(18 * CANVAS_ART_SCALE, Math.min(iconSize - 14 * CANVAS_ART_SCALE, 42 * CANVAS_ART_SCALE))} />}
            </div>
          </div>;
        });
      })}
      {textNotes.map((note) => <div key={note.id} className={`landscape-text-note ${selectedTextNoteId === note.id ? 'selected' : ''}`} style={{ left: `${note.x}%`, top: `${note.y}%`, fontSize: note.fontSize * CANVAS_ART_SCALE }} role="button" tabIndex={0} aria-label={`نص: ${note.text}`} onPointerDown={(event) => startTextNoteDrag(event, note)} onPointerMove={(event) => moveTextNoteDrag(event, note.id)} onPointerUp={endTextNoteDrag} onPointerCancel={endTextNoteDrag}>{note.text}</div>)}
    </div></div></div><aside className="landscape-plan-schedule" aria-label="جدول عناصر المخطط"><header className="landscape-schedule-heading"><div><small>LANDSCAPE SCHEDULE</small><strong>قائمة العناصر</strong></div><span>{scheduleItems.length} أصناف</span></header><div className="landscape-schedule-total"><span>إجمالي الوحدات</span><strong>{scheduleItems.reduce((total, item) => total + item.quantity, 0)}</strong></div><div className="landscape-schedule-scroll">{scheduleItems.length ? <table className="landscape-schedule-table"><colgroup><col className="landscape-schedule-name-col" /><col className="landscape-schedule-quantity-col" /><col className="landscape-schedule-icon-col" /></colgroup><thead><tr><th>الاسم</th><th>الكمية</th><th>الأيقونة</th></tr></thead><tbody>{scheduleItems.map((item) => { const Icon = iconFor(item.category); return <tr key={item.id}><td title={item.name.split(' / ')[0]}>{item.name.split(' / ')[0]}</td><td className="landscape-schedule-quantity">{item.quantity}</td><td><span className="landscape-table-icon">{item.landscapeIcon || item.image ? <img src={item.landscapeIcon || item.image} alt="" /> : <Icon size={19} />}</span></td></tr>; })}</tbody></table> : <div className="landscape-schedule-empty">أضف عنصرًا للمخطط ليظهر اسمه وكميته وأيقونته هنا.</div>}</div></aside></div> : <div className="landscape-table-scroll"><table ref={tableRef} className="landscape-items-table"><thead><tr><th>الاسم</th><th>الكمية</th><th>الأيقونة</th></tr></thead><tbody>{scheduleItems.length ? scheduleItems.map((item) => { const Icon = iconFor(item.category); return <tr key={item.id}><td>{item.name.split(' / ')[0]}</td><td>{item.quantity}</td><td><span className="landscape-table-icon">{item.landscapeIcon || item.image ? <img src={item.landscapeIcon || item.image} alt="" /> : <Icon size={19} />}</span></td></tr>; }) : <tr><td colSpan={3} className="landscape-table-empty">أضف عناصر إلى المخطط ليظهر الجدول هنا.</td></tr>}</tbody></table></div>}
    <div className={`landscape-ai-drawer ${isAiChatOpen ? 'is-open' : ''}`} aria-hidden={!isAiChatOpen}>
      {isAiChatOpen && <button type="button" className="landscape-ai-backdrop" aria-label="إغلاق مساعد AI" onClick={() => setAiChatVisibility(false)} />}
      <aside className="landscape-ai-drawer-panel" aria-label="مساعد مخطط Landscape" aria-modal={isAiChatOpen} role="dialog">
        <button type="button" className="landscape-ai-close" aria-label="إغلاق مساعد AI" onClick={() => setAiChatVisibility(false)}>×</button>
        <LandscapeAiChat
          quote={quote}
          onItemChange={onItemChange}
          onDrawingsChange={onDrawingsChange}
          onTextNotesChange={onTextNotesChange}
          onCustomStampsChange={onCustomStampsChange}
          availablePlants={availablePlants}
          onAddPlant={onAiAddPlant}
        />
      </aside>
    </div>

    {viewMode === 'plan' && selectedItem && <div className="landscape-object-properties">
      <div><strong>{selectedItem.name.split(' / ')[0]}</strong><small>خصائص الأيقونة المحددة</small></div>
      <label>حجم الأيقونة <b>{selectedItem.landscapeSize ?? globalSize}px</b><input type="range" min="24" max="180" step="2" value={selectedItem.landscapeSize ?? globalSize} onChange={(event) => onItemChange(selectedItem.id, { landscapeSize: Number(event.target.value) })} /></label>
      <button type="button" onClick={() => removeItemFromCanvas(selectedItem)}><Trash2 size={13} />إزالة من المخطط</button>
    </div>}
    {viewMode === 'plan' && selectedCustomStamp && <div className="landscape-object-properties">
      <div><strong>{customTools.find((tool) => tool.id === selectedCustomStamp.toolId)?.name || 'أيقونة مخصصة'}</strong><small>اسحب الأيقونة لتغيير موقعها</small></div>
      <label>حجم الأيقونة <b>{selectedCustomStamp.size ?? 44}px</b><input type="range" min="24" max="180" step="2" value={selectedCustomStamp.size ?? 44} onChange={(event) => onCustomStampsChange(customStamps.map((stamp) => stamp.id === selectedCustomStamp.id ? { ...stamp, size: Number(event.target.value) } : stamp))} /></label>
      <button type="button" onClick={removeSelectedCustomStamp}><Trash2 size={13} />إزالة الأيقونة المحددة</button>
    </div>}
    {viewMode === 'plan' && selectedTextNote && <div className="landscape-object-properties landscape-text-note-properties">
      <div><strong>نص على المخطط</strong><small>اسحبه لتغيير موقعه</small></div>
      <label>النص<textarea rows={2} value={selectedTextNote.text} onChange={(event) => updateTextNote(selectedTextNote.id, { text: event.target.value })} /></label>
      <label>حجم النص <b>{selectedTextNote.fontSize}px</b><input type="range" min="12" max="72" step="1" value={selectedTextNote.fontSize} onChange={(event) => updateTextNote(selectedTextNote.id, { fontSize: Number(event.target.value) })} /></label>
      <button type="button" onClick={removeSelectedTextNote}><Trash2 size={13} />حذف النص</button>
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



    {viewMode === 'plan' && (unplacedItems.length > 0 || onOpenPlantPicker) && <div className="landscape-item-library">
      <div className="landscape-item-library-head"><span><strong>إضافة أيقونات للنباتات والعناصر</strong><small>أضف من كتالوج النباتات أو من بنود عرض السعر</small></span>{onOpenPlantPicker && <button type="button" className="landscape-open-plant-picker" onClick={onOpenPlantPicker}><Sprout size={14} />إضافة نبتة من الكتالوج</button>}</div>
      {unplacedItems.length > 0 && <div className="landscape-item-library-list">{unplacedItems.map((item, index) => { const Icon = iconFor(item.category); return <div className="landscape-item-library-card" key={item.id}><span className="landscape-item-library-icon">{item.landscapeIcon || item.image ? <img src={item.landscapeIcon || item.image} alt="" /> : categoryStyle(item.category) === 'plant' ? <TreePlanSymbol size={25} /> : <Icon size={18} />}</span><span><strong>{item.name.split(' / ')[0]}</strong><small>{item.category}{item.scientificName ? ` · ${item.scientificName}` : ''}</small></span><button type="button" onClick={() => addItemToCanvas(item, items.length + index)} aria-label={`إضافة ${item.name} إلى المخطط`}>إضافة</button></div>; })}</div>}
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
