import { useState } from 'react';
import { Paper, Text, Stack, SimpleGrid, Button, FileInput } from '@mantine/core';
import toast from 'react-hot-toast';
import { exportAllData, importData } from '../../utils/dataExport';

interface DataManagementSectionProps {
  mode?: 'production' | 'demo';
}

export function DataManagementSection({ mode = 'production' }: DataManagementSectionProps) {
  const [importing, setImporting] = useState(false);

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
    <Paper p="md" radius="md" withBorder>
      <Text fw={600} mb="md">Data Management</Text>
      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Button variant="light" onClick={async () => { await exportAllData(); toast.success('Backup downloaded'); }}>
            Export All Data
          </Button>
          {mode === 'demo' && (
            <FileInput
              placeholder="Import backup..."
              accept=".json"
              onChange={handleImport}
              disabled={importing}
            />
          )}
        </SimpleGrid>
        <Text size="xs" c="dimmed">
          {mode === 'production'
            ? 'Export creates a JSON backup of your obligations, documents, PTO, checklists, and settings.'
            : 'Export creates a JSON backup. Import will overwrite existing data — reload after importing.'}
        </Text>
      </Stack>
    </Paper>
  );
}
