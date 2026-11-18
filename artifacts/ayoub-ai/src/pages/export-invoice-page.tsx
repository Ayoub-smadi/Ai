import { useMemo, useRef, useState } from 'react';
import { FileDown, LayoutDashboard, Plus, Save, Trash2, X } from 'lucide-react';
import { Link } from 'wouter';
import { createAdminDocumentId, localDateString } from '@/lib/admin-document-storage';

type ExportLine = {
  id: string;
  item: string;
  weight: string;
  quantity: string;
  origin: string;
  notes: string;
  dinars: string;
  fils: string;
};

type ExportInvoice = {
  recordId: string;
  number: string;
  date: string;
  companyName: string;
  activity: string;
  companyAddress: string;
  phone: string;
  declaration: string;
  clearanceText: string;
  facilityNumber: string;
  source: string;
  sourceAddress: string;
  importer: string;
  importerAddress: string;
  destination: string;
  lines: ExportLine[];
  savedAt: string;
};

const STORAGE_KEY = 'qadri-export-invoices';
const newLine = (): ExportLine => ({ id: `${Date.now()}-${Math.random()}`, item: '', weight: '', quantity: '1', origin: 'أردني', notes: '', dinars: '', fils: '' });
const newNumber = () => `EXP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
const blankInvoice = (): ExportInvoice => ({ recordId: createAdminDocumentId(), number: newNumber(), date: localDateString(), companyName: 'مؤسسة القادري الزراعية', activity: 'استيراد وتصدير الاشتال الزراعية', companyAddress: 'الأردن - جرش', phone: '0777772211', declaration: 'نشهد أن هذه الفاتورة هي الوحيدة الصادرة عنا بشأن البضاعة المبينة فيها من منشأ أردني، منتجات زراعية، الشحن برا.', clearanceText: 'لا مانع للتصدير', facilityNumber: '', source: '', sourceAddress: '', importer: '', importerAddress: '', destination: '', lines: [newLine()], savedAt: new Date().toISOString() });

function readInvoices(): ExportInvoice[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

const units = ['صفر', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
function arabicNumber(value: number): string {
  const number = Math.max(0, Math.floor(value));
  if (number < 10) return units[number];
  if (number < 20) return number === 10 ? 'عشرة' : `${units[number - 10]} عشر`;
  if (number < 100) return number % 10 ? `${units[number % 10]} و${tens[Math.floor(number / 10)]}` : tens[number / 10];
  if (number < 1000) return number % 100 ? `${units[Math.floor(number / 100)]} مئة و${arabicNumber(number % 100)}` : `${units[Math.floor(number / 100)]} مئة`;
  if (number < 1000000) return `${arabicNumber(Math.floor(number / 1000))} ألف${number % 1000 ? ` و${arabicNumber(number % 1000)}` : ''}`;
  return String(number);
}

function amountInWords(total: number) {
  const dinars = Math.floor(total);
  const fils = Math.round((total - dinars) * 1000);
  const dinarText = `${arabicNumber(dinars)} دينار${dinars === 1 ? '' : 'اً'}`;
  return fils ? `${dinarText} و${arabicNumber(fils)} فلساً فقط لا غير` : `${dinarText} فقط لا غير`;
}

function money(line: ExportLine) {
  return (Number(line.dinars) || 0) + (Number(line.fils) || 0) / 1000;
}

export default function ExportInvoicePage() {
  const [records, setRecords] = useState<ExportInvoice[]>(readInvoices);
  const [active, setActive] = useState<ExportInvoice | null>(null);
  const [search, setSearch] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const printRef = useRef<HTMLElement>(null);
  const filtered = useMemo(() => records.filter((record) => `${record.number} ${record.importer} ${record.source}`.toLocaleLowerCase('ar').includes(search.toLocaleLowerCase('ar').trim())), [records, search]);
  const total = active?.lines.reduce((sum, line) => sum + money(line), 0) || 0;
  const update = (patch: Partial<ExportInvoice>) => setActive((current) => current ? { ...current, ...patch } : current);
  const updateLine = (id: string, patch: Partial<ExportLine>) => update({ lines: active?.lines.map((line) => line.id === id ? { ...line, ...patch } : line) || [] });
  const save = () => {
    if (!active) return;
    const nextRecord = { ...active, savedAt: new Date().toISOString() };
    const next = [nextRecord, ...records.filter((record) => record.recordId !== nextRecord.recordId)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setRecords(next);
    setActive(nextRecord);
  };
  const remove = (record: ExportInvoice) => {
    const next = records.filter((item) => item.recordId !== record.recordId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setRecords(next);
    if (active?.recordId === record.recordId) setActive(null);
  };
  const downloadPdf = async () => {
    if (!printRef.current) return;
    setPdfBusy(true);
    try {
      await document.fonts?.ready;
      await Promise.all(Array.from(printRef.current.querySelectorAll('img')).map((image) => image.decode().catch(() => undefined)));
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: '#fff', useCORS: true, logging: false });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const width = 190;
      const height = canvas.height * width / canvas.width;
      const fit = Math.min(1, 277 / height);
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', (210 - width * fit) / 2, 10, width * fit, height * fit);
      pdf.save(`${active?.number || 'export-invoice'}.pdf`);
    } catch (error) {
      console.error('Export invoice PDF generation failed', error);
      window.alert('تعذر تنزيل ملف PDF. أعد المحاولة بعد اكتمال المعاينة.');
    } finally { setPdfBusy(false); }
  };

  return <main className="admin-page export-invoice-page" dir="rtl">
    <div className="admin-head export-invoice-head">
      <div><div className="eyebrow">QADRI AGRICULTURAL ESTABLISHMENT / EXPORT</div><h1>فواتير تصدير</h1><p className="page-desc">أنشئ فاتورة تصدير زراعية رسمية، وراجعها مباشرة قبل الحفظ أو الطباعة.</p></div>
      <div className="admin-head-actions"><button className="btn secondary" onClick={() => setActive(blankInvoice())}><Plus size={14} />فاتورة جديدة</button><Link className="btn secondary" href="/admin"><LayoutDashboard size={14} />لوحة التحكم</Link></div>
    </div>
    <div className="export-invoice-layout">
      <section className="panel export-invoice-preview-panel"><div className="export-toolbar"><span>المعاينة الرسمية</span><small>تتحدث تلقائياً مع كل تعديل</small><button className="btn secondary small" onClick={downloadPdf} disabled={!active || pdfBusy}><FileDown size={13} />{pdfBusy ? 'جاري تجهيز PDF...' : 'تنزيل PDF'}</button></div>
        {active ? <article ref={printRef} className="export-invoice-sheet">
          <header className="export-invoice-brand"><div className="export-brand-mark">ق</div><div><h2>{active.companyName || 'مؤسسة القادري الزراعية'}</h2><p>{active.activity || 'استيراد وتصدير الاشتال الزراعية'}</p><small>{active.companyAddress || 'الأردن - جرش'}&nbsp;&nbsp; | &nbsp;&nbsp;هاتف: {active.phone || '0777772211'}</small></div><div className="export-invoice-number"><span>فاتورة رقم</span><strong>{active.number}</strong><small>{active.date}</small></div></header>
          <div className="export-invoice-rule" />
          <div className="export-meta-grid"><label>منشأة رقم:<b>{active.facilityNumber || '................'}</b></label><label>المصدر:<b>{active.source || '................'}</b></label><label>العنوان:<b>{active.sourceAddress || '................'}</b></label><label>المستورد:<b>{active.importer || '................'}</b></label><label>العنوان:<b>{active.importerAddress || '................'}</b></label><label>المصدر إليه:<b>{active.destination || '................'}</b></label></div>
          <table className="export-lines-table"><thead><tr><th colSpan={2}>القيمة الإجمالية</th><th rowSpan={2}>الصنف</th><th rowSpan={2}>الوزن</th><th rowSpan={2}>الكمية</th><th rowSpan={2}>المنشأ</th><th rowSpan={2}>ملاحظات</th></tr><tr><th>دينار</th><th>فلس</th></tr></thead><tbody>{active.lines.map((line) => <tr key={line.id}><td>{line.dinars || '0'}</td><td>{line.fils || '000'}</td><td>{line.item || 'اسم الصنف'}</td><td>{line.weight || '—'}</td><td>{line.quantity || '—'}</td><td>{line.origin || 'أردني'}</td><td>{line.notes || '—'}</td></tr>)}</tbody></table>
          <div className="export-total-row"><span>المجموع</span><strong>{Math.floor(total)} دينار و{Math.round((total - Math.floor(total)) * 1000)} فلس</strong></div>
          <div className="export-words"><b>المجموع كتابةً</b><span>{amountInWords(total)}</span></div>
          <p className="export-declaration">{active.declaration || 'نشهد أن هذه الفاتورة هي الوحيدة الصادرة عنا بشأن البضاعة المبينة فيها من منشأ أردني، منتجات زراعية، الشحن برا.'}</p>
          <div className="export-clearance">{active.clearanceText || 'لا مانع للتصدير'}</div>
        </article> : <div className="export-empty-state"><div className="export-empty-icon">↗</div><h2>ابدأ بفاتورة تصدير جديدة</h2><p>أدخل بيانات المصدر والمستورد وأضف البنود، وستظهر الفاتورة هنا جاهزة للطباعة.</p><button className="btn" onClick={() => setActive(blankInvoice())}><Plus size={15} />إنشاء أول فاتورة</button></div>}
      </section>
      <aside className="export-invoice-editor">
        {active ? <form className="panel export-form" onSubmit={(event) => { event.preventDefault(); save(); }}><div className="export-form-title"><div><span className="eyebrow">EXPORT DOCUMENT BUILDER</span><h2>بيانات الفاتورة</h2></div><button type="button" className="icon-button" onClick={() => setActive(null)} aria-label="إغلاق"><X size={16} /></button></div>
          <div className="export-fields"><label>اسم المؤسسة<input value={active.companyName || ''} onChange={(event) => update({ companyName: event.target.value })} /></label><label>النشاط<input value={active.activity || ''} onChange={(event) => update({ activity: event.target.value })} /></label><label>عنوان المؤسسة<input value={active.companyAddress || ''} onChange={(event) => update({ companyAddress: event.target.value })} /></label><label>الهاتف<input dir="ltr" value={active.phone || ''} onChange={(event) => update({ phone: event.target.value })} /></label><label>رقم الفاتورة<input value={active.number} onChange={(event) => update({ number: event.target.value })} /></label><label>التاريخ<input type="date" value={active.date} onChange={(event) => update({ date: event.target.value })} /></label><label>منشأة رقم<input value={active.facilityNumber} onChange={(event) => update({ facilityNumber: event.target.value })} placeholder="رقم المنشأة" /></label><label>المصدر<input value={active.source} onChange={(event) => update({ source: event.target.value })} placeholder="اسم المصدر" /></label><label className="export-wide">عنوان المصدر<input value={active.sourceAddress} onChange={(event) => update({ sourceAddress: event.target.value })} placeholder="العنوان" /></label><label>المستورد<input value={active.importer} onChange={(event) => update({ importer: event.target.value })} placeholder="اسم المستورد" /></label><label>المصدر إليه<input value={active.destination} onChange={(event) => update({ destination: event.target.value })} placeholder="اكتب الجهة أو العميل" /></label><label className="export-wide">عنوان المستورد<input value={active.importerAddress} onChange={(event) => update({ importerAddress: event.target.value })} placeholder="العنوان" /></label><label className="export-wide">نص الشهادة<input value={active.declaration || ''} onChange={(event) => update({ declaration: event.target.value })} /></label><label>نص خانة التصدير<input value={active.clearanceText || ''} onChange={(event) => update({ clearanceText: event.target.value })} /></label></div>
          <div className="export-lines-editor"><div className="export-section-title"><h3>بنود الفاتورة</h3><button type="button" className="btn secondary small" onClick={() => update({ lines: [...active.lines, newLine()] })}><Plus size={13} />إضافة بند</button></div><div className="export-editor-table"><div className="export-editor-table-head"><span>#</span><span>الصنف</span><span>الوزن</span><span>الكمية</span><span>المنشأ</span><span>دينار</span><span>فلس</span><span>ملاحظات</span><span /></div>{active.lines.map((line, index) => <div className="export-editor-row" key={line.id}><strong>{index + 1}</strong><input aria-label={`الصنف ${index + 1}`} value={line.item} onChange={(event) => updateLine(line.id, { item: event.target.value })} placeholder="شتلات زراعية" /><input aria-label={`الوزن ${index + 1}`} value={line.weight} onChange={(event) => updateLine(line.id, { weight: event.target.value })} placeholder="كغم" /><input aria-label={`الكمية ${index + 1}`} type="number" min="0" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} placeholder="1" /><input aria-label={`المنشأ ${index + 1}`} value={line.origin} onChange={(event) => updateLine(line.id, { origin: event.target.value })} placeholder="أردني" /><input aria-label={`الدينار ${index + 1}`} type="number" min="0" step="1" value={line.dinars} onChange={(event) => updateLine(line.id, { dinars: event.target.value })} placeholder="0" /><input aria-label={`الفلس ${index + 1}`} type="number" min="0" max="999" step="1" value={line.fils} onChange={(event) => updateLine(line.id, { fils: event.target.value })} placeholder="000" /><input aria-label={`ملاحظات ${index + 1}`} value={line.notes} onChange={(event) => updateLine(line.id, { notes: event.target.value })} placeholder="ملاحظات البند" /><button type="button" className="icon-button export-row-delete" onClick={() => update({ lines: active.lines.length === 1 ? active.lines : active.lines.filter((item) => item.id !== line.id) })} disabled={active.lines.length === 1} aria-label="حذف البند"><Trash2 size={14} /></button></div>)}</div></div>
          <div className="export-live-total"><span>القيمة الإجمالية</span><strong>{Math.floor(total)} دينار و{Math.round((total - Math.floor(total)) * 1000)} فلس</strong><small>{amountInWords(total)}</small></div>
          <button className="btn export-save" type="submit"><Save size={15} />حفظ فاتورة التصدير</button>
        </form> : <section className="panel export-history"><div className="export-history-head"><div><span className="eyebrow">SAVED EXPORTS</span><h2>الفواتير المحفوظة</h2></div><span>{filtered.length}</span></div><input className="export-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث برقم الفاتورة أو الجهة..." />{filtered.length ? filtered.map((record) => <article className="export-record" key={record.recordId}><button onClick={() => setActive(record)}><strong>{record.number}</strong><span>{record.importer || 'بدون مستورد'} · {record.date}</span></button><button className="export-record-delete" onClick={() => remove(record)} aria-label="حذف الفاتورة"><Trash2 size={14} /></button></article>) : <p className="export-history-empty">لا توجد فواتير محفوظة بعد.</p>}<button className="btn export-new-record" onClick={() => setActive(blankInvoice())}><Plus size={15} />إنشاء فاتورة جديدة</button></section>}
      </aside>
    </div>
  </main>;
}
