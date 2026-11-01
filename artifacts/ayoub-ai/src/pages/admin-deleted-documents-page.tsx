import { useMemo, useState } from 'react';
import { ArrowLeft, ArchiveRestore, Search, Trash2 } from 'lucide-react';
import { Link } from 'wouter';
import { adminDocumentKindLabels, permanentlyDeleteAdminDocument, readDeletedAdminDocuments, restoreAdminDocument, type DeletedAdminDocument } from '@/lib/admin-document-storage';
import './admin-deleted-documents-page.css';

function formatDeletedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('ar-JO', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function AdminDeletedDocumentsPage() {
  const [records, setRecords] = useState<DeletedAdminDocument[]>(() => readDeletedAdminDocuments());
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ar');
    if (!query) return records;
    return records.filter((record) => `${record.number} ${record.name} ${adminDocumentKindLabels[record.kind]}`.toLocaleLowerCase('ar').includes(query));
  }, [records, search]);

  const restore = (id: string) => setRecords(restoreAdminDocument(id));
  const deleteForever = (record: DeletedAdminDocument) => {
    if (!window.confirm(`حذف ${record.number} نهائيًا؟ لا يمكن استرجاعه بعد ذلك.`)) return;
    setRecords(permanentlyDeleteAdminDocument(record.id));
  };

  return (
    <main className="admin-page deleted-documents-page" dir="rtl">
      <header className="admin-head">
        <div><div className="eyebrow">QADRI AI / RECYCLE BIN</div><h1>سجل المحذوفات</h1><p className="page-desc">ابحث عن المستندات المحذوفة واسترجعها، أو احذفها نهائيًا عند الحاجة.</p></div>
        <div className="admin-head-actions"><Link className="btn secondary" href="/admin"><ArrowLeft size={14} />لوحة التحكم</Link></div>
      </header>
      <section className="panel deleted-documents-panel">
        <div className="deleted-documents-toolbar">
          <div><h2>المستندات المحذوفة</h2><span>{records.length} مستند</span></div>
          <label className="deleted-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو الرقم" aria-label="ابحث في سجل المحذوفات بالاسم أو الرقم" /></label>
        </div>
        {filtered.length ? <div className="deleted-document-list">{filtered.map((record) => <article className="deleted-document-card" key={record.id}>
          <div className="deleted-document-kind">{adminDocumentKindLabels[record.kind]}</div>
          <div className="deleted-document-main"><strong>{record.name || 'بدون اسم'}</strong><span dir="ltr">{record.number}</span><small>تاريخ الحذف: {formatDeletedAt(record.deletedAt)}</small></div>
          <div className="deleted-document-actions"><button className="btn secondary small" type="button" onClick={() => restore(record.id)}><ArchiveRestore size={14} />استرجاع</button><button className="deleted-permanent-button" type="button" onClick={() => deleteForever(record)} aria-label={`حذف ${record.number} نهائيًا`} title="حذف نهائي"><Trash2 size={15} />حذف نهائي</button></div>
        </article>)}</div> : <div className="deleted-documents-empty"><Trash2 size={28} /><strong>{records.length ? 'لا توجد نتائج مطابقة' : 'سجل المحذوفات فارغ'}</strong><span>{records.length ? 'جرّب البحث باسم أو رقم مختلف.' : 'أي مستند تحذفه سيظهر هنا لتتمكن من استرجاعه.'}</span></div>}
      </section>
    </main>
  );
}
