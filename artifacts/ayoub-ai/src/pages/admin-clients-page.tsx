import { useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Building2, Check, Copy, FileDown, Globe2, Mail, MapPin, MessageCircle, Pencil, Phone, Plus, Search, Trash2, UserRound, Users, X } from 'lucide-react';
import { Link } from 'wouter';
import { moveAdminEntityToTrash } from '@/lib/admin-document-storage';
import './admin-clients-page.css';

type ClientKind = 'individual' | 'company';
export type ClientRecord = {
  id: string;
  kind: ClientKind;
  name: string;
  contactPerson?: string;
  phone: string;
  email: string;
  address: string;
  website?: string;
  taxNumber?: string;
  notes: string;
  createdAt: string;
  // Older versions stored financial entries here. Keep them in localStorage for compatibility,
  // but this contact book deliberately never displays or edits them.
  transactions?: unknown[];
};

type ClientExportField = 'contactPerson' | 'phone' | 'email' | 'address' | 'website' | 'taxNumber' | 'notes';
const clientExportFields: { key: ClientExportField; label: string }[] = [
  { key: 'contactPerson', label: 'الشخص المسؤول / جهة التواصل' },
  { key: 'phone', label: 'رقم الهاتف' },
  { key: 'email', label: 'البريد الإلكتروني' },
  { key: 'address', label: 'العنوان' },
  { key: 'website', label: 'الموقع الإلكتروني' },
  { key: 'taxNumber', label: 'رقم التسجيل / الضريبة' },
  { key: 'notes', label: 'ملاحظات' },
];
const defaultExportFields: Record<ClientExportField, boolean> = {
  contactPerson: true,
  phone: true,
  email: true,
  address: true,
  website: true,
  taxNumber: true,
  notes: true,
};

const STORAGE_KEY = 'qadri-admin-clients-v1';
const newId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const blankDraft = () => ({ kind: 'individual' as ClientKind, name: '', contactPerson: '', phone: '', email: '', address: '', website: '', taxNumber: '', notes: '' });
const readClients = (): ClientRecord[] => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.map((client) => ({
      ...client,
      contactPerson: client.contactPerson || '',
      website: client.website || '',
      transactions: Array.isArray(client.transactions) ? client.transactions : [],
    })) : [];
  } catch { return []; }
};

