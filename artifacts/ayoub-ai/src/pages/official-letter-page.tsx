import { useRef, useState, type FormEvent } from 'react';
import { FileDown, FileText, LayoutDashboard, RotateCcw, Save } from 'lucide-react';
import { Link } from 'wouter';
import './official-letter-page.css';

type OfficialLetterDraft = {
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
  closing: string;
  signatureLabel: string;
  footerName: string;
};

type SavedOfficialLetter = OfficialLetterDraft & {
  id: string;
  savedAt: string;
};

const STORAGE_KEY = 'qadri-official-letters';
const DEFAULT_LETTER: OfficialLetterDraft = {
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
  closing: 'وتفضلوا بقبول فائق الاحترام والتقدير....',
  signatureLabel: 'التوقيع والختم',
  footerName: 'مؤسسة القادري الزراعية',
};

function readSavedLetters(): SavedOfficialLetter[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value.map((item, index) => {
      const old = item as Partial<SavedOfficialLetter> & { recipient?: string; subject?: string; body?: string };
      return {
        ...DEFAULT_LETTER,
        ...old,
        title: old.title || old.subject || DEFAULT_LETTER.title,
        recipient: old.recipient || DEFAULT_LETTER.recipient,
        body: old.body || DEFAULT_LETTER.body,
        id: old.id || `legacy-${index}-${old.savedAt || ''}`,
        savedAt: old.savedAt || '',
      };
    });
  } catch {
    return [];
  }
}

function formattedDate(date: string) {
  return date ? date.split('-').join('/ ') : '—';
}

