import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, Download, FileText, History, Plus, Save, Trash2, X } from 'lucide-react';

type AlternativeQuoteItem = {
  name: string;
  category?: string;
  description?: string;
  quantity: number;
  price: number;
};

type AlternativeQuoteData = {
  number: string;
  date: string;
  title?: string;
  customer: string;
  customerPhone?: string;
  customerLocation?: string;
  companyNameAr?: string;
  companyLocationAr?: string;
  currency: string;
  discount?: number;
  shippingCost?: number;
  taxEnabled?: boolean;
  taxRate?: number;
  notes?: string;
  items: readonly AlternativeQuoteItem[];
};

type EditableQuoteData = Omit<AlternativeQuoteData, 'items'> & {
  companyNameAr: string;
  companyLocationAr: string;
  items: AlternativeQuoteItem[];
  stampUrl: string;
};

type TemplateId = 'haybah' | 'wadi' | 'athil';
type TemplateOption = { id: TemplateId; name: string; description: string };
type SavedAlternativeQuote = { id: string; template: TemplateId; savedAt: string; draft: EditableQuoteData };
type ModalStep = 'choose' | 'edit' | 'registry';

const REGISTRY_KEY = 'qadri-alternative-quote-registry-v1';
const templateOptions: TemplateOption[] = [
  { id: 'haybah', name: 'مشاتل الريف الأخضر', description: 'اسم المشتل وختمه المرفق، ويتضمن الختم اسم المدير ورقم الهاتف.' },
  { id: 'wadi', name: 'مشتل الأندلس الزراعي', description: 'ختم الأندلس الدائري المرفق، دون إضافة شعار.' },
  { id: 'athil', name: 'الأصيل', description: 'قالب مفتوح؛ اختر الاسم والختم واكتب بيانات العرض بنفسك.' },
];

const stampForTemplate: Record<TemplateId, string> = {
  haybah: '/stamp-alreef.png',
  wadi: '/stamp-alandalus.png',
  athil: '',
};

function templateBusinessName(template: TemplateId) {
  if (template === 'haybah') return 'مشاتل الريف الأخضر';
  if (template === 'wadi') return 'مشتل الأندلس الزراعي';
  return '';
}

function amount(value: number, currency: string) {
  const currencyLabel = currency === 'JOD' ? 'د.أ' : currency || 'د.أ';
  return `${(Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyLabel}`;
}

function quoteTotals(quote: AlternativeQuoteData) {
  const subtotal = quote.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);
  const discount = Math.min(subtotal, Math.max(0, Number(quote.discount) || 0));
  const tax = quote.taxEnabled ? (subtotal - discount) * (Number(quote.taxRate) || 0) / 100 : 0;
  const shipping = Math.max(0, Number(quote.shippingCost) || 0);
  return { subtotal, discount, tax, shipping, total: subtotal - discount + tax + shipping };
}

function normalizeHeading(value: string | undefined) {
  const heading = (value || '').replace(/COMMERCIAL\s+OFFER/gi, '').trim();
  return /^عرض\s+ال?سعر$/u.test(heading) ? 'عرض سعر' : heading;
}

function makeEditableQuote(quote: AlternativeQuoteData, template: TemplateId): EditableQuoteData {
  return {
    number: quote.number || '',
    date: quote.date || '',
    title: normalizeHeading(quote.title) || 'عرض سعر',
    customer: quote.customer || '',
    customerPhone: quote.customerPhone || '',
    customerLocation: quote.customerLocation || '',
    companyNameAr: templateBusinessName(template),
    companyLocationAr: '',
    currency: quote.currency || 'JOD',
    discount: Number(quote.discount) || 0,
    shippingCost: Number(quote.shippingCost) || 0,
    taxEnabled: Boolean(quote.taxEnabled),
    taxRate: Number(quote.taxRate) || 16,
    notes: quote.notes || '',
    items: quote.items.length
      ? quote.items.map((item) => ({ name: item.name || '', category: item.category || '', description: item.description || '', quantity: Number(item.quantity) || 0, price: Number(item.price) || 0 }))
      : [{ name: '', category: '', description: '', quantity: 1, price: 0 }],
    stampUrl: stampForTemplate[template],
  };
}

