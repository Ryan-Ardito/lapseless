import * as mock from './mock/documents';
import * as http from './http/documents';
import { getAppMode } from '../contexts/AppModeContext';

const isDemo = () => getAppMode() === 'demo';

export const getDocuments = (orgId: string) =>
  isDemo() ? mock.getDocuments() : http.getDocuments(orgId);
export const addDocument = (orgId: string, doc: Parameters<typeof mock.addDocument>[0]) =>
  isDemo() ? mock.addDocument(doc) : http.addDocument(orgId, doc);
export const updateDocument = (orgId: string, id: string, updates: Parameters<typeof mock.updateDocument>[1]) =>
  isDemo() ? mock.updateDocument(id, updates) : http.updateDocument(orgId, id, updates);
export const removeDocument = (orgId: string, id: string) =>
  isDemo() ? mock.removeDocument(id) : http.removeDocument(orgId, id);
export const restoreDocument = (orgId: string, id: string) =>
  isDemo() ? mock.restoreDocument(id) : http.restoreDocument(orgId, id);
export const seedDocuments = (orgId: string, data: Parameters<typeof mock.seedDocuments>[0]) =>
  isDemo() ? mock.seedDocuments(data) : http.seedDocuments(orgId, data);
