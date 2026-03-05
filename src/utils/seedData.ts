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
      notes: 'State Board of Nursing - submit online portal',
      notification: { channels: ['email', 'sms'], reminderDaysBefore: 30 },
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'CEU - Ethics in Healthcare',
      category: 'ceu',
      dueDate: daysFromNow(7),
      notes: '3 credit hours required. Complete via approved online provider.',
      notification: { channels: ['email'], reminderDaysBefore: 14 },
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Quarterly Tax Payment (Q1)',
      category: 'tax',
      dueDate: daysFromNow(22),
      notes: 'Estimated tax payment due to IRS',
      notification: { channels: ['email', 'sms'], reminderDaysBefore: 7 },
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Professional Liability Insurance',
      category: 'insurance',
      dueDate: daysFromNow(60),
      notes: 'Annual renewal with current provider. Compare rates.',
      notification: { channels: ['email'], reminderDaysBefore: 30 },
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'CPR/BLS Certification',
      category: 'certification',
      dueDate: daysFromNow(120),
      notes: 'American Heart Association - in-person skills check required',
      notification: { channels: ['whatsapp'], reminderDaysBefore: 30 },
      completed: false,
      createdAt: new Date().toISOString(),
    },
  ];
}
