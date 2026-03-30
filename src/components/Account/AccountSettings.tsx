import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
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
} from '@mantine/core';
import { IconUser } from '@tabler/icons-react';
import { notify } from '../../utils/notify';
import { PhoneInput } from '../PhoneInput/PhoneInput';
import { useProfile } from '../../hooks/useProfile';
import { BillingSection } from '../Settings/BillingSection';
import { NotificationSection } from './NotificationSection';
import { DataManagementSection } from './DataManagementSection';
import { PrivacyConsentSection } from './PrivacyConsentSection';
import { AccountDangerZone } from './AccountDangerZone';

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

export function AccountSettingsContent() {
  const { profile, updateProfile } = useProfile();

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
    notify.success('Profile saved');
  }

  const displayInitials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <Stack gap="lg">
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

      <BillingSection isOwner={true} />

      <NotificationSection />

      <DataManagementSection />

      <PrivacyConsentSection />

      <AccountDangerZone />
    </Stack>
  );
}

export function AccountSettings() {
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

        <AccountSettingsContent />
      </Stack>
    </Container>
  );
}
