import type { DocumentMeta } from '../types/obligation';
import { getItem, setItem, simulateAsync } from './client';

const KEY = 'lapseless-standalone-docs';

export function getDocuments(): Promise<DocumentMeta[]> {
  return simulateAsync(() => getItem<DocumentMeta[]>(KEY, []));
}

export function addDocument(doc: DocumentMeta): Promise<DocumentMeta> {
  return simulateAsync(() => {
    const docs = getItem<DocumentMeta[]>(KEY, []);
    setItem(KEY, [...docs, doc]);
    return doc;
  });
}

export function updateDocument(
  id: string,
  updates: Partial<Pick<DocumentMeta, 'displayName'>>,
): Promise<DocumentMeta> {
  return simulateAsync(() => {
    const docs = getItem<DocumentMeta[]>(KEY, []);
    const updated = docs.map((d) => (d.id === id ? { ...d, ...updates } : d));
    setItem(KEY, updated);
    return updated.find((d) => d.id === id)!;
  });
}

export function removeDocument(id: string): Promise<void> {
  return simulateAsync(() => {
    const docs = getItem<DocumentMeta[]>(KEY, []);
    setItem(KEY, docs.filter((d) => d.id !== id));
  });
}

export function seedDocuments(data: DocumentMeta[]): Promise<DocumentMeta[]> {
  return simulateAsync(() => {
    setItem(KEY, data);
    return data;
  });
}
