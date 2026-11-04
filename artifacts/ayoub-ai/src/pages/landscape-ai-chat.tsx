import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LoaderCircle, MessageSquareText, Send, Sparkles } from 'lucide-react';
import type {
  LandscapeDrawing,
  LandscapeQuote,
  LandscapeTextNote,
  LandscapeQuoteItem,
  LandscapeCustomStamp,
  LandscapePoint,
  LandscapeDrawingTool,
  LandscapeAiPlant,
} from './landscape-plan';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type AiOperation =
  | { type: 'place_item'; itemId: string; positions: LandscapePoint[]; size?: number }
  | { type: 'add_plant'; plantId: string; quantity: number; positions: LandscapePoint[]; size?: number }
  | { type: 'remove_item'; itemId: string }
  | { type: 'add_rectangle'; tool: Exclude<LandscapeDrawingTool, 'boundary' | 'path'>; x: number; y: number; width: number; height: number; rotation: number }
  | { type: 'add_stroke'; tool: 'boundary' | 'path'; points: LandscapePoint[]; strokeWidth: number }
  | { type: 'add_text'; text: string; x: number; y: number; fontSize: number }
  | { type: 'edit_text'; noteId: string; text?: string; x?: number; y?: number; fontSize?: number }
  | { type: 'delete_text'; noteId: string }
  | { type: 'remove_drawing'; drawingId: string }
  | { type: 'clear_layout' };
type AiReply = { reply: string; operations: AiOperation[] };
type Props = {
  quote: LandscapeQuote;
  onItemChange: (id: string, patch: Partial<LandscapeQuoteItem>) => void;
  onDrawingsChange: (drawings: LandscapeDrawing[]) => void;
  onTextNotesChange: (notes: LandscapeTextNote[]) => void;
  onCustomStampsChange: (stamps: LandscapeCustomStamp[]) => void;
  availablePlants?: LandscapeAiPlant[];
  onAddPlant?: (plantId: string, quantity: number, positions: LandscapePoint[], size?: number) => void;
};

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function errorText(value: unknown): string {
  if (value && typeof value === 'object' && 'error' in value && typeof value.error === 'string') {
    return value.error;
  }
  return 'تعذر الاتصال بمساعد المخطط. حاول مرة أخرى بعد قليل.';
}

