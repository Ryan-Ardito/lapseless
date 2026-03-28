import { useState, useEffect } from 'react';
import {
  Paper, Text, Group, Badge, Button, Stack, TextInput, Select, Progress,
  Modal, Avatar, Menu, Loader, Alert, Divider,
} from '@mantine/core';
import {
  IconUsers, IconUserPlus, IconDots, IconArrowsExchange, IconTrash,
  IconShield, IconCrown, IconAlertTriangle,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { useOrgContext } from '../../contexts/OrgContext';
import { useOrgMembers } from '../../hooks/useOrgMembers';
import { useOrgInvites } from '../../hooks/useOrgInvites';
import { getSubscriptionStatus, type SubscriptionStatus } from '../../api/http/stripe';
import type { OrgRole, OrgMember } from '../../types/org';

const ROLE_COLORS: Record<OrgRole, string> = {
  owner: 'green',
  admin: 'blue',
  member: 'gray',
};

function usageBarColor(pct: number): string {
  if (pct >= 100) return 'red';
  if (pct >= 80) return 'orange';
  if (pct >= 60) return 'yellow';
  return 'green';
}

export function TeamSection() {
  const { orgId, isOwner, canManageMembers, userRole } = useOrgContext();
  const { members, isLoading: membersLoading, updateRole, removeMember, transferOwnership, isUpdatingRole, isRemoving, isTransferring } = useOrgMembers(orgId);
  const { invites, isLoading: invitesLoading, createInvite, revokeInvite, isCreating, revokingId } = useOrgInvites(orgId);

  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('member');
  const [roleChangeTarget, setRoleChangeTarget] = useState<{ member: OrgMember; newRole: string } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<OrgMember | null>(null);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferConfirm, setTransferConfirm] = useState('');

  useEffect(() => {
    getSubscriptionStatus(orgId).then(setStatus).catch(() => {});
  }, [orgId]);

  const seatLimit = status?.limits.seatsPerOrg ?? 0;
  const pendingCount = invites.filter((i) => i.status === 'pending').length;
  const seatUsed = members.length + pendingCount;
  const seatPct = seatLimit > 0 ? (seatUsed / seatLimit) * 100 : 0;
  const atSeatLimit = seatLimit > 0 && seatUsed >= seatLimit;

  const nonOwnerMembers = members.filter((m) => m.role !== 'owner');

  async function handleInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    try {
      await createInvite(email, inviteRole);
      setInviteEmail('');
      setInviteRole('member');
      toast.success(`Invitation sent to ${email}`);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to send invitation');
    }
  }

  async function handleRoleChange() {
    if (!roleChangeTarget) return;
    try {
      await updateRole(roleChangeTarget.member.id, roleChangeTarget.newRole);
      toast.success(`${roleChangeTarget.member.name} is now ${roleChangeTarget.newRole}`);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to change role');
    }
    setRoleChangeTarget(null);
  }

  async function handleRemoveMember() {
    if (!removeTarget) return;
    try {
      await removeMember(removeTarget.id);
      toast.success(`${removeTarget.name} has been removed`);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to remove member');
    }
    setRemoveTarget(null);
  }

  async function handleTransfer() {
    if (!transferTarget) return;
    try {
      await transferOwnership(transferTarget);
      toast.success('Ownership transferred');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to transfer ownership');
    }
    setTransferTarget(null);
    setTransferModalOpen(false);
    setTransferConfirm('');
  }

  async function handleRevokeInvite(inviteId: string) {
    try {
      await revokeInvite(inviteId);
      toast.success('Invitation revoked');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to revoke invitation');
    }
  }

  function canModifyMember(target: OrgMember): boolean {
    if (target.role === 'owner') return false;
    if (userRole === 'owner') return true;
    if (userRole === 'admin' && target.role === 'member') return true;
    return false;
  }

  const transferTargetMember = nonOwnerMembers.find((m) => m.userId === transferTarget);

  return (
    <>
      <Paper p="md" radius="md" withBorder>
        <Group mb="md" justify="space-between">
          <Group gap="xs">
            <IconUsers size={20} />
            <Text fw={600}>Team</Text>
          </Group>
          {seatLimit > 0 && (
            <Badge variant="light" color={usageBarColor(seatPct)} size="sm">
              {seatUsed} / {seatLimit} seats
            </Badge>
          )}
        </Group>

        {seatLimit > 0 && (
          <Progress
            value={Math.min(seatPct, 100)}
            size="sm"
            radius="xl"
            color={usageBarColor(seatPct)}
            mb="md"
          />
        )}

        {membersLoading ? (
          <Group justify="center" py="xl">
            <Loader size="sm" />
          </Group>
        ) : (
          <Stack gap="sm">
            {members.map((member) => (
              <Group key={member.id} justify="space-between" py={4}>
                <Group gap="sm">
                  <Avatar size="sm" radius="xl" src={member.avatarUrl} color="initials" name={member.name} />
                  <Stack gap={0}>
                    <Group gap="xs">
                      <Text size="sm" fw={500}>{member.name}</Text>
                      {member.role === 'owner' && <IconCrown size={14} color="var(--mantine-color-yellow-6)" />}
                      <Badge size="xs" color={ROLE_COLORS[member.role]} variant="light">
                        {member.role}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">{member.email}</Text>
                  </Stack>
                </Group>

                {canManageMembers && canModifyMember(member) && (
                  <Menu position="bottom-end" withArrow>
                    <Menu.Target>
                      <Button variant="subtle" size="xs" px={6}>
                        <IconDots size={16} />
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconShield size={14} />}
                        onClick={() => setRoleChangeTarget({
                          member,
                          newRole: member.role === 'admin' ? 'member' : 'admin',
                        })}
                      >
                        {member.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconTrash size={14} />}
                        color="red"
                        onClick={() => setRemoveTarget(member)}
                      >
                        Remove
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                )}
              </Group>
            ))}
          </Stack>
        )}

        {canManageMembers && (
          <>
            <Divider my="md" />

            <Group gap="xs" mb="sm">
              <IconUserPlus size={18} />
              <Text fw={600} size="sm">Invite Member</Text>
            </Group>

            {atSeatLimit && (
              <Alert color="orange" icon={<IconAlertTriangle size={16} />} mb="sm">
                Seat limit reached. Upgrade your plan to invite more members.
              </Alert>
            )}

            <Group align="end">
              <TextInput
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && !atSeatLimit && handleInvite()}
                style={{ flex: 1 }}
                disabled={atSeatLimit}
              />
              <Select
                value={inviteRole}
                onChange={(v) => setInviteRole(v ?? 'member')}
                data={[
                  { value: 'member', label: 'Member' },
                  { value: 'admin', label: 'Admin' },
                ]}
                w={120}
                disabled={atSeatLimit}
              />
              <Button
                onClick={handleInvite}
                loading={isCreating}
                disabled={!inviteEmail.trim() || atSeatLimit}
              >
                Invite
              </Button>
            </Group>

            {(invitesLoading || invites.length > 0) && (
              <Stack gap="sm" mt="md">
                <Text size="sm" fw={500} c="dimmed">Pending Invitations</Text>
                {invitesLoading ? (
                  <Loader size="xs" />
                ) : invites.length === 0 ? (
                  <Text size="sm" c="dimmed">No pending invitations</Text>
                ) : (
                  invites.map((invite) => (
                    <Group key={invite.id} justify="space-between" py={4}>
                      <Group gap="sm">
                        <Text size="sm">{invite.email}</Text>
                        <Badge size="xs" color={ROLE_COLORS[invite.role]} variant="light">
                          {invite.role}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          Expires {new Date(invite.expiresAt).toLocaleDateString()}
                        </Text>
                      </Group>
                      <Button
                        variant="subtle"
                        color="red"
                        size="xs"
                        onClick={() => handleRevokeInvite(invite.id)}
                        loading={revokingId === invite.id}
                      >
                        Revoke
                      </Button>
                    </Group>
                  ))
                )}
              </Stack>
            )}
          </>
        )}

        {isOwner && nonOwnerMembers.length > 0 && (
          <>
            <Divider my="md" />

            <Group gap="xs" mb="sm">
              <IconArrowsExchange size={18} />
              <Text fw={600} size="sm">Transfer Ownership</Text>
            </Group>
            <Text size="sm" c="dimmed" mb="sm">
              Transfer ownership of this organization to another member. You will be demoted to admin.
            </Text>
            <Group align="end">
              <Select
                placeholder="Select new owner"
                data={nonOwnerMembers.map((m) => ({
                  value: m.userId,
                  label: `${m.name} (${m.email})`,
                }))}
                value={transferTarget}
                onChange={setTransferTarget}
                clearable
                style={{ flex: 1 }}
              />
              <Button
                color="red"
                variant="outline"
                leftSection={<IconArrowsExchange size={16} />}
                onClick={() => setTransferModalOpen(true)}
                disabled={!transferTarget}
              >
                Transfer
              </Button>
            </Group>
          </>
        )}

        {isOwner && nonOwnerMembers.length === 0 && !membersLoading && (
          <>
            <Divider my="md" />
            <Text size="sm" c="dimmed">
              No other members to transfer ownership to. Invite members first.
            </Text>
          </>
        )}
      </Paper>

      {/* Role change confirmation */}
      <Modal
        opened={!!roleChangeTarget}
        onClose={() => setRoleChangeTarget(null)}
        title="Change Member Role"
        centered
      >
        {roleChangeTarget && (
          <Stack gap="md">
            <Text size="sm">
              Change <Text span fw={600}>{roleChangeTarget.member.name}</Text>'s role
              from {roleChangeTarget.member.role} to <Text span fw={600}>{roleChangeTarget.newRole}</Text>?
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setRoleChangeTarget(null)}>Cancel</Button>
              <Button onClick={handleRoleChange} loading={isUpdatingRole}>
                Change Role
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Remove member confirmation */}
      <Modal
        opened={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove Member"
        centered
      >
        {removeTarget && (
          <Stack gap="md">
            <Text size="sm">
              Remove <Text span fw={600}>{removeTarget.name}</Text> from this organization?
              They will need a new invitation to rejoin.
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setRemoveTarget(null)}>Cancel</Button>
              <Button color="red" onClick={handleRemoveMember} loading={isRemoving}>
                Remove
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Transfer ownership confirmation */}
      <Modal
        opened={transferModalOpen}
        onClose={() => { setTransferModalOpen(false); setTransferConfirm(''); }}
        title="Transfer Ownership"
        centered
      >
        {transferTarget && transferTargetMember && (
          <Stack gap="md">
            <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
              This will make <Text span fw={600}>{transferTargetMember.name}</Text> the owner
              and demote you to admin. This cannot be undone. The new owner's subscription plan
              will determine future limits for this organization (seats, storage, etc.).
            </Alert>
            <TextInput
              label='Type "TRANSFER" to confirm'
              value={transferConfirm}
              onChange={(e) => setTransferConfirm(e.currentTarget.value)}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => { setTransferModalOpen(false); setTransferConfirm(''); }}>
                Cancel
              </Button>
              <Button
                color="red"
                onClick={handleTransfer}
                loading={isTransferring}
                disabled={transferConfirm !== 'TRANSFER'}
              >
                Transfer Ownership
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}
