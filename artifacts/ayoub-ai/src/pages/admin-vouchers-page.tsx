import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { FileDown, LayoutDashboard, Plus, Receipt, Search, Trash2 } from 'lucide-react';
import { Link } from 'wouter';
import { localDateString, moveAdminDocumentToTrash, nextDailyDocumentNumber, readDeletedAdminDocuments, type StoredAdminDocument } from '@/lib/admin-document-storage';
import './admin-vouchers-page.css';

type VoucherKind = 'receipt' | 'disbursement';
type PaymentMethod = 'cash' | 'cheque' | 'bank';
type Voucher = {
  number: string;
  date: string;
  party: string;
  amountJod: string;
  amountFils: string;
  amountWords: string;
  purpose: string;
  method: PaymentMethod;
  reference: string;
  notes: string;
  createdAt: string;
};

const labels = {
  receipt: { title: 'سند قبض', prefix: 'RC', partyLabel: 'استلمنا من السادة:', partyField: 'اسم الدافع / الجهة', signatureLeft: 'توقيع المستلم', signatureRight: 'توقيع الدافع' },
  disbursement: { title: 'سند صرف', prefix: 'PV', partyLabel: 'صرفنا للسادة:', partyField: 'اسم المستلم / الجهة', signatureLeft: 'توقيع المستلم', signatureRight: 'توقيع المسؤول' },
} satisfies Record<VoucherKind, { title: string; prefix: string; partyLabel: string; partyField: string; signatureLeft: string; signatureRight: string }>;

const arabicOnes = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const arabicTeens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const arabicTens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const arabicHundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

function underThousand(value: number): string {
  const number = Math.max(0, Math.floor(value));
  const hundreds = Math.floor(number / 100);
  const remainder = number % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(arabicHundreds[hundreds]);
  if (remainder >= 10 && remainder < 20) parts.push(arabicTeens[remainder - 10]);
  else if (remainder >= 20) {
    const ones = remainder % 10;
    parts.push(ones ? `${arabicOnes[ones]} و${arabicTens[Math.floor(remainder / 10)]}` : arabicTens[Math.floor(remainder / 10)]);
  } else if (remainder > 0) parts.push(arabicOnes[remainder]);
  return parts.join(' و') || 'صفر';
}

function arabicInteger(value: number): string {
  const number = Math.max(0, Math.floor(value));
  if (number < 1000) return underThousand(number);
  const groups = [
    { value: Math.floor(number / 1_000_000_000), one: 'مليار', two: 'ملياران', plural: 'مليارات', other: 'مليارًا' },
    { value: Math.floor(number / 1_000_000) % 1000, one: 'مليون', two: 'مليونان', plural: 'ملايين', other: 'مليونًا' },
    { value: Math.floor(number / 1000) % 1000, one: 'ألف', two: 'ألفان', plural: 'آلاف', other: 'ألفًا' },
  ];
  const parts: string[] = [];
  for (const group of groups) {
    if (!group.value) continue;
    if (group.value === 1) parts.push(group.one);
    else if (group.value === 2) parts.push(group.two);
    else if (group.value >= 3 && group.value <= 10) parts.push(`${underThousand(group.value)} ${group.plural}`);
    else parts.push(`${underThousand(group.value)} ${group.other}`);
  }
  const remainder = number % 1000;
  if (remainder) parts.push(underThousand(remainder));
  return parts.join(' و');
}

function currencyPart(value: number, singular: string, dual: string, plural: string): string {
  if (!value) return '';
  if (value === 1) return `${singular} واحد`;
  if (value === 2) return dual;
  return `${arabicInteger(value)} ${value >= 3 && value <= 10 ? plural : singular}`;
}

function amountToArabicWords(jodValue: string, filsValue: string): string {
  const jod = Math.max(0, Math.floor(Number(jodValue) || 0));
  const fils = Math.max(0, Math.min(999, Math.floor(Number(filsValue) || 0)));
  const parts = [currencyPart(jod, 'دينار', 'ديناران', 'دنانير'), currencyPart(fils, 'فلس', 'فلسان', 'فلسات')].filter(Boolean);
  return `${parts.length ? parts.join(' و') : 'صفر دينار'} فقط لا غير`;
}

