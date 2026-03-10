const LAPSELESS_KEYS = [
  'lapseless-obligations',
  'lapseless-notifications',
  'lapseless-pto',
  'lapseless-pto-config',
  'lapseless-checklists',
  'lapseless-settings',
];

interface ExportData {
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
}

export function exportAllData(): void {
  const exported: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {},
  };

  for (const key of LAPSELESS_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        exported.data[key] = JSON.parse(raw);
      } catch {
        exported.data[key] = raw;
      }
    }
  }

  const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lapseless-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(file: File): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as ExportData;
        if (!parsed.version || !parsed.data) {
          resolve({ success: false, error: 'Invalid backup file format' });
          return;
        }

        for (const [key, value] of Object.entries(parsed.data)) {
          if (LAPSELESS_KEYS.includes(key)) {
            localStorage.setItem(key, JSON.stringify(value));
          }
        }

        resolve({ success: true });
      } catch {
        resolve({ success: false, error: 'Failed to parse backup file' });
      }
    };
    reader.onerror = () => resolve({ success: false, error: 'Failed to read file' });
    reader.readAsText(file);
  });
}
