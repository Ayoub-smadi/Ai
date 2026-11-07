import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, LayoutDashboard, Plus, Printer, RotateCcw, Scale, Trash2, Truck } from 'lucide-react';
import { Link } from 'wouter';
import { calculatePlan, type DraftItem, type PlannerDraft } from '@/lib/truck-load-planner';
import './admin-truck-load-planner-page.css';

const STORAGE_KEY = 'qadri-truck-load-planner-v1';
const makeId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const emptyRow = (): DraftItem => ({ id: makeId(), name: '', quantity: '', weightKg: '' });
const initialDraft = (): PlannerDraft => ({ capacityTons: '', items: [emptyRow()] });

function readDraft(): PlannerDraft {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null') as Partial<PlannerDraft> | null;
    if (!saved || !Array.isArray(saved.items)) return initialDraft();
    return {
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
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* Ignore storage errors. */ }
  };

  return <main className="admin-page truck-load-page" dir="rtl">
    <header className="admin-head truck-load-head">
      <div><div className="eyebrow">QADRI AI / TRUCK LOAD PLANNER</div><h1>توزيع حمولة الأشجار</h1><p className="page-desc">أدخل سعة البراد وأعداد الأشجار وأوزانها، وستحصل على قائمة توزيع لكل براد دون تجاوز السعة المحددة.</p></div>
      <div className="admin-head-actions truck-load-actions"><Link className="btn secondary" href="/admin"><LayoutDashboard size={15} />لوحة الإدارة</Link><button className="btn secondary" type="button" onClick={() => window.print()}><Printer size={15} />طباعة خطة التوزيع</button></div>
    </header>

    <section className="truck-load-metrics" aria-label="ملخص الحمولة">
      <article className="truck-load-metric"><span className="truck-load-metric-icon"><Truck size={18} /></span><div><small>عدد البرادات المطلوبة</small><strong>{plan.trucks.length}</strong></div></article>
      <article className="truck-load-metric"><span className="truck-load-metric-icon"><Scale size={18} /></span><div><small>إجمالي الوزن المدخل</small><strong>{formatKg(plan.totalKg)}</strong></div></article>
      <article className="truck-load-metric"><span className="truck-load-metric-icon"><Check size={18} /></span><div><small>إجمالي عدد الأشجار</small><strong>{numberFormat.format(plan.totalTrees)}</strong></div></article>
    </section>

    <section className="panel truck-load-input-panel">
      <div className="truck-load-section-heading"><span className="truck-load-heading-icon"><Truck size={19} /></span><div><h2>بيانات الحمولة</h2><p>السعة تُدخل بالطن، ووزن الشجرة الواحدة بالكيلوغرام.</p></div><span className="truck-load-autosave"><Check size={13} /> حفظ تلقائي</span></div>
      <div className="truck-load-capacity-row">
        <label className="truck-load-capacity-field"><span>سعة البراد الواحد</span><div><input type="number" min="0.01" step="0.1" inputMode="decimal" placeholder="مثال: 20" value={draft.capacityTons} onChange={(event) => setDraft((current) => ({ ...current, capacityTons: event.target.value }))} /><b>طن</b></div></label>
        {draft.capacityTons && Number(draft.capacityTons) > 0 && <span className="truck-load-capacity-hint">تعادل {formatKg(plan.capacityKg)} لكل براد</span>}
      </div>

      <div className="truck-load-table-heading"><div><h3>الأصناف والأوزان</h3><p>كل صنف يُوزّع حسب عدد الأشجار ووزن الشجرة الواحدة.</p></div><button type="button" className="truck-load-add-button" onClick={addItem}><Plus size={16} />إضافة صنف</button></div>
      <div className="truck-load-column-head"><span>اسم الصنف</span><span>العدد الكامل</span><span>وزن الشجرة</span><span aria-hidden="true" /></div>
      <div className="truck-load-rows">{draft.items.map((item, index) => <div className="truck-load-row" key={item.id}>
        <label><span className="truck-load-mobile-label">الصنف</span><input type="text" value={item.name} onChange={(event) => updateItem(item.id, 'name', event.target.value)} placeholder={`اسم الصنف ${index + 1}`} /></label>
        <label><span className="truck-load-mobile-label">عدد الأشجار</span><input type="number" min="1" step="1" inputMode="numeric" value={item.quantity} onChange={(event) => updateItem(item.id, 'quantity', event.target.value)} placeholder="مثال: 30" /></label>
        <label><span className="truck-load-mobile-label">وزن الشجرة (كغ)</span><div className="truck-load-weight-input"><input type="number" min="0.01" step="0.1" inputMode="decimal" value={item.weightKg} onChange={(event) => updateItem(item.id, 'weightKg', event.target.value)} placeholder="مثال: 45" /><b>كغ</b></div></label>
        <button type="button" className="truck-load-remove-button" onClick={() => removeItem(item.id)} aria-label={`حذف الصنف ${item.name || index + 1}`} title="حذف الصنف"><Trash2 size={16} /></button>
      </div>)}</div>
      <div className="truck-load-input-footer"><button type="button" className="btn secondary truck-load-reset" onClick={reset}><RotateCcw size={14} />تفريغ المدخلات</button><small>يتم حفظ السعة والأصناف تلقائيًا في هذا المتصفح.</small></div>
    </section>

    {plan.incompleteRows > 0 && <div className="truck-load-alert" role="status"><AlertTriangle size={17} /><span>أكمل اسم الصنف والعدد الصحيح ووزن الشجرة في {numberFormat.format(plan.incompleteRows)} صف/صفوف حتى تدخل في الحساب.</span></div>}
    {plan.oversized.length > 0 && <div className="truck-load-alert truck-load-alert-error" role="alert"><AlertTriangle size={17} /><div><strong>هناك أشجار وزنها أعلى من سعة البراد.</strong><span>{plan.oversized.map((item) => `${item.name}: وزن الشجرة ${formatKg(item.weightKg)} مقابل سعة ${formatKg(plan.capacityKg)}`).join('، ')} — لم تُدرج هذه الأصناف في التوزيع.</span></div></div>}

    <section className="truck-load-results">
      <div className="truck-load-results-heading"><div><div className="eyebrow">AUTOMATIC LOAD PLAN</div><h2>خطة توزيع البرادات</h2><p>تُرتب الأشجار من الأثقل إلى الأخف وتُجمع الأصناف داخل كل براد قدر الإمكان.</p></div><span className="truck-load-truck-count"><Truck size={17} />{numberFormat.format(plan.trucks.length)} براد</span></div>
      {!plan.capacityKg ? <div className="truck-load-empty"><Scale size={27} /><strong>أدخل سعة البراد لتظهر خطة التوزيع</strong><span>ثم أدخل الصنف والعدد ووزن الشجرة.</span></div> : plan.trucks.length === 0 ? <div className="truck-load-empty"><Truck size={27} /><strong>أضف صنفًا صالحًا لحساب التوزيع</strong><span>يجب إدخال اسم الصنف، عدد صحيح للأشجار، ووزن أكبر من صفر.</span></div> : <div className="truck-load-manifests">{plan.trucks.map((truck) => {
        const fill = Math.min(100, (truck.totalKg / plan.capacityKg) * 100);
        return <article className="truck-load-manifest" key={truck.number}>
          <header className="truck-load-manifest-head"><span className="truck-load-number"><Truck size={17} />البراد {numberFormat.format(truck.number)}</span><div className="truck-load-total"><strong>{formatKg(truck.totalKg)}</strong><small>من {formatKg(plan.capacityKg)}</small></div></header>
          <div className="truck-load-progress" role="progressbar" aria-valuenow={Math.round(fill)} aria-valuemin={0} aria-valuemax={100} aria-label={`نسبة إشغال البراد ${truck.number}`}><span style={{ width: `${fill}%` }} /></div>
          <div className="truck-load-utilization"><span>نسبة استغلال السعة</span><strong>{numberFormat.format(fill)}٪</strong></div>
          <div className="truck-load-manifest-list"><div className="truck-load-manifest-columns"><span>الصنف</span><span>الكمية</span><span>وزن الصنف</span></div>{truck.lines.map((line) => <div className="truck-load-manifest-line" key={line.id}><strong>{line.name}</strong><span>{numberFormat.format(line.quantity)} شجرة</span><b>{formatKg(line.lineTotalKg)}</b></div>)}</div>
          <footer className="truck-load-manifest-foot"><span>عدد الأصناف</span><strong>{numberFormat.format(truck.lines.length)}</strong></footer>
        </article>;
      })}</div>}
    </section>

    <aside className="truck-load-safety-note"><AlertTriangle size={16} /><p>الحساب يراعي الوزن المدخل وسعة البراد فقط؛ تأكد أيضًا من حدود المحاور، توزيع الوزن داخل المركبة، وتثبيت الأشجار بأمان قبل التحميل.</p></aside>
  </main>;
}
