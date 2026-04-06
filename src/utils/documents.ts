import * as mock from './documents.mock';
import * as http from './documents.http';
import { getAppMode } from '../contexts/AppModeContext';

const isDemo = () => getAppMode() === 'demo';

export const saveDocument = (orgId: string, file: File, obligationId?: string, targetUserId?: string) =>
  isDemo() ? mock.saveDocument(file, obligationId) : http.saveDocument(orgId, file, obligationId, targetUserId);
export const getDocument = (orgId: string, id: string) =>
  isDemo() ? mock.getDocument(id) : http.getDocument(orgId, id);
export const deleteDocument = (orgId: string, id: string) =>
  isDemo() ? mock.deleteDocument(id) : http.deleteDocument(orgId, id);
export const getStorageEstimate = (orgId: string) =>
  isDemo() ? mock.getStorageEstimate() : http.getStorageEstimate(orgId);
