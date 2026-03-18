import {
  IconLayoutDashboard,
  IconBeach,
  IconChecklist,
  IconBell,
  IconSettings,
  IconMessage,
  IconMail,
  IconBrandWhatsapp,
  IconFiles,
  IconHistory,
} from '@tabler/icons-react';
import type { Status } from '../types/obligation';
import type { Channel } from '../types/obligation';
import type { PTOType } from '../types/pto';
import type { Tab } from '../components/Layout/Layout';

export const STATUS_COLORS: Record<Status, string> = {
  overdue: 'red',
  'due-soon': 'yellow',
  upcoming: 'teal',
  completed: 'gray',
};

export const STATUS_BORDERS: Record<Status, string> = {
  overdue: 'var(--mantine-color-red-5)',
  'due-soon': 'var(--mantine-color-yellow-5)',
  upcoming: 'var(--mantine-color-teal-5)',
  completed: 'var(--mantine-color-gray-4)',
};

export const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'browser', label: 'Browser' },
];

export const CHANNEL_ICONS: Record<string, typeof IconBell> = {
  sms: IconMessage,
  email: IconMail,
  whatsapp: IconBrandWhatsapp,
};

export function getNavItems(basePath: '/app' | '/demo'): { value: Tab; label: string; icon: typeof IconBell; path: string }[] {
  return [
    { value: 'dashboard', label: 'Dashboard', icon: IconLayoutDashboard, path: `${basePath}/dashboard` },
    { value: 'documents', label: 'Documents', icon: IconFiles, path: `${basePath}/documents` },
    { value: 'pto', label: 'PTO', icon: IconBeach, path: `${basePath}/pto` },
    { value: 'checklists', label: 'Checklists', icon: IconChecklist, path: `${basePath}/checklists` },
    { value: 'notifications', label: 'Notifications', icon: IconBell, path: `${basePath}/notifications` },
    { value: 'history', label: 'History', icon: IconHistory, path: `${basePath}/history` },
    { value: 'settings', label: 'Settings', icon: IconSettings, path: `${basePath}/settings` },
  ];
}

export const PTO_TYPES: { value: PTOType; label: string; color: string }[] = [
  { value: 'vacation', label: 'Vacation', color: 'teal' },
  { value: 'sick', label: 'Sick', color: 'red' },
  { value: 'personal', label: 'Personal', color: 'grape' },
  { value: 'holiday', label: 'Holiday', color: 'teal' },
  { value: 'other', label: 'Other', color: 'gray' },
];
