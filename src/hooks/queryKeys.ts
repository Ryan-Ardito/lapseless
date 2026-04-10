export const queryKeys = {
  // Org-scoped keys (with optional userId for view-as support)
  obligations: (orgId: string, userId?: string) =>
    userId ? ['org', orgId, 'obligations', 'user', userId] as const : ['org', orgId, 'obligations'] as const,
  ptoEntries: (orgId: string, userId?: string) =>
    userId ? ['org', orgId, 'pto', 'entries', 'user', userId] as const : ['org', orgId, 'pto', 'entries'] as const,
  ptoConfig: (orgId: string, userId?: string) =>
    userId ? ['org', orgId, 'pto', 'config', 'user', userId] as const : ['org', orgId, 'pto', 'config'] as const,
  orgPtoConfig: (orgId: string) => ['org', orgId, 'pto', 'org-config'] as const,
  checklists: (orgId: string, userId?: string) =>
    userId ? ['org', orgId, 'checklists', 'user', userId] as const : ['org', orgId, 'checklists'] as const,
  checklistTemplates: (orgId: string) => ['org', orgId, 'checklistTemplates'] as const,
  documents: (orgId: string, userId?: string) =>
    userId ? ['org', orgId, 'documents', 'user', userId] as const : ['org', orgId, 'documents'] as const,
  notifications: (orgId: string) => ['org', orgId, 'notifications'] as const,
  history: (orgId: string, userId?: string) =>
    userId ? ['org', orgId, 'history', 'user', userId] as const : ['org', orgId, 'history'] as const,
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
