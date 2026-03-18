import * as mock from './documents.mock';
import * as http from './documents.http';
import { getAppMode } from '../contexts/AppModeContext';

const getImpl = () => (getAppMode() === 'demo' ? mock : http);

export const saveDocument: typeof mock.saveDocument = (...args) => getImpl().saveDocument(...args);
export const getDocument: typeof mock.getDocument = (...args) => getImpl().getDocument(...args);
export const deleteDocument: typeof mock.deleteDocument = (...args) => getImpl().deleteDocument(...args);
export const getStorageEstimate: typeof mock.getStorageEstimate = (...args) => getImpl().getStorageEstimate(...args);
