export type AdminDocumentKind = 'quote' | 'invoice' | 'receipt' | 'disbursement';
export type StoredAdminDocument = Record<string, unknown> & { number: string; recordId?: string };

export type DeletedAdminDocument = {
  id: string;
  kind: AdminDocumentKind;
  number: string;
  name: string;
  deletedAt: string;
  sourceKey: string;
  document: StoredAdminDocument;
};

export const ADMIN_DOCUMENT_TRASH_KEY = 'qadri-admin-document-trash-v1';

export const adminDocumentKindLabels: Record<AdminDocumentKind, string> = {
  quote: 'عرض سعر',
  invoice: 'فاتورة',
  receipt: 'سند قبض',
  disbursement: 'سند صرف',
};

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

function parseRecords<T>(key: string): T[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value as T[] : [];
  } catch {
    return [];
  }
}

export function readDeletedAdminDocuments(): DeletedAdminDocument[] {
  const stored = parseRecords<DeletedAdminDocument>(ADMIN_DOCUMENT_TRASH_KEY);
  let changed = false;
  const prefixes: Record<AdminDocumentKind, string> = { quote: 'Q', invoice: 'INV', receipt: 'RC', disbursement: 'PV' };
  const records = stored.map((entry) => {
    const prefix = prefixes[entry.kind];
    const number = migrateLegacyDocumentNumber(entry.number, prefix, String(entry.document.date || ''));
    const recordId = typeof entry.document.recordId === 'string' ? entry.document.recordId : `legacy-${entry.kind}-${entry.number}-${entry.document.savedAt || entry.deletedAt}`;
    if (number !== entry.number || entry.document.recordId !== recordId) changed = true;
    return { ...entry, number, document: { ...entry.document, number, recordId } };
  });
  if (changed) writeTrash(records);
  return records;
}

function matchesDocumentKind(document: StoredAdminDocument, kind: AdminDocumentKind): boolean {
  if (kind === 'invoice') return document.documentType === 'invoice';
  if (kind === 'quote') return document.documentType !== 'invoice';
  return true;
}

function displayName(document: StoredAdminDocument): string {
  for (const key of ['customer', 'party', 'recipient', 'supplier', 'subject', 'title']) {
    const value = document[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return 'بدون اسم';
}

function writeTrash(records: DeletedAdminDocument[]): void {
  localStorage.setItem(ADMIN_DOCUMENT_TRASH_KEY, JSON.stringify(records));
}

export function moveAdminDocumentToTrash(
  kind: AdminDocumentKind,
  sourceKey: string,
  value: StoredAdminDocument,
): DeletedAdminDocument[] {
  const number = String(value.number || 'بدون رقم');
  const recordId = typeof value.recordId === 'string' ? value.recordId : '';
  const active = parseRecords<StoredAdminDocument>(sourceKey);
  const remaining = active.filter((record) => {
    if (!matchesDocumentKind(record, kind)) return true;
    if (recordId && typeof record.recordId === 'string') return record.recordId !== recordId;
    return String(record.number) !== number;
  });
  localStorage.setItem(sourceKey, JSON.stringify(remaining));
  const trash = readDeletedAdminDocuments();
  const entry: DeletedAdminDocument = {
    id: `${kind}:${number}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
    kind,
    number,
    name: displayName(value),
    deletedAt: new Date().toISOString(),
    sourceKey,
    document: value,
  };
  const next = [entry, ...trash];
  writeTrash(next);
  return next;
}

export function restoreAdminDocument(id: string): DeletedAdminDocument[] {
  const trash = readDeletedAdminDocuments();
  const entry = trash.find((item) => item.id === id);
  if (!entry) return trash;
  const active = parseRecords<StoredAdminDocument>(entry.sourceKey);
  const recordId = typeof entry.document.recordId === 'string' ? entry.document.recordId : '';
  const alreadyActive = active.some((record) => {
    if (!matchesDocumentKind(record, entry.kind)) return false;
    if (recordId) return record.recordId === recordId;
    return String(record.number) === entry.number;
  });
  if (!alreadyActive) {
    localStorage.setItem(entry.sourceKey, JSON.stringify([entry.document, ...active]));
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
