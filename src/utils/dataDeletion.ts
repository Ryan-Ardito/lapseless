import { getAppMode } from '../contexts/AppModeContext';
import { removeItem } from './storage';

const PRACTICE_ATLAS_PREFIX = 'practiceatlas-';
const INDEXEDDB_BASE_NAME = 'practiceatlas-docs';

function getIndexedDBName(): string {
  return getAppMode() === 'demo' ? `demo:${INDEXEDDB_BASE_NAME}` : INDEXEDDB_BASE_NAME;
}

function deleteIndexedDB(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(getIndexedDBName());
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

type DataCategory = 'documents' | 'notifications' | 'obligations' | 'pto' | 'checklists' | 'profile';

export type DeletionProvider = {
  deleteAll: () => Promise<void>;
  deleteByCategory: (category: DataCategory) => Promise<void>;
};

const CATEGORY_KEYS: Record<DataCategory, string[]> = {
  documents: ['practiceatlas-standalone-docs'],
  notifications: ['practiceatlas-notifications'],
  obligations: ['practiceatlas-obligations'],
  pto: ['practiceatlas-pto', 'practiceatlas-pto-config'],
  checklists: ['practiceatlas-checklists'],
  profile: ['practiceatlas-profile'],
};

const localDeletionProvider: DeletionProvider = {
  async deleteAll() {
    const prefix = getAppMode() === 'demo'
      ? `demo:${PRACTICE_ATLAS_PREFIX}`
      : PRACTICE_ATLAS_PREFIX;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }

    await deleteIndexedDB();
  },

  async deleteByCategory(category: DataCategory) {
    const keys = CATEGORY_KEYS[category];
    if (keys) {
      for (const key of keys) {
        removeItem(key);
      }
    }

    if (category === 'documents') {
      await deleteIndexedDB();
    }
  },
};

const providers: DeletionProvider[] = [localDeletionProvider];

export function registerDeletionProvider(p: DeletionProvider): void {
  providers.push(p);
}

export async function deleteAllData(): Promise<void> {
  await Promise.all(providers.map(p => p.deleteAll()));
}

export async function deleteDataByCategory(category: DataCategory): Promise<void> {
  await Promise.all(providers.map(p => p.deleteByCategory(category)));
}