function readRegistry(): SavedAlternativeQuote[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(REGISTRY_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((record): record is SavedAlternativeQuote => Boolean(
      record && typeof record === 'object' &&
      typeof record.id === 'string' && typeof record.savedAt === 'string' &&
      ['haybah', 'wadi', 'athil'].includes(record.template) &&
      record.draft && typeof record.draft === 'object' && Array.isArray(record.draft.items),
    ));
  } catch {
    return [];
  }
}

function TemplateThumbnail({ template }: { template: TemplateOption }) {
  return (
    <div className={`alt-quote-template-thumbnail alt-quote-template-thumbnail--${template.id}`} aria-hidden="true">
      <div className="alt-quote-thumbnail-top" />
      <div className="alt-quote-thumbnail-header"><span className="alt-quote-thumbnail-stamp" /><span className="alt-quote-thumbnail-company" /><span className="alt-quote-thumbnail-number" /></div>
      <div className="alt-quote-thumbnail-title" />
      <div className="alt-quote-thumbnail-meta"><i /><i /><i /></div>
      <div className="alt-quote-thumbnail-table"><i /><i /><i /><i /></div>
      <div className="alt-quote-thumbnail-bottom"><i /><i /></div>
      <div className="alt-quote-thumbnail-footer" />
    </div>
  );
}

