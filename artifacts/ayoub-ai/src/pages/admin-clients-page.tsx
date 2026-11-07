import { useMemo, useState, type FormEvent } from 'react';
import { Building2, Check, Copy, Mail, MapPin, MessageCircle, Pencil, Phone, Plus, Search, Trash2, UserRound, Users, X, Globe2, Download } from 'lucide-react';
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

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>(readClients);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | ClientKind>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(blankDraft);
  const [notice, setNotice] = useState('');

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
    if (!selected || !window.confirm(`حذف جهة الاتصال «${selected.name}»؟`)) return;
    const next = clients.filter((client) => client.id !== selected.id);
    persist(next);
    setSelectedId(next[0]?.id || null);
  };
  const copyContact = async () => {
    if (!selected) return;
    const text = [selected.name, selected.contactPerson && `جهة التواصل: ${selected.contactPerson}`, selected.phone && `الهاتف: ${selected.phone}`, selected.email && `البريد: ${selected.email}`, selected.address && `العنوان: ${selected.address}`, selected.website && `الموقع: ${selected.website}`, selected.notes && `ملاحظات: ${selected.notes}`].filter(Boolean).join('\n');
    try { await navigator.clipboard.writeText(text); setNotice('تم نسخ بيانات جهة الاتصال'); window.setTimeout(() => setNotice(''), 2500); }
    catch { setNotice('تعذر النسخ من هذا المتصفح'); window.setTimeout(() => setNotice(''), 2500); }
  };
  const exportCsv = () => {
    const header = ['النوع', 'الاسم', 'جهة التواصل', 'الهاتف', 'البريد الإلكتروني', 'العنوان', 'الموقع الإلكتروني', 'رقم التسجيل', 'ملاحظات'];
    const rows = clients.map((client) => [client.kind === 'company' ? 'شركة' : 'فرد', client.name, client.contactPerson || '', client.phone, client.email, client.address, client.website || '', client.taxNumber || '', client.notes]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value || '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'دليل-عملاء-القادري.csv'; anchor.click(); URL.revokeObjectURL(url);
  };

  return <main className="admin-clients-page" dir="rtl">
    <header className="admin-clients-head">
      <div><div className="eyebrow">QADRI / CONTACT BOOK</div><h1>عملاؤنا</h1><p>دفتر بسيط لمعلومات الأفراد والشركات كي تعود إليها وقت الحاجة. لا فواتير ولا حسابات مالية.</p></div>
      <div className="contact-book-actions"><button className="btn secondary" onClick={exportCsv} disabled={!clients.length}><Download size={15} />تصدير الدليل</button><button className="btn" onClick={openNew}><Plus size={16} />إضافة جهة اتصال</button></div>
    </header>
    <div className="client-metrics contact-metrics"><section><Users size={17} /><span>كل جهات الاتصال</span><strong>{clients.length}</strong></section><section><Building2 size={17} /><span>الشركات</span><strong>{clients.filter((client) => client.kind === 'company').length}</strong></section><section><UserRound size={17} /><span>الأفراد</span><strong>{clients.filter((client) => client.kind === 'individual').length}</strong></section></div>
    <div className="clients-layout"><section className="clients-list-panel"><div className="clients-toolbar"><label><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو الهاتف أو البريد" /></label><select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as typeof kindFilter)}><option value="all">الكل</option><option value="individual">أفراد</option><option value="company">شركات</option></select></div>
      {filtered.length ? <div className="clients-list">{filtered.map((client) => <button type="button" className={`client-list-row ${client.id === selected?.id ? 'is-active' : ''}`} key={client.id} onClick={() => setSelectedId(client.id)}><span className="client-avatar">{client.kind === 'company' ? <Building2 size={17} /> : <UserRound size={17} />}</span><span><strong>{client.name}</strong><small>{client.kind === 'company' ? 'شركة' : 'فرد'}{client.contactPerson ? ` · ${client.contactPerson}` : ''}{client.phone ? ` · ${client.phone}` : ''}</small></span><span className="contact-row-arrow">←</span></button>)}</div> : <div className="clients-empty"><Users size={25} /><h2>{search ? 'لا توجد نتائج' : 'دليلك يبدأ من هنا'}</h2><p>{search ? 'جرّب كلمة بحث مختلفة.' : 'أضف معلومات عميل أو شركة لتعود إليها بسهولة لاحقًا.'}</p>{!search && <button className="btn small" onClick={openNew}><Plus size={14} />إضافة أول جهة اتصال</button>}</div>}
    </section>
    <section className="client-detail-panel">{selected ? <>
      <div className="client-detail-head"><div className="client-title"><span className="client-avatar large">{selected.kind === 'company' ? <Building2 size={21} /> : <UserRound size={21} />}</span><div><span className="client-kind">{selected.kind === 'company' ? 'شركة' : 'فرد'}</span><h2>{selected.name}</h2></div></div><div className="client-detail-actions"><button className="icon-button" title="نسخ بيانات الاتصال" aria-label="نسخ بيانات الاتصال" onClick={() => void copyContact()}><Copy size={15} /></button><button className="icon-button" title="تعديل بيانات الاتصال" aria-label="تعديل بيانات الاتصال" onClick={() => openEdit(selected)}><Pencil size={15} /></button><button className="icon-button" title="حذف جهة الاتصال" aria-label="حذف جهة الاتصال" onClick={deleteClient}><Trash2 size={15} /></button></div></div>
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
      <footer><button type="button" className="btn secondary" onClick={() => setShowForm(false)}>إلغاء</button><button className="btn" type="submit"><Check size={15} />{editingId ? 'حفظ التعديلات' : 'حفظ جهة الاتصال'}</button></footer>
    </form></div>}
  </main>;
}
