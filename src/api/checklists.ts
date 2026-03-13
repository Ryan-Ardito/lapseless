import * as mock from './mock/checklists';
import * as http from './http/checklists';

const impl = import.meta.env.VITE_API_URL ? http : mock;

export const getChecklists = impl.getChecklists;
export const createChecklist = impl.createChecklist;
export const updateChecklist = impl.updateChecklist;
export const deleteChecklist = impl.deleteChecklist;
export const restoreChecklist = impl.restoreChecklist;
export const seedChecklists = impl.seedChecklists;
