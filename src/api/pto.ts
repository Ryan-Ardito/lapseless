import * as mock from './mock/pto';
import * as http from './http/pto';
import { getAppMode } from '../contexts/AppModeContext';

const isDemo = () => getAppMode() === 'demo';

export const getPTOEntries = (orgId: string, year?: number, userId?: string) =>
  isDemo() ? mock.getPTOEntries(year) : http.getPTOEntries(orgId, year, userId);
export const getPTOConfig = (orgId: string, year?: number, userId?: string) =>
  isDemo() ? mock.getPTOConfig(year) : http.getPTOConfig(orgId, year, userId);
export const createPTOEntry = (orgId: string, data: Parameters<typeof mock.createPTOEntry>[0], targetUserId?: string) =>
  isDemo() ? mock.createPTOEntry(data) : http.createPTOEntry(orgId, data, targetUserId);
export const updatePTOEntry = (orgId: string, id: string, updates: Parameters<typeof mock.updatePTOEntry>[1]) =>
  isDemo() ? mock.updatePTOEntry(id, updates) : http.updatePTOEntry(orgId, id, updates);
export const deletePTOEntry = (orgId: string, id: string) =>
  isDemo() ? mock.deletePTOEntry(id) : http.deletePTOEntry(orgId, id);
export const restorePTOEntry = (orgId: string, id: string) =>
  isDemo() ? mock.restorePTOEntry(id) : http.restorePTOEntry(orgId, id);
export const updatePTOConfig = (orgId: string, updates: Parameters<typeof mock.updatePTOConfig>[0], targetUserId?: string) =>
  isDemo() ? mock.updatePTOConfig(updates) : http.updatePTOConfig(orgId, updates, targetUserId);
export const seedPTOEntries = (orgId: string, data: Parameters<typeof mock.seedPTOEntries>[0]) =>
  isDemo() ? mock.seedPTOEntries(data) : http.seedPTOEntries(orgId, data);
