import { apiFetch } from './client';
import type { OrgMembership, OrgMember, OrgInvite, InvitePreview } from '../../types/org';

export function getUserOrgs(): Promise<OrgMembership[]> {
  return apiFetch('/api/orgs');
}

export function createOrg(name: string): Promise<{ id: string; name: string }> {
  return apiFetch('/api/orgs', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  return apiFetch(`/api/orgs/${orgId}/members`);
}

export function updateMemberRole(orgId: string, memberId: string, role: string): Promise<OrgMember> {
  return apiFetch(`/api/orgs/${orgId}/members/${memberId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export function removeMember(orgId: string, memberId: string): Promise<void> {
  return apiFetch(`/api/orgs/${orgId}/members/${memberId}`, { method: 'DELETE' });
}

export function getOrgInvites(orgId: string): Promise<OrgInvite[]> {
  return apiFetch(`/api/orgs/${orgId}/invites`);
}

export function createInvite(orgId: string, email: string, role: string): Promise<OrgInvite> {
  return apiFetch(`/api/orgs/${orgId}/invites`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export function revokeInvite(orgId: string, inviteId: string): Promise<void> {
  return apiFetch(`/api/orgs/${orgId}/invites/${inviteId}`, { method: 'DELETE' });
}

export function getInvitePreview(token: string): Promise<InvitePreview> {
  return apiFetch(`/api/invites/${token}`);
}

export function acceptInvite(token: string): Promise<{ orgId: string; role: string }> {
  return apiFetch(`/api/invites/${token}/accept`, { method: 'POST' });
}
