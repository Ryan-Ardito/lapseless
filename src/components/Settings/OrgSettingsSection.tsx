import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Paper, Text, Group, Button, Stack, TextInput, Modal, Divider,
} from '@mantine/core';
import { IconSettings, IconTrash, IconLogout } from '@tabler/icons-react';
import { notify } from '../../utils/notify';
import { useOrgContext } from '../../contexts/OrgContext';
import { useOrgs } from '../../hooks/useOrgs';
import { renameOrg } from '../../api/http/orgs';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../hooks/queryKeys';

export function OrgSettingsSection() {
  const { orgId, orgName, userRole, isOwner } = useOrgContext();
  const { deleteOrg, leaveOrg, isDeleting, isLeaving } = useOrgs();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [name, setName] = useState(orgName);
  const [renaming, setRenaming] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  useEffect(() => setName(orgName), [orgName]);

  async function handleRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === orgName) return;
    setRenaming(true);
    try {
      await renameOrg(orgId, trimmed);
      qc.invalidateQueries({ queryKey: queryKeys.userOrgs });
      qc.invalidateQueries({ queryKey: queryKeys.authUser });
      notify.success('Organization renamed');
    } catch (err: any) {
      notify.error(err.message ?? 'Failed to rename organization');
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteOrg(orgId);
      notify.success('Organization deleted. You have 30 days to restore it.');
      navigate({ to: '/app/orgs' });
    } catch (err: any) {
      notify.error(err.message ?? 'Failed to delete organization');
    }
    setDeleteModalOpen(false);
  }

  async function handleLeave() {
    try {
      await leaveOrg(orgId);
      notify.success('You have left the organization');
      navigate({ to: '/app/orgs' });
    } catch (err: any) {
      notify.error(err.message ?? 'Failed to leave organization');
    }
    setLeaveModalOpen(false);
  }

  return (
    <>
      <Paper p="md" radius="md" withBorder>
        <Group mb="md" gap="xs">
          <IconSettings size={20} />
          <Text fw={600}>Organization</Text>
        </Group>

        {isOwner && (
          <>
            <Text size="sm" c="dimmed" mb="sm">Rename your organization.</Text>
            <Group align="end">
              <TextInput
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                style={{ flex: 1 }}
              />
              <Button
                variant="light"
                onClick={handleRename}
                loading={renaming}
                disabled={!name.trim() || name.trim() === orgName}
              >
                Rename
              </Button>
            </Group>

            <Divider my="md" />

            <Stack gap="sm" style={{ borderRadius: 'var(--mantine-radius-md)', border: '1px solid var(--mantine-color-red-3)', padding: 'var(--mantine-spacing-md)' }}>
              <Text fw={600} c="red" size="sm">Danger Zone</Text>
              <Text size="sm" c="dimmed">
                Delete this organization. You'll have 30 days to restore it from the Organizations page
                before all data is permanently deleted.
              </Text>
              <Button
                color="red"
                variant="outline"
                leftSection={<IconTrash size={16} />}
                onClick={() => setDeleteModalOpen(true)}
                style={{ alignSelf: 'flex-start' }}
              >
                Delete Organization
              </Button>
            </Stack>
          </>
        )}

        {!isOwner && (
          <>
            <Text size="sm" c="dimmed" mb="sm">
              You are {userRole === 'admin' ? 'an' : 'a'} {userRole} of this organization.
              Only the organization owner can rename or delete it.
            </Text>
            <Button
              color="red"
              variant="outline"
              leftSection={<IconLogout size={16} />}
              onClick={() => setLeaveModalOpen(true)}
            >
              Leave Organization
            </Button>
          </>
        )}
      </Paper>

      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Organization"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete <Text span fw={600}>{orgName}</Text>?
            You'll have 30 days to restore it before all data is permanently deleted.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button color="red" onClick={handleDelete} loading={isDeleting}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        title="Leave Organization"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to leave <Text span fw={600}>{orgName}</Text>?
            You'll need a new invitation to rejoin.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setLeaveModalOpen(false)}>Cancel</Button>
            <Button color="red" onClick={handleLeave} loading={isLeaving}>
              Leave
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
