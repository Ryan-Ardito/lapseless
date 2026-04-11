import { getItem, setItem, simulateAsync } from './client';

export interface UserSettings {
  theme: string;
  defaultReminder: {
    channels: string[];
    daysBefore: number;
    frequency: string;
    time?: string;
  };
}

const KEY = 'lapseless_settings';

const DEFAULTS: UserSettings = {
  theme: 'system',
  defaultReminder: { channels: ['email'], daysBefore: 7, frequency: 'once', time: '09:00' },
};

export function getSettings(): Promise<UserSettings> {
  return simulateAsync(() => getItem<UserSettings>(KEY, DEFAULTS));
}

export function updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
  return simulateAsync(() => {
    const current = getItem<UserSettings>(KEY, DEFAULTS);
    const merged = { ...current, ...updates };
    if (updates.defaultReminder) {
      merged.defaultReminder = { ...current.defaultReminder, ...updates.defaultReminder };
    }
    setItem(KEY, merged);
    return merged;
  });
}
