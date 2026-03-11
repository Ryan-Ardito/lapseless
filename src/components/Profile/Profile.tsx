import { useState, useEffect } from 'react';
import { Stack, Title, Paper, Text, TextInput, Button, Group, Avatar, Select } from '@mantine/core';
import { IconUser } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { useProfile } from '../../hooks/useProfile';

const TIMEZONE_OPTIONS = [
  // US
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  // Europe
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  // Asia
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  // Oceania
  'Australia/Sydney',
  'Pacific/Auckland',
  // South America
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
];

function getTimezoneOptions(): { value: string; label: string }[] {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zones = new Set(TIMEZONE_OPTIONS);
  zones.add(detected);
  return Array.from(zones)
    .sort()
    .map((tz) => ({ value: tz, label: tz.replace(/_/g, ' ') }));
}

export function Profile() {
  const { profile, updateProfile } = useProfile();

  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [jobTitle, setJobTitle] = useState(profile.jobTitle);
  const [timezone, setTimezone] = useState(profile.timezone);

  useEffect(() => {
    setName(profile.name);
    setEmail(profile.email);
    setPhone(profile.phone);
    setJobTitle(profile.jobTitle);
    setTimezone(profile.timezone);
  }, [profile]);

  const timezoneOptions = getTimezoneOptions();

  function handleSave() {
    updateProfile({ name, email, phone, jobTitle, timezone });
    toast.success('Profile saved');
  }

  const displayInitials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <Stack gap="lg">
      <Title order={2}>Profile</Title>

      <Paper p="md" radius="md" withBorder>
        <Stack align="center" gap="sm" mb="md">
          <Avatar size={80} radius="xl" color="sage">
            {displayInitials || <IconUser size={36} />}
          </Avatar>
          {name.trim() && (
            <Text fw={600} size="lg">
              {name.trim()}
            </Text>
          )}
          {jobTitle.trim() && (
            <Text size="sm" c="dimmed">
              {jobTitle.trim()}
            </Text>
          )}
        </Stack>
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Text fw={600} mb="md">
          Personal Information
        </Text>
        <Stack gap="md">
          <TextInput label="Full Name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.currentTarget.value)} />
          <TextInput label="Email" placeholder="jane@example.com" type="email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
          <TextInput label="Phone" placeholder="+1 (555) 123-4567" value={phone} onChange={(e) => setPhone(e.currentTarget.value)} />
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
    </Stack>
  );
}
