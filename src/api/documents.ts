import * as mock from './mock/documents';
import * as http from './http/documents';
import { getAppMode } from '../contexts/AppModeContext';

const getImpl = () => (getAppMode() === 'demo' ? mock : http);

export const getDocuments: typeof mock.getDocuments = (...args) => getImpl().getDocuments(...args);
export const addDocument: typeof mock.addDocument = (...args) => getImpl().addDocument(...args);
export const updateDocument: typeof mock.updateDocument = (...args) => getImpl().updateDocument(...args);
export const removeDocument: typeof mock.removeDocument = (...args) => getImpl().removeDocument(...args);
export const restoreDocument: typeof mock.restoreDocument = (...args) => getImpl().restoreDocument(...args);
export const seedDocuments: typeof mock.seedDocuments = (...args) => getImpl().seedDocuments(...args);
