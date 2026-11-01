export type AdminDocumentKind = 'quote' | 'invoice' | 'receipt' | 'disbursement';
export type StoredAdminDocument = Record<string, unknown> & { number: string };

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

export function nextDailyDocumentNumber(prefix: string, date: string, knownNumbers: string[] = []): string {
  const dateDigits = date.replace(/\D/g, '') || localDateString().replace(/\D/g, '');
  const storageKey = `qadri-document-sequence:${prefix}:${dateDigits}`;
  let sequence = 0;
  try {
    sequence = Number.parseInt(localStorage.getItem(storageKey) || '0', 10) || 0;
  } catch {
    // Continue with the numbers already known in memory if storage is unavailable.
  }
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escapedPrefix}-${dateDigits}-(\\d+)$`);
  for (const number of knownNumbers) {
    const match = number.match(pattern);
    if (match) sequence = Math.max(sequence, Number.parseInt(match[1], 10) || 0);
  }
  sequence += 1;
  try {
    localStorage.setItem(storageKey, String(sequence));
  } catch {
    // The returned number is still valid for this draft if storage is unavailable.
  }
  return `${prefix}-${dateDigits}-${String(sequence).padStart(3, '0')}`;
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
  return parseRecords<DeletedAdminDocument>(ADMIN_DOCUMENT_TRASH_KEY);
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
  const active = parseRecords<StoredAdminDocument>(sourceKey);
  localStorage.setItem(sourceKey, JSON.stringify(active.filter((record) => String(record.number) !== number || !matchesDocumentKind(record, kind))));
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
  if (!active.some((record) => String(record.number) === entry.number && matchesDocumentKind(record, entry.kind))) {
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
