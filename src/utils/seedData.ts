import type { Obligation } from '../types/obligation';

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function createSeedData(): Obligation[] {
  return [
    {
      id: crypto.randomUUID(),
      name: 'Nursing License Renewal',
      category: 'license',
      dueDate: daysFromNow(-3),
      startDate: daysFromNow(-368),
      referenceNumber: 'RN-2024-58291',
      notes: 'State Board of Nursing - submit online portal',
      links: [
        { label: 'State Board Portal', url: 'https://example.com/nursing-board' },
      ],
      recurrence: { type: 'yearly', autoRenew: true },
      notification: { channels: ['email', 'sms'], reminderDaysBefore: 30, reminderFrequency: 'daily' },
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'CEU - Ethics in Healthcare',
      category: 'ceu',
      dueDate: daysFromNow(7),
      notes: '3 credit hours required. Complete via approved online provider.',
      ceuTracking: { required: 3, completed: 1 },
      links: [
        { label: 'Course Provider', url: 'https://example.com/ceu-ethics' },
      ],
      notification: { channels: ['email'], reminderDaysBefore: 14, reminderFrequency: 'weekly' },
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Quarterly Tax Payment (Q1)',
      category: 'tax',
      dueDate: daysFromNow(22),
      notes: 'Estimated tax payment due to IRS',
      recurrence: { type: 'quarterly', autoRenew: true },
      notification: { channels: ['email', 'sms'], reminderDaysBefore: 7, reminderFrequency: 'once' },
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Professional Liability Insurance',
      category: 'insurance',
      dueDate: daysFromNow(60),
      referenceNumber: 'PLI-9928-2024',
      notes: 'Annual renewal with current provider. Compare rates.',
      recurrence: { type: 'yearly', autoRenew: false },
      notification: { channels: ['email'], reminderDaysBefore: 30, reminderFrequency: 'weekly' },
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'CPR/BLS Certification',
      category: 'certification',
      dueDate: daysFromNow(120),
      referenceNumber: 'AHA-BLS-44012',
      notes: 'American Heart Association - in-person skills check required',
      notification: { channels: ['whatsapp'], reminderDaysBefore: 30, reminderFrequency: 'once' },
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Credit Card Payment',
      category: 'credit-card',
      dueDate: daysFromNow(12),
      notes: 'Monthly minimum payment due',
      recurrence: { type: 'monthly', autoRenew: true },
      notification: { channels: ['email', 'browser'], reminderDaysBefore: 3, reminderFrequency: 'daily' },
      completed: false,
      createdAt: new Date().toISOString(),
    },
  ];
}
