export type Category = 'license' | 'ceu' | 'tax' | 'certification' | 'insurance' | 'other';

export type Channel = 'sms' | 'email' | 'whatsapp';

export type Status = 'upcoming' | 'due-soon' | 'overdue' | 'completed';

export interface Obligation {
  id: string;
  name: string;
  category: Category;
  dueDate: string; // ISO date string
  notes: string;
  notification: {
    channels: Channel[];
    reminderDaysBefore: number;
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
