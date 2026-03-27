import { createContext, useContext, type ReactNode } from 'react';
import type { OrgRole } from '../types/org';

interface OrgContextValue {
  orgId: string;
  orgName: string;
  userRole: OrgRole;
  isOwner: boolean;
  canEdit: boolean;
  canManageMembers: boolean;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({
  orgId,
  orgName,
  userRole,
  children,
}: {
  orgId: string;
  orgName: string;
  userRole: OrgRole;
  children: ReactNode;
}) {
  const value: OrgContextValue = {
    orgId,
    orgName,
    userRole,
    isOwner: userRole === 'owner',
    canEdit: userRole !== 'viewer',
    canManageMembers: userRole === 'admin' || userRole === 'owner',
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrgContext(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrgContext must be used within an OrgProvider');
  return ctx;
}
