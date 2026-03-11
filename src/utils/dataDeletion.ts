const LAPSELESS_PREFIX = 'lapseless-';
const INDEXEDDB_NAME = 'lapseless-docs';

type DataCategory = 'documents' | 'notifications' | 'obligations' | 'pto' | 'checklists';

export type DeletionProvider = {
  deleteAll: () => Promise<void>;
  deleteByCategory: (category: DataCategory) => Promise<void>;
};

const CATEGORY_KEYS: Record<DataCategory, string[]> = {
  documents: ['lapseless-standalone-docs'],
  notifications: ['lapseless-notifications'],
  obligations: ['lapseless-obligations'],
  pto: ['lapseless-pto', 'lapseless-pto-config'],
  checklists: ['lapseless-checklists'],
};

const localDeletionProvider: DeletionProvider = {
  async deleteAll() {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LAPSELESS_PREFIX)) {
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
