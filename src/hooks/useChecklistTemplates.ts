import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../contexts/ApiContext';
import { queryKeys } from './queryKeys';
import { useOrgContext } from '../contexts/OrgContext';
import { notify } from '../utils/notify';

export function useChecklistTemplates() {
  const api = useApi();
  const qc = useQueryClient();
  const { orgId } = useOrgContext();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: queryKeys.checklistTemplates(orgId),
    queryFn: () => api.getChecklistTemplates(orgId),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; items: string[]; isOrg?: boolean }) =>
      api.createChecklistTemplate(orgId, data),
    onSuccess: () => {
      notify.success('Template created');
      qc.invalidateQueries({ queryKey: queryKeys.checklistTemplates(orgId) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { name?: string; items?: string[] } }) =>
      api.updateChecklistTemplate(orgId, id, updates),
    onSuccess: () => {
      notify.success('Template updated');
      qc.invalidateQueries({ queryKey: queryKeys.checklistTemplates(orgId) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteChecklistTemplate(orgId, id),
    onSuccess: () => {
      notify.success('Template deleted');
      qc.invalidateQueries({ queryKey: queryKeys.checklistTemplates(orgId) });
    },
  });

  const saveFromChecklistMutation = useMutation({
    mutationFn: ({ checklistId, name, items, isOrg }: { checklistId: string; name: string; items: string[]; isOrg?: boolean }) =>
      api.createTemplateFromChecklist(orgId, checklistId, { name, items, isOrg }),
    onSuccess: () => {
      notify.success('Saved as template');
      qc.invalidateQueries({ queryKey: queryKeys.checklistTemplates(orgId) });
    },
  });

  return {
    templates,
    isLoading,
    createTemplate: createMutation.mutateAsync,
    updateTemplate: (id: string, updates: { name?: string; items?: string[] }) =>
      updateMutation.mutateAsync({ id, updates }),
    deleteTemplate: deleteMutation.mutateAsync,
    saveFromChecklist: saveFromChecklistMutation.mutateAsync,
  };
}