export default function LandscapeAiChat({ quote, onItemChange, onDrawingsChange, onTextNotesChange, onCustomStampsChange, availablePlants = [], onAddPlant }: Props) {
  const [configured, setConfigured] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState('');
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/landscape-ai/status', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('AI_STATUS_UNAVAILABLE');
        return response.json() as Promise<{ configured?: boolean }>;
      })
      .then((data) => {
        setConfigured(data.configured === true);
        setStatusError(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setConfigured(false);
        setStatusError(true);
      })
      .finally(() => setStatusLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const list = messageListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, busy]);

  const applyOperations = (operations: AiOperation[]) => {
    let nextDrawings = [...(quote.landscapeDrawings ?? [])];
    let nextTextNotes = [...(quote.landscapeTextNotes ?? [])];
    let nextCustomStamps = [...(quote.landscapeCustomStamps ?? [])];
    const itemPatches = new Map<string, Partial<LandscapeQuoteItem>>();

    for (const operation of operations) {
      if (!operation || typeof operation !== 'object' || !('type' in operation)) continue;
      switch (operation.type) {
        case 'place_item': {
          const item = quote.items.find((candidate) => candidate.id === operation.itemId);
          if (!item || !Array.isArray(operation.positions) || operation.positions.length === 0) break;
          const quantity = Math.max(0, Math.round(Number(item.quantity) || 0));
          const positions = operation.positions.slice(0, quantity).map((point) => ({
            x: Math.max(0, Math.min(100, Number(point.x))),
            y: Math.max(0, Math.min(100, Number(point.y))),
          }));
          if (!positions.length || positions.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) break;
          itemPatches.set(item.id, {
            ...itemPatches.get(item.id),
            landscapeAdded: true,
            landscapeX: positions[0].x,
            landscapeY: positions[0].y,
            landscapeInstances: positions,
            ...(Number.isFinite(operation.size) ? { landscapeSize: Math.max(24, Math.min(180, Number(operation.size))) } : {}),
          });
          break;
        }
        case 'add_plant': {
          const plant = availablePlants.find((candidate) => candidate.id === operation.plantId);
          if (!plant || !onAddPlant || !Array.isArray(operation.positions) || operation.positions.length === 0) break;
          const quantity = Math.max(1, Math.min(100, Math.round(Number(operation.quantity) || operation.positions.length)));
          const positions = operation.positions.slice(0, quantity).map((point) => ({
            x: Math.max(0, Math.min(100, Number(point.x))),
            y: Math.max(0, Math.min(100, Number(point.y))),
          }));
          if (!positions.length || positions.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) break;
          onAddPlant(plant.id, quantity, positions, Number.isFinite(operation.size) ? Math.max(24, Math.min(180, Number(operation.size))) : undefined);
          break;
        }
        case 'remove_item': {
          if (quote.items.some((item) => item.id === operation.itemId)) {
            itemPatches.set(operation.itemId, { ...itemPatches.get(operation.itemId), landscapeAdded: false, landscapeX: undefined, landscapeY: undefined, landscapeInstances: undefined });
          }
          break;
        }
        case 'add_rectangle':
          nextDrawings.push({
            id: newId('ai-area'),
            kind: 'rectangle',
            tool: operation.tool,
            x: Math.max(0, Math.min(100, operation.x)),
            y: Math.max(0, Math.min(100, operation.y)),
            width: Math.max(1.2, Math.min(95, operation.width)),
            height: Math.max(1.2, Math.min(95, operation.height)),
            rotation: Math.max(-180, Math.min(180, operation.rotation)),
          });
          break;
        case 'add_stroke':
          if (operation.points.length >= 2) {
            nextDrawings.push({
              id: newId('ai-line'),
              kind: 'stroke',
              tool: operation.tool,
              points: operation.points.map((point) => ({ x: Math.max(0, Math.min(100, point.x)), y: Math.max(0, Math.min(100, point.y)) })),
              strokeWidth: Math.max(1, Math.min(12, operation.strokeWidth)),
            });
          }
          break;
        case 'add_text':
          nextTextNotes.push({
            id: newId('ai-note'),
            text: operation.text.slice(0, 200),
            x: Math.max(0, Math.min(100, operation.x)),
            y: Math.max(0, Math.min(100, operation.y)),
            fontSize: Math.max(12, Math.min(72, operation.fontSize)),
          });
          break;
        case 'edit_text':
          nextTextNotes = nextTextNotes.map((note) => note.id === operation.noteId ? {
            ...note,
            ...(typeof operation.text === 'string' ? { text: operation.text.slice(0, 200) } : {}),
            ...(Number.isFinite(operation.x) ? { x: Math.max(0, Math.min(100, Number(operation.x))) } : {}),
            ...(Number.isFinite(operation.y) ? { y: Math.max(0, Math.min(100, Number(operation.y))) } : {}),
            ...(Number.isFinite(operation.fontSize) ? { fontSize: Math.max(12, Math.min(72, Number(operation.fontSize))) } : {}),
          } : note);
          break;
        case 'delete_text':
          nextTextNotes = nextTextNotes.filter((note) => note.id !== operation.noteId);
          break;
        case 'remove_drawing':
          nextDrawings = nextDrawings.filter((drawing) => drawing.id !== operation.drawingId);
          break;
        case 'clear_layout':
          for (const item of quote.items) itemPatches.set(item.id, { ...itemPatches.get(item.id), landscapeAdded: false, landscapeX: undefined, landscapeY: undefined, landscapeInstances: undefined });
          nextDrawings = [];
          nextTextNotes = [];
          nextCustomStamps = [];
          break;
        default:
          break;
      }
    }

    itemPatches.forEach((patch, itemId) => onItemChange(itemId, patch));
    if (JSON.stringify(nextDrawings) !== JSON.stringify(quote.landscapeDrawings ?? [])) onDrawingsChange(nextDrawings);
    if (JSON.stringify(nextTextNotes) !== JSON.stringify(quote.landscapeTextNotes ?? [])) onTextNotesChange(nextTextNotes);
    if (JSON.stringify(nextCustomStamps) !== JSON.stringify(quote.landscapeCustomStamps ?? [])) onCustomStampsChange(nextCustomStamps);
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!configured || !message || busy) return;
    setDraft('');
    setRequestError('');
    setMessages((current) => [...current, { role: 'user', content: message }]);
    setBusy(true);
    try {
      const response = await fetch('/api/landscape-ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: messages.slice(-8).map((entry) => ({ ...entry, content: entry.content.slice(0, 1200) })),
          plan: {
            items: quote.items.filter((item) => item.name.trim()).map((item) => ({
              id: item.id,
              name: item.name,
              category: item.category,
              scientificName: item.scientificName,
              quantity: item.quantity,
              landscapeAdded: item.landscapeAdded === true,
              landscapeX: item.landscapeX,
              landscapeY: item.landscapeY,
              landscapeInstances: item.landscapeInstances,
              landscapeSize: item.landscapeSize,
            })),
            drawings: quote.landscapeDrawings ?? [],
            textNotes: quote.landscapeTextNotes ?? [],
            availablePlants: availablePlants.slice(0, 150).map((plant) => ({ id: plant.id, name: plant.name, category: plant.category, scientificName: plant.scientificName })),
          },
        }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 503 && data && typeof data === 'object' && 'error' in data && data.error === 'AI_NOT_CONFIGURED') {
          setConfigured(false);
          setStatusError(false);
        }
        throw new Error(errorText(data));
      }
      if (!data || typeof data !== 'object' || !('reply' in data) || typeof data.reply !== 'string' || !('operations' in data) || !Array.isArray(data.operations)) {
        throw new Error('وصل رد غير مفهوم من مساعد المخطط.');
      }
      const result = data as AiReply;
      applyOperations(result.operations);
      setMessages((current) => [...current, { role: 'assistant', content: result.reply }]);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'تعذر تنفيذ طلبك. حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  return <section className="landscape-ai-chat" aria-label="محادثة AI لتصميم Landscape">
    <div className="landscape-ai-chat-heading">
      <span className="landscape-ai-chat-icon"><Sparkles size={17} /></span>
      <div><strong>تحدث مع AI لتصميم المخطط</strong><small>اطلب توزيع النباتات أو إضافة مبانٍ ومسارات وملاحظات نصية.</small></div>
      <span className={`landscape-ai-status ${configured ? 'is-connected' : 'is-disconnected'}`}>
        {statusLoading ? 'جارٍ التحقق…' : configured ? 'مفتاح OpenAI مضبوط' : statusError ? 'الخدمة غير متاحة' : 'بانتظار ربط OpenAI'}
      </span>
    </div>
    <div className="landscape-ai-chat-body">
      <div className="landscape-ai-messages" ref={messageListRef} aria-live="polite">
        {!messages.length && <div className="landscape-ai-empty"><MessageSquareText size={17} /><span>{configured ? 'اكتب طلبك، وسأطبّقه على المخطط الحالي.' : 'ستظهر المحادثة هنا بعد ربط OpenAI.'}</span></div>}
        {messages.map((message, index) => <div className={`landscape-ai-message ${message.role}`} key={`${message.role}-${index}`}><b>{message.role === 'user' ? 'أنت' : 'مساعد Landscape'}</b><p>{message.content}</p></div>)}
        {busy && <div className="landscape-ai-message assistant is-loading"><b>مساعد Landscape</b><p><LoaderCircle size={15} className="landscape-ai-spinner" /> جارٍ تحليل الطلب وتحديث المخطط…</p></div>}
      </div>
      {!configured && <p className="landscape-ai-setup-note" role="status">المحادثة غير مفعّلة الآن. أضف مفتاح OpenAI باسم <code>LANDSCAPE_OPENAI_API_KEY</code> إلى أسرار خادم API لتفعيلها.</p>}
      {statusError && <p className="landscape-ai-error" role="alert">لم نتمكن من التحقق من اتصال AI. تأكد من تشغيل خدمة API ثم أعد تحميل الصفحة.</p>}
      {requestError && <p className="landscape-ai-error" role="alert">{requestError}</p>}
      <form className="landscape-ai-compose" onSubmit={sendMessage}>
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} disabled={!configured || busy} maxLength={4000} rows={2} placeholder={configured ? 'مثال: وزّع الأشجار حول المبنى وأضف مسارًا من المدخل…' : 'سيُفعّل حقل الطلب بعد ربط OpenAI.'} />
        <button type="submit" disabled={!configured || busy || !draft.trim()} aria-label="إرسال الطلب إلى AI">{busy ? <LoaderCircle size={16} className="landscape-ai-spinner" /> : <Send size={16} />}إرسال إلى AI</button>
      </form>
    </div>
  </section>;
}