function clientFieldValue(client: ClientRecord, key: ClientExportField): string {
  return String(client[key] || '').trim();
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>(readClients);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | ClientKind>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(blankDraft);
  const [notice, setNotice] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportSearch, setExportSearch] = useState('');
  const [exportClientIds, setExportClientIds] = useState<string[]>([]);
  const [exportFields, setExportFields] = useState(defaultExportFields);
  const [pdfTitle, setPdfTitle] = useState('دليل العملاء');
  const [pdfBusy, setPdfBusy] = useState(false);
  const pdfCoverRef = useRef<HTMLDivElement>(null);
  const pdfCardsRef = useRef<HTMLDivElement>(null);

  const persist = (next: ClientRecord[]) => {
    setClients(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };
  const selected = clients.find((client) => client.id === selectedId) || null;
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ar');
    return clients.filter((client) => {
      const matchesKind = kindFilter === 'all' || client.kind === kindFilter;
      const haystack = [client.name, client.contactPerson, client.phone, client.email, client.address, client.website, client.taxNumber, client.notes].join(' ').toLocaleLowerCase('ar');
      return matchesKind && (!query || haystack.includes(query));
    });
  }, [clients, search, kindFilter]);
  const selectedExportClients = useMemo(() => {
    const selectedSet = new Set(exportClientIds);
    return clients.filter((client) => selectedSet.has(client.id));
  }, [clients, exportClientIds]);
  const visibleExportClients = useMemo(() => {
    const query = exportSearch.trim().toLocaleLowerCase('ar');
    if (!query) return clients;
    return clients.filter((client) => `${client.name} ${client.contactPerson || ''} ${client.phone} ${client.email}`.toLocaleLowerCase('ar').includes(query));
  }, [clients, exportSearch]);
  const visibleExportIds = visibleExportClients.map((client) => client.id);
  const allVisibleSelected = visibleExportIds.length > 0 && visibleExportIds.every((id) => exportClientIds.includes(id));

  const openNew = () => { setEditingId(null); setDraft(blankDraft()); setShowForm(true); };
  const openEdit = (client: ClientRecord) => {
    setEditingId(client.id);
    setDraft({ kind: client.kind, name: client.name, contactPerson: client.contactPerson || '', phone: client.phone || '', email: client.email || '', address: client.address || '', website: client.website || '', taxNumber: client.taxNumber || '', notes: client.notes || '' });
    setShowForm(true);
  };
  const saveClient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    if (editingId) {
      const next = clients.map((client) => client.id === editingId ? { ...client, ...draft, name, createdAt: client.createdAt } : client);
      persist(next);
      setSelectedId(editingId);
      setNotice(`تم تحديث بيانات ${name}`);
      window.setTimeout(() => setNotice(''), 2500);
    } else {
      const client: ClientRecord = { id: newId(), ...draft, name, createdAt: new Date().toISOString(), transactions: [] };
      persist([client, ...clients]);
      setSelectedId(client.id);
      setNotice(`تم حفظ ${name} في دليل العملاء`);
      window.setTimeout(() => setNotice(''), 2500);
    }
    setShowForm(false);
    setEditingId(null);
  };
  const deleteClient = () => {
    if (!selected || !window.confirm(`نقل جهة الاتصال «${selected.name}» إلى سجل المحذوفات؟ يمكنك استعادتها لاحقًا.`)) return;
    moveAdminEntityToTrash('client', STORAGE_KEY, selected);
    const next = clients.filter((client) => client.id !== selected.id);
    persist(next);
    setSelectedId(next[0]?.id || null);
    setNotice('تم نقل جهة الاتصال إلى سجل المحذوفات.');
    window.setTimeout(() => setNotice(''), 2500);
  };
  const copyContact = async () => {
    if (!selected) return;
    const text = [selected.name, selected.contactPerson && `جهة التواصل: ${selected.contactPerson}`, selected.phone && `الهاتف: ${selected.phone}`, selected.email && `البريد: ${selected.email}`, selected.address && `العنوان: ${selected.address}`, selected.website && `الموقع: ${selected.website}`, selected.notes && `ملاحظات: ${selected.notes}`].filter(Boolean).join('\n');
    try { await navigator.clipboard.writeText(text); setNotice('تم نسخ بيانات جهة الاتصال'); window.setTimeout(() => setNotice(''), 2500); }
    catch { setNotice('تعذر النسخ من هذا المتصفح'); window.setTimeout(() => setNotice(''), 2500); }
  };
  const openExportDialog = () => {
    setExportClientIds(clients.map((client) => client.id));
    setExportSearch('');
    setShowExportDialog(true);
    setNotice('');
  };
  const toggleExportClient = (id: string) => setExportClientIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const toggleVisibleExportClients = (checked: boolean) => {
    const visibleIds = new Set(visibleExportIds);
    setExportClientIds((current) => checked
      ? [...new Set([...current, ...visibleIds])]
      : current.filter((id) => !visibleIds.has(id)));
  };
  const exportPdf = async () => {
    if (!selectedExportClients.length || pdfBusy) return;
    const cover = pdfCoverRef.current;
    const cards = Array.from(pdfCardsRef.current?.querySelectorAll<HTMLElement>('[data-client-pdf-card]') || []);
    if (!cover || !cards.length) { setNotice('تعذر تجهيز صفحات الدليل. أعد المحاولة.'); return; }
    setPdfBusy(true);
    try {
      await document.fonts?.ready;
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const renderOptions = { scale: 2, backgroundColor: '#ffffff', useCORS: true, allowTaint: false, logging: false, windowWidth: 794 } as const;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const coverCanvas = await html2canvas(cover, renderOptions);
      pdf.addImage(coverCanvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);

      const marginX = 13;
      const marginY = 12;
      const contentWidth = 184;
      const contentHeight = 273;
      for (const card of cards) {
        pdf.addPage();
        const canvas = await html2canvas(card, renderOptions);
        const pixelsPerMm = canvas.width / contentWidth;
        const maxSliceHeight = Math.max(1, Math.floor(contentHeight * pixelsPerMm));
        let offsetY = 0;
        let firstSlice = true;
        while (offsetY < canvas.height) {
          if (!firstSlice) pdf.addPage();
          const sliceHeight = Math.min(maxSliceHeight, canvas.height - offsetY);
          const slice = document.createElement('canvas');
          slice.width = canvas.width;
          slice.height = sliceHeight;
          const context = slice.getContext('2d');
          if (!context) throw new Error('تعذر تجهيز صفحة PDF.');
          context.drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
          pdf.addImage(slice.toDataURL('image/png'), 'PNG', marginX, marginY, contentWidth, sliceHeight / pixelsPerMm, undefined, 'FAST');
          offsetY += sliceHeight;
          firstSlice = false;
        }
      }
      const date = new Date().toISOString().slice(0, 10);
      pdf.save(`دليل-عملاء-${date}.pdf`);
      setShowExportDialog(false);
      setNotice(`تم تنزيل PDF لـ ${selectedExportClients.length} جهة اتصال.`);
      window.setTimeout(() => setNotice(''), 3000);
    } catch (error) {
      console.error('Client guide PDF export failed', error);
      setNotice('تعذر إنشاء ملف PDF. أعد المحاولة من فضلك.');
    } finally {
      setPdfBusy(false);
    }
  };

  return <main className="admin-clients-page" dir="rtl">
    <header className="admin-clients-head">
      <div><div className="eyebrow">QADRI / CONTACT BOOK</div><h1>عملاؤنا</h1><p>دفتر بسيط لمعلومات الأفراد والشركات كي تعود إليها وقت الحاجة. لا فواتير ولا حسابات مالية.</p></div>
      <div className="contact-book-actions">
        <Link className="btn secondary" href="/admin"><ArrowRight size={15} />لوحة التحكم</Link>
        <button className="btn secondary" onClick={openExportDialog} disabled={!clients.length}><FileDown size={15} />تصدير الدليل PDF</button>
        <button className="btn" onClick={openNew}><Plus size={16} />إضافة جهة اتصال</button>
      </div>
    </header>
    <div className="client-metrics contact-metrics"><section><Users size={17} /><span>كل جهات الاتصال</span><strong>{clients.length}</strong></section><section><Building2 size={17} /><span>الشركات</span><strong>{clients.filter((client) => client.kind === 'company').length}</strong></section><section><UserRound size={17} /><span>الأفراد</span><strong>{clients.filter((client) => client.kind === 'individual').length}</strong></section></div>
    <div className="clients-layout"><section className="clients-list-panel"><div className="clients-toolbar"><label><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو الهاتف أو البريد" /></label><select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as typeof kindFilter)}><option value="all">الكل</option><option value="individual">أفراد</option><option value="company">شركات</option></select></div>
      {filtered.length ? <div className="clients-list">{filtered.map((client) => <button type="button" className={`client-list-row ${client.id === selected?.id ? 'is-active' : ''}`} key={client.id} onClick={() => setSelectedId(client.id)}><span className="client-avatar">{client.kind === 'company' ? <Building2 size={17} /> : <UserRound size={17} />}</span><span><strong>{client.name}</strong><small>{client.kind === 'company' ? 'شركة' : 'فرد'}{client.contactPerson ? ` · ${client.contactPerson}` : ''}{client.phone ? ` · ${client.phone}` : ''}</small></span><span className="contact-row-arrow">←</span></button>)}</div> : <div className="clients-empty"><Users size={25} /><h2>{search ? 'لا توجد نتائج' : 'دليلك يبدأ من هنا'}</h2><p>{search ? 'جرّب كلمة بحث مختلفة.' : 'أضف معلومات عميل أو شركة لتعود إليها بسهولة لاحقًا.'}</p>{!search && <button className="btn small" onClick={openNew}><Plus size={14} />إضافة أول جهة اتصال</button>}</div>}
    </section>
    <section className="client-detail-panel">{selected ? <>
      <div className="client-detail-head"><div className="client-title"><span className="client-avatar large">{selected.kind === 'company' ? <Building2 size={21} /> : <UserRound size={21} />}</span><div><span className="client-kind">{selected.kind === 'company' ? 'شركة' : 'فرد'}</span><h2>{selected.name}</h2></div></div><div className="client-detail-actions"><button className="icon-button" title="نسخ بيانات الاتصال" aria-label="نسخ بيانات الاتصال" onClick={() => void copyContact()}><Copy size={15} /></button><button className="icon-button" title="تعديل بيانات الاتصال" aria-label="تعديل بيانات الاتصال" onClick={() => openEdit(selected)}><Pencil size={15} /></button><button className="icon-button" title="نقل إلى سجل المحذوفات" aria-label="نقل جهة الاتصال إلى سجل المحذوفات" onClick={deleteClient}><Trash2 size={15} /></button></div></div>
      <div className="contact-details-grid">
        {selected.contactPerson && <div className="contact-info-card"><UserRound size={16} /><span><small>الشخص المسؤول</small><strong>{selected.contactPerson}</strong></span></div>}
        {selected.phone && <div className="contact-info-card"><Phone size={16} /><span><small>رقم الهاتف</small><strong dir="ltr">{selected.phone}</strong></span><a href={`tel:${selected.phone.replace(/[^+\d]/g, '')}`} aria-label="اتصال" title="اتصال"><Phone size={14} /></a></div>}
        {selected.email && <div className="contact-info-card"><Mail size={16} /><span><small>البريد الإلكتروني</small><strong dir="ltr">{selected.email}</strong></span><a href={`mailto:${selected.email}`} aria-label="إرسال بريد" title="إرسال بريد"><Mail size={14} /></a></div>}
        {selected.address && <div className="contact-info-card"><MapPin size={16} /><span><small>العنوان</small><strong>{selected.address}</strong></span></div>}
        {selected.website && <div className="contact-info-card"><Globe2 size={16} /><span><small>الموقع الإلكتروني</small><strong dir="ltr">{selected.website}</strong></span><a href={/^https?:\/\//.test(selected.website) ? selected.website : `https://${selected.website}`} target="_blank" rel="noreferrer" aria-label="فتح الموقع" title="فتح الموقع"><Globe2 size={14} /></a></div>}
        {selected.taxNumber && <div className="contact-info-card"><Building2 size={16} /><span><small>رقم التسجيل / الضريبة</small><strong>{selected.taxNumber}</strong></span></div>}
      </div>
      {selected.phone && <a className="contact-whatsapp" href={`https://wa.me/${selected.phone.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle size={17} />فتح محادثة واتساب</a>}
      {selected.notes && <div className="contact-notes"><span>ملاحظات خاصة</span><p>{selected.notes}</p></div>}
      <div className="contact-saved-note"><Check size={15} /><span>بيانات الاتصال محفوظة في هذا المتصفح للرجوع إليها.</span></div>
    </> : <div className="client-detail-empty"><Users size={34} /><h2>دليل علاقاتك، مرتب بمكان واحد</h2><p>اختر اسمًا من القائمة لعرض تفاصيله أو أضف جهة اتصال جديدة.</p><button className="btn small" onClick={openNew}><Plus size={14} />إضافة جهة اتصال</button></div>}</section></div>
    {notice && <div className="contact-toast" role="status">{notice}</div>}
    {showForm && <div className="client-modal-backdrop" onClick={() => setShowForm(false)}><form className="client-modal contact-modal" onSubmit={saveClient} onClick={(event) => event.stopPropagation()}><header><div><span className="eyebrow">QADRI / CONTACT DETAILS</span><h2>{editingId ? 'تعديل جهة الاتصال' : 'إضافة جهة اتصال'}</h2><p>أدخل ما تحتاجه لتتواصل مع العميل أو الشركة لاحقًا.</p></div><button type="button" className="icon-button" onClick={() => setShowForm(false)} aria-label="إغلاق"><X size={16} /></button></header>
      <div className="client-kind-toggle"><button type="button" className={draft.kind === 'individual' ? 'active' : ''} onClick={() => setDraft({ ...draft, kind: 'individual' })}><UserRound size={15} />فرد</button><button type="button" className={draft.kind === 'company' ? 'active' : ''} onClick={() => setDraft({ ...draft, kind: 'company' })}><Building2 size={15} />شركة</button></div>
      <div className="client-form-grid"><label><span>{draft.kind === 'company' ? 'اسم الشركة' : 'اسم العميل'} *</span><input required autoFocus value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder={draft.kind === 'company' ? 'مثال: شركة البستان' : 'الاسم الكامل'} /></label><label><span>{draft.kind === 'company' ? 'اسم الشخص المسؤول' : 'صفة / جهة التواصل'}</span><input value={draft.contactPerson} onChange={(event) => setDraft({ ...draft, contactPerson: event.target.value })} placeholder="اختياري" /></label><label><span>رقم الهاتف</span><input dir="ltr" type="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="+962 ..." /></label><label><span>البريد الإلكتروني</span><input dir="ltr" type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="name@example.com" /></label><label className="wide"><span>العنوان</span><input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} placeholder="المدينة، المنطقة، أو العنوان" /></label><label><span>الموقع الإلكتروني</span><input dir="ltr" value={draft.website} onChange={(event) => setDraft({ ...draft, website: event.target.value })} placeholder="example.com" /></label>{draft.kind === 'company' && <label><span>رقم التسجيل / الضريبة</span><input value={draft.taxNumber} onChange={(event) => setDraft({ ...draft, taxNumber: event.target.value })} /></label>}<label className="wide"><span>ملاحظات تساعدك عند التواصل</span><textarea rows={3} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="موعد مناسب للاتصال، مجال الشركة، أو أي معلومة مفيدة…" /></label></div>
      <footer><button type="button" className="btn secondary" onClick={() => setShowForm(false)}>إلغاء</button><button className="btn" type="submit"><Check size={15} />{editingId ? 'حفظ التعديلات' : 'حفظ جهة اتصال'}</button></footer>
    </form></div>}
    {showExportDialog && <div className="client-modal-backdrop client-export-backdrop" onClick={() => !pdfBusy && setShowExportDialog(false)}><section className="client-export-modal" role="dialog" aria-modal="true" aria-labelledby="client-export-title" onClick={(event) => event.stopPropagation()}>
      <header className="client-export-head"><div><span className="eyebrow">QADRI / PDF STUDIO</span><h2 id="client-export-title">جهّز دليل العملاء</h2><p>اختر الجهات والبيانات التي تريد ظهورها في ملف PDF.</p></div><button type="button" className="icon-button" onClick={() => !pdfBusy && setShowExportDialog(false)} aria-label="إغلاق" disabled={pdfBusy}><X size={17} /></button></header>
      <div className="client-export-title-field"><label htmlFor="client-pdf-title">عنوان الدليل</label><input id="client-pdf-title" value={pdfTitle} onChange={(event) => setPdfTitle(event.target.value)} maxLength={80} /></div>
      <div className="client-export-layout">
        <section className="client-export-select-panel"><div className="client-export-section-head"><div><strong>الجهات التي ستظهر</strong><small>{selectedExportClients.length} من {clients.length} محددة</small></div><button type="button" className="client-export-select-all" onClick={() => toggleVisibleExportClients(!allVisibleSelected)}>{allVisibleSelected ? 'إلغاء تحديد الظاهر' : 'تحديد الظاهر'}</button></div>
          <label className="client-export-search"><Search size={15} /><input value={exportSearch} onChange={(event) => setExportSearch(event.target.value)} placeholder="ابحث عن جهة اتصال" /></label>
          <div className="client-export-client-list">{visibleExportClients.map((client) => <label className="client-export-client-option" key={client.id}><input type="checkbox" checked={exportClientIds.includes(client.id)} onChange={() => toggleExportClient(client.id)} /><span className="client-export-client-icon">{client.kind === 'company' ? <Building2 size={15} /> : <UserRound size={15} />}</span><span><strong>{client.name}</strong><small>{client.kind === 'company' ? 'شركة' : 'فرد'}{client.phone ? ` · ${client.phone}` : ''}</small></span></label>)}{!visibleExportClients.length && <p className="client-export-no-results">لا توجد جهات مطابقة للبحث.</p>}</div>
        </section>
        <section className="client-export-fields-panel"><div className="client-export-section-head"><div><strong>البيانات المطلوب تضمينها</strong><small>الاسم ونوع الجهة يظهران دائمًا</small></div></div><div className="client-export-field-list">{clientExportFields.map((field) => <label className="client-export-field-option" key={field.key}><input type="checkbox" checked={exportFields[field.key]} onChange={(event) => setExportFields((current) => ({ ...current, [field.key]: event.target.checked }))} /><span>{field.label}</span></label>)}</div><div className="client-export-preview-note"><span className="client-export-preview-mark">Q</span><span><strong>تصميم PDF أنيق</strong><small>غلاف مخصص وبطاقة واضحة لكل جهة اتصال.</small></span></div></section>
      </div>
      <footer className="client-export-footer"><button type="button" className="btn secondary" onClick={() => !pdfBusy && setShowExportDialog(false)} disabled={pdfBusy}>إلغاء</button><button type="button" className="btn" onClick={() => void exportPdf()} disabled={!selectedExportClients.length || pdfBusy}><FileDown size={15} />{pdfBusy ? 'جارٍ إعداد PDF…' : `تنزيل PDF · ${selectedExportClients.length}`}</button></footer>
    </section></div>}
    <div className="client-pdf-export-stage" aria-hidden="true">
      <section className="client-pdf-cover" ref={pdfCoverRef}>
        <div className="client-pdf-cover-brand"><span className="client-pdf-mark">Q</span><div><strong>القادري للمشاتل والزراعة</strong><small>QADRI AGRICULTURAL ESTABLISHMENT</small></div><span className="client-pdf-cover-tag">CONTACT BOOK</span></div>
        <div className="client-pdf-cover-main"><span className="client-pdf-cover-kicker">دليل العلاقات · {new Date().getFullYear()}</span><h1>{pdfTitle.trim() || 'دليل العملاء'}</h1><p>مرجع أنيق ومخصص لبيانات العملاء وجهات التواصل.</p><div className="client-pdf-cover-stats"><div><strong>{selectedExportClients.length}</strong><span>جهة اتصال</span></div><div><strong>{selectedExportClients.filter((client) => client.kind === 'company').length}</strong><span>شركة</span></div><div><strong>{selectedExportClients.filter((client) => client.kind === 'individual').length}</strong><span>فرد</span></div></div></div>
        <div className="client-pdf-cover-footer"><span>إعداد الدليل</span><strong>{new Intl.DateTimeFormat('ar-JO', { dateStyle: 'long' }).format(new Date())}</strong><span>للاستخدام الداخلي · QADRI</span></div>
      </section>
      <div className="client-pdf-cards" ref={pdfCardsRef}>{selectedExportClients.map((client, index) => <article className="client-pdf-card" data-client-pdf-card key={client.id}>
        <header className="client-pdf-card-head"><span className="client-pdf-card-index">{String(index + 1).padStart(2, '0')}</span><div><small>دليل العملاء / بطاقة جهة اتصال</small><h2>{client.name}</h2><span className="client-pdf-kind">{client.kind === 'company' ? 'شركة' : 'فرد'}</span></div><span className="client-pdf-card-symbol">{client.kind === 'company' ? <Building2 size={25} /> : <UserRound size={25} />}</span></header>
        <div className="client-pdf-card-content">{clientExportFields.filter((field) => exportFields[field.key] && clientFieldValue(client, field.key)).map((field) => <div className={`client-pdf-data client-pdf-data-${field.key}`} key={field.key}><span>{field.label}</span><strong dir={field.key === 'phone' || field.key === 'email' || field.key === 'website' ? 'ltr' : undefined}>{clientFieldValue(client, field.key)}</strong></div>)}{!clientExportFields.some((field) => exportFields[field.key] && clientFieldValue(client, field.key)) && <p className="client-pdf-empty-data">لم يتم اختيار بيانات إضافية لهذه الجهة.</p>}</div>
        <footer className="client-pdf-card-footer"><span>القادري للمشاتل والزراعة</span><span>{String(index + 1).padStart(2, '0')} / {String(selectedExportClients.length).padStart(2, '0')}</span></footer>
      </article>)}</div>
    </div>
  </main>;
}
