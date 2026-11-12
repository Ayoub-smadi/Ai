import { useRef, useState, type ChangeEvent, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { FileDown, FileText, ImagePlus, LayoutDashboard, Plus, RotateCcw, Save, Trash2, Type, X } from 'lucide-react';
import { Link } from 'wouter';
import { createAdminDocumentId, dateBasedDocumentNumber, migrateLegacyDocumentNumber } from '@/lib/admin-document-storage';
import './official-letter-page.css';

type BlockPosition = { x: number; y: number; width: number; height: number };
type LetterBlock = {
  id: string;
  type: 'text' | 'images';
  text?: string;
  images?: string[];
  position?: BlockPosition;
};

type LetterPage = {
  id: string;
  blocks: LetterBlock[];
};

type OfficialLetterDraft = {
  number: string;
  date: string;
  institution: string;
  title: string;
  recipient: string;
  attention: string;
  attentionLabel: string;
  projectSite: string;
  projectName: string;
  greeting: string;
  body: string;
  pages: LetterPage[];
  closing: string;
  signatureLabel: string;
  footerName: string;
};

type SavedOfficialLetter = OfficialLetterDraft & { id: string; savedAt: string };
type LegacyLetter = Partial<OfficialLetterDraft> & {
  recipient?: string;
  subject?: string;
  body?: string;
  images?: unknown;
  extraText?: unknown;
  textBeforeImagesAfterText?: unknown;
  imagesAfterText?: unknown;
  textAfterImages?: unknown;
};

const STORAGE_KEY = 'qadri-official-letters';
const makeId = (prefix: string) => `${prefix}-${createAdminDocumentId()}`;
const DEFAULT_LETTER: OfficialLetterDraft = {
  number: dateBasedDocumentNumber('LTR', '2026-11-05'),
  date: '2026-11-05',
  institution: 'مؤسسة القادري الزراعية',
  title: 'إشعار المباشرة بتنفيذ الأعمال',
  recipient: 'الشركة الأردنية لتطوير المدن والمرافق',
  attention: 'السادة إدارة المشروع / مدير المشروع',
  attentionLabel: 'عناية',
  projectSite: 'مبنى الاستقلال',
  projectName: 'أعمال الزراعة والتشجير وعزل الأحواض وصيانة شبكة الري',
  greeting: 'تحية طيبة وبعد،',
  body: 'يسرنا بالإشارة إلى العطاء المذكور أعلاه، وبناءً على كتاب الإحالة وأمر المباشرة الصادر عنكم، إعلامكم بأن مؤسسة القادري الزراعية ستباشر بتنفيذ الأعمال الموكلة إليها اعتباراً من يوم الخميس الموافق 2026/11/05، وذلك وفقاً للشروط والمواصفات الفنية وجدول الكميات والبرنامج الزمني المعتمد في وثائق العطاء.\n\nونؤكد التزامنا بتنفيذ الأعمال وفق الأصول الفنية والمهنية المتبعة، وبما يضمن جودة التنفيذ والالتزام بالمدة الزمنية المحددة، مع التنسيق المستمر مع إدارة المشروع والجهات المعنية.\n\nراجين التكرم بالعلم واتخاذ ما يلزم حسب الأصول.',
  pages: [{ id: 'page-1', blocks: [] }],
  closing: 'وتفضلوا بقبول فائق الاحترام والتقدير....',
  signatureLabel: 'التوقيع والختم',
  footerName: 'مؤسسة القادري الزراعية',
};

function asImages(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((image): image is string => typeof image === 'string') : [];
}

function defaultBlockPosition(pageIndex: number, blockIndex: number, type: LetterBlock['type']): BlockPosition {
  return { x: 10, y: pageIndex === 0 ? Math.min(72 + blockIndex * 12, 86) : Math.min(12 + blockIndex * 18, 78), width: 80, height: type === 'images' ? 22 : 12 };
}

function normalizeBlock(block: Partial<LetterBlock>, pageIndex: number, blockIndex: number): LetterBlock {
  const type = block.type === 'images' ? 'images' : 'text';
  return {
    id: block.id || makeId('block'),
    type,
    text: type === 'text' ? String(block.text || '') : undefined,
    images: type === 'images' ? asImages(block.images) : undefined,
    position: block.position || defaultBlockPosition(pageIndex, blockIndex, type),
  };
}

function migrateLegacyPages(old: LegacyLetter): LetterPage[] {
  if (Array.isArray(old.pages) && old.pages.length) {
    const pages = old.pages.filter((page): page is LetterPage => Boolean(page && typeof page === 'object' && Array.isArray(page.blocks)));
    if (pages.length) return pages.map((page, index) => ({ id: page.id || `page-${index + 1}`, blocks: page.blocks.filter((block) => block?.type === 'text' || block?.type === 'images').map((block, blockIndex) => normalizeBlock(block, index, blockIndex)) }));
  }
  const blocks: LetterBlock[] = [];
  const images = asImages(old.images);
  const extraText = typeof old.extraText === 'string' ? old.extraText : '';
  const beforeImages = typeof old.textBeforeImagesAfterText === 'string' ? old.textBeforeImagesAfterText : '';
  const imagesAfterText = asImages(old.imagesAfterText);
  const afterImages = typeof old.textAfterImages === 'string' ? old.textAfterImages : '';
  if (images.length) blocks.push({ id: makeId('block'), type: 'images', images, position: defaultBlockPosition(0, blocks.length, 'images') });
  if (extraText) blocks.push({ id: makeId('block'), type: 'text', text: extraText, position: defaultBlockPosition(0, blocks.length, 'text') });
  if (beforeImages) blocks.push({ id: makeId('block'), type: 'text', text: beforeImages, position: defaultBlockPosition(0, blocks.length, 'text') });
  if (imagesAfterText.length) blocks.push({ id: makeId('block'), type: 'images', images: imagesAfterText, position: defaultBlockPosition(0, blocks.length, 'images') });
  if (afterImages) blocks.push({ id: makeId('block'), type: 'text', text: afterImages, position: defaultBlockPosition(0, blocks.length, 'text') });
  return [{ id: 'page-1', blocks }];
}

function readSavedLetters(): SavedOfficialLetter[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    const records = value.map((item, index) => {
      const old = item as LegacyLetter & { id?: string; savedAt?: string; date?: string; number?: string };
      const date = old.date || DEFAULT_LETTER.date;
      const number = old.number ? migrateLegacyDocumentNumber(old.number, 'LTR', date) : dateBasedDocumentNumber('LTR', date);
      return {
        ...DEFAULT_LETTER,
        ...old,
        number,
        title: old.title || old.subject || DEFAULT_LETTER.title,
        recipient: old.recipient || DEFAULT_LETTER.recipient,
        body: old.body || DEFAULT_LETTER.body,
        pages: migrateLegacyPages(old),
        id: old.id || `legacy-${index}-${old.savedAt || ''}`,
        savedAt: old.savedAt || '',
      } as SavedOfficialLetter;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return records;
  } catch {
    return [];
  }
}

function formattedDate(date: string) {
  return date ? date.split('-').join('/ ') : '—';
}

function paragraphs(text: string) {
  return text.split(/\n\s*\n/).filter((paragraph) => paragraph.trim());
}

export default function OfficialLetterPage() {
  const [form, setForm] = useState<OfficialLetterDraft>({ ...DEFAULT_LETTER });
  const [saved, setSaved] = useState<SavedOfficialLetter[]>(readSavedLetters);
  const [pdfMode, setPdfMode] = useState<'multi' | 'single' | null>(null);
  const [status, setStatus] = useState('');
  const paperRef = useRef<HTMLElement>(null);
  const pdfBusy = pdfMode !== null;

  const update = (key: keyof OfficialLetterDraft, value: string) => {
    setForm((current) => ({ ...current, [key]: value, ...(key === 'date' ? { number: dateBasedDocumentNumber('LTR', value) } : {}) }));
    setStatus('');
  };

  const updatePages = (updater: (pages: LetterPage[]) => LetterPage[]) => {
    setForm((current) => ({ ...current, pages: updater(current.pages) }));
    setStatus('');
  };

  const updateBlockPosition = (pageId: string, blockId: string, position: BlockPosition) => updatePages((pages) => pages.map((page) => page.id === pageId ? { ...page, blocks: page.blocks.map((block) => block.id === blockId ? { ...block, position } : block) } : page));

  const beginBlockInteraction = (event: ReactPointerEvent<HTMLElement>, pageId: string, block: LetterBlock, mode: 'move' | 'resize') => {
    event.preventDefault();
    event.stopPropagation();
    const layer = event.currentTarget.closest('.official-letter-free-layer');
    if (!layer) return;
    const bounds = layer.getBoundingClientRect();
    const start = block.position || defaultBlockPosition(0, 0, block.type);
    const startX = event.clientX;
    const startY = event.clientY;
    const onMove = (moveEvent: PointerEvent) => {
      const dx = ((moveEvent.clientX - startX) / bounds.width) * 100;
      const dy = ((moveEvent.clientY - startY) / bounds.height) * 100;
      if (mode === 'move') {
        updateBlockPosition(pageId, block.id, { ...start, x: Math.max(0, Math.min(100 - start.width, start.x + dx)), y: Math.max(0, Math.min(100 - start.height, start.y + dy)) });
      } else {
        updateBlockPosition(pageId, block.id, { ...start, width: Math.max(12, Math.min(100 - start.x, start.width + dx)), height: Math.max(8, Math.min(100 - start.y, start.height + dy)) });
      }
    };
    const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };

  const saveLetter = (event: FormEvent) => {
    event.preventDefault();
    const record: SavedOfficialLetter = { ...form, id: createAdminDocumentId(), savedAt: new Date().toISOString() };
    const next = [record, ...saved];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaved(next);
      setStatus('تم حفظ الكتاب على هذا الجهاز.');
    } catch {
      setStatus('تعذر حفظ الكتاب في المتصفح.');
    }
  };

  const addImagesToPage = async (event: ChangeEvent<HTMLInputElement>, pageId: string, blockId?: string) => {
    const input = event.currentTarget;
    const files = Array.from(input.files || []).filter((file) => file.type.startsWith('image/'));
    input.value = '';
    if (!files.length) return;
    const images: string[] = [];
    for (const file of files) {
      try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas is unavailable');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        images.push(canvas.toDataURL('image/jpeg', 0.86));
      } catch {
        // Ignore files the browser cannot decode.
      }
    }
    if (!images.length) return;
    updatePages((pages) => pages.map((page) => {
      if (page.id !== pageId) return page;
      if (blockId) return { ...page, blocks: page.blocks.map((block) => block.id === blockId ? { ...block, images: [...(block.images || []), ...images] } : block) };
      return { ...page, blocks: [...page.blocks, { id: makeId('block'), type: 'images', images, position: defaultBlockPosition(pages.indexOf(page), page.blocks.length, 'images') }] };
    }));
    setStatus(`تمت إضافة ${images.length} صورة.`);
  };

  const addPage = () => {
    updatePages((pages) => [...pages, { id: makeId('page'), blocks: [] }]);
    setStatus('تمت إضافة صفحة جديدة.');
  };

  const removePage = (pageId: string) => {
    if (form.pages.length <= 1) return;
    updatePages((pages) => pages.filter((page) => page.id !== pageId));
    setStatus('تم حذف الصفحة.');
  };

  const insertBlockAfter = (pageId: string, index: number, type: LetterBlock['type']) => {
    updatePages((pages) => pages.map((page) => {
      if (page.id !== pageId) return page;
      const block: LetterBlock = type === 'text' ? { id: makeId('block'), type, text: '', position: defaultBlockPosition(pages.indexOf(page), page.blocks.length, type) } : { id: makeId('block'), type, images: [], position: defaultBlockPosition(pages.indexOf(page), page.blocks.length, type) };
      const blocks = [...page.blocks];
      blocks.splice(index + 1, 0, block);
      return { ...page, blocks };
    }));
  };

  const updateTextBlock = (pageId: string, blockId: string, text: string) => updatePages((pages) => pages.map((page) => page.id === pageId ? { ...page, blocks: page.blocks.map((block) => block.id === blockId ? { ...block, text } : block) } : page));
  const removeBlock = (pageId: string, blockId: string) => updatePages((pages) => pages.map((page) => page.id === pageId ? { ...page, blocks: page.blocks.filter((block) => block.id !== blockId) } : page));
  const removeImage = (pageId: string, blockId: string, imageIndex: number) => updatePages((pages) => pages.map((page) => page.id === pageId ? { ...page, blocks: page.blocks.map((block) => block.id === blockId ? { ...block, images: (block.images || []).filter((_, index) => index !== imageIndex) } : block) } : page));

  const openSaved = (record: SavedOfficialLetter) => {
    const { id: _id, savedAt: _savedAt, ...draft } = record;
    setForm({ ...DEFAULT_LETTER, ...draft, pages: migrateLegacyPages(record) });
    setStatus('تم فتح الكتاب المحفوظ.');
  };

  const downloadPdf = async () => {
    const paper = paperRef.current;
    if (!paper) return;
    setPdfMode('multi');
    setStatus('');
    try {
      await document.fonts?.ready;
      await Promise.all(Array.from(paper.querySelectorAll('img')).map((image) => image.decode().catch(() => undefined)));
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      paper.classList.add('official-letter-exporting');
      const canvas = await html2canvas(paper, { scale: 2.5, backgroundColor: '#ffffff', useCORS: true, logging: false, width: paper.scrollWidth, height: paper.scrollHeight });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter', compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const sourcePageHeight = Math.floor(canvas.width * pageHeight / pageWidth);
      let sourceY = 0;
      let page = 0;
      while (sourceY < canvas.height) {
        const sourceEnd = Math.min(sourceY + sourcePageHeight, canvas.height);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourcePageHeight;
        const context = pageCanvas.getContext('2d');
        if (!context) throw new Error('Canvas is unavailable');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        context.drawImage(canvas, 0, sourceY, canvas.width, sourceEnd - sourceY, 0, 0, canvas.width, sourceEnd - sourceY);
        if (page > 0) pdf.addPage();
        pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.98), 'JPEG', 0, 0, pageWidth, pageHeight);
        sourceY = sourceEnd;
        page += 1;
      }
      const safeName = (form.title.trim() || 'كتاب-رسمي').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80);
      pdf.save(`${safeName}.pdf`);
      setStatus('تم تنزيل الكتاب بصيغة PDF متعددة الصفحات.');
    } catch (error) {
      console.error('Official letter PDF generation failed', error);
      setStatus('تعذر إنشاء ملف PDF. أعد المحاولة بعد اكتمال تحميل الصفحة.');
    } finally {
      paper.classList.remove('official-letter-exporting');
      setPdfMode(null);
    }
  };

  const downloadSinglePagePdf = async () => {
    const paper = paperRef.current;
    if (!paper) return;
    setPdfMode('single');
    setStatus('');
    try {
      await document.fonts?.ready;
      await Promise.all(Array.from(paper.querySelectorAll('img')).map((image) => image.decode().catch(() => undefined)));
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      paper.classList.add('official-letter-exporting');
      const canvas = await html2canvas(paper, { scale: 2.5, backgroundColor: '#ffffff', useCORS: true, logging: false, width: paper.scrollWidth, height: paper.scrollHeight });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter', compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const fullHeight = canvas.height * pageWidth / canvas.width;
      const scaleToFit = Math.min(1, pageHeight / fullHeight);
      const imageWidth = pageWidth * scaleToFit;
      const imageHeight = fullHeight * scaleToFit;
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', (pageWidth - imageWidth) / 2, (pageHeight - imageHeight) / 2, imageWidth, imageHeight);
      const safeName = (form.title.trim() || 'كتاب-رسمي').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80);
      pdf.save(`${safeName}-صفحة-واحدة.pdf`);
      setStatus('تم تنزيل الكتاب كاملًا في صفحة PDF واحدة.');
    } catch (error) {
      console.error('Single-page official letter PDF generation failed', error);
      setStatus('تعذر إنشاء ملف PDF من صفحة واحدة. أعد المحاولة بعد اكتمال تحميل الصفحة.');
    } finally {
      paper.classList.remove('official-letter-exporting');
      setPdfMode(null);
    }
  };

  const renderCanvasBlocks = (blocks: LetterBlock[], pageIndex: number) => <div className="official-letter-free-layer">{blocks.map((block, index) => {
    const position = block.position || defaultBlockPosition(pageIndex, index, block.type);
    return <div className={`official-letter-canvas-block official-letter-canvas-block--${block.type}`} key={block.id} style={{ left: `${position.x}%`, top: `${position.y}%`, width: `${position.width}%`, height: `${position.height}%` }} onPointerDown={(event) => beginBlockInteraction(event, form.pages[pageIndex]?.id || '', block, 'move')}>
      <div className="official-letter-canvas-block-label">{block.type === 'text' ? 'اسحب النص' : 'اسحب الصورة'}</div>
      {block.type === 'text' ? <textarea value={block.text || ''} onChange={(event) => updateTextBlock(form.pages[pageIndex]?.id || '', block.id, event.target.value)} onPointerDown={(event) => event.stopPropagation()} placeholder="اكتب النص هنا..." /> : <div className="official-letter-canvas-images">{(block.images || []).map((image, imageIndex) => <img key={`${imageIndex}-${image.slice(-24)}`} src={image} alt="صورة مضافة" />)}{!(block.images || []).length && <span>أضف صورًا من لوحة التحكم</span>}</div>}
      <span className="official-letter-resize-handle" onPointerDown={(event) => beginBlockInteraction(event, form.pages[pageIndex]?.id || '', block, 'resize')} />
    </div>;
  })}</div>;

  const renderPageBlocksEditor = (page: LetterPage, pageIndex: number) => (
    <section className="official-letter-page-editor" key={page.id}>
      <div className="official-letter-page-editor-head"><div><strong>صفحة {pageIndex + 1}</strong><small>{page.blocks.length ? `${page.blocks.length} عناصر مضافة` : 'صفحة فارغة'}</small></div>{form.pages.length > 1 && <button className="icon-button" type="button" onClick={() => removePage(page.id)} aria-label={`حذف الصفحة ${pageIndex + 1}`}><Trash2 size={14} /></button>}</div>
      <div className="official-letter-block-editor">
        {page.blocks.map((block, blockIndex) => <div className="official-letter-block-card" key={block.id}>
          <div className="official-letter-block-card-head"><strong>{block.type === 'text' ? 'نص' : 'صور'}</strong><button type="button" className="icon-button" onClick={() => removeBlock(page.id, block.id)} aria-label="حذف العنصر"><X size={14} /></button></div>
          {block.type === 'text' ? <textarea rows={5} value={block.text || ''} onChange={(event) => updateTextBlock(page.id, block.id, event.target.value)} placeholder="اكتب النص في هذا الموضع..." /> : <><div className="official-letter-image-list">{(block.images || []).map((image, imageIndex) => <div className="official-letter-image-item" key={`${imageIndex}-${image.slice(-24)}`}><img src={image} alt={`صورة ${imageIndex + 1}`} /><span>الصورة {imageIndex + 1}</span><button type="button" onClick={() => removeImage(page.id, block.id, imageIndex)} aria-label="حذف الصورة"><Trash2 size={14} /></button></div>)}</div><label className="btn secondary official-letter-add-image"><ImagePlus size={14} />إضافة صور لهذا الموضع<input className="official-letter-file-input" type="file" accept="image/*" multiple onChange={(event) => addImagesToPage(event, page.id, block.id)} /></label></>}
          <div className="official-letter-insert-actions"><button type="button" className="btn secondary small" onClick={() => insertBlockAfter(page.id, blockIndex, 'text')}><Type size={13} />نص بعده</button><button type="button" className="btn secondary small" onClick={() => insertBlockAfter(page.id, blockIndex, 'images')}><ImagePlus size={13} />صور بعده</button></div>
        </div>)}
        {!page.blocks.length && <p className="operations-empty">أضف نصًا أو صورًا إلى هذه الصفحة.</p>}
      </div>
      <div className="official-letter-page-actions"><button type="button" className="btn secondary small" onClick={() => insertBlockAfter(page.id, -1, 'text')}><Type size={13} />إضافة نص</button><button type="button" className="btn secondary small" onClick={() => insertBlockAfter(page.id, -1, 'images')}><ImagePlus size={13} />إضافة صور</button><label className="btn secondary small"><ImagePlus size={13} />اختيار صور<input className="official-letter-file-input" type="file" accept="image/*" multiple onChange={(event) => addImagesToPage(event, page.id)} /></label></div>
    </section>
  );

  const firstPageBlocks = form.pages[0]?.blocks || [];
  return <main className="admin-page operations-page official-letter-page" dir="rtl">
    <div className="admin-head"><div><div className="eyebrow">QADRI AI / OFFICIAL LETTERS</div><h1>الكتب الرسمية</h1><p className="page-desc">أنشئ كتابًا رسميًا متعدد الصفحات، وأضف النصوص والصور في أي موضع داخل الصفحات، ثم نزّله PDF.</p></div><div className="admin-head-actions"><button className="btn" type="button" onClick={downloadPdf} disabled={pdfBusy}><FileDown size={14} />{pdfMode === 'multi' ? 'جاري تجهيز PDF...' : 'تنزيل PDF متعدد الصفحات'}</button><button className="btn secondary" type="button" onClick={downloadSinglePagePdf} disabled={pdfBusy}><FileDown size={14} />{pdfMode === 'single' ? 'جاري تجهيز صفحة واحدة...' : 'تنزيل PDF صفحة واحدة'}</button><button className="btn secondary" type="button" onClick={() => { setForm({ ...DEFAULT_LETTER }); setStatus('تمت استعادة بيانات النموذج المرفق.'); }}><RotateCcw size={14} />استعادة النموذج</button><Link className="btn secondary" href="/admin"><LayoutDashboard size={14} />لوحة التحكم</Link></div></div>
    <div className="official-letter-workspace">
      <form className="panel official-letter-form" onSubmit={saveLetter}><div className="official-letter-form-head"><div><span className="eyebrow">DOCUMENT BUILDER</span><h2>بيانات الكتاب والصفحات</h2></div><span className="operations-live-dot">معاينة مباشرة</span></div>
        <div className="official-letter-fields"><label>التاريخ<input type="date" value={form.date} onChange={(event) => update('date', event.target.value)} /></label><label>اسم المؤسسة<input value={form.institution} onChange={(event) => update('institution', event.target.value)} /></label><label className="official-letter-field-wide">عنوان الكتاب<input value={form.title} onChange={(event) => update('title', event.target.value)} /></label><label className="official-letter-field-wide">الجهة الموجّه إليها<input value={form.recipient} onChange={(event) => update('recipient', event.target.value)} /></label><label>تسمية عناية<input value={form.attentionLabel} onChange={(event) => update('attentionLabel', event.target.value)} /></label><label className="official-letter-field-wide">الاسم بعد عناية<input value={form.attention} onChange={(event) => update('attention', event.target.value)} /></label><label>موقع المشروع<input value={form.projectSite} onChange={(event) => update('projectSite', event.target.value)} /></label><label>اسم المشروع<input value={form.projectName} onChange={(event) => update('projectName', event.target.value)} /></label><label className="official-letter-field-wide">التحية<input value={form.greeting} onChange={(event) => update('greeting', event.target.value)} /></label><label className="official-letter-field-wide">نص الكتاب<textarea rows={12} value={form.body} onChange={(event) => update('body', event.target.value)} /></label></div>
        <section className="official-letter-pages-editor official-letter-field-wide"><div className="official-letter-pages-editor-head"><div><strong>محتوى الصفحات الإضافي</strong><small>أضف نصوصًا وصورًا بالترتيب الذي تريده داخل كل صفحة.</small></div><button type="button" className="btn secondary small" onClick={addPage}><Plus size={14} />إضافة صفحة ثانية</button></div>{form.pages.map(renderPageBlocksEditor)}</section>
        <div className="official-letter-fields"><label className="official-letter-field-wide">عبارة الختام<input value={form.closing} onChange={(event) => update('closing', event.target.value)} /></label><label>تسمية التوقيع والختم<input value={form.signatureLabel} onChange={(event) => update('signatureLabel', event.target.value)} /></label><label>الاسم أسفل التوقيع<input value={form.footerName} onChange={(event) => update('footerName', event.target.value)} /></label></div>
        {status && <p className="official-letter-status" role="status">{status}</p>}<button className="btn official-letter-save" type="submit"><Save size={14} />حفظ الكتاب</button>
        <section className="official-letter-history"><div className="official-letter-history-head"><h2>الكتب المحفوظة</h2><span>{saved.length}</span></div>{saved.length ? saved.map((record) => <button type="button" className="official-letter-record" key={record.id} onClick={() => openSaved(record)}><span className="official-letter-record-icon"><FileText size={15} /></span><span className="official-letter-record-copy"><strong>{record.title || 'كتاب رسمي'}</strong><small>{record.number} · {record.recipient || 'بدون جهة'} · {formattedDate(record.date)}</small></span><span className="official-letter-open">فتح</span></button>) : <p className="operations-empty">لا توجد كتب محفوظة بعد.</p>}</section>
      </form>
      <section className="panel official-letter-preview-panel"><div className="official-letter-preview-toolbar"><span>معاينة الورقة الرسمية</span><small>{form.pages.length} صفحة · Letter · 8.5 × 11 بوصة</small></div><div className="official-letter-paper-scroll"><article className="official-letter-paper" ref={paperRef}><div className="official-letter-top-rule" /><header className="official-letter-header-row"><strong>{form.institution || '—'}</strong><span><b>التاريخ:</b> {formattedDate(form.date)}</span></header><h2 className="official-letter-title"><span className="official-letter-title-text">{form.title || '—'}</span></h2><div className="official-letter-recipient"><b>إلى :</b><span>{form.recipient || '—'}</span></div><div className="official-letter-attention"><b>{form.attentionLabel || '—'} :</b><span>{form.attention || '—'}</span></div><div className="official-letter-project-grid"><div><b>موقع المشروع</b><span>{form.projectSite || '—'}</span></div><div><b>المشروع</b><span>{form.projectName || '—'}</span></div></div><section className="official-letter-content"><p className="official-letter-greeting">{form.greeting || '—'}</p><div className="official-letter-body">{paragraphs(form.body).length ? paragraphs(form.body).map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 12)}`}>{paragraph}</p>) : <p>اكتب نص الكتاب ليظهر هنا.</p>}</div><p className="official-letter-closing">{form.closing || '—'}</p></section><footer className="official-letter-signature"><strong>{form.signatureLabel || '—'}</strong><img src="/official-letter-signature.jpg" alt="التوقيع والختم" /><b>{form.footerName || '—'}</b></footer>{renderCanvasBlocks(firstPageBlocks, 0)}{form.pages.slice(1).map((page, pageIndex) => <section className="official-letter-additional-page" key={page.id}><div className="official-letter-additional-header"><strong>{form.institution || '—'}</strong><span>صفحة {pageIndex + 2}</span></div><div className="official-letter-additional-content">{renderCanvasBlocks(page.blocks, pageIndex + 1)}</div></section>)}</article></div></section>
    </div>
  </main>;
}
