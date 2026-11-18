export type AdminDocumentKind =
  | 'quote'
  | 'invoice'
  | 'receipt'
  | 'disbursement'
  | 'project'
  | 'storeProduct'
  | 'plant'
  | 'socialLink'
  | 'heroSlide'
  | 'client';

export type StoredAdminDocument = Record<string, unknown> & {
  number?: string;
  recordId?: string;
  id?: string;
};

export type DeletedAdminDocument = {
  id: string;
  kind: AdminDocumentKind;
  number: string;
  name: string;
  deletedAt: string;
  sourceKey: string;
  collectionKey?: string;
  document: StoredAdminDocument;
};

export const ADMIN_DOCUMENT_TRASH_KEY = 'qadri-admin-document-trash-v1';

export const adminDocumentKindLabels: Record<AdminDocumentKind, string> = {
  quote: 'عرض سعر',
  invoice: 'فاتورة',
  receipt: 'سند قبض',
  disbursement: 'سند صرف',
  project: 'مشروع',
  storeProduct: 'منتج متجر',
  plant: 'نبتة من الكتالوج',
  socialLink: 'رابط تواصل',
  heroSlide: 'صورة الصفحة الرئيسية',
  client: 'جهة اتصال',
};

const numberedDocumentKinds = new Set<AdminDocumentKind>(['quote', 'invoice', 'receipt', 'disbursement']);

type CollectionWriteMode = 'remove' | 'restore';

function publishSourceUpdated(key: string): void {
  if (typeof window === 'undefined') return;
  if (key === 'qadri-admin-settings') window.dispatchEvent(new Event('qadri-admin-settings-updated'));
  if (key === 'qadri-store-products-v1' || key === 'qadri-portfolio-projects-v1') window.dispatchEvent(new Event('qadri-site-content-updated'));
  if (key === 'qadri-managed-plants-v1') window.dispatchEvent(new Event('qadri-managed-plants-updated'));
}

export function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createAdminDocumentId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function dateBasedDocumentNumber(prefix: string, date: string): string {
  const dateDigits = date.replace(/\D/g, '') || localDateString().replace(/\D/g, '');
  return `${prefix}-${dateDigits}`;
}

export function migrateLegacyDocumentNumber(number: string, prefix: string, date: string): string {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const oldDailySequence = new RegExp(`^${escapedPrefix}-\\d{8}-\\d+$`);
  const oldOperationsNumber = /^(?:PO|LTR)-\d{4}-\d{5}$/;
  if (oldDailySequence.test(number) || ((prefix === 'PO' || prefix === 'LTR') && oldOperationsNumber.test(number))) {
    return dateBasedDocumentNumber(prefix, date);
  }
  return number;
}

function parseJson<T>(key: string, fallback: T): T {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value === null ? fallback : value as T;
  } catch {
    return fallback;
  }
}

function parseRecords<T>(key: string): T[] {
  const value = parseJson<unknown>(key, []);
  return Array.isArray(value) ? value as T[] : [];
}

function readCollection<T>(key: string, collectionKey?: string): T[] {
  if (!collectionKey) return parseRecords<T>(key);
  const value = parseJson<unknown>(key, {});
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== 'object') return [];
  const collection = (value as Record<string, unknown>)[collectionKey];
  return Array.isArray(collection) ? collection as T[] : [];
}

function writeCollection(
  key: string,
  records: StoredAdminDocument[],
  collectionKey: string | undefined,
  kind: AdminDocumentKind,
  mode: CollectionWriteMode,
  itemId: string,
): void {
  if (!collectionKey) {
    localStorage.setItem(key, JSON.stringify(records));
    publishSourceUpdated(key);
    return;
  }

  const current = parseJson<unknown>(key, {});
  const root = !Array.isArray(current) && current && typeof current === 'object'
    ? current as Record<string, unknown>
    : {};

  if (kind === 'plant') {
    const oldDeletedIds = Array.isArray(root.deletedIds) ? root.deletedIds.map(String) : [];
    const deletedIds = mode === 'remove'
      ? [...new Set([...oldDeletedIds, itemId])]
      : oldDeletedIds.filter((id) => id !== itemId);
    localStorage.setItem(key, JSON.stringify({ ...root, [collectionKey]: records, deletedIds }));
    publishSourceUpdated(key);
    return;
  }

  localStorage.setItem(key, JSON.stringify({ ...root, [collectionKey]: records }));
  publishSourceUpdated(key);
}

