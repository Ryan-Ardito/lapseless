import * as http from './http/settings';
import { getAppMode } from '../contexts/AppModeContext';
import type { UserSettings } from './http/settings';

const DEMO_KEY = 'lapseless_settings';

const DEFAULTS: UserSettings = {
  theme: 'system',
  defaultReminder: { channels: ['email'], daysBefore: 7, frequency: 'once', time: '09:00' },
};

function getDemoSettings(): UserSettings {
  const raw = localStorage.getItem(DEMO_KEY);
  return raw ? JSON.parse(raw) : DEFAULTS;
}

function updateDemoSettings(updates: Partial<UserSettings>): UserSettings {
  const current = getDemoSettings();
  const merged = { ...current, ...updates };
  if (updates.defaultReminder) {
    merged.defaultReminder = { ...current.defaultReminder, ...updates.defaultReminder };
  }
  localStorage.setItem(DEMO_KEY, JSON.stringify(merged));
  return merged;
}

const isDemo = () => getAppMode() === 'demo';

export const getSettings = () =>
  isDemo() ? Promise.resolve(getDemoSettings()) : http.getSettings();

export const updateSettings = (updates: Partial<UserSettings>) =>
  isDemo() ? Promise.resolve(updateDemoSettings(updates)) : http.updateSettings(updates);

export type { UserSettings };
