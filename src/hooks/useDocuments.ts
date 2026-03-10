import { useCallback } from 'react';
import type { DocumentMeta } from '../types/obligation';
import { useLocalStorage } from './useLocalStorage';

export function useDocuments() {
  const [documents, setDocuments] = useLocalStorage<DocumentMeta[]>('lapseless-standalone-docs', []);

  const addDocument = useCallback(
    (doc: DocumentMeta) => {
      setDocuments((prev) => [...prev, doc]);
    },
    [setDocuments],
  );

  const updateDocument = useCallback(
    (id: string, updates: Partial<Pick<DocumentMeta, 'displayName'>>) => {
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      );
    },
    [setDocuments],
  );

  const removeDocument = useCallback(
    (id: string) => {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    },
    [setDocuments],
  );

  return { documents, addDocument, updateDocument, removeDocument };
}
