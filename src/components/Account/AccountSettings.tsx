import { useState, useEffect } from 'react';
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
  Avatar,
  Select,
  Anchor,
  Modal,
  List,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconUser } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { PhoneInput } from '../PhoneInput/PhoneInput';
import { useProfile } from '../../hooks/useProfile';
import { useOrgs } from '../../hooks/useOrgs';
import { deleteAccount } from '../../api/profile';
import { logout } from '../../api/http/auth';

const TIMEZONE_OPTIONS = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Tokyo',
  'Australia/Sydney', 'Pacific/Auckland',
  'America/Sao_Paulo', 'America/Argentina/Buenos_Aires',
];

function getTimezoneOptions(): { value: string; label: string }[] {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zones = new Set(TIMEZONE_OPTIONS);
  zones.add(detected);
  return Array.from(zones).sort().map((tz) => ({ value: tz, label: tz.replace(/_/g, ' ') }));
}

export function AccountSettings() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useProfile();
  const { ownedOrgs } = useOrgs();
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [jobTitle, setJobTitle] = useState(profile.jobTitle);
  const [timezone, setTimezone] = useState(profile.timezone);

  useEffect(() => {
    setName(profile.name);
    setPhone(profile.phone);
    setJobTitle(profile.jobTitle);
    setTimezone(profile.timezone);
  }, [profile]);

  const timezoneOptions = getTimezoneOptions();

  function handleSave() {
    updateProfile({ name, phone, jobTitle, timezone });
    toast.success('Profile saved');
  }

  async function handleDeleteAccount() {
    try {
      await deleteAccount();
      await logout().catch(() => {});
      toast.success('Account deleted');
      navigate({ to: '/' });
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete account');
    }
  }

  const displayInitials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  // Check if user owns orgs with other members (server blocks deletion in this case)
  const hasOwnedOrgs = ownedOrgs.length > 0;

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
          <Button variant="subtle" component={Link} to="/app/orgs" size="xs">
            Organizations
          </Button>
        </Group>

        <Title order={2}>Account Settings</Title>

        <Paper p="md" radius="md" withBorder>
          <Stack align="center" gap="sm" mb="md">
            <Avatar size={80} radius="xl" color="sage">
              {displayInitials || <IconUser size={36} />}
            </Avatar>
            {name.trim() && <Text fw={600} size="lg">{name.trim()}</Text>}
            <Text size="sm" c="dimmed">{profile.email}</Text>
          </Stack>
        </Paper>

        <Paper p="md" radius="md" withBorder>
          <Text fw={600} mb="md">Personal Information</Text>
          <Stack gap="md">
            <TextInput label="Full Name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.currentTarget.value)} />
            <TextInput label="Email" value={profile.email} disabled description="Email cannot be changed" />
            <PhoneInput label="Phone" value={phone} onChange={setPhone} />
            <TextInput label="Job Title" placeholder="Software Engineer" value={jobTitle} onChange={(e) => setJobTitle(e.currentTarget.value)} />
            <Select
              label="Timezone"
              data={timezoneOptions}
              value={timezone}
              onChange={(val) => setTimezone(val ?? timezone)}
              searchable
            />
            <Group justify="flex-end">
              <Button onClick={handleSave}>Save</Button>
            </Group>
          </Stack>
        </Paper>

        <Paper p="md" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-red-4)' }}>
          <Text fw={600} c="red" mb="sm">Danger Zone</Text>
          <Text size="sm" c="dimmed" mb="md">
            Permanently delete your account and all associated data. This action cannot be undone.
          </Text>
          <Button color="red" variant="outline" onClick={openDelete}>
            Delete Account
          </Button>
        </Paper>
      </Stack>

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
              onClick={handleDeleteAccount}
            >
              Delete Account
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
