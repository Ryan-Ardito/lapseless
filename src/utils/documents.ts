import * as mock from './documents.mock';
import * as http from './documents.http';

const impl = import.meta.env.VITE_API_URL ? http : mock;

export const saveDocument = impl.saveDocument;
export const getDocument = impl.getDocument;
export const deleteDocument = impl.deleteDocument;
export const getStorageEstimate = impl.getStorageEstimate;
