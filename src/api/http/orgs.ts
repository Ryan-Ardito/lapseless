import { apiFetch } from './client';
import type { OrgMembership, OrgMember, OrgInvite, InvitePreview, DeletedOrg, PendingUserInvite } from '../../types/org';

export async function getUserOrgs(): Promise<{ orgs: OrgMembership[]; deletedOrgs: DeletedOrg[] }> {
  return apiFetch('/api/orgs');
}

export function createOrg(name: string): Promise<{ id: string; name: string }> {
  return apiFetch('/api/orgs', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function deleteOrg(orgId: string): Promise<void> {
  return apiFetch(`/api/orgs/${orgId}`, { method: 'DELETE' });
}

export function restoreOrg(orgId: string): Promise<{ id: string; name: string }> {
  return apiFetch(`/api/orgs/${orgId}/restore`, { method: 'POST' });
}

export function transferOwnership(orgId: string, userId: string): Promise<{ orgId: string; newOwnerId: string }> {
  return apiFetch(`/api/orgs/${orgId}/transfer`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export function leaveOrg(orgId: string): Promise<void> {
  return apiFetch(`/api/orgs/${orgId}/members/leave`, { method: 'POST' });
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

export function getUserPendingInvites(): Promise<PendingUserInvite[]> {
  return apiFetch('/api/user/invites');
}

export function acceptInviteById(inviteId: string): Promise<{ orgId: string; role: string }> {
  return apiFetch(`/api/user/invites/${inviteId}/accept`, { method: 'POST' });
}

export function renameOrg(orgId: string, name: string): Promise<{ id: string; name: string }> {
  return apiFetch(`/api/orgs/${orgId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}
