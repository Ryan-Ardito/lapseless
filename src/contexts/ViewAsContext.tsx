import { createContext, useContext, type ReactNode } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useOrgContext } from './OrgContext';
import { useOrgMembers } from '../hooks/useOrgMembers';

interface ViewAsContextValue {
  viewAsUserId: string | undefined;
  viewAsUserName: string | undefined;
  isViewingAsOther: boolean;
  setViewAs: (userId: string) => void;
  clearViewAs: () => void;
}

const ViewAsContext = createContext<ViewAsContextValue | null>(null);

const defaultValue: ViewAsContextValue = {
  viewAsUserId: undefined,
  viewAsUserName: undefined,
  isViewingAsOther: false,
  setViewAs: () => {},
  clearViewAs: () => {},
};

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const { canManageMembers, orgId } = useOrgContext();
  const navigate = useNavigate();

  // Read viewAs from search params (works across all child routes)
  let viewAs: string | undefined;
  try {
    const search = useSearch({ strict: false }) as { viewAs?: string };
    viewAs = search.viewAs;
  } catch {
    viewAs = undefined;
  }

  // Only admin/owner can view as another user
  const activeViewAs = canManageMembers ? viewAs : undefined;

  // Fetch members to resolve the viewed user's name (only when admin/owner)
  const { members } = useOrgMembers(canManageMembers ? orgId : '');
  const viewedMember = activeViewAs
    ? members.find((m) => m.userId === activeViewAs)
    : undefined;

  const value: ViewAsContextValue = {
    viewAsUserId: activeViewAs,
    viewAsUserName: viewedMember?.name ?? viewedMember?.email,
    isViewingAsOther: !!activeViewAs,
    setViewAs: (userId: string) => {
      navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, viewAs: userId }) } as any);
    },
    clearViewAs: () => {
      navigate({ search: (prev: Record<string, unknown>) => {
        const { viewAs: _, ...rest } = prev;
        return rest;
      }} as any);
    },
  };

  return <ViewAsContext.Provider value={value}>{children}</ViewAsContext.Provider>;
}

export function useViewAs(): ViewAsContextValue {
  const ctx = useContext(ViewAsContext);
  return ctx ?? defaultValue;
}