function AlternativeQuotePage({
  quote,
  template,
  pageItems,
  startIndex,
  pageNumber,
  pageCount,
  totals,
}: {
  quote: EditableQuoteData;
  template: TemplateId;
  pageItems: readonly AlternativeQuoteItem[];
  startIndex: number;
  pageNumber: number;
  pageCount: number;
  totals: ReturnType<typeof quoteTotals>;
}) {
  const isLastPage = pageNumber === pageCount;
  const rows = pageItems.length ? pageItems : [null];
  const namedItemCount = quote.items.filter((item) => item.name.trim()).length;
  const heading = normalizeHeading(quote.title);
  return (
    <article className={`alt-quote-export-page alt-quote-sheet--${template}`} dir="rtl">
      <div className="alt-quote-page-rail" />
      <header className="alt-quote-document-head">
        <div className="alt-quote-company-copy">
          <strong>{quote.companyNameAr || ' '}</strong>
          {quote.companyLocationAr && <span>{quote.companyLocationAr}</span>}
        </div>
        <div className="alt-quote-document-mark">
          <span>{pageNumber > 1 ? 'تكملة' : 'رقم المستند'}</span>
          <strong dir="ltr">{quote.number || '—'}</strong>
          <small>{pageNumber} / {pageCount}</small>
        </div>
      </header>

      <div className="alt-quote-title-row">
        {heading && <div><h1><span className="alt-quote-arabic-heading" lang="ar" dir="rtl">{heading}</span></h1></div>}
        <time>{quote.date || ' '}</time>
      </div>

      <section className="alt-quote-customer-grid">
        <div><small>مقدم إلى</small><strong>{quote.customer || ' '}</strong></div>
        <div><small>رقم الهاتف</small><strong dir="ltr">{quote.customerPhone || ' '}</strong></div>
        <div><small>الموقع</small><strong>{quote.customerLocation || ' '}</strong></div>
      </section>

      <div className="alt-quote-items-heading"><h2>تفاصيل الأصناف والخدمات</h2><span>{namedItemCount} بنود</span></div>
      <table className="alt-quote-items-table">
        <colgroup><col className="alt-quote-col-number" /><col className="alt-quote-col-name" /><col className="alt-quote-col-description" /><col className="alt-quote-col-quantity" /><col className="alt-quote-col-price" /><col className="alt-quote-col-total" /></colgroup>
        <thead><tr><th>م</th><th>الصنف</th><th>التفاصيل</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
        <tbody>
          {rows.map((item, index) => (
            <tr key={item ? `${item.name}-${startIndex + index}` : 'blank-row'}>
              <td>{item ? startIndex + index + 1 : ''}</td>
              <td><strong>{item?.name || ''}</strong>{item?.category && <small>{item.category}</small>}</td>
              <td>{item?.description || ''}</td>
              <td>{item ? (Number(item.quantity) || 0).toLocaleString('en-US') : ''}</td>
              <td>{item ? amount(Number(item.price) || 0, quote.currency) : ''}</td>
              <td>{item ? amount((Number(item.quantity) || 0) * (Number(item.price) || 0), quote.currency) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {isLastPage && (
        <>
          <section className="alt-quote-settlement">
            <div className="alt-quote-notes-box"><strong>ملاحظات</strong><p>{quote.notes || ' '}</p></div>
            <div className="alt-quote-totals-box">
              <div><span>المجموع الفرعي</span><strong>{amount(totals.subtotal, quote.currency)}</strong></div>
              {totals.discount > 0 && <div><span>الخصم</span><strong>− {amount(totals.discount, quote.currency)}</strong></div>}
              {totals.tax > 0 && <div><span>الضريبة</span><strong>{amount(totals.tax, quote.currency)}</strong></div>}
              {totals.shipping > 0 && <div><span>التوصيل</span><strong>{amount(totals.shipping, quote.currency)}</strong></div>}
              <div className="alt-quote-grand-total"><span>الإجمالي النهائي</span><strong>{amount(totals.total, quote.currency)}</strong></div>
            </div>
          </section>
          <section className="alt-quote-stamp-region">
            <span>الختم</span>
            {quote.stampUrl ? <img src={quote.stampUrl} alt="الختم" /> : <div className="alt-quote-stamp-space" aria-label="مساحة فارغة للختم" />}
          </section>
        </>
      )}

      <div className="alt-quote-page-grow" />
      <footer className="alt-quote-empty-footer" aria-label="مساحة فارغة للتذييل"><div /><div /></footer>
    </article>
  );
}

export default function AlternativeQuoteExportButton({ quote }: { quote: AlternativeQuoteData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('haybah');
  const [step, setStep] = useState<ModalStep>('choose');
  const [draft, setDraft] = useState<EditableQuoteData>(() => makeEditableQuote(quote, 'haybah'));
  const [savedQuotes, setSavedQuotes] = useState<SavedAlternativeQuote[]>(() => readRegistry());
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const renderRootRef = useRef<HTMLDivElement>(null);
  const totals = useMemo(() => quoteTotals(draft), [draft]);
  const pages = useMemo(() => {
    const namedItems = draft.items.filter((item) => item.name.trim());
    const pageSize = 4;
    if (!namedItems.length) return [{ items: [] as AlternativeQuoteItem[], startIndex: 0 }];
    return Array.from({ length: Math.ceil(namedItems.length / pageSize) }, (_, index) => ({
      items: namedItems.slice(index * pageSize, (index + 1) * pageSize),
      startIndex: index * pageSize,
    }));
  }, [draft.items]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isExporting) setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isExporting]);

  const openTemplates = () => {
    setEditingRecordId(null);
    setDraft(makeEditableQuote(quote, selectedTemplate));
    setStep('choose');
    setError('');
    setSavedMessage('');
    setIsOpen(true);
  };

  const openRegistry = () => {
    setSavedQuotes(readRegistry());
    setStep('registry');
    setError('');
    setSavedMessage('');
    setIsOpen(true);
  };

  const chooseTemplate = (template: TemplateId) => {
    setSelectedTemplate(template);
    setDraft((current) => ({
      ...current,
      companyNameAr: templateBusinessName(template),
      companyLocationAr: '',
      stampUrl: stampForTemplate[template],
      title: normalizeHeading(current.title),
    }));
    setError('');
    setSavedMessage('');
  };

  const openSavedQuote = (record: SavedAlternativeQuote) => {
    setSelectedTemplate(record.template);
    setDraft({ ...record.draft, title: normalizeHeading(record.draft.title) || 'عرض سعر', items: record.draft.items.map((item) => ({ ...item })) });
    setEditingRecordId(record.id);
    setStep('edit');
    setError('');
    setSavedMessage('');
  };

  const updateDraft = <K extends keyof EditableQuoteData>(key: K, value: EditableQuoteData[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSavedMessage('');
  };

  const updateItem = (index: number, changes: Partial<AlternativeQuoteItem>) => {
    setDraft((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item) }));
    setSavedMessage('');
  };

  const addItem = () => setDraft((current) => ({ ...current, items: [...current.items, { name: '', category: '', description: '', quantity: 1, price: 0 }] }));
  const removeItem = (index: number) => setDraft((current) => ({ ...current, items: current.items.length > 1 ? current.items.filter((_, itemIndex) => itemIndex !== index) : [{ name: '', category: '', description: '', quantity: 1, price: 0 }] }));

  const uploadCustomStamp = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateDraft('stampUrl', String(reader.result || ''));
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const persistDraft = () => {
    const id = editingRecordId || `altq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record: SavedAlternativeQuote = {
      id,
      template: selectedTemplate,
      savedAt: new Date().toISOString(),
      draft: { ...draft, items: draft.items.map((item) => ({ ...item })) },
    };
    const next = [record, ...savedQuotes.filter((saved) => saved.id !== id)];
    try {
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(next));
      setSavedQuotes(next);
      setEditingRecordId(id);
      setSavedMessage('تم حفظ النموذج في السجل الخاص. يمكنك فتحه وتعديله لاحقًا.');
      setError('');
      return true;
    } catch (saveError) {
      console.error('Alternative quote registry save failed', saveError);
      setError('تعذر الحفظ في السجل. قد تكون مساحة التخزين ممتلئة.');
      return false;
    }
  };

  const deleteSavedQuote = (id: string) => {
    const next = savedQuotes.filter((record) => record.id !== id);
    try {
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(next));
      setSavedQuotes(next);
    } catch (deleteError) {
      console.error('Alternative quote registry delete failed', deleteError);
      setError('تعذر حذف النموذج من السجل.');
    }
  };

  const exportSelectedTemplate = async () => {
    const renderRoot = renderRootRef.current;
    if (!renderRoot || isExporting) return;
    setIsExporting(true);
    setError('');
    const saved = persistDraft();
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const pageNodes = Array.from(renderRoot.querySelectorAll<HTMLElement>('.alt-quote-export-page'));
      if (!pageNodes.length) throw new Error('No export pages were rendered.');
      const pendingImages = Array.from(renderRoot.querySelectorAll('img')).map((image) => image.decode().catch(() => undefined));
      await Promise.all(pendingImages);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      await (document.fonts?.ready || Promise.resolve());

      for (let index = 0; index < pageNodes.length; index += 1) {
        const wrapper = document.createElement('div');
        wrapper.className = 'alt-quote-render-root';
        wrapper.style.cssText = 'position:fixed;left:0;top:0;z-index:-1;visibility:hidden;pointer-events:none;width:794px;height:1123px;overflow:visible;background:#fff;';
        const page = pageNodes[index].cloneNode(true) as HTMLElement;
        page.style.visibility = 'visible';
        wrapper.appendChild(page);
        document.body.appendChild(wrapper);
        try {
          const canvas = await html2canvas(page, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
            allowTaint: false,
            logging: false,
            width: 794,
            height: 1123,
            windowWidth: 794,
            windowHeight: 1123,
            scrollX: 0,
            scrollY: 0,
            onclone: (clonedDocument) => {
              const clonedRoot = clonedDocument.querySelector<HTMLElement>('.alt-quote-render-root');
              if (clonedRoot) {
                clonedRoot.style.visibility = 'visible';
                clonedRoot.style.zIndex = '99999';
              }
            },
          });
          if (index > 0) pdf.addPage('a4', 'portrait');
          pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        } finally {
          wrapper.remove();
        }
      }

      const safeNumber = draft.number.replace(/[\\/:*?"<>|]/g, '-').trim() || 'quote';
      const template = templateOptions.find((option) => option.id === selectedTemplate)!;
      const safeTemplateName = template.name.replace(/[\\/:*?"<>|]/g, '-').trim();
      pdf.save(`${safeNumber}-${safeTemplateName}.pdf`);
      if (saved) setIsOpen(false);
      else setError('تم تنزيل الملف، لكن تعذر حفظ نسخة في السجل. يمكنك المحاولة بالحفظ يدويًا.');
    } catch (exportError) {
      console.error('Alternative quote PDF generation failed', exportError);
      setError('تعذر إنشاء ملف PDF. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedName = templateOptions.find((template) => template.id === selectedTemplate)?.name || 'الأصيل';
  const portal = isOpen ? createPortal(
    <>
      <div className="alt-quote-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isExporting) setIsOpen(false); }}>
        <section className="alt-quote-modal" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="alt-quote-modal-title">
          <header className="alt-quote-modal-header">
            <div>
              <span className="alt-quote-modal-kicker">{step === 'registry' ? 'سجل مستقل للقوالب المختلفة' : step === 'choose' ? 'قوالب مستقلة عن العرض الحالي' : selectedName}</span>
              <h2 id="alt-quote-modal-title">{step === 'registry' ? 'النماذج المحفوظة' : step === 'choose' ? 'اختر تصميم القالب' : 'عدّل بيانات القالب'}</h2>
              <p>{step === 'registry' ? 'افتح أي نموذج محفوظ لمتابعة تعديله أو تصديره.' : step === 'choose' ? 'لا توجد شعارات في هذه القوالب؛ تُستخدم الأختام المرفقة فقط.' : 'عدّل النصوص والأسعار والكميات. التعديلات هنا لا تغيّر العرض الأصلي.'}</p>
            </div>
            <button className="alt-quote-modal-close" type="button" onClick={() => setIsOpen(false)} disabled={isExporting} aria-label="إغلاق"><X size={18} /></button>
          </header>

          {step === 'choose' && (
            <div className="alt-quote-template-grid">
              {templateOptions.map((template) => (
                <button key={template.id} className={`alt-quote-template-choice ${selectedTemplate === template.id ? 'selected' : ''}`} type="button" onClick={() => chooseTemplate(template.id)} aria-pressed={selectedTemplate === template.id}>
                  <TemplateThumbnail template={template} />
                  <span className="alt-quote-template-copy"><strong>{template.name}</strong><small>{template.description}</small></span>
                  <span className="alt-quote-template-check" aria-hidden="true"><Check size={14} /></span>
                </button>
              ))}
            </div>
          )}

          {step === 'registry' && (
            <div className="alt-quote-registry-list">
              {savedQuotes.length ? savedQuotes.map((record) => {
                const recordTemplate = templateOptions.find((template) => template.id === record.template)!;
                const recordName = record.draft.companyNameAr || recordTemplate.name;
                return (
                  <article className="alt-quote-registry-row" key={record.id}>
                    <div className={`alt-quote-registry-mark alt-quote-registry-mark--${record.template}`}><FileText size={18} /></div>
                    <div className="alt-quote-registry-info"><strong>{recordName}</strong><span>{record.draft.number || 'بلا رقم'} · {new Date(record.savedAt).toLocaleDateString('ar-JO')}</span><small>{recordTemplate.name} · {amount(quoteTotals(record.draft).total, record.draft.currency)}</small></div>
                    <div className="alt-quote-registry-actions"><button type="button" className="alt-quote-open-saved" onClick={() => openSavedQuote(record)}>فتح وتعديل</button><button type="button" className="alt-quote-delete-saved" onClick={() => deleteSavedQuote(record.id)} aria-label={`حذف ${recordName}`} title="حذف من السجل"><Trash2 size={14} /></button></div>
                  </article>
                );
              }) : <div className="alt-quote-registry-empty"><History size={24} /><strong>السجل فارغ</strong><span>احفظ أول نموذج من شاشة التعديل ليظهر هنا.</span></div>}
            </div>
          )}

          {step === 'edit' && (
            <div className="alt-quote-editor" dir="rtl">
              <section className="alt-quote-editor-panel">
                <div className="alt-quote-editor-section-head"><div><h3>بيانات القالب والنصوص</h3><p>اسم المدير ورقم الهاتف يظهران من صورة الختم المرفقة كما هما.</p></div></div>
                <div className="alt-quote-editor-fields">
                  <label>اسم المنشأة<input value={draft.companyNameAr} onChange={(event) => updateDraft('companyNameAr', event.target.value)} placeholder={selectedTemplate === 'athil' ? 'اكتب الاسم الذي تريده' : ''} readOnly={selectedTemplate !== 'athil'} /></label>
                  <label>عنوان إضافي<input value={draft.companyLocationAr} onChange={(event) => updateDraft('companyLocationAr', event.target.value)} placeholder="اختياري" /></label>
                  <label>العنوان الرئيسي<input value={draft.title || ''} onChange={(event) => updateDraft('title', event.target.value)} placeholder="اختياري" /></label>
                  <label>رقم المستند<input value={draft.number} onChange={(event) => updateDraft('number', event.target.value)} dir="ltr" /></label>
                  <label>التاريخ<input type="date" value={draft.date} onChange={(event) => updateDraft('date', event.target.value)} /></label>
                  <label>اسم العميل<input value={draft.customer} onChange={(event) => updateDraft('customer', event.target.value)} placeholder="اسم العميل" /></label>
                  <label>هاتف العميل<input value={draft.customerPhone || ''} onChange={(event) => updateDraft('customerPhone', event.target.value)} dir="ltr" /></label>
                  <label>موقع العميل<input value={draft.customerLocation || ''} onChange={(event) => updateDraft('customerLocation', event.target.value)} /></label>
                  <label className="alt-quote-editor-wide">الملاحظات أو نص إضافي<textarea value={draft.notes || ''} onChange={(event) => updateDraft('notes', event.target.value)} rows={3} placeholder="اكتب النص الذي تريد ظهوره في المستند" /></label>
                </div>

                {selectedTemplate === 'athil' ? (
                  <div className="alt-quote-stamp-controls">
                    <label>اختر الختم
                      <select value={draft.stampUrl.startsWith('data:') ? 'custom' : draft.stampUrl} onChange={(event) => updateDraft('stampUrl', event.target.value === 'custom' ? draft.stampUrl : event.target.value)}>
                        <option value="">بدون ختم</option>
                        <option value="/stamp-alreef.png">ختم مشاتل الريف الأخضر</option>
                        <option value="/stamp-alandalus.png">ختم مشتل الأندلس الزراعي</option>
                        {draft.stampUrl.startsWith('data:') && <option value="custom">الختم المرفوع</option>}
                      </select>
                    </label>
                    <label className="alt-quote-upload-stamp">رفع ختم آخر<input type="file" accept="image/*" onChange={uploadCustomStamp} /></label>
                    <div className="alt-quote-stamp-preview">{draft.stampUrl ? <img src={draft.stampUrl} alt="معاينة الختم المختار" /> : <span>مكان الختم فارغ</span>}</div>
                  </div>
                ) : (
                  <div className="alt-quote-fixed-stamp"><div><strong>الختم المعتمد</strong><small>يتضمن الختم اسم المنشأة وبيانات المدير ورقم الهاتف.</small></div><img src={draft.stampUrl} alt={`ختم ${selectedName}`} /></div>
                )}
              </section>

              <section className="alt-quote-editor-panel alt-quote-items-editor-panel">
                <div className="alt-quote-editor-section-head"><div><h3>الأصناف والأسعار</h3><p>يمكنك تعديل النص والكمية والسعر لكل بند، دون إضافة صور.</p></div><button type="button" className="alt-quote-add-item" onClick={addItem}><Plus size={14} />إضافة بند</button></div>
                <div className="alt-quote-edit-table-wrap">
                  <table className="alt-quote-edit-items-table"><thead><tr><th>اسم البند</th><th>التفاصيل</th><th>الكمية</th><th>السعر</th><th>حذف</th></tr></thead><tbody>
                    {draft.items.map((item, index) => (
                      <tr key={`edit-${index}`}>
                        <td><input value={item.name} onChange={(event) => updateItem(index, { name: event.target.value })} placeholder="اسم الصنف أو الخدمة" /></td>
                        <td><textarea value={item.description || ''} onChange={(event) => updateItem(index, { description: event.target.value })} rows={2} placeholder="وصف أو ملاحظات" /></td>
                        <td><input type="number" min="0" step="any" value={item.quantity} onChange={(event) => updateItem(index, { quantity: Math.max(0, Number(event.target.value) || 0) })} /></td>
                        <td><input type="number" min="0" step="0.01" value={item.price} onChange={(event) => updateItem(index, { price: Math.max(0, Number(event.target.value) || 0) })} /></td>
                        <td><button type="button" className="alt-quote-remove-item" onClick={() => removeItem(index)} aria-label={`حذف البند ${index + 1}`}><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
                <div className="alt-quote-edit-totals">
                  <label>الخصم<input type="number" min="0" step="0.01" value={draft.discount || 0} onChange={(event) => updateDraft('discount', Math.max(0, Number(event.target.value) || 0))} /></label>
                  <label>التوصيل<input type="number" min="0" step="0.01" value={draft.shippingCost || 0} onChange={(event) => updateDraft('shippingCost', Math.max(0, Number(event.target.value) || 0))} /></label>
                  <label className="alt-quote-tax-edit"><span>الضريبة</span><input type="checkbox" checked={Boolean(draft.taxEnabled)} onChange={(event) => updateDraft('taxEnabled', event.target.checked)} /><input type="number" min="0" max="100" step="0.5" value={draft.taxRate || 0} onChange={(event) => updateDraft('taxRate', Math.max(0, Number(event.target.value) || 0))} aria-label="نسبة الضريبة" disabled={!draft.taxEnabled} /><b>%</b></label>
                  <div className="alt-quote-edit-total-preview"><span>الإجمالي النهائي</span><strong>{amount(totals.total, draft.currency)}</strong></div>
                </div>
              </section>
              {savedMessage && <p className="alt-quote-saved-message" role="status">{savedMessage}</p>}
            </div>
          )}

          {error && <p className="alt-quote-export-error" role="alert">{error}</p>}
          <footer className="alt-quote-modal-actions">
          {step === 'choose' && <><button className="btn secondary" type="button" onClick={() => setIsOpen(false)} disabled={isExporting}>إلغاء</button><button className="btn secondary alt-quote-registry-inline" type="button" onClick={openRegistry}><History size={14} />السجل الخاص</button><button className="btn alt-quote-export-button" type="button" onClick={() => setStep('edit')}><FileText size={15} />متابعة للتعديل</button></>}
            {step === 'registry' && <><button className="btn secondary" type="button" onClick={() => setIsOpen(false)}>إغلاق</button><button className="btn alt-quote-export-button" type="button" onClick={() => { setEditingRecordId(null); setDraft(makeEditableQuote(quote, selectedTemplate)); setStep('choose'); }}>قالب جديد</button></>}
            {step === 'edit' && <><button className="btn secondary" type="button" onClick={() => setStep(editingRecordId ? 'registry' : 'choose')} disabled={isExporting}>رجوع</button><button className="btn secondary alt-quote-save-button" type="button" onClick={persistDraft} disabled={isExporting}><Save size={14} />حفظ في السجل</button><button className="btn alt-quote-export-button" type="button" onClick={() => void exportSelectedTemplate()} disabled={isExporting}><Download size={15} />{isExporting ? 'جارٍ التجهيز...' : 'تنزيل PDF'}</button></>}
          </footer>
        </section>
      </div>
      <div className="alt-quote-render-root" ref={renderRootRef} aria-hidden="true">
        {pages.map((page, index) => <AlternativeQuotePage key={`${selectedTemplate}-${index}`} quote={draft} template={selectedTemplate} pageItems={page.items} startIndex={page.startIndex} pageNumber={index + 1} pageCount={pages.length} totals={totals} />)}
      </div>
    </>,
    document.body,
  ) : null;

  return (
    <>
      <button className="btn secondary small alternative-quote-trigger" type="button" onClick={openTemplates}><FileText size={14} />تحويل إلى عرض سعر مختلف</button>
      {portal}
    </>
  );
}