export function readDeletedAdminDocuments(): DeletedAdminDocument[] {
  const stored = parseRecords<DeletedAdminDocument>(ADMIN_DOCUMENT_TRASH_KEY);
  let changed = false;
  const prefixes: Partial<Record<AdminDocumentKind, string>> = { quote: 'Q', invoice: 'INV', receipt: 'RC', disbursement: 'PV' };
  const records = stored.map((entry) => {
    const prefix = prefixes[entry.kind];
    const number = prefix ? migrateLegacyDocumentNumber(entry.number || '', prefix, String(entry.document.date || '')) : entry.number || '';
    let document = entry.document;
    if (numberedDocumentKinds.has(entry.kind)) {
      const hasRecordId = typeof document.recordId === 'string' && document.recordId.length > 0;
      const recordId = hasRecordId ? document.recordId : `legacy-${entry.kind}-${entry.number}-${document.savedAt || entry.deletedAt}`;
      if (number !== entry.number || document.recordId !== recordId) changed = true;
      document = { ...document, number, recordId };
    } else if (number !== entry.number) {
      changed = true;
      document = { ...document, number };
    }
    return { ...entry, number, document };
  });
  if (changed) writeTrash(records);
  return records;
}

function matchesDocumentKind(document: StoredAdminDocument, kind: AdminDocumentKind): boolean {
  if (kind === 'invoice') return document.documentType === 'invoice';
  if (kind === 'quote') return document.documentType !== 'invoice';
  return true;
}

function recordIdentity(document: StoredAdminDocument): string {
  return String(document.recordId || document.id || '');
}

function displayName(document: StoredAdminDocument): string {
  for (const key of ['customer', 'party', 'recipient', 'supplier', 'subject', 'title', 'nameAr', 'name', 'nameEn', 'scientificName', 'label', 'alt', 'url']) {
    const value = document[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return 'بدون اسم';
}

function writeTrash(records: DeletedAdminDocument[]): void {
  localStorage.setItem(ADMIN_DOCUMENT_TRASH_KEY, JSON.stringify(records));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('qadri-admin-document-trash-updated'));
}

function matchesStoredRecord(
  record: StoredAdminDocument,
  kind: AdminDocumentKind,
  itemId: string,
  number: string,
): boolean {
  if (numberedDocumentKinds.has(kind)) {
    if (!matchesDocumentKind(record, kind)) return false;
    const actualRecordId = typeof record.recordId === 'string' ? record.recordId : '';
    if (itemId && itemId !== number && !itemId.startsWith('legacy-') && actualRecordId) return actualRecordId === itemId;
    return String(record.number || '') === number;
  }
  return !!itemId && recordIdentity(record) === itemId;
}

function moveToTrash(
  kind: AdminDocumentKind,
  sourceKey: string,
  value: StoredAdminDocument,
  collectionKey?: string,
): DeletedAdminDocument[] {
  const number = String(value.number || '');
  const itemId = String(value.recordId || value.id || number);
  const active = readCollection<StoredAdminDocument>(sourceKey, collectionKey);
  const remaining = active.filter((record) => !matchesStoredRecord(record, kind, itemId, number));
  writeCollection(sourceKey, remaining, collectionKey, kind, 'remove', itemId);

  const trash = readDeletedAdminDocuments();
  const entry: DeletedAdminDocument = {
    id: `${kind}:${itemId || number || Date.now()}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
    kind,
    number,
    name: displayName(value),
    deletedAt: new Date().toISOString(),
    sourceKey,
    ...(collectionKey ? { collectionKey } : {}),
    document: value,
  };
  const next = [entry, ...trash];
  writeTrash(next);
  return next;
}

export function moveAdminDocumentToTrash(
  kind: AdminDocumentKind,
  sourceKey: string,
  value: StoredAdminDocument,
): DeletedAdminDocument[] {
  return moveToTrash(kind, sourceKey, value);
}

export function moveAdminEntityToTrash(
  kind: Exclude<AdminDocumentKind, 'quote' | 'invoice' | 'receipt' | 'disbursement'>,
  sourceKey: string,
  value: StoredAdminDocument,
  collectionKey?: string,
): DeletedAdminDocument[] {
  return moveToTrash(kind, sourceKey, value, collectionKey);
}

export function restoreAdminDocument(id: string): DeletedAdminDocument[] {
  const trash = readDeletedAdminDocuments();
  const entry = trash.find((item) => item.id === id);
  if (!entry) return trash;

  const active = readCollection<StoredAdminDocument>(entry.sourceKey, entry.collectionKey);
  const itemId = String(entry.document.recordId || entry.document.id || entry.number);
  const alreadyActive = active.some((record) => matchesStoredRecord(record, entry.kind, itemId, entry.number));
  if (!alreadyActive) {
    writeCollection(entry.sourceKey, [entry.document, ...active], entry.collectionKey, entry.kind, 'restore', itemId);
  }
  const next = trash.filter((item) => item.id !== id);
  writeTrash(next);
  return next;
}

export function permanentlyDeleteAdminDocument(id: string): DeletedAdminDocument[] {
  const next = readDeletedAdminDocuments().filter((item) => item.id !== id);
  writeTrash(next);
  return next;
}
