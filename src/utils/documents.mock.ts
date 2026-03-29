import { openDB, type IDBPDatabase } from 'idb';
import type { DocumentMeta } from '../types/obligation';
import { getAppMode } from '../contexts/AppModeContext';

const BASE_DB_NAME = 'practiceatlas-docs';
const STORE_NAME = 'documents';
const DB_VERSION = 1;

const dbPromises = new Map<string, Promise<IDBPDatabase>>();

function getDBName(): string {
  return getAppMode() === 'demo' ? `demo:${BASE_DB_NAME}` : BASE_DB_NAME;
}

function getDB() {
  const name = getDBName();
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

export async function saveDocument(file: File, obligationId?: string): Promise<DocumentMeta> {
  const id = crypto.randomUUID();
  const db = await getDB();
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

export async function getDocument(id: string): Promise<Blob | null> {
  const db = await getDB();
  const blob = await db.get(STORE_NAME, id);
  return blob ?? null;
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function getStorageEstimate(): Promise<{ used: number; quota: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    const est = await navigator.storage.estimate();
    return { used: est.usage ?? 0, quota: est.quota ?? 0 };
  }
  return { used: 0, quota: 0 };
}
