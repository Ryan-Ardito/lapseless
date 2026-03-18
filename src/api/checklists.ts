import * as mock from './mock/checklists';
import * as http from './http/checklists';
import { getAppMode } from '../contexts/AppModeContext';

const getImpl = () => (getAppMode() === 'demo' ? mock : http);

export const getChecklists: typeof mock.getChecklists = (...args) => getImpl().getChecklists(...args);
export const createChecklist: typeof mock.createChecklist = (...args) => getImpl().createChecklist(...args);
export const updateChecklist: typeof mock.updateChecklist = (...args) => getImpl().updateChecklist(...args);
export const deleteChecklist: typeof mock.deleteChecklist = (...args) => getImpl().deleteChecklist(...args);
export const restoreChecklist: typeof mock.restoreChecklist = (...args) => getImpl().restoreChecklist(...args);
export const seedChecklists: typeof mock.seedChecklists = (...args) => getImpl().seedChecklists(...args);
