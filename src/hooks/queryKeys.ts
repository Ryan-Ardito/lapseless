export const queryKeys = {
  // Org-scoped keys
  obligations: (orgId: string) => ['org', orgId, 'obligations'] as const,
  ptoEntries: (orgId: string) => ['org', orgId, 'pto', 'entries'] as const,
  ptoConfig: (orgId: string) => ['org', orgId, 'pto', 'config'] as const,
  checklists: (orgId: string) => ['org', orgId, 'checklists'] as const,
  checklistTemplates: (orgId: string) => ['org', orgId, 'checklistTemplates'] as const,
  documents: (orgId: string) => ['org', orgId, 'documents'] as const,
  notifications: (orgId: string) => ['org', orgId, 'notifications'] as const,
  history: (orgId: string) => ['org', orgId, 'history'] as const,
  subscription: ['subscription'] as const,
  subscriptionStatus: (orgId: string) => ['org', orgId, 'subscriptionStatus'] as const,
  orgMembers: (orgId: string) => ['org', orgId, 'members'] as const,
  orgInvites: (orgId: string) => ['org', orgId, 'invites'] as const,

  // User-scoped keys
  profile: ['profile'] as const,
  settings: ['settings'] as const,
  userOrgs: ['user', 'orgs'] as const,
  userPendingInvites: ['user', 'pendingInvites'] as const,
  authUser: ['auth', 'me'] as const,
};
