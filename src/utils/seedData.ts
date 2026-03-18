import type { Obligation, DocumentMeta } from '../types/obligation';
import type { PTOEntry } from '../types/pto';
import type { Checklist } from '../types/checklist';
import { createItemsFromTemplate } from './checklistTemplates';

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function dateInCurrentYear(month: number, day: number): string {
  const year = new Date().getFullYear();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function createSeedData(): Obligation[] {
  const nursingDocId = crypto.randomUUID();
  const insuranceDocId = crypto.randomUUID();

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
      documents: [
        {
          id: nursingDocId,
          name: 'renewal-receipt-2026.pdf',
          displayName: 'Renewal Receipt',
          type: 'application/pdf',
          size: 85_000,
          addedAt: new Date().toISOString(),
        },
      ],
      recurrence: { type: 'yearly', autoRenew: true },
      notification: { channels: ['email', 'sms'], reminderDaysBefore: 30, reminderFrequency: 'daily', muted: false },
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
      notification: { channels: ['email'], reminderDaysBefore: 14, reminderFrequency: 'weekly', muted: false },
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
      notification: { channels: ['email', 'sms'], reminderDaysBefore: 7, reminderFrequency: 'once', muted: false },
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
      documents: [
        {
          id: insuranceDocId,
          name: 'declaration-page-2026.pdf',
          displayName: 'Declaration Page',
          type: 'application/pdf',
          size: 120_000,
          addedAt: new Date().toISOString(),
        },
      ],
      recurrence: { type: 'yearly', autoRenew: false },
      notification: { channels: ['email'], reminderDaysBefore: 30, reminderFrequency: 'weekly', muted: false },
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
      notification: { channels: ['whatsapp'], reminderDaysBefore: 30, reminderFrequency: 'once', muted: false },
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
      notification: { channels: ['email', 'browser'], reminderDaysBefore: 3, reminderFrequency: 'daily', muted: false },
      completed: false,
      createdAt: new Date().toISOString(),
    },
  ];
}

export function createSeedPTOData(): PTOEntry[] {
  const now = new Date().toISOString();
  return [
    { id: crypto.randomUUID(), startDate: dateInCurrentYear(1, 1), endDate: dateInCurrentYear(1, 1), hours: 8, type: 'holiday', notes: "New Year's Day", createdAt: now },
    { id: crypto.randomUUID(), startDate: dateInCurrentYear(1, 20), endDate: dateInCurrentYear(1, 20), hours: 8, type: 'holiday', notes: 'MLK Day', createdAt: now },
    { id: crypto.randomUUID(), startDate: dateInCurrentYear(2, 17), endDate: dateInCurrentYear(2, 17), hours: 8, type: 'holiday', notes: "Presidents' Day", createdAt: now },
    { id: crypto.randomUUID(), startDate: dateInCurrentYear(5, 26), endDate: dateInCurrentYear(5, 26), hours: 8, type: 'holiday', notes: 'Memorial Day', createdAt: now },
    { id: crypto.randomUUID(), startDate: dateInCurrentYear(4, 14), endDate: dateInCurrentYear(4, 14), hours: 8, type: 'vacation', notes: 'Spring getaway day 1', createdAt: now },
    { id: crypto.randomUUID(), startDate: dateInCurrentYear(4, 15), endDate: dateInCurrentYear(4, 15), hours: 8, type: 'vacation', notes: 'Spring getaway day 2', createdAt: now },
    { id: crypto.randomUUID(), startDate: dateInCurrentYear(7, 3), endDate: dateInCurrentYear(7, 3), hours: 8, type: 'vacation', notes: 'Summer day off', createdAt: now },
    { id: crypto.randomUUID(), startDate: dateInCurrentYear(3, 10), endDate: dateInCurrentYear(3, 10), hours: 8, type: 'sick', notes: 'Flu', createdAt: now },
    { id: crypto.randomUUID(), startDate: dateInCurrentYear(6, 5), endDate: dateInCurrentYear(6, 5), hours: 4, type: 'sick', notes: 'Doctor appointment (half day)', createdAt: now },
    { id: crypto.randomUUID(), startDate: dateInCurrentYear(5, 2), endDate: dateInCurrentYear(5, 2), hours: 8, type: 'personal', notes: 'Moving day', createdAt: now },
  ];
}

export function createSeedChecklistData(): Checklist[] {
  const now = new Date().toISOString();
  const year = new Date().getFullYear();
  const month = new Date().getMonth(); // 0-indexed
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // End-of-month checklist with 2/5 items completed
  const eomItems = createItemsFromTemplate('end-of-month');
  eomItems[0].completed = true;
  eomItems[1].completed = true;

  // End-of-year checklist with all items uncompleted
  const eoyItems = createItemsFromTemplate('end-of-year');

  // Custom onboarding checklist
  const onboardingItems = [
    { id: crypto.randomUUID(), label: 'Complete HR paperwork', completed: true },
    { id: crypto.randomUUID(), label: 'Set up direct deposit', completed: false },
    { id: crypto.randomUUID(), label: 'Review employee handbook', completed: false },
    { id: crypto.randomUUID(), label: 'Complete HIPAA training', completed: false },
  ];

  return [
    {
      id: crypto.randomUUID(),
      type: 'end-of-month',
      title: 'End of Month',
      period: `${monthNames[month]} ${year}`,
      items: eomItems,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      type: 'end-of-year',
      title: 'End of Year / Tax',
      period: String(year),
      items: eoyItems,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      type: 'custom',
      title: 'Onboarding Tasks',
      period: `${monthNames[month]} ${year}`,
      items: onboardingItems,
      createdAt: now,
    },
  ];
}

export function createSeedDocumentData(): DocumentMeta[] {
  const now = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      name: 'nursing-license-2026.pdf',
      displayName: 'Nursing License',
      type: 'application/pdf',
      size: 245_760,
      addedAt: now,
    },
    {
      id: crypto.randomUUID(),
      name: 'liability-insurance-policy.pdf',
      displayName: 'Liability Insurance Policy',
      type: 'application/pdf',
      size: 1_048_576,
      addedAt: now,
    },
    {
      id: crypto.randomUUID(),
      name: 'cpr-card-photo.jpg',
      displayName: 'CPR Card Photo',
      type: 'image/jpeg',
      size: 524_288,
      addedAt: now,
    },
  ];
}
