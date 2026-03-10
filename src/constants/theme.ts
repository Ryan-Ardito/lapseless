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

export const NAV_ITEMS: { value: Tab; label: string; icon: typeof IconBell }[] = [
  { value: 'dashboard', label: 'Dashboard', icon: IconLayoutDashboard },
  { value: 'documents', label: 'Documents', icon: IconFiles },
  { value: 'pto', label: 'PTO', icon: IconBeach },
  { value: 'checklists', label: 'Checklists', icon: IconChecklist },
  { value: 'notifications', label: 'Notifications', icon: IconBell },
  { value: 'settings', label: 'Settings', icon: IconSettings },
];

export const PTO_TYPES: { value: PTOType; label: string; color: string }[] = [
  { value: 'vacation', label: 'Vacation', color: 'teal' },
  { value: 'sick', label: 'Sick', color: 'red' },
  { value: 'personal', label: 'Personal', color: 'grape' },
  { value: 'holiday', label: 'Holiday', color: 'teal' },
  { value: 'other', label: 'Other', color: 'gray' },
];
