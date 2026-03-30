import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Paper, Text, Group, Button, Stack, TextInput, Modal, List,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconTrash } from '@tabler/icons-react';
import { notify } from '../../utils/notify';
import { deleteAllData } from '../../utils/dataDeletion';
import { deleteAccount } from '../../api/profile';
import { logout } from '../../api/http/auth';
import { useOrgs } from '../../hooks/useOrgs';

export function AccountDangerZone() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { ownedOrgs } = useOrgs();
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const hasOwnedOrgs = ownedOrgs.length > 0;

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await deleteAccount();
      await deleteAllData();
      queryClient.clear();
      await logout().catch(() => {});
      notify.success('Account and all data deleted');
      closeDelete();
      navigate({ to: '/' });
    } catch (err: any) {
      notify.error(err.message ?? 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Paper p="md" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-red-4)' }}>
        <Text fw={600} c="red" mb="sm">Danger Zone</Text>
        <Text size="sm" c="dimmed" mb="md">
          Permanently delete your account and all associated data, including obligations, documents,
          PTO records, checklists, notifications, settings, and consent preferences. This action cannot be undone.
        </Text>
        <Button
          color="red"
          variant="outline"
          leftSection={<IconTrash size={16} />}
          onClick={openDelete}
        >
          Delete Account
        </Button>
      </Paper>

      <Modal opened={deleteOpened} onClose={closeDelete} title="Delete Account" centered>
        <Stack>
          {hasOwnedOrgs && (
            <Paper p="sm" radius="sm" bg="var(--mantine-color-yellow-0)" withBorder style={{ borderColor: 'var(--mantine-color-yellow-4)' }}>
              <Text size="sm" fw={500} c="yellow.9" mb="xs">
                You own {ownedOrgs.length} organization{ownedOrgs.length > 1 ? 's' : ''}:
              </Text>
              <List size="sm">
                {ownedOrgs.map((o) => (
                  <List.Item key={o.id}>{o.name}</List.Item>
                ))}
              </List>
              <Text size="sm" c="yellow.9" mt="xs">
                If these organizations have other members, you must transfer ownership before deleting your account. Solo organizations will be permanently deleted.
              </Text>
            </Paper>
          )}
          <Text size="sm">
            Type <Text span fw={700}>DELETE</Text> to confirm:
          </Text>
          <TextInput
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.currentTarget.value)}
            placeholder="DELETE"
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDelete}>Cancel</Button>
            <Button
              color="red"
              disabled={deleteConfirm !== 'DELETE'}
              loading={deleting}
              onClick={handleDeleteAccount}
            >
              Delete Account
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
