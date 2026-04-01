export type OrgRole = 'owner' | 'admin' | 'member';

export interface OrgMembership {
  id: string;
  name: string;
  role: OrgRole;
}

export interface OrgMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: OrgRole;
  joinedAt: string;
}

export interface OrgInvite {
  id: string;
  email: string;
  role: OrgRole;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
  createdAt: string;
}

export interface InvitePreview {
  orgName: string;
  inviterName: string;
  role: OrgRole;
  email: string;
  emailMatch?: boolean;
}

export interface DeletedOrg {
  id: string;
  name: string;
  deletedAt: string;
}

export interface PendingUserInvite {
  id: string;
  organizationId: string;
  orgName: string;
  inviterName: string;
  role: OrgRole;
  email: string;
  expiresAt: string;
}
