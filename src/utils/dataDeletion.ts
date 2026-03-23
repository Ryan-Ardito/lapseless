const PRACTICE_ATLAS_PREFIX = 'practiceatlas-';
const INDEXEDDB_NAME = 'practiceatlas-docs';

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
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PRACTICE_ATLAS_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }

    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(INDEXEDDB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
  },

  async deleteByCategory(category: DataCategory) {
    const keys = CATEGORY_KEYS[category];
    if (keys) {
      for (const key of keys) {
        localStorage.removeItem(key);
      }
    }

    if (category === 'documents') {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase(INDEXEDDB_NAME);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        req.onblocked = () => resolve();
      });
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
