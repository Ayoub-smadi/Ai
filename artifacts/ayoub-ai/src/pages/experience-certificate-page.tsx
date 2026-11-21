import { useRef, useState } from 'react';
import { Award, Download, Save } from 'lucide-react';
import './experience-certificate-page.css';

type CertificateForm = {
  employeeName: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  company: string;
  paragraph: string;
  includeSalary: boolean;
  salary: string;
  signer: string;
  signerTitle: string;
};

const DEFAULT_FORM: CertificateForm = {
  employeeName: 'اسم الموظف', jobTitle: 'المسمى الوظيفي', startDate: '', endDate: '', company: 'مؤسسة القادري الزراعية',
  paragraph: 'تشهد مؤسسة القادري الزراعية بأن المذكور أعلاه قد عمل لديها، وقد أدى المهام الموكلة إليه بكفاءة وأمانة خلال فترة عمله، وكانت سيرته حسنة ولم يصدر بحقه أي إجراء يخل بواجباته المهنية.',
  includeSalary: false, salary: '', signer: 'م. ثامر أحمد القادري', signerTitle: 'المدير العام',
};
const formatDate = (value: string) => value ? new Intl.DateTimeFormat('ar-JO', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${value}T00:00:00`)) : '—';

export default function ExperienceCertificatePage() {
  const [form, setForm] = useState<CertificateForm>(() => { try { return { ...DEFAULT_FORM, ...JSON.parse(localStorage.getItem('qadri-experience-certificate') || '{}') }; } catch { return DEFAULT_FORM; } });
  const [status, setStatus] = useState('');
  const paperRef = useRef<HTMLElement>(null);
  const update = <K extends keyof CertificateForm>(key: K, value: CertificateForm[K]) => { setForm((current) => ({ ...current, [key]: value })); setStatus(''); };
  const save = () => { localStorage.setItem('qadri-experience-certificate', JSON.stringify(form)); setStatus('تم حفظ الشهادة على هذا الجهاز.'); };
  const downloadPdf = async () => {
    if (!paperRef.current) return; setStatus('جاري تجهيز ملف PDF...');
    try { await document.fonts?.ready; const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]); const canvas = await html2canvas(paperRef.current, { scale: 2.5, backgroundColor: '#fff', useCORS: true, logging: false }); const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true }); const width = pdf.internal.pageSize.getWidth(); const height = canvas.height * width / canvas.width; pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', 0, (pdf.internal.pageSize.getHeight() - height) / 2, width, height); pdf.save(`شهادة-خبرة-${form.employeeName || 'موظف'}.pdf`); setStatus('تم تنزيل شهادة الخبرة بصيغة PDF.'); } catch { setStatus('تعذر إنشاء ملف PDF، أعد المحاولة.'); }
  };
  return <main className="experience-page page" dir="rtl">
    <div className="page-head experience-page-head"><div><div className="eyebrow">ADMIN DOCUMENTS / EXPERIENCE</div><h1>شهادة خبرة</h1><p className="page-desc">أنشئ شهادة خبرة رسمية باسم المؤسسة وعدّل محتواها قبل التنزيل.</p></div><div className="experience-actions"><button className="btn secondary" onClick={save}><Save size={15} />حفظ</button><button className="btn" onClick={downloadPdf}><Download size={15} />تنزيل PDF</button></div></div>
    <div className="experience-layout">
      <section className="panel experience-editor"><div className="panel-head"><div><h2 className="panel-title">بيانات الشهادة</h2><div className="panel-kicker">كل الحقول قابلة للتغيير وتظهر مباشرة في المعاينة.</div></div><Award size={22} /></div><div className="experience-fields">
        <label>اسم الموظف<input value={form.employeeName} onChange={(e) => update('employeeName', e.target.value)} /></label><label>المسمى الوظيفي<input value={form.jobTitle} onChange={(e) => update('jobTitle', e.target.value)} /></label>
        <label>من تاريخ<input type="date" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} /></label><label>إلى تاريخ<input type="date" value={form.endDate} onChange={(e) => update('endDate', e.target.value)} /></label>
        <label className="experience-field-full">اسم المؤسسة<input value={form.company} onChange={(e) => update('company', e.target.value)} /></label>
        <label className="experience-field-full experience-check"><span>إظهار الراتب في الشهادة</span><input type="checkbox" checked={form.includeSalary} onChange={(e) => update('includeSalary', e.target.checked)} /></label>
        {form.includeSalary && <label>الراتب<input type="text" inputMode="decimal" value={form.salary} onChange={(e) => update('salary', e.target.value)} placeholder="مثال: 500 دينار أردني" /></label>}
        <label className="experience-field-full">نص الشهادة<textarea rows={6} value={form.paragraph} onChange={(e) => update('paragraph', e.target.value)} /></label>
        <label>اسم الموقّع<input value={form.signer} onChange={(e) => update('signer', e.target.value)} /></label><label>صفة الموقّع<input value={form.signerTitle} onChange={(e) => update('signerTitle', e.target.value)} /></label>
      </div>{status && <p className="experience-status" role="status">{status}</p>}</section>
      <section className="experience-preview-wrap"><div className="experience-preview-label">المعاينة الرسمية</div><article className="experience-paper" ref={paperRef}><div className="experience-paper-border">
        <header className="experience-paper-header"><img src="/alqadri-logo.png" alt="شعار مؤسسة القادري الزراعية" /><div><strong>{form.company || '—'}</strong></div></header>
        <h2>شهادة خبرة</h2><div className="experience-paper-rule" />
        <p className="experience-intro">تشهد <b>{form.company || 'المؤسسة'}</b> والمسجلة بالسجل التجاري رقم <b>(505999)</b> ورقم وطني للمنشأة <b>100960051</b> ورقم رخصة مهن <b>(2020463)</b> بأن السيد/السيدة:</p>
        <h3>{form.employeeName || '—'}</h3><p className="experience-role">{form.jobTitle || '—'}</p><p className="experience-body">{form.paragraph || '—'}</p>
        <p className="experience-period">وذلك خلال الفترة من <b>{formatDate(form.startDate)}</b> إلى <b>{formatDate(form.endDate)}</b>.</p>{form.includeSalary && <p className="experience-salary">وبراتب شهري قدره: <b>{form.salary || '—'}</b>.</p>}
        <p className="experience-closing">وقد أعطيت له/لها هذه الشهادة بناءً على طلبه/طلبها دون أدنى مسؤولية على المؤسسة.</p>
        <footer className="experience-signature"><div className="experience-signature-stack"><strong>{form.signerTitle || 'المدير العام'}/ {form.signer || 'ثامر القادري'}</strong><img className="experience-stamp" src="/quote-signature-stamp.png" alt="ختم المؤسسة" /></div></footer>
      </div></article></section>
    </div>
  </main>;
}
