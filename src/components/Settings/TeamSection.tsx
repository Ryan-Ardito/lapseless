import { useEffect, useState } from 'react';
import {
  Paper, Text, Group, Badge, Button, Stack, TextInput, Select, Progress,
  Modal, Avatar, Menu, Loader, Alert, Divider, NumberInput,
} from '@mantine/core';
import {
  IconUsers, IconUserPlus, IconDots, IconArrowsExchange, IconTrash,
  IconShield, IconCrown, IconAlertTriangle, IconBeach,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { notify } from '../../utils/notify';
import { useOrgContext } from '../../contexts/OrgContext';
import { useOrgMembers } from '../../hooks/useOrgMembers';
import { useOrgInvites } from '../../hooks/useOrgInvites';
import { useSubscriptionStatus } from '../../hooks/useSubscriptionStatus';
import { useOrgPTOConfig } from '../../hooks/useOrgPTOConfig';
import { queryKeys } from '../../hooks/queryKeys';
import { useApi } from '../../contexts/ApiContext';
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
  const api = useApi();
  const { orgId, isOwner, canManageMembers, userRole } = useOrgContext();
  const { members, isLoading: membersLoading, updateRole, removeMember, transferOwnership, isUpdatingRole, isRemoving, isTransferring } = useOrgMembers(orgId);
  const { invites, isLoading: invitesLoading, createInvite, revokeInvite, isCreating, revokingId } = useOrgInvites(orgId);
  const {
    defaultYearlyAllowance: orgDefaultPto,
    isLoading: orgPtoLoading,
    updateDefault: updateOrgDefaultPto,
    isUpdating: isUpdatingOrgDefaultPto,
  } = useOrgPTOConfig(orgId);
  const qc = useQueryClient();

  const { status } = useSubscriptionStatus(orgId);
  const [inviteEmail, setInviteEmail] = useState('');

  const [inviteRole, setInviteRole] = useState<string>('member');
  const [roleChangeTarget, setRoleChangeTarget] = useState<{ member: OrgMember; newRole: string } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<OrgMember | null>(null);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferConfirm, setTransferConfirm] = useState('');

  const [orgPtoDraft, setOrgPtoDraft] = useState<number | string>(orgDefaultPto);
  useEffect(() => { setOrgPtoDraft(orgDefaultPto); }, [orgDefaultPto]);

  const [ptoTarget, setPtoTarget] = useState<OrgMember | null>(null);
  const [ptoDraft, setPtoDraft] = useState<number | string>(160);
  const [ptoLoading, setPtoLoading] = useState(false);
  const [ptoSaving, setPtoSaving] = useState(false);
  const ptoYear = new Date().getFullYear();

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
      notify.success(`Invitation sent to ${email}`);
    } catch (err: any) {
      notify.error(err.message ?? 'Failed to send invitation');
    }
  }

  async function handleRoleChange() {
    if (!roleChangeTarget) return;
    try {
      await updateRole(roleChangeTarget.member.id, roleChangeTarget.newRole);
      notify.success(`${roleChangeTarget.member.name} is now ${roleChangeTarget.newRole}`);
    } catch (err: any) {
      notify.error(err.message ?? 'Failed to change role');
    }
    setRoleChangeTarget(null);
  }

  async function handleRemoveMember() {
    if (!removeTarget) return;
    try {
      await removeMember(removeTarget.id);
      notify.success(`${removeTarget.name} has been removed`);
    } catch (err: any) {
      notify.error(err.message ?? 'Failed to remove member');
    }
    setRemoveTarget(null);
  }

  async function handleTransfer() {
    if (!transferTarget) return;
    try {
      await transferOwnership(transferTarget);
      notify.success('Ownership transferred');
    } catch (err: any) {
      notify.error(err.message ?? 'Failed to transfer ownership');
    }
    setTransferTarget(null);
    setTransferModalOpen(false);
    setTransferConfirm('');
  }

  async function handleRevokeInvite(inviteId: string) {
    try {
      await revokeInvite(inviteId);
      notify.success('Invitation revoked');
    } catch (err: any) {
      notify.error(err.message ?? 'Failed to revoke invitation');
    }
  }

  function canModifyMember(target: OrgMember): boolean {
    if (target.role === 'owner') return false;
    if (userRole === 'owner') return true;
    if (userRole === 'admin' && target.role === 'member') return true;
    return false;
  }

  // Admin+ can edit any member's PTO allowance, including owners.
  function canEditMemberPto(_target: OrgMember): boolean {
    return canManageMembers;
  }

  async function handleSaveOrgPtoDefault() {
    const value = typeof orgPtoDraft === 'number' ? orgPtoDraft : parseInt(String(orgPtoDraft), 10);
    if (!Number.isFinite(value) || value < 0) {
      notify.error('Allowance must be a non-negative number');
      return;
    }
    try {
      await updateOrgDefaultPto(value);
      notify.success('Default PTO allowance updated');
    } catch (err: any) {
      notify.error(err.message ?? 'Failed to update default PTO allowance');
    }
  }

  async function openPtoEditor(member: OrgMember) {
    setPtoTarget(member);
    setPtoLoading(true);
    try {
      const config = await api.getPTOConfig(orgId, ptoYear, member.userId);
      setPtoDraft(config.yearlyAllowance);
    } catch (err: any) {
      notify.error(err.message ?? 'Failed to load PTO allowance');
      setPtoDraft(orgDefaultPto);
    } finally {
      setPtoLoading(false);
    }
  }

  async function handleSaveMemberPto() {
    if (!ptoTarget) return;
    const value = typeof ptoDraft === 'number' ? ptoDraft : parseInt(String(ptoDraft), 10);
    if (!Number.isFinite(value) || value < 0) {
      notify.error('Allowance must be a non-negative number');
      return;
    }
    setPtoSaving(true);
    try {
      await api.updatePTOConfig(
        orgId,
        { yearlyAllowance: value, year: ptoYear },
        ptoTarget.userId,
      );
      qc.invalidateQueries({ queryKey: queryKeys.ptoConfig(orgId, ptoTarget.userId) });
      qc.invalidateQueries({ queryKey: queryKeys.ptoConfig(orgId) });
      notify.success(`Updated ${ptoTarget.name}'s PTO allowance`);
      setPtoTarget(null);
    } catch (err: any) {
      notify.error(err.message ?? 'Failed to update PTO allowance');
    } finally {
      setPtoSaving(false);
    }
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

                {canManageMembers && (canModifyMember(member) || canEditMemberPto(member)) && (
                  <Menu position="bottom-end" withArrow>
                    <Menu.Target>
                      <Button variant="subtle" size="xs" px={6}>
                        <IconDots size={16} />
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      {canEditMemberPto(member) && (
                        <Menu.Item
                          leftSection={<IconBeach size={14} />}
                          onClick={() => openPtoEditor(member)}
                        >
                          Set PTO allowance
                        </Menu.Item>
                      )}
                      {canModifyMember(member) && (
                        <>
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
                        </>
                      )}
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
                data={isOwner
                  ? [{ value: 'member', label: 'Member' }, { value: 'admin', label: 'Admin' }]
                  : [{ value: 'member', label: 'Member' }]
                }
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

        {canManageMembers && (
          <>
            <Divider my="md" />
            <Group gap="xs" mb="sm">
              <IconBeach size={18} />
              <Text fw={600} size="sm">Default PTO Allowance</Text>
            </Group>
            <Text size="sm" c="dimmed" mb="sm">
              Yearly PTO hours given to members who don't have a per-member override.
            </Text>
            <Group align="end">
              <NumberInput
                value={orgPtoDraft}
                onChange={setOrgPtoDraft}
                min={0}
                max={8760}
                step={8}
                disabled={orgPtoLoading}
                style={{ flex: 1, maxWidth: 200 }}
                suffix=" hours"
              />
              <Button
                onClick={handleSaveOrgPtoDefault}
                loading={isUpdatingOrgDefaultPto}
                disabled={orgPtoLoading || Number(orgPtoDraft) === orgDefaultPto}
              >
                Save
              </Button>
            </Group>
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

      {/* Per-member PTO allowance editor */}
      <Modal
        opened={!!ptoTarget}
        onClose={() => setPtoTarget(null)}
        title="Set PTO Allowance"
        centered
      >
        {ptoTarget && (
          <Stack gap="md">
            <Text size="sm">
              Yearly PTO allowance for <Text span fw={600}>{ptoTarget.name}</Text> in {ptoYear}.
            </Text>
            {ptoLoading ? (
              <Group justify="center" py="md">
                <Loader size="sm" />
              </Group>
            ) : (
              <NumberInput
                label="Yearly Allowance (hours)"
                value={ptoDraft}
                onChange={setPtoDraft}
                min={0}
                max={8760}
                step={8}
              />
            )}
            <Text size="xs" c="dimmed">
              Org default is {orgDefaultPto} hours. Setting a value here overrides the default for this member.
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setPtoTarget(null)}>Cancel</Button>
              <Button onClick={handleSaveMemberPto} loading={ptoSaving} disabled={ptoLoading}>
                Save
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}
