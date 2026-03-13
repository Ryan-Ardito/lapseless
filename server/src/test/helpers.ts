import { Hono } from 'hono';
import type { AuthUser } from '../middleware/auth';

export const FAKE_USER: AuthUser = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  email: 'test@example.com',
  name: 'Test User',
  phone: '+15555555555',
  jobTitle: 'Engineer',
  timezone: 'America/New_York',
  avatarUrl: null,
};

export function createTestApp() {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('user', FAKE_USER);
    c.set('requestId', 'req-test-123');
    await next();
  });
  return app;
}

export const FAKE_OBLIGATION_ROW = {
  id: '11111111-2222-3333-4444-555555555555',
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
  id: '22222222-3333-4444-5555-666666666666',
  userId: FAKE_USER.id,
  date: '2025-03-15',
  hours: 8,
  type: 'vacation' as const,
  notes: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  deletedAt: null,
};

export const FAKE_CHECKLIST_ROW = {
  id: '33333333-4444-5555-6666-777777777777',
  userId: FAKE_USER.id,
  type: 'end-of-month' as const,
  title: 'March Close',
  period: '2025-03-01',
  items: [{ id: 'a', label: 'Reconcile', completed: false }],
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  deletedAt: null,
};
