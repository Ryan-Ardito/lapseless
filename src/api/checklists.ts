import * as mock from './mock/checklists';
import * as http from './http/checklists';
import { getAppMode } from '../contexts/AppModeContext';

const isDemo = () => getAppMode() === 'demo';

export const getChecklists = (orgId: string, userId?: string) =>
  isDemo() ? mock.getChecklists() : http.getChecklists(orgId, userId);
export const createChecklist = (orgId: string, data: Parameters<typeof mock.createChecklist>[0], targetUserId?: string) =>
  isDemo() ? mock.createChecklist(data) : http.createChecklist(orgId, data, targetUserId);
export const updateChecklist = (orgId: string, id: string, updates: Parameters<typeof mock.updateChecklist>[1]) =>
  isDemo() ? mock.updateChecklist(id, updates) : http.updateChecklist(orgId, id, updates);
export const deleteChecklist = (orgId: string, id: string) =>
  isDemo() ? mock.deleteChecklist(id) : http.deleteChecklist(orgId, id);
export const restoreChecklist = (orgId: string, id: string) =>
  isDemo() ? mock.restoreChecklist(id) : http.restoreChecklist(orgId, id);
export const seedChecklists = (orgId: string, data: Parameters<typeof mock.seedChecklists>[0]) =>
  isDemo() ? mock.seedChecklists(data) : http.seedChecklists(orgId, data);
