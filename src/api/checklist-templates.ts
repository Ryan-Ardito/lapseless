import * as mock from './mock/checklist-templates';
import * as http from './http/checklist-templates';
import { getAppMode } from '../contexts/AppModeContext';

const isDemo = () => getAppMode() === 'demo';

export const getChecklistTemplates = (orgId: string) =>
  isDemo() ? mock.getChecklistTemplates() : http.getChecklistTemplates(orgId);
export const createChecklistTemplate = (orgId: string, data: Parameters<typeof mock.createChecklistTemplate>[0]) =>
  isDemo() ? mock.createChecklistTemplate(data) : http.createChecklistTemplate(orgId, data);
export const updateChecklistTemplate = (orgId: string, id: string, updates: Parameters<typeof mock.updateChecklistTemplate>[1]) =>
  isDemo() ? mock.updateChecklistTemplate(id, updates) : http.updateChecklistTemplate(orgId, id, updates);
export const deleteChecklistTemplate = (orgId: string, id: string) =>
  isDemo() ? mock.deleteChecklistTemplate(id) : http.deleteChecklistTemplate(orgId, id);
export const createTemplateFromChecklist = (orgId: string, checklistId: string, data: Parameters<typeof mock.createTemplateFromChecklist>[1]) =>
  isDemo() ? mock.createTemplateFromChecklist(checklistId, data) : http.createTemplateFromChecklist(orgId, checklistId, data);
