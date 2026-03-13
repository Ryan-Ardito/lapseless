import * as mock from './mock/documents';
import * as http from './http/documents';

const impl = import.meta.env.VITE_API_URL ? http : mock;

export const getDocuments = impl.getDocuments;
export const addDocument = impl.addDocument;
export const updateDocument = impl.updateDocument;
export const removeDocument = impl.removeDocument;
export const restoreDocument = impl.restoreDocument;
export const seedDocuments = impl.seedDocuments;