function storageKey(kind: VoucherKind) {
  return `qadri-cash-vouchers-${kind}`;
}

function readRecords(kind: VoucherKind): Voucher[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(kind)) || '[]');
    return Array.isArray(value) ? value as Voucher[] : [];
  } catch {
    return [];
  }
}

function newVoucher(kind: VoucherKind): Voucher {
  const now = new Date();
  const date = localDateString(now);
  const existingNumbers = [...readRecords(kind).map((record) => record.number), ...readDeletedAdminDocuments().filter((record) => record.kind === kind).map((record) => record.number)];
  return {
    number: nextDailyDocumentNumber(labels[kind].prefix, date, existingNumbers),
    date,
    party: '',
    amountJod: '',
    amountFils: '0',
    amountWords: '',
    purpose: '',
    method: 'cash',
    reference: '',
    notes: '',
    createdAt: now.toISOString(),
  };
}

function formatDate(value: string) {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('ar-JO', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

const methodLabels: Record<PaymentMethod, string> = { cash: 'نقدًا', cheque: 'شيك', bank: 'تحويل بنكي' };

export default function AdminVouchersPage({ kind }: { kind: VoucherKind }) {
  const config = labels[kind];
  const [records, setRecords] = useState<Voucher[]>(() => readRecords(kind));
  const [voucher, setVoucher] = useState<Voucher>(() => newVoucher(kind));
  const [savedNotice, setSavedNotice] = useState('');
  const [pdfStatus, setPdfStatus] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [search, setSearch] = useState('');
  const previewRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setRecords(readRecords(kind));
    setVoucher(newVoucher(kind));
    setSavedNotice('');
    setPdfStatus('');
  }, [kind]);

  const total = useMemo(() => (Number(voucher.amountJod) || 0) + (Number(voucher.amountFils) || 0) / 1000, [voucher.amountJod, voucher.amountFils]);
  const amountWords = useMemo(() => amountToArabicWords(voucher.amountJod, voucher.amountFils), [voucher.amountJod, voucher.amountFils]);
  const filteredRecords = useMemo(() => { const query = search.trim().toLocaleLowerCase('ar'); return records.filter((record) => !query || `${record.number} ${record.party}`.toLocaleLowerCase('ar').includes(query)); }, [records, search]);
  const update = (patch: Partial<Voucher>) => setVoucher((current) => ({ ...current, ...patch }));

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const savedVoucher = { ...voucher, amountWords, createdAt: new Date().toISOString() };
    const next = [savedVoucher, ...records.filter((record) => record.number !== savedVoucher.number)];
    localStorage.setItem(storageKey(kind), JSON.stringify(next));
    setRecords(next);
    setVoucher(savedVoucher);
    setSavedNotice('تم حفظ السند على هذا الجهاز.');
  };

  const openNew = () => {
    setVoucher(newVoucher(kind));
    setSavedNotice('');
    setPdfStatus('');
  };

  const removeRecord = (record: Voucher) => {
    moveAdminDocumentToTrash(kind, storageKey(kind), record as unknown as StoredAdminDocument);
    const next = records.filter((item) => item.number !== record.number);
    setRecords(next);
    if (voucher.number === record.number) openNew();
  };

  const downloadPdf = async () => {
    const page = previewRef.current;
    if (!page) return;
    setPdfBusy(true);
    setPdfStatus('');
    try {
      await document.fonts?.ready;
      await Promise.all(Array.from(page.querySelectorAll('img')).map((image) => image.decode().catch(() => undefined)));
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const canvas = await html2canvas(page, { scale: 2, backgroundColor: '#fff', useCORS: true, logging: false, windowWidth: page.scrollWidth });
      const image = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const scale = Math.min((pageWidth - margin * 2) / canvas.width, (pageHeight - margin * 2) / canvas.height);
      const imageWidth = canvas.width * scale;
      const imageHeight = canvas.height * scale;
      pdf.addImage(image, 'PNG', (pageWidth - imageWidth) / 2, (pageHeight - imageHeight) / 2, imageWidth, imageHeight);
      pdf.setProperties({ title: config.title, subject: voucher.number });
      const filename = (voucher.number || config.prefix).replace(/[^a-zA-Z0-9_-]/g, '-');
      pdf.save(`${filename}.pdf`);
      setPdfStatus('تم تنزيل ملف PDF بنجاح.');
    } catch (error) {
      console.error('Voucher PDF download failed', error);
      setPdfStatus('تعذر إنشاء ملف PDF. أعد المحاولة بعد تحميل الصفحة بالكامل.');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <main className="admin-page voucher-page" dir="rtl">
      <header className="admin-head voucher-page-head">
        <div>
          <div className="eyebrow">QADRI AI / CASH VOUCHERS</div>
          <h1>{config.title}</h1>
          <p className="page-desc">أنشئ السند، راجع معاينته، ثم احفظه أو نزّله بصيغة PDF.</p>
        </div>
        <div className="admin-head-actions">
          <button className="btn secondary" type="button" onClick={openNew}><Plus size={15} />سند جديد</button>
          <button className="btn" type="button" onClick={() => void downloadPdf()} disabled={pdfBusy}><FileDown size={15} />{pdfBusy ? 'جاري تجهيز PDF...' : 'تنزيل PDF'}</button>
          <Link className="btn secondary" href="/admin/deleted-documents"><Trash2 size={14} />سجل المحذوفات</Link>
          <Link className="btn secondary" href="/admin"><LayoutDashboard size={14} />لوحة التحكم</Link>
        </div>
      </header>

      <div className="voucher-workspace">
        <section className="panel voucher-preview-panel">
          <div className="voucher-preview-toolbar"><strong>معاينة {config.title}</strong><span>تتحدث تلقائيًا مع كل تعديل</span></div>
          <article ref={previewRef} className="voucher-sheet">
            <header className="voucher-brand-row">
              <div className="voucher-brand-en" dir="ltr"><strong>Al-Qadri Agricultural Foundation</strong><span>Jarash - Al-Rashaidah · Jordan</span></div>
              <div className="voucher-brand-logo"><img src="/chatbot.png" alt="شعار القادري الزراعي" /></div>
              <div className="voucher-brand-ar"><strong>مؤسسة القادري الزراعية</strong><span>جرش - الرشايدة - الأردن</span><small>0777772211 · 0778111155</small></div>
            </header>
            <div className="voucher-blue-rule" />
            <div className="voucher-title-row">
              <span dir="ltr">No. <b>{voucher.number || '—'}</b></span>
              <strong>{config.title}</strong>
              <span>التاريخ: {formatDate(voucher.date)}</span>
            </div>
            <section className="voucher-detail-box"><span>{config.partyLabel}</span><strong>{voucher.party || '........................................'}</strong></section>
            <div className="voucher-amount-row">
              <section className="voucher-amount-words"><small>المبلغ كتابةً</small><strong>{amountWords}</strong></section>
              <section className="voucher-amount-numbers" aria-label="المبلغ بالأرقام">
                <div><small>دينار</small><strong>{voucher.amountJod || '0'}</strong></div>
                <div><small>فلس</small><strong>{String(Math.min(999, Number(voucher.amountFils) || 0)).padStart(3, '0')}</strong></div>
              </section>
            </div>
            <section className="voucher-detail-box voucher-purpose"><span>وذلك عن:</span><strong>{voucher.purpose || '........................................'}</strong></section>
            <section className="voucher-payment-row"><span>طريقة الدفع:</span><div>{(['cash', 'cheque', 'bank'] as PaymentMethod[]).map((method) => <span className="voucher-payment-option" key={method}><i className={voucher.method === method ? 'checked' : ''} />{methodLabels[method]}</span>)}</div>{voucher.method !== 'cash' && <small>رقم المرجع: {voucher.reference || '—'}</small>}</section>
            {voucher.notes && <section className="voucher-note"><b>ملاحظات:</b> {voucher.notes}</section>}
            <div className="voucher-signatures">
              <div><span>{config.signatureLeft}</span><b>{kind === 'receipt' ? 'م. ثامر القادري' : '................................'}</b></div>
              <img src="/quote-signature-stamp.png" alt="ختم مؤسسة القادري الزراعية" />
              <div><span>{config.signatureRight}</span><b>................................</b></div>
            </div>
            <footer className="voucher-footer">Al-Qadri Agricultural Foundation · Jarash - Al-Rashaidah - Jordan · 0777772211</footer>
          </article>
          <div className="voucher-total-note">الإجمالي المحسوب: <strong>{total.toLocaleString('ar-JO', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.أ</strong></div>
          {pdfStatus && <p className="voucher-pdf-status" role="status">{pdfStatus}</p>}
        </section>

        <aside className="voucher-tools-column">
          <form className="panel voucher-form" onSubmit={save}>
            <div className="voucher-form-heading"><div><span className="eyebrow">VOUCHER DETAILS</span><h2>بيانات {config.title}</h2></div><Receipt size={20} /></div>
            <div className="voucher-form-grid">
              <label>رقم السند<input required value={voucher.number} onChange={(event) => update({ number: event.target.value })} /></label>
              <label>التاريخ<input required type="date" value={voucher.date} onChange={(event) => update({ date: event.target.value })} /></label>
              <label className="voucher-field-wide">{config.partyField}<input required value={voucher.party} onChange={(event) => update({ party: event.target.value })} placeholder="الاسم أو الجهة" /></label>
              <div className="voucher-field-wide voucher-amount-editor">
                <span className="voucher-field-label">المبلغ</span>
                <label>دينار<input required type="number" min="0" step="1" value={voucher.amountJod} onChange={(event) => update({ amountJod: event.target.value })} placeholder="0" /></label>
                <label>فلس<input type="number" min="0" max="999" step="1" value={voucher.amountFils} onChange={(event) => { const value = event.target.value; update({ amountFils: value === '' ? '' : String(Math.min(999, Math.max(0, Math.floor(Number(value) || 0)))) }); }} placeholder="000" /></label>
              </div>
              <label className="voucher-field-wide">المبلغ كتابةً<input readOnly value={amountWords} aria-live="polite" /></label>
              <label className="voucher-field-wide">وذلك عن<input required value={voucher.purpose} onChange={(event) => update({ purpose: event.target.value })} placeholder="سبب القبض أو الصرف" /></label>
              <fieldset className="voucher-field-wide voucher-method-editor"><legend>طريقة الدفع</legend>{(['cash', 'cheque', 'bank'] as PaymentMethod[]).map((method) => <label key={method}><input type="radio" name="voucher-method" checked={voucher.method === method} onChange={() => update({ method })} />{methodLabels[method]}</label>)}</fieldset>
              {voucher.method !== 'cash' && <label className="voucher-field-wide">رقم الشيك / مرجع التحويل<input value={voucher.reference} onChange={(event) => update({ reference: event.target.value })} placeholder="رقم المرجع" /></label>}
              <label className="voucher-field-wide">ملاحظات<textarea rows={3} value={voucher.notes} onChange={(event) => update({ notes: event.target.value })} placeholder="ملاحظات إضافية (اختياري)" /></label>
            </div>
            <button className="btn voucher-save-button" type="submit"><Receipt size={15} />حفظ {config.title}</button>
            {savedNotice && <p className="voucher-saved-notice" role="status">{savedNotice}</p>}
          </form>

          <section className="panel voucher-history">
            <div className="voucher-history-heading"><h2>السجل المحفوظ</h2><span>{filteredRecords.length}</span></div>
            <label className="voucher-history-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو الرقم" aria-label="ابحث في السندات بالاسم أو الرقم" /></label>
            {filteredRecords.length ? filteredRecords.map((record) => <article className={`voucher-record ${record.number === voucher.number ? 'active' : ''}`} key={record.number}>
              <button className="voucher-record-open" type="button" onClick={() => { setVoucher(record); setSavedNotice(''); }}><strong>{record.number}</strong><span>{record.party}</span><small>{formatDate(record.date)} · {record.amountJod || 0}.{String(record.amountFils || 0).padStart(3, '0')} د.أ</small></button>
              <button className="voucher-record-delete" type="button" aria-label={`حذف ${record.number}`} title="حذف السند" onClick={() => removeRecord(record)}><Trash2 size={14} /></button>
            </article>) : <p className="voucher-empty">{records.length ? 'لا توجد نتائج مطابقة.' : 'لا توجد سندات محفوظة بعد.'}</p>}
          </section>
        </aside>
      </div>
    </main>
  );
}