export default function OfficialLetterPage() {
  const [form, setForm] = useState<OfficialLetterDraft>({ ...DEFAULT_LETTER });
  const [saved, setSaved] = useState<SavedOfficialLetter[]>(readSavedLetters);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [status, setStatus] = useState('');
  const paperRef = useRef<HTMLElement>(null);

  const update = (key: keyof OfficialLetterDraft, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setStatus('');
  };

  const saveLetter = (event: FormEvent) => {
    event.preventDefault();
    const record: SavedOfficialLetter = { ...form, id: `${Date.now()}`, savedAt: new Date().toISOString() };
    const next = [record, ...saved];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaved(next);
      setStatus('تم حفظ الكتاب على هذا الجهاز.');
    } catch {
      setStatus('تعذر حفظ الكتاب في المتصفح.');
    }
  };

  const openSaved = (record: SavedOfficialLetter) => {
    const { id: _id, savedAt: _savedAt, ...draft } = record;
    setForm({ ...DEFAULT_LETTER, ...draft });
    setStatus('تم فتح الكتاب المحفوظ.');
  };

  const downloadPdf = async () => {
    const paper = paperRef.current;
    if (!paper) return;
    setPdfBusy(true);
    setStatus('');
    try {
      await document.fonts?.ready;
      await Promise.all(Array.from(paper.querySelectorAll('img')).map((image) => image.decode().catch(() => undefined)));
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const canvas = await html2canvas(paper, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: paper.scrollWidth,
        height: paper.scrollHeight,
      });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter', compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageHeight = canvas.height * pageWidth / canvas.width;
      const fit = Math.min(1, pageHeight / imageHeight);
      const finalWidth = pageWidth * fit;
      const finalHeight = imageHeight * fit;
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', (pageWidth - finalWidth) / 2, 0, finalWidth, finalHeight);
      const safeName = (form.title.trim() || 'كتاب-رسمي').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80);
      pdf.save(`${safeName}.pdf`);
    } catch (error) {
      console.error('Official letter PDF generation failed', error);
      setStatus('تعذر إنشاء ملف PDF. أعد المحاولة بعد اكتمال تحميل الصفحة.');
    } finally {
      setPdfBusy(false);
    }
  };

  const bodyParagraphs = form.body.split(/\n\s*\n/).filter((paragraph) => paragraph.trim());

  return (
    <main className="admin-page operations-page official-letter-page" dir="rtl">
      <div className="admin-head">
        <div>
          <div className="eyebrow">QADRI AI / OFFICIAL LETTERS</div>
          <h1>الكتب الرسمية</h1>
          <p className="page-desc">عدّل بيانات الخطاب وشاهدها مباشرة في النموذج الرسمي، ثم نزّله PDF مطابقًا لمقاس الملف المرفق.</p>
        </div>
        <div className="admin-head-actions">
          <button className="btn" type="button" onClick={downloadPdf} disabled={pdfBusy}>
            <FileDown size={14} />{pdfBusy ? 'جاري تجهيز PDF...' : 'تنزيل PDF'}
          </button>
          <button className="btn secondary" type="button" onClick={() => { setForm({ ...DEFAULT_LETTER }); setStatus('تمت استعادة بيانات النموذج المرفق.'); }}>
            <RotateCcw size={14} />استعادة النموذج
          </button>
          <Link className="btn secondary" href="/admin"><LayoutDashboard size={14} />لوحة التحكم</Link>
        </div>
      </div>

      <div className="official-letter-workspace">
        <form className="panel official-letter-form" onSubmit={saveLetter}>
          <div className="official-letter-form-head">
            <div><span className="eyebrow">DOCUMENT BUILDER</span><h2>بيانات الكتاب</h2></div>
            <span className="operations-live-dot">معاينة مباشرة</span>
          </div>
          <div className="official-letter-fields">
            <label>التاريخ<input type="date" value={form.date} onChange={(event) => update('date', event.target.value)} /></label>
            <label>اسم المؤسسة<input value={form.institution} onChange={(event) => update('institution', event.target.value)} /></label>
            <label className="official-letter-field-wide">عنوان الكتاب<input value={form.title} onChange={(event) => update('title', event.target.value)} /></label>
            <label className="official-letter-field-wide">الجهة الموجّه إليها<input value={form.recipient} onChange={(event) => update('recipient', event.target.value)} /></label>
            <label>تسمية عناية<input value={form.attentionLabel} onChange={(event) => update('attentionLabel', event.target.value)} /></label>
            <label className="official-letter-field-wide">الاسم بعد عناية<input value={form.attention} onChange={(event) => update('attention', event.target.value)} /></label>
            <label>موقع المشروع<input value={form.projectSite} onChange={(event) => update('projectSite', event.target.value)} /></label>
            <label>اسم المشروع<input value={form.projectName} onChange={(event) => update('projectName', event.target.value)} /></label>
            <label className="official-letter-field-wide">التحية<input value={form.greeting} onChange={(event) => update('greeting', event.target.value)} /></label>
            <label className="official-letter-field-wide">نص الكتاب<textarea rows={12} value={form.body} onChange={(event) => update('body', event.target.value)} /></label>
            <label className="official-letter-field-wide">عبارة الختام<input value={form.closing} onChange={(event) => update('closing', event.target.value)} /></label>
            <label>تسمية التوقيع والختم<input value={form.signatureLabel} onChange={(event) => update('signatureLabel', event.target.value)} /></label>
            <label>الاسم أسفل التوقيع<input value={form.footerName} onChange={(event) => update('footerName', event.target.value)} /></label>
          </div>
          {status && <p className="official-letter-status" role="status">{status}</p>}
          <button className="btn official-letter-save" type="submit"><Save size={14} />حفظ الكتاب</button>

          <section className="official-letter-history">
            <div className="official-letter-history-head"><h2>الكتب المحفوظة</h2><span>{saved.length}</span></div>
            {saved.length ? saved.map((record) => (
              <button type="button" className="official-letter-record" key={record.id} onClick={() => openSaved(record)}>
                <span className="official-letter-record-icon"><FileText size={15} /></span>
                <span className="official-letter-record-copy"><strong>{record.title || 'كتاب رسمي'}</strong><small>{record.recipient || 'بدون جهة'} · {formattedDate(record.date)}</small></span>
                <span className="official-letter-open">فتح</span>
              </button>
            )) : <p className="operations-empty">لا توجد كتب محفوظة بعد.</p>}
          </section>
        </form>

        <section className="panel official-letter-preview-panel">
          <div className="official-letter-preview-toolbar"><span>معاينة الورقة الرسمية</span><small>المقاس الأصلي: Letter · 8.5 × 11 بوصة</small></div>
          <div className="official-letter-paper-scroll">
            <article className="official-letter-paper" ref={paperRef}>
              <div className="official-letter-top-rule" />
              <header className="official-letter-header-row">
                <strong>{form.institution || '—'}</strong>
                <span><b>التاريخ:</b> {formattedDate(form.date)}</span>
              </header>
              <h2 className="official-letter-title"><span className="official-letter-title-text">{form.title || '—'}</span></h2>
              <div className="official-letter-recipient"><b>إلى :</b><span>{form.recipient || '—'}</span></div>
              <div className="official-letter-attention"><b>{form.attentionLabel || '—'} :</b><span>{form.attention || '—'}</span></div>
              <div className="official-letter-project-grid">
                <div><b>موقع المشروع</b><span>{form.projectSite || '—'}</span></div>
                <div><b>المشروع</b><span>{form.projectName || '—'}</span></div>
              </div>
              <section className="official-letter-content">
                <p className="official-letter-greeting">{form.greeting || '—'}</p>
                <div className="official-letter-body">
                  {bodyParagraphs.length ? bodyParagraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 12)}`}>{paragraph}</p>) : <p>اكتب نص الكتاب ليظهر هنا.</p>}
                </div>
                <p className="official-letter-closing">{form.closing || '—'}</p>
              </section>
              <footer className="official-letter-signature">
                <strong>{form.signatureLabel || '—'}</strong>
                <img src="/official-letter-signature.jpg" alt="التوقيع والختم" />
                <b>{form.footerName || '—'}</b>
              </footer>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
