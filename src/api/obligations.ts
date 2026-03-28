import * as mock from './mock/obligations';
import * as http from './http/obligations';
import { getAppMode } from '../contexts/AppModeContext';

const isDemo = () => getAppMode() === 'demo';

export const getObligations = (orgId: string) =>
  isDemo() ? mock.getObligations() : http.getObligations(orgId);
export const createObligation = (orgId: string, data: Parameters<typeof mock.createObligation>[0]) =>
  isDemo() ? mock.createObligation(data) : http.createObligation(orgId, data);
export const updateObligation = (orgId: string, id: string, updates: Parameters<typeof mock.updateObligation>[1]) =>
  isDemo() ? mock.updateObligation(id, updates) : http.updateObligation(orgId, id, updates);
export const deleteObligation = (orgId: string, id: string) =>
  isDemo() ? mock.deleteObligation(id) : http.deleteObligation(orgId, id);
export const restoreObligation = (orgId: string, id: string) =>
  isDemo() ? mock.restoreObligation(id) : http.restoreObligation(orgId, id);
export const toggleObligationComplete = (orgId: string, id: string) =>
  isDemo() ? mock.toggleObligationComplete(id) : http.toggleObligationComplete(orgId, id);
export const seedObligations = (orgId: string, data: Parameters<typeof mock.seedObligations>[0]) =>
  isDemo() ? mock.seedObligations(data) : http.seedObligations(orgId, data);
