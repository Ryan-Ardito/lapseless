import { Hono } from 'hono';
import type { AuthUser } from '../middleware/auth';

export const FAKE_USER: AuthUser = {
  id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  email: 'test@example.com',
  name: 'Test User',
  phone: '+15555555555',
  jobTitle: 'Engineer',
  timezone: 'America/New_York',
  avatarUrl: null,
  phoneVerified: false,
  twoFactorEnabled: false,
};

export const FAKE_ORG_ID = 'ffffffff-eeee-4ddd-8ccc-bbbbbbbbbbbb';

export function createTestApp() {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('user', FAKE_USER);
    c.set('requestId', 'req-test-123');
    c.set('org', { id: FAKE_ORG_ID, name: 'Test Org', ownerId: FAKE_USER.id });
    c.set('orgRole', 'owner' as const);
    await next();
  });
  return app;
}

export const FAKE_OBLIGATION_ROW = {
  id: '11111111-2222-4333-8444-555555555555',
  organizationId: FAKE_ORG_ID,
  userId: FAKE_USER.id,
  name: 'State License',
  category: 'license' as const,
  dueDate: '2025-06-15',
  startDate: null,
  referenceNumber: null,
  notes: '',
  links: null,
  recurrenceType: null,
  recurrenceAutoRenew: false,
  ceuRequired: null,
  ceuCompleted: null,
  notificationChannels: ['email'],
  reminderDaysBefore: 7,
  reminderFrequency: null,
  completed: false,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  deletedAt: null,
};

export const FAKE_PTO_ROW = {
  id: '22222222-3333-4444-8555-666666666666',
  organizationId: FAKE_ORG_ID,
  userId: FAKE_USER.id,
  startDate: '2025-03-15',
  endDate: '2025-03-15',
  hours: 8,
  type: 'vacation' as const,
  notes: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  deletedAt: null,
};

export const FAKE_CHECKLIST_ROW = {
  id: '33333333-4444-4555-8666-777777777777',
  organizationId: FAKE_ORG_ID,
  userId: FAKE_USER.id,
  type: 'end-of-month' as const,
  title: 'March Close',
  period: '2025-03-01',
  items: [{ id: 'a', label: 'Reconcile', completed: false }],
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  deletedAt: null,
};

export const FAKE_DOCUMENT_ROW = {
  id: '44444444-5555-4666-8777-888888888888',
  organizationId: FAKE_ORG_ID,
  userId: FAKE_USER.id,
  obligationId: '11111111-2222-4333-8444-555555555555',
  name: 'nursing-license-2026.pdf',
  displayName: 'Nursing License',
  mimeType: 'application/pdf',
  size: 245760,
  s3Key: `uploads/${FAKE_ORG_ID}/some-uuid/nursing-license-2026.pdf`,
  addedAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  deletedAt: null,
};

export const FULL_OBLIGATION_ROW = {
  ...FAKE_OBLIGATION_ROW,
  startDate: '2024-06-15',
  referenceNumber: 'RN-2024-58291',
  notes: 'State Board of Nursing - submit online portal',
  links: [{ label: 'State Board Portal', url: 'https://example.com/nursing-board' }],
  recurrenceType: 'yearly' as const,
  recurrenceAutoRenew: true,
  ceuRequired: 30,
  ceuCompleted: 12,
  notificationChannels: ['email', 'sms'],
  reminderDaysBefore: 30,
  reminderFrequency: 'daily' as const,
  reminderDates: ['2025-05-15', '2025-06-01'],
  reminderTime: '09:00',
  notificationsMuted: false,
};
