import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Download, LayoutDashboard, Plus, Printer, RotateCcw, Scale, Trash2, Truck } from 'lucide-react';
import { Link } from 'wouter';
import { calculatePlan, type DraftItem, type PlannerDraft, type TruckManifest } from '@/lib/truck-load-planner';
import './admin-truck-load-planner-page.css';

const STORAGE_KEY = 'qadri-truck-load-planner-v1';
const MAX_TRUCKS = 1000;
const makeId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const emptyRow = (): DraftItem => ({ id: makeId(), name: '', quantity: '', weightKg: '' });
const initialDraft = (): PlannerDraft => ({ truckCount: '', capacityTons: '', items: [emptyRow()] });

function readDraft(): PlannerDraft {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null') as Partial<PlannerDraft> | null;
    if (!saved || !Array.isArray(saved.items)) return initialDraft();
    return {
      truckCount: typeof saved.truckCount === 'string' ? saved.truckCount : '',
      capacityTons: typeof saved.capacityTons === 'string' ? saved.capacityTons : '',
      items: saved.items.map((item) => ({
        id: typeof item?.id === 'string' ? item.id : makeId(),
        name: typeof item?.name === 'string' ? item.name : '',
        quantity: typeof item?.quantity === 'string' ? item.quantity : '',
        weightKg: typeof item?.weightKg === 'string' ? item.weightKg : '',
      })),
    };
  } catch {
    return initialDraft();
  }
}

const numberFormat = new Intl.NumberFormat('ar-JO', { maximumFractionDigits: 2 });
const formatKg = (value: number) => `${numberFormat.format(value)} كغ`;

