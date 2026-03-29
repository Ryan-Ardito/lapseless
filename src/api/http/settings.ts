import { apiFetch } from './client';

export interface UserSettings {
  theme: string;
  defaultReminder: {
    channels: string[];
    daysBefore: number;
    frequency: string;
    time?: string;
  };
}

export function getSettings(): Promise<UserSettings> {
  return apiFetch('/api/settings');
}

export function updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
  return apiFetch('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}
