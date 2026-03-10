export type Category = 'license' | 'ceu' | 'tax' | 'certification' | 'insurance' | 'credit-card' | 'mailbox' | 'other';

export type Channel = 'sms' | 'email' | 'whatsapp' | 'browser';

export type Status = 'upcoming' | 'due-soon' | 'overdue' | 'completed';

export interface DocumentMeta {
  id: string;
  name: string;
  type: string;
  size: number;
  addedAt: string;
}

export interface Obligation {
  id: string;
  name: string;
  category: Category;
  dueDate: string; // ISO date string
  startDate?: string; // ISO date string
  referenceNumber?: string;
  links?: { label: string; url: string }[];
  recurrence?: { type: 'monthly' | 'quarterly' | 'yearly'; autoRenew: boolean };
  ceuTracking?: { required: number; completed: number };
  documents?: DocumentMeta[];
  notes: string;
  notification: {
    channels: Channel[];
    reminderDaysBefore: number;
    reminderFrequency?: 'once' | 'daily' | 'weekly';
  };
  completed: boolean;
  createdAt: string; // ISO date string
}

export interface AppNotification {
  id: string;
  obligationId: string;
  obligationName: string;
  channel: Channel;
  message: string;
  triggeredAt: string; // ISO date string
  read: boolean;
}