export default function AdminTruckLoadPlannerPage() {
  const [draft, setDraft] = useState<PlannerDraft>(readDraft);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfStatus, setPdfStatus] = useState('');
  const plan = useMemo(() => calculatePlan(draft), [draft]);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch { /* Keep the calculator usable if browser storage is unavailable. */ }
  }, [draft]);

  const updateItem = (id: string, key: 'name' | 'quantity' | 'weightKg', value: string) => {
    setDraft((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, [key]: value } : item) }));
  };
  const addItem = () => setDraft((current) => ({ ...current, items: [...current.items, emptyRow()] }));
  const removeItem = (id: string) => setDraft((current) => ({ ...current, items: current.items.length > 1 ? current.items.filter((item) => item.id !== id) : [emptyRow()] }));
  const reset = () => {
    const fresh = initialDraft();
    setDraft(fresh);
    setPdfStatus('');
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* Ignore storage errors. */ }
  };

  const downloadPdfs = async (trucks: TruckManifest[], filename: string) => {
    if (pdfBusy || !plan.complete || trucks.length === 0) return;
    setPdfBusy(true);
    setPdfStatus('جارٍ تجهيز ملف PDF…');
    let wrapper: HTMLDivElement | null = null;
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      let pageCount = 0;
      const rowsPerPage = 20;

      for (const truck of trucks) {
        const chunks = truck.lines.length
          ? Array.from({ length: Math.ceil(truck.lines.length / rowsPerPage) }, (_, index) => truck.lines.slice(index * rowsPerPage, (index + 1) * rowsPerPage))
          : [[]];
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
          wrapper = document.createElement('div');
          wrapper.dir = 'rtl';
          wrapper.style.cssText = 'position:fixed;left:-20000px;top:0;width:900px;z-index:-1;padding:40px;box-sizing:border-box;background:#fff;color:#20372a;font-family:Arial,sans-serif;direction:rtl;';
          document.body.appendChild(wrapper);

          const eyebrow = document.createElement('div');
          eyebrow.textContent = 'QADRI AI · بيان توزيع حمولة الأشجار';
          eyebrow.style.cssText = 'color:#6d806d;font-size:16px;font-weight:700;letter-spacing:.04em;text-align:right;margin-bottom:10px;';
          wrapper.appendChild(eyebrow);
          const title = document.createElement('h1');
          title.textContent = `حمولة البراد رقم ${numberFormat.format(truck.number)}`;
          title.style.cssText = 'font-size:30px;line-height:1.3;color:#244630;margin:0 0 7px;text-align:right;';
          wrapper.appendChild(title);
          const subtitle = document.createElement('div');
          subtitle.textContent = `تاريخ إصدار البيان: ${new Intl.DateTimeFormat('ar-JO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}`;
          subtitle.style.cssText = 'font-size:14px;color:#728173;text-align:right;margin-bottom:22px;';
          wrapper.appendChild(subtitle);

          const summary = document.createElement('div');
          summary.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;';
          const treesInTruck = truck.lines.reduce((sum, line) => sum + line.quantity, 0);
          const summaryItems = [
            ['الوزن المحمّل', formatKg(truck.totalKg)],
            ['السعة القصوى', formatKg(plan.capacityKg)],
            ['عدد الأشجار', numberFormat.format(treesInTruck)],
          ];
          for (const [label, value] of summaryItems) {
            const card = document.createElement('div');
            card.style.cssText = 'padding:14px;border:1px solid #dfe8dd;border-radius:12px;background:#f7faf5;text-align:right;';
            const cardLabel = document.createElement('div');
            cardLabel.textContent = label;
            cardLabel.style.cssText = 'color:#778678;font-size:12px;margin-bottom:6px;';
            const cardValue = document.createElement('strong');
            cardValue.textContent = value;
            cardValue.style.cssText = 'color:#2d5738;font-size:18px;';
            card.append(cardLabel, cardValue);
            summary.appendChild(card);
          }
          wrapper.appendChild(summary);

          const table = document.createElement('table');
          table.style.cssText = 'width:100%;border-collapse:collapse;border:1px solid #e0e8de;font-size:14px;';
          const thead = document.createElement('thead');
          const headerRow = document.createElement('tr');
          for (const label of ['الصنف', 'عدد الأشجار', 'وزن الشجرة', 'إجمالي وزن الصنف']) {
            const th = document.createElement('th');
            th.textContent = label;
            th.style.cssText = 'padding:12px 10px;background:#edf4ea;color:#37593d;text-align:right;border-bottom:1px solid #dce6d9;font-size:13px;';
            headerRow.appendChild(th);
          }
          thead.appendChild(headerRow);
          table.appendChild(thead);
          const tbody = document.createElement('tbody');
          const rows = chunks[chunkIndex];
          if (rows.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 4;
            cell.textContent = 'لا توجد أشجار موزّعة في هذا البراد.';
            cell.style.cssText = 'padding:18px 10px;color:#768276;text-align:center;border-bottom:1px solid #e6ece4;';
            row.appendChild(cell);
            tbody.appendChild(row);
          } else {
            for (const line of rows) {
              const row = document.createElement('tr');
              const values = [line.name, `${numberFormat.format(line.quantity)} شجرة`, formatKg(line.weightKg), formatKg(line.lineTotalKg)];
              for (const value of values) {
                const cell = document.createElement('td');
                cell.textContent = value;
                cell.style.cssText = 'padding:12px 10px;color:#394b3d;text-align:right;border-bottom:1px solid #e8ede6;';
                row.appendChild(cell);
              }
              tbody.appendChild(row);
            }
          }
          table.appendChild(tbody);
          wrapper.appendChild(table);

          const footer = document.createElement('div');
          footer.textContent = chunks.length > 1 ? `صفحة ${chunkIndex + 1} من ${chunks.length} · كل الأوزان تقديرية حسب البيانات المدخلة.` : 'كل الأوزان تقديرية حسب البيانات المدخلة. يرجى التأكد من الحمولة قبل التحميل.';
          footer.style.cssText = 'margin-top:18px;padding-top:12px;border-top:1px solid #e5eae3;color:#768276;font-size:12px;text-align:right;';
          wrapper.appendChild(footer);

          await document.fonts.ready;
          const canvas = await html2canvas(wrapper, { scale: 2, backgroundColor: '#ffffff', useCORS: true, allowTaint: false, logging: false, windowWidth: 1000 });
          if (pageCount > 0) pdf.addPage('a4', 'portrait');
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const margin = 10;
          const scale = Math.min((pageWidth - margin * 2) / canvas.width, (pageHeight - margin * 2) / canvas.height);
          const imageWidth = canvas.width * scale;
          const imageHeight = canvas.height * scale;
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageWidth - imageWidth) / 2, (pageHeight - imageHeight) / 2, imageWidth, imageHeight);
          pageCount += 1;
          wrapper.remove();
          wrapper = null;
        }
      }
      pdf.save(filename);
      setPdfStatus(`تم تنزيل ${trucks.length === 1 ? `بيان البراد ${numberFormat.format(trucks[0].number)}` : 'خطة جميع البرادات'} بصيغة PDF.`);
    } catch (error) {
      console.error('Truck load PDF export failed:', error);
      setPdfStatus('تعذر إنشاء ملف PDF. حاول مرة أخرى.');
    } finally {
      wrapper?.remove();
      setPdfBusy(false);
    }
  };

  const isReady = plan.capacityKg > 0 && plan.requestedTrucks > 0;

  return <main className="admin-page truck-load-page" dir="rtl">
    <header className="admin-head truck-load-head">
      <div><div className="eyebrow">QADRI AI / TRUCK LOAD PLANNER</div><h1>توزيع حمولة الأشجار</h1><p className="page-desc">حدد عدد البرادات وسعة كل براد، ثم أدخل الأصناف والأوزان لتحصل على توزيع متوازن وبيان PDF لكل براد.</p></div>
      <div className="admin-head-actions truck-load-actions">
        <Link className="btn secondary" href="/admin"><LayoutDashboard size={15} />لوحة الإدارة</Link>
        <button className="btn secondary" type="button" onClick={() => void downloadPdfs(plan.trucks, 'qadri-truck-load-plan.pdf')} disabled={!plan.complete || pdfBusy}><Download size={15} />تنزيل الخطة كاملة PDF</button>
        <button className="btn secondary" type="button" onClick={() => window.print()}><Printer size={15} />طباعة</button>
      </div>
    </header>

    <section className="truck-load-metrics" aria-label="ملخص الحمولة">
      <article className="truck-load-metric"><span className="truck-load-metric-icon"><Truck size={18} /></span><div><small>عدد البرادات المحدد</small><strong>{numberFormat.format(plan.requestedTrucks)}</strong></div></article>
      <article className="truck-load-metric"><span className="truck-load-metric-icon"><Scale size={18} /></span><div><small>إجمالي وزن الأصناف</small><strong>{formatKg(plan.totalKg)}</strong></div></article>
      <article className="truck-load-metric"><span className="truck-load-metric-icon"><Check size={18} /></span><div><small>فرق الوزن بين الأثقل والأخف</small><strong>{formatKg(plan.balanceSpreadKg)}</strong></div></article>
    </section>

    <section className="panel truck-load-input-panel">
      <div className="truck-load-section-heading"><span className="truck-load-heading-icon"><Truck size={19} /></span><div><h2>بيانات البرادات والحمولة</h2><p>اختر عدد البرادات وسعة البراد الواحد، ثم أدخل العدد ووزن الشجرة الواحدة.</p></div><span className="truck-load-autosave"><Check size={13} /> حفظ تلقائي</span></div>
      <div className="truck-load-capacity-row">
        <label className="truck-load-capacity-field"><span>عدد البرادات</span><div><input type="number" min="1" max={MAX_TRUCKS} step="1" inputMode="numeric" placeholder="مثال: 4" value={draft.truckCount} onChange={(event) => setDraft((current) => ({ ...current, truckCount: event.target.value }))} /><b>براد</b></div></label>
        <label className="truck-load-capacity-field"><span>سعة البراد الواحد القصوى</span><div><input type="number" min="0.01" step="0.1" inputMode="decimal" placeholder="مثال: 20" value={draft.capacityTons} onChange={(event) => setDraft((current) => ({ ...current, capacityTons: event.target.value }))} /><b>طن</b></div></label>
        {isReady && <span className="truck-load-capacity-hint">كل براد يستوعب حتى {formatKg(plan.capacityKg)} · التوزيع يستخدم {numberFormat.format(plan.requestedTrucks)} براد</span>}
      </div>
      {plan.invalidTruckCount && <div className="truck-load-alert truck-load-alert-error" role="alert"><AlertTriangle size={17} /><span>أدخل عددًا صحيحًا من 1 إلى {numberFormat.format(MAX_TRUCKS)} براد.</span></div>}

      <div className="truck-load-table-heading"><div><h3>الأصناف والأوزان</h3><p>سيضع النظام الأشجار الأثقل أولًا، ثم يختار البراد الأقل وزنًا مع احترام سعته.</p></div><button type="button" className="truck-load-add-button" onClick={addItem}><Plus size={16} />إضافة صنف</button></div>
      <div className="truck-load-column-head"><span>اسم الصنف</span><span>العدد الكامل</span><span>وزن الشجرة</span><span aria-hidden="true" /></div>
      <div className="truck-load-rows">{draft.items.map((item, index) => <div className="truck-load-row" key={item.id}>
        <label><span className="truck-load-mobile-label">الصنف</span><input type="text" value={item.name} onChange={(event) => updateItem(item.id, 'name', event.target.value)} placeholder={`اسم الصنف ${index + 1}`} /></label>
        <label><span className="truck-load-mobile-label">عدد الأشجار</span><input type="number" min="1" step="1" inputMode="numeric" value={item.quantity} onChange={(event) => updateItem(item.id, 'quantity', event.target.value)} placeholder="مثال: 30" /></label>
        <label><span className="truck-load-mobile-label">وزن الشجرة (كغ)</span><div className="truck-load-weight-input"><input type="number" min="0.01" step="0.1" inputMode="decimal" value={item.weightKg} onChange={(event) => updateItem(item.id, 'weightKg', event.target.value)} placeholder="مثال: 45" /><b>كغ</b></div></label>
        <button type="button" className="truck-load-remove-button" onClick={() => removeItem(item.id)} aria-label={`حذف الصنف ${item.name || index + 1}`} title="حذف الصنف"><Trash2 size={16} /></button>
      </div>)}</div>
      <div className="truck-load-input-footer"><button type="button" className="btn secondary truck-load-reset" onClick={reset}><RotateCcw size={14} />تفريغ المدخلات</button><small>يتم حفظ عدد البرادات والسعة والأصناف تلقائيًا في هذا المتصفح.</small></div>
    </section>

    {plan.incompleteRows > 0 && <div className="truck-load-alert" role="status"><AlertTriangle size={17} /><span>أكمل اسم الصنف والعدد الصحيح ووزن الشجرة في {numberFormat.format(plan.incompleteRows)} صف/صفوف حتى يدخل كامل الطلب في الحساب والتنزيل.</span></div>}
    {plan.unassignedTrees > 0 && <div className="truck-load-alert truck-load-alert-error" role="alert"><AlertTriangle size={17} /><div><strong>لم تتسع البرادات المحددة لكل الأشجار.</strong><span>غير موزع: {numberFormat.format(plan.unassignedTrees)} شجرة ({formatKg(plan.unassignedKg)}). {plan.unassigned.map((item) => `${item.name}: ${numberFormat.format(item.quantity)} شجرة`).join('، ')}</span><span>زِد عدد البرادات أو سعتها قبل تنزيل بيانات الحمولة.</span></div></div>}

    <section className="truck-load-results">
      <div className="truck-load-results-heading"><div><div className="eyebrow">BALANCED LOAD DISTRIBUTION</div><h2>توزيع الأصناف على البرادات</h2><p>يُوزّع كل صنف شجرةً شجرةً على البراد الأقل وزنًا، مع عدم تجاوز السعة التي حددتها.</p></div><span className="truck-load-truck-count"><Truck size={17} />{numberFormat.format(plan.requestedTrucks)} براد محدد</span></div>
      {!isReady ? <div className="truck-load-empty"><Scale size={27} /><strong>حدد عدد البرادات وسعة البراد أولًا</strong><span>بعدها أضف الأصناف حتى تظهر خطة التوزيع.</span></div> : plan.totalTrees === 0 ? <div className="truck-load-empty"><Truck size={27} /><strong>أضف صنفًا صالحًا لحساب التوزيع</strong><span>أدخل اسم الصنف، وعددًا صحيحًا للأشجار، ووزن الشجرة بالكيلوغرام.</span></div> : <div className="truck-load-manifests">{plan.trucks.map((truck) => {
        const fill = Math.min(100, (truck.totalKg / plan.capacityKg) * 100);
        const trees = truck.lines.reduce((sum, line) => sum + line.quantity, 0);
        return <article className="truck-load-manifest" key={truck.number}>
          <header className="truck-load-manifest-head"><span className="truck-load-number"><Truck size={17} />البراد {numberFormat.format(truck.number)}</span><div className="truck-load-total"><strong>{formatKg(truck.totalKg)}</strong><small>من {formatKg(plan.capacityKg)}</small></div></header>
          <div className="truck-load-progress" role="progressbar" aria-valuenow={Math.round(fill)} aria-valuemin={0} aria-valuemax={100} aria-label={`نسبة إشغال البراد ${truck.number}`}><span style={{ width: `${fill}%` }} /></div>
          <div className="truck-load-utilization"><span>استغلال السعة · {numberFormat.format(trees)} شجرة</span><strong>{numberFormat.format(fill)}٪</strong></div>
          <div className="truck-load-manifest-list"><div className="truck-load-manifest-columns"><span>الصنف</span><span>الكمية</span><span>وزن الصنف</span></div>{truck.lines.length ? truck.lines.map((line) => <div className="truck-load-manifest-line" key={line.id}><strong>{line.name}</strong><span>{numberFormat.format(line.quantity)} شجرة</span><b>{formatKg(line.lineTotalKg)}</b></div>) : <div className="truck-load-no-items">لا توجد أشجار موزعة في هذا البراد حاليًا.</div>}</div>
          <footer className="truck-load-manifest-foot"><span>{numberFormat.format(truck.lines.length)} أصناف · فرق الخطة {formatKg(plan.balanceSpreadKg)}</span><button type="button" className="truck-load-download-button" onClick={() => void downloadPdfs([truck], `qadri-truck-${truck.number}.pdf`)} disabled={!plan.complete || pdfBusy}><Download size={14} />PDF لهذا البراد</button></footer>
        </article>;
      })}</div>}
      {pdfStatus && <div className={`truck-load-pdf-status${pdfStatus.startsWith('تعذر') ? ' is-error' : ''}`} role="status">{pdfStatus}</div>}
    </section>

    <aside className="truck-load-safety-note"><AlertTriangle size={16} /><p>التوزيع يوازن الوزن الإجمالي وفق أوزان الأشجار التي أدخلتها وسعة البرادات؛ راجع أيضًا حدود المحاور، توزيع الحمولة داخل المركبة، وتثبيت الأشجار بأمان قبل التحميل.</p></aside>
  </main>;
}
