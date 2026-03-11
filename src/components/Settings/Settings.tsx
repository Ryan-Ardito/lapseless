import { useState } from 'react';
import {
  Stack, Title, Paper, Text, Button, SimpleGrid, FileInput, Progress,
  TextInput, Group,
} from '@mantine/core';
import { IconMessage } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { exportAllData, importData } from '../../utils/dataExport';
import { getStorageEstimate } from '../../utils/documents';

export function Settings() {
  const [storageUsed, setStorageUsed] = useState<number | null>(null);
  const [storageQuota, setStorageQuota] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  async function checkStorage() {
    const est = await getStorageEstimate();
    setStorageUsed(est.used);
    setStorageQuota(est.quota);
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleImport(file: File | null) {
    if (!file) return;
    setImporting(true);
    const result = await importData(file);
    setImporting(false);
    if (result.success) {
      toast.success('Data imported! Reload the page to see changes.');
    } else {
      toast.error(result.error ?? 'Import failed');
    }
  }

  return (
    <Stack gap="lg">
      <Title order={2}>Settings</Title>

      <Paper p="md" radius="md" withBorder>
        <Text fw={600} mb="md">SMS Reminder Test</Text>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Enter your phone number to send a test SMS reminder. This helps verify your number receives notifications correctly.
          </Text>
          <Group align="end">
            <TextInput
              label="Phone number"
              placeholder="+1 (555) 123-4567"
              value={testPhone}
              onChange={(e) => setTestPhone(e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Button
              leftSection={<IconMessage size={16} />}
              variant="light"
              disabled={!testPhone.trim() || sendingTest}
              loading={sendingTest}
              onClick={() => {
                setSendingTest(true);
                setTimeout(() => {
                  setSendingTest(false);
                  toast.success('Test SMS sent (simulated)');
                }, 1500);
              }}
            >
              Send Test
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Text fw={600} mb="md">Data Management</Text>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Button variant="light" onClick={() => { exportAllData(); toast.success('Backup downloaded'); }}>
              Export All Data
            </Button>
            <FileInput
              placeholder="Import backup..."
              accept=".json"
              onChange={handleImport}
              disabled={importing}
            />
          </SimpleGrid>
          <Text size="xs" c="dimmed">
            Export creates a JSON backup of all your obligations, PTO, checklists, and settings.
            Import will overwrite existing data — reload after importing.
          </Text>
        </Stack>
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Text fw={600} mb="md">Storage Usage</Text>
        <Button variant="light" size="xs" mb="md" onClick={checkStorage}>
          Check Storage
        </Button>
        {storageUsed !== null && storageQuota !== null && (
          <Stack gap="xs">
            <Progress
              value={storageQuota > 0 ? (storageUsed / storageQuota) * 100 : 0}
              size="lg"
              radius="xl"
              color="sage"
            />
            <Text size="sm" c="dimmed">
              {formatBytes(storageUsed)} used of {formatBytes(storageQuota)}
            </Text>
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
