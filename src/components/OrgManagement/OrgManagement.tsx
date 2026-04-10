import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  Container,
  Stack,
  Title,
  Paper,
  Text,
  TextInput,
  Button,
  Group,
  Badge,
  Anchor,
  Modal,
  Loader,
  Center,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus,
  IconTrash,
  IconArrowBack,
  IconCheck,
  IconMail,
} from '@tabler/icons-react';
import { notify } from '../../utils/notify';
import { useOrgs } from '../../hooks/useOrgs';
import { useUserInvites } from '../../hooks/useUserInvites';
import type { OrgRole } from '../../types/org';

const ROLE_COLORS: Record<OrgRole, string> = {
  owner: 'green',
  admin: 'blue',
  member: 'gray',
};

export function OrgManagementContent({ onClose, currentOrgId }: { onClose?: () => void; currentOrgId?: string }) {
  const navigate = useNavigate();
  const {
    orgs,
    deletedOrgs,
    isLoading,
    createOrg,
    deleteOrg,
    restoreOrg,
    leaveOrg,
    isCreating,
  } = useOrgs();
  const { invites, isLoading: invitesLoading, acceptInvite, acceptingId, declineInvite, decliningId } = useUserInvites();

  const [newOrgName, setNewOrgName] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string; action: 'delete' | 'leave' } | null>(null);
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);

  async function handleCreate() {
    if (!newOrgName.trim()) return;
    try {
      const org = await createOrg(newOrgName.trim());
      setNewOrgName('');
      notify.success('Organization created');
      onClose?.();
      navigate({ to: `/app/orgs/${org.id}/dashboard` as any });
    } catch (err: any) {
      notify.error(err.message ?? 'Failed to create organization');
    }
  }

  function openConfirmDialog(id: string, name: string, action: 'delete' | 'leave') {
    setConfirmTarget({ id, name, action });
    openConfirm();
  }

  async function handleConfirm() {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.action === 'delete') {
        await deleteOrg(confirmTarget.id);
        notify.success('Organization deleted. You have 30 days to restore it.');
      } else {
        await leaveOrg(confirmTarget.id);
        notify.success('You have left the organization');
      }
    } catch (err: any) {
      notify.error(err.message ?? 'Action failed');
    }
    closeConfirm();
    setConfirmTarget(null);
  }

  async function handleAcceptInvite(inviteId: string) {
    try {
      const result = await acceptInvite(inviteId);
      notify.success('Invitation accepted');
      onClose?.();
      navigate({ to: `/app/orgs/${result.orgId}/dashboard` as any });
    } catch (err: any) {
      notify.error(err.message ?? 'Failed to accept invitation');
    }
  }

  async function handleDeclineInvite(inviteId: string) {
    try {
      await declineInvite(inviteId);
      notify.success('Invitation declined');
    } catch (err: any) {
      notify.error(err.message ?? 'Failed to decline invitation');
    }
  }

  async function handleRestore(orgId: string) {
    try {
      await restoreOrg(orgId);
      notify.success('Organization restored');
    } catch (err: any) {
      notify.error(err.message ?? 'Failed to restore organization');
    }
  }

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  return (
    <>
      <Stack gap="lg">
        {orgs.length === 0 && (
          <Paper p="lg" radius="md" withBorder>
            <Text c="dimmed" ta="center">
              You don't belong to any organizations yet. Create one below or accept a pending invitation.
            </Text>
          </Paper>
        )}

        {orgs.map((org) => {
          const isCurrent = org.id === currentOrgId;
          return (
          <Paper key={org.id} p="md" radius="md" withBorder>
            <Group justify="space-between" align="center">
              <Group gap="sm">
                <Text fw={600}>{org.name}</Text>
                <Badge size="sm" color={ROLE_COLORS[org.role]} variant="light">
                  {org.role}
                </Badge>
                {isCurrent && (
                  <Badge size="sm" color="teal" variant="filled">
                    Current
                  </Badge>
                )}
              </Group>
              <Group gap="xs">
                {!isCurrent && (
                  <Button
                    variant="light"
                    size="xs"
                    onClick={() => {
                      onClose?.();
                      navigate({ to: `/app/orgs/${org.id}/dashboard` as any });
                    }}
                  >
                    Open
                  </Button>
                )}
                {org.role === 'owner' ? (
                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    leftSection={<IconTrash size={14} />}
                    onClick={() => openConfirmDialog(org.id, org.name, 'delete')}
                  >
                    Delete
                  </Button>
                ) : (
                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    onClick={() => openConfirmDialog(org.id, org.name, 'leave')}
                  >
                    Leave
                  </Button>
                )}
              </Group>
            </Group>
          </Paper>
          );
        })}

        <Paper p="md" radius="md" withBorder>
          <Text fw={600} mb="sm">Create Organization</Text>
          <Group>
            <TextInput
              placeholder="Organization name"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              style={{ flex: 1 }}
            />
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleCreate}
              loading={isCreating}
              disabled={!newOrgName.trim()}
            >
              Create
            </Button>
          </Group>
        </Paper>

        {(invitesLoading || invites.length > 0) && (
          <>
            <Title order={3}>
              <Group gap="xs">
                <IconMail size={20} />
                Pending Invitations
                {invites.length > 0 && (
                  <Badge size="sm" color="red" variant="filled">{invites.length}</Badge>
                )}
              </Group>
            </Title>

            {invitesLoading ? (
              <Center><Loader size="sm" /></Center>
            ) : (
              invites.map((invite) => (
                <Paper key={invite.id} p="md" radius="md" withBorder>
                  <Group justify="space-between" align="center">
                    <Stack gap={4}>
                      <Group gap="sm">
                        <Text fw={600}>{invite.orgName}</Text>
                        <Badge size="sm" color={ROLE_COLORS[invite.role]} variant="light">
                          {invite.role}
                        </Badge>
                      </Group>
                      <Text size="sm" c="dimmed">
                        Invited by {invite.inviterName} &middot; Expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </Text>
                    </Stack>
                    <Group gap="xs">
                      <Button
                        variant="subtle"
                        color="gray"
                        size="xs"
                        onClick={() => handleDeclineInvite(invite.id)}
                        loading={decliningId === invite.id}
                        disabled={acceptingId === invite.id}
                      >
                        Decline
                      </Button>
                      <Button
                        leftSection={<IconCheck size={16} />}
                        size="xs"
                        onClick={() => handleAcceptInvite(invite.id)}
                        loading={acceptingId === invite.id}
                        disabled={decliningId === invite.id}
                      >
                        Accept
                      </Button>
                    </Group>
                  </Group>
                </Paper>
              ))
            )}
          </>
        )}

        {deletedOrgs.length > 0 && (
          <>
            <Title order={3}>Deleted Organizations</Title>
            {deletedOrgs.map((org) => {
              const deletedAt = new Date(org.deletedAt);
              const expiresAt = new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
              const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
              return (
                <Paper key={org.id} p="md" radius="md" withBorder style={{ opacity: 0.7 }}>
                  <Group justify="space-between" align="center">
                    <Stack gap={4}>
                      <Text fw={600}>{org.name}</Text>
                      <Text size="sm" c="dimmed">
                        Deleted {deletedAt.toLocaleDateString()} &middot; {daysRemaining} days to restore
                      </Text>
                    </Stack>
                    <Button
                      variant="light"
                      size="xs"
                      leftSection={<IconArrowBack size={14} />}
                      onClick={() => handleRestore(org.id)}
                    >
                      Restore
                    </Button>
                  </Group>
                </Paper>
              );
            })}
          </>
        )}
      </Stack>

      <Modal
        opened={confirmOpened}
        onClose={closeConfirm}
        title={confirmTarget?.action === 'delete' ? 'Delete Organization' : 'Leave Organization'}
        centered
      >
        <Stack>
          <Text>
            {confirmTarget?.action === 'delete'
              ? `Are you sure you want to delete "${confirmTarget?.name}"? You'll have 30 days to restore it before all data is permanently deleted.`
              : `Are you sure you want to leave "${confirmTarget?.name}"? You'll need a new invitation to rejoin.`}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeConfirm}>Cancel</Button>
            <Button color="red" onClick={handleConfirm}>
              {confirmTarget?.action === 'delete' ? 'Delete' : 'Leave'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

export function OrgManagement() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Group gap="xs" align="center">
            <Anchor component={Link} to="/" underline="never" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="/greenlogo.png" alt="The Practice Atlas" style={{ height: 28 }} />
              <Text fw={700} size="lg" c="dark">The Practice Atlas</Text>
            </Anchor>
          </Group>
          <Button variant="subtle" component={Link} to="/app/account" size="xs">
            Account Settings
          </Button>
        </Group>

        <Title order={2}>Your Organizations</Title>

        <OrgManagementContent />
      </Stack>
    </Container>
  );
}
