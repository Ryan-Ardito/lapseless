import { openDB, type IDBPDatabase } from 'idb';
import type { DocumentMeta } from '../../types/obligation';
import { getItem, setItem, simulateAsync } from './client';

const key = (orgId: string) => `practiceatlas-${orgId}-standalone-docs`;

export function getDocuments(orgId: string, _userId?: string): Promise<DocumentMeta[]> {
  return simulateAsync(() => getItem<DocumentMeta[]>(key(orgId), []).filter((d) => !d.deletedAt));
}

export function addDocument(orgId: string, doc: DocumentMeta): Promise<DocumentMeta> {
  return simulateAsync(() => {
    const docs = getItem<DocumentMeta[]>(key(orgId), []);
    setItem(key(orgId), [...docs, doc]);
    return doc;
  });
}

export function updateDocument(
  orgId: string,
  id: string,
  updates: Partial<Pick<DocumentMeta, 'displayName' | 'obligationId'>>,
): Promise<DocumentMeta> {
  return simulateAsync(() => {
    const docs = getItem<DocumentMeta[]>(key(orgId), []);
    const updated = docs.map((d) => (d.id === id ? { ...d, ...updates } : d));
    setItem(key(orgId), updated);
    return updated.find((d) => d.id === id)!;
  });
}

export function removeDocument(orgId: string, id: string): Promise<DocumentMeta> {
  return simulateAsync(() => {
    const docs = getItem<DocumentMeta[]>(key(orgId), []);
    const target = docs.find((d) => d.id === id);
    if (!target) throw new Error(`Document ${id} not found`);
    const deletedAt = new Date().toISOString();
    setItem(key(orgId), docs.map((d) => (d.id === id ? { ...d, deletedAt } : d)));
    return { ...target, deletedAt };
  });
}

export function restoreDocument(orgId: string, id: string): Promise<DocumentMeta> {
  return simulateAsync(() => {
    const docs = getItem<DocumentMeta[]>(key(orgId), []);
    const updated = docs.map((d) =>
      d.id === id ? { ...d, deletedAt: undefined } : d,
    );
    setItem(key(orgId), updated);
    return updated.find((d) => d.id === id)!;
  });
}

export function seedDocuments(orgId: string, data: DocumentMeta[]): Promise<DocumentMeta[]> {
  return simulateAsync(() => {
    setItem(key(orgId), data);
    return data;
  });
}

// --- Blob storage (IndexedDB) ---

const BASE_DB_NAME = 'practiceatlas-docs';
const STORE_NAME = 'documents';
const DB_VERSION = 1;

const dbPromises = new Map<string, Promise<IDBPDatabase>>();

function getDB(orgId: string) {
  const name = `${orgId}:${BASE_DB_NAME}`;
  if (!dbPromises.has(name)) {
    dbPromises.set(name, openDB(name, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    }));
  }
  return dbPromises.get(name)!;
}

export async function saveDocument(orgId: string, file: File, obligationId?: string, _targetUserId?: string): Promise<DocumentMeta> {
  const id = crypto.randomUUID();
  const db = await getDB(orgId);
  const blob = new Blob([await file.arrayBuffer()], { type: file.type });
  await db.put(STORE_NAME, blob, id);

  return {
    id,
    name: file.name,
    type: file.type,
    size: file.size,
    addedAt: new Date().toISOString(),
    obligationId,
  };
}

export async function getDocument(orgId: string, id: string): Promise<Blob | null> {
  const db = await getDB(orgId);
  const blob = await db.get(STORE_NAME, id);
  return blob ?? null;
}

export async function deleteDocument(orgId: string, id: string): Promise<void> {
  const db = await getDB(orgId);
  await db.delete(STORE_NAME, id);
}

export async function getStorageEstimate(_orgId: string): Promise<{ used: number; quota: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    const est = await navigator.storage.estimate();
    return { used: est.usage ?? 0, quota: est.quota ?? 0 };
  }
  return { used: 0, quota: 0 };
}
