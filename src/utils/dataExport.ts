const PRACTICE_ATLAS_KEYS = [
  'practiceatlas-obligations',
  'practiceatlas-notifications',
  'practiceatlas-pto',
  'practiceatlas-pto-config',
  'practiceatlas-checklists',
  'practiceatlas-settings',
  'practiceatlas-standalone-docs',
  'practiceatlas-consent',
  'practiceatlas-history',
];

interface ExportData {
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
}

export type ExportProvider = {
  getData: () => Promise<Record<string, unknown>>;
};

const localExportProvider: ExportProvider = {
  async getData() {
    const data: Record<string, unknown> = {};
    for (const key of PRACTICE_ATLAS_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          data[key] = JSON.parse(raw);
        } catch {
          data[key] = raw;
        }
      }
    }
    return data;
  },
};

const providers: ExportProvider[] = [localExportProvider];

export function registerExportProvider(p: ExportProvider): void {
  providers.push(p);
}

export async function exportAllData(): Promise<void> {
  const allData: Record<string, unknown> = {};
  for (const p of providers) {
    Object.assign(allData, await p.getData());
  }

  const exported: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: allData,
  };

  const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `practice-atlas-backup-${new Date().toISOString().split('T')[0]}.json`;
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
          if (PRACTICE_ATLAS_KEYS.includes(key)) {
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
