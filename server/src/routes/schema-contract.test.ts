import { describe, expect, test, mock, beforeEach } from 'bun:test';
import {
  FAKE_USER,
  FAKE_ORG_ID,
  FAKE_OBLIGATION_ROW,
  FAKE_PTO_ROW,
  FAKE_CHECKLIST_ROW,
  FAKE_DOCUMENT_ROW,
  FULL_OBLIGATION_ROW,
  createTestApp,
} from '../test/helpers';

// Mock logger before importing error handler
mock.module('../lib/logger', () => ({
  logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
}));

const { errorHandler } = await import('../middleware/error-handler');

// --- Service mocks ---

const mockObligationSvc = {
  listObligations: mock(() => Promise.resolve([])),
  createObligation: mock(() => Promise.resolve(FULL_OBLIGATION_ROW)),
  updateObligation: mock(() => Promise.resolve(FULL_OBLIGATION_ROW)),
  softDeleteObligation: mock(() => Promise.resolve(FULL_OBLIGATION_ROW)),
  restoreObligation: mock(() => Promise.resolve(FULL_OBLIGATION_ROW)),
  toggleComplete: mock(() => Promise.resolve({ updated: FULL_OBLIGATION_ROW, renewed: null })),
  getObligation: mock(() => Promise.resolve(FULL_OBLIGATION_ROW)),
  getDocumentsForObligations: mock(() => Promise.resolve([])),
};

const mockPtoSvc = {
  listEntries: mock(() => Promise.resolve([])),
  createEntry: mock(() => Promise.resolve(FAKE_PTO_ROW)),
  updateEntry: mock(() => Promise.resolve(FAKE_PTO_ROW)),
  softDeleteEntry: mock(() => Promise.resolve(FAKE_PTO_ROW)),
  restoreEntry: mock(() => Promise.resolve(FAKE_PTO_ROW)),
  getConfig: mock(() => Promise.resolve({ yearlyAllowance: 160, year: 2025 })),
  upsertConfig: mock(() => Promise.resolve({ yearlyAllowance: 160, year: 2025 })),
};

const mockChecklistSvc = {
  listChecklists: mock(() => Promise.resolve([])),
  createChecklist: mock(() => Promise.resolve(FAKE_CHECKLIST_ROW)),
  updateChecklist: mock(() => Promise.resolve(FAKE_CHECKLIST_ROW)),
  softDeleteChecklist: mock(() => Promise.resolve(FAKE_CHECKLIST_ROW)),
  restoreChecklist: mock(() => Promise.resolve(FAKE_CHECKLIST_ROW)),
  getChecklist: mock(() => Promise.resolve(FAKE_CHECKLIST_ROW)),
};

const mockDocumentSvc = {
  listDocuments: mock(() => Promise.resolve([])),
  registerDocument: mock(() => Promise.resolve(FAKE_DOCUMENT_ROW)),
  generateUploadUrl: mock(() => Promise.resolve({ url: 'https://s3.example.com/upload', key: 'uploads/test/file.pdf' })),
  generateDownloadUrl: mock(() => Promise.resolve({ url: 'https://s3.example.com/download' })),
  updateDocument: mock(() => Promise.resolve(FAKE_DOCUMENT_ROW)),
  softDeleteDocument: mock(() => Promise.resolve(FAKE_DOCUMENT_ROW)),
  restoreDocument: mock(() => Promise.resolve(FAKE_DOCUMENT_ROW)),
  getDocument: mock(() => Promise.resolve(FAKE_DOCUMENT_ROW)),
};

const mockProfileSvc = {
  getProfile: mock(() => Promise.resolve({ ...FAKE_USER })),
  updateProfile: mock(() => Promise.resolve({ ...FAKE_USER })),
  deleteAccount: mock(() => Promise.resolve()),
};

const mockSettingsSvc = {
  getSettings: mock(() => Promise.resolve({
    theme: 'system',
    defaultReminder: { channels: ['email'], daysBefore: 7, frequency: 'once', time: '09:00' },
  })),
  upsertSettings: mock(() => Promise.resolve({
    theme: 'dark',
    defaultReminder: { channels: ['email', 'sms'], daysBefore: 14, frequency: 'daily', time: '08:00' },
  })),
};

mock.module('../services/obligation.service', () => mockObligationSvc);
mock.module('../services/pto.service', () => mockPtoSvc);
mock.module('../services/checklist.service', () => mockChecklistSvc);
mock.module('../services/document.service', () => mockDocumentSvc);
mock.module('../services/profile.service', () => mockProfileSvc);
mock.module('../services/settings.service', () => mockSettingsSvc);
mock.module('../middleware/plan-enforcement', () => ({
  checkObligationLimit: mock(() => Promise.resolve()),
  checkStorageLimit: mock(() => Promise.resolve()),
  checkSmsLimit: mock(() => Promise.resolve()),
  checkMemberLimit: mock(() => Promise.resolve()),
  checkOrgLimit: mock(() => Promise.resolve()),
  checkTransferCompatibility: mock(() => Promise.resolve()),
}));
mock.module('../lib/s3', () => ({
  getObjectSize: mock(() => Promise.resolve(50000)),
}));
// Mock db for document route's inline obligation ownership check
mock.module('../db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: FAKE_OBLIGATION_ROW.id }]),
        }),
      }),
    }),
  },
}));

// Must import routes after all mocks
const obligationsRoute = (await import('./obligations')).default;
const ptoRoute = (await import('./pto')).default;
const checklistsRoute = (await import('./checklists')).default;
const documentsRoute = (await import('./documents')).default;
const settingsRoute = (await import('./settings')).default;
const profileRoute = (await import('./profile')).default;

function app() {
  const a = createTestApp();
  a.route('/obligations', obligationsRoute);
  a.route('/pto', ptoRoute);
  a.route('/checklists', checklistsRoute);
  a.route('/documents', documentsRoute);
  a.route('/settings', settingsRoute);
  a.route('/profile', profileRoute);
  a.onError(errorHandler);
  return a;
}

function post(path: string, body: unknown) {
  return app().request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function patch(path: string, body: unknown) {
  return app().request(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function put(path: string, body: unknown) {
  return app().request(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const FAKE_OBL_ID = FAKE_OBLIGATION_ROW.id;
const FAKE_DOC_ID = FAKE_DOCUMENT_ROW.id;
const FAKE_PTO_ID = FAKE_PTO_ROW.id;
const FAKE_CL_ID = FAKE_CHECKLIST_ROW.id;

// --- Realistic frontend payloads ---

const FULL_OBLIGATION_CREATE = {
  name: 'Nursing License Renewal',
  category: 'license',
  dueDate: '2025-06-15',
  startDate: '2024-06-15',
  referenceNumber: 'RN-2024-58291',
  notes: 'State Board of Nursing - submit online portal',
  links: [{ label: 'State Board Portal', url: 'https://example.com/nursing-board' }],
  recurrence: { type: 'yearly', autoRenew: true },
  ceuTracking: { required: 30, completed: 12 },
  notification: {
    channels: ['email', 'sms'],
    reminderDaysBefore: 30,
    reminderFrequency: 'daily',
    reminderDates: ['2025-05-15', '2025-06-01'],
    reminderTime: '09:00',
  },
};

const FULL_PTO_CREATE = {
  startDate: '2025-07-01',
  endDate: '2025-07-05',
  hours: 40,
  type: 'vacation',
  notes: 'Summer family trip',
};

const FULL_CHECKLIST_CREATE = {
  type: 'end-of-month',
  title: 'March 2025 Closing',
  period: '2025-03',
  items: [
    { id: 'item-1', label: 'Reconcile bank accounts', completed: false },
    { id: 'item-2', label: 'Review outstanding invoices', completed: true, notes: 'All paid except #4521' },
    { id: 'item-3', label: 'Submit payroll', completed: false },
  ],
};

// --- Reset mocks ---

beforeEach(() => {
  for (const svc of [mockObligationSvc, mockPtoSvc, mockChecklistSvc, mockDocumentSvc, mockProfileSvc, mockSettingsSvc]) {
    for (const fn of Object.values(svc)) {
      if (typeof fn === 'function' && 'mockReset' in fn) {
        (fn as any).mockReset();
      }
    }
  }

  // Restore default implementations
  mockObligationSvc.listObligations.mockImplementation(() => Promise.resolve([]));
  mockObligationSvc.createObligation.mockImplementation(() => Promise.resolve(FULL_OBLIGATION_ROW));
  mockObligationSvc.updateObligation.mockImplementation(() => Promise.resolve(FULL_OBLIGATION_ROW));
  mockObligationSvc.softDeleteObligation.mockImplementation(() => Promise.resolve(FULL_OBLIGATION_ROW));
  mockObligationSvc.getObligation.mockImplementation(() => Promise.resolve(FULL_OBLIGATION_ROW));
  mockObligationSvc.getDocumentsForObligations.mockImplementation(() => Promise.resolve([]));
  mockObligationSvc.toggleComplete.mockImplementation(() =>
    Promise.resolve({ updated: FULL_OBLIGATION_ROW, renewed: null }),
  );

  mockPtoSvc.listEntries.mockImplementation(() => Promise.resolve([]));
  mockPtoSvc.createEntry.mockImplementation(() => Promise.resolve(FAKE_PTO_ROW));
  mockPtoSvc.updateEntry.mockImplementation(() => Promise.resolve(FAKE_PTO_ROW));
  mockPtoSvc.softDeleteEntry.mockImplementation(() => Promise.resolve(FAKE_PTO_ROW));

  mockChecklistSvc.listChecklists.mockImplementation(() => Promise.resolve([]));
  mockChecklistSvc.createChecklist.mockImplementation(() => Promise.resolve(FAKE_CHECKLIST_ROW));
  mockChecklistSvc.updateChecklist.mockImplementation(() => Promise.resolve(FAKE_CHECKLIST_ROW));
  mockChecklistSvc.softDeleteChecklist.mockImplementation(() => Promise.resolve(FAKE_CHECKLIST_ROW));
  mockChecklistSvc.getChecklist.mockImplementation(() => Promise.resolve(FAKE_CHECKLIST_ROW));

  mockDocumentSvc.listDocuments.mockImplementation(() => Promise.resolve([]));
  mockDocumentSvc.generateUploadUrl.mockImplementation(() =>
    Promise.resolve({ url: 'https://s3.example.com/upload', key: 'uploads/test/file.pdf' }),
  );
  mockDocumentSvc.updateDocument.mockImplementation(() => Promise.resolve(FAKE_DOCUMENT_ROW));
  mockDocumentSvc.softDeleteDocument.mockImplementation(() => Promise.resolve(FAKE_DOCUMENT_ROW));
  mockDocumentSvc.getDocument.mockImplementation(() => Promise.resolve(FAKE_DOCUMENT_ROW));

  mockProfileSvc.getProfile.mockImplementation(() => Promise.resolve({ ...FAKE_USER }));
  mockProfileSvc.updateProfile.mockImplementation(() => Promise.resolve({ ...FAKE_USER }));

  mockSettingsSvc.getSettings.mockImplementation(() =>
    Promise.resolve({
      theme: 'system',
      defaultReminder: { channels: ['email'], daysBefore: 7, frequency: 'once', time: '09:00' },
    }),
  );
  mockSettingsSvc.upsertSettings.mockImplementation(() =>
    Promise.resolve({
      theme: 'dark',
      defaultReminder: { channels: ['email', 'sms'], daysBefore: 14, frequency: 'daily', time: '08:00' },
    }),
  );
});

// =====================================================================
// OBLIGATIONS
// =====================================================================

describe('Obligation contract', () => {
  describe('inbound: full create payload', () => {
    test('201 with all frontend fields', async () => {
      const res = await post('/obligations', FULL_OBLIGATION_CREATE);
      expect(res.status).toBe(201);
    });

    test('service receives flattened recurrence fields', async () => {
      await post('/obligations', FULL_OBLIGATION_CREATE);
      const args = mockObligationSvc.createObligation.mock.calls[0];
      const data = args[2]; // (orgId, userId, data)
      expect(data.recurrenceType).toBe('yearly');
      expect(data.recurrenceAutoRenew).toBe(true);
    });

    test('service receives flattened ceuTracking fields', async () => {
      await post('/obligations', FULL_OBLIGATION_CREATE);
      const data = mockObligationSvc.createObligation.mock.calls[0][2];
      expect(data.ceuRequired).toBe(30);
      expect(data.ceuCompleted).toBe(12);
    });

    test('service receives flattened notification fields', async () => {
      await post('/obligations', FULL_OBLIGATION_CREATE);
      const data = mockObligationSvc.createObligation.mock.calls[0][2];
      expect(data.notificationChannels).toEqual(['email', 'sms']);
      expect(data.reminderDaysBefore).toBe(30);
      expect(data.reminderFrequency).toBe('daily');
      expect(data.reminderDates).toEqual(['2025-05-15', '2025-06-01']);
      expect(data.reminderTime).toBe('09:00');
    });

    test('service receives links and scalar fields', async () => {
      await post('/obligations', FULL_OBLIGATION_CREATE);
      const data = mockObligationSvc.createObligation.mock.calls[0][2];
      expect(data.name).toBe('Nursing License Renewal');
      expect(data.dueDate).toBe('2025-06-15');
      expect(data.startDate).toBe('2024-06-15');
      expect(data.links).toEqual([{ label: 'State Board Portal', url: 'https://example.com/nursing-board' }]);
      expect(data.notes).toBe('State Board of Nursing - submit online portal');
    });
  });

  describe('inbound: update with nulls to clear optional fields', () => {
    test('200 when clearing recurrence, ceuTracking, links, startDate', async () => {
      const res = await patch(`/obligations/${FAKE_OBL_ID}`, {
        recurrence: null,
        ceuTracking: null,
        links: null,
        startDate: null,
        referenceNumber: null,
      });
      expect(res.status).toBe(200);
    });

    test('service receives null flat fields for cleared nested objects', async () => {
      await patch(`/obligations/${FAKE_OBL_ID}`, {
        recurrence: null,
        ceuTracking: null,
        links: null,
      });
      const data = mockObligationSvc.updateObligation.mock.calls[0][2];
      expect(data.recurrenceType).toBeNull();
      expect(data.recurrenceAutoRenew).toBe(false);
      expect(data.ceuRequired).toBeNull();
      expect(data.ceuCompleted).toBeNull();
      expect(data.links).toBeNull();
    });
  });

  describe('inbound: update notification with muted', () => {
    test('service receives notificationsMuted', async () => {
      await patch(`/obligations/${FAKE_OBL_ID}`, {
        notification: {
          channels: ['email'],
          reminderDaysBefore: 7,
          muted: true,
        },
      });
      const data = mockObligationSvc.updateObligation.mock.calls[0][2];
      expect(data.notificationsMuted).toBe(true);
      expect(data.notificationChannels).toEqual(['email']);
    });
  });

  describe('outbound: response shape matches Obligation type', () => {
    test('GET response contains all nested fields', async () => {
      mockObligationSvc.listObligations.mockImplementation(() => Promise.resolve([FULL_OBLIGATION_ROW]));
      const res = await app().request('/obligations');
      const [item] = (await res.json()) as any[];

      // Scalar fields
      expect(item.id).toBe(FULL_OBLIGATION_ROW.id);
      expect(item.name).toBe(FULL_OBLIGATION_ROW.name);
      expect(item.category).toBe('license');
      expect(item.dueDate).toBe(FULL_OBLIGATION_ROW.dueDate);
      expect(item.startDate).toBe('2024-06-15');
      expect(item.referenceNumber).toBe('RN-2024-58291');
      expect(item.notes).toBe('State Board of Nursing - submit online portal');
      expect(item.completed).toBe(false);
      expect(typeof item.createdAt).toBe('string');

      // Nested recurrence
      expect(item.recurrence).toEqual({ type: 'yearly', autoRenew: true });

      // Nested ceuTracking
      expect(item.ceuTracking).toEqual({ required: 30, completed: 12 });

      // Nested notification
      expect(item.notification).toEqual({
        channels: ['email', 'sms'],
        reminderDaysBefore: 30,
        reminderFrequency: 'daily',
        reminderDates: ['2025-05-15', '2025-06-01'],
        reminderTime: '09:00',
        muted: false,
      });

      // Links
      expect(item.links).toEqual([{ label: 'State Board Portal', url: 'https://example.com/nursing-board' }]);
    });

    test('GET response excludes raw DB column names', async () => {
      mockObligationSvc.listObligations.mockImplementation(() => Promise.resolve([FULL_OBLIGATION_ROW]));
      const res = await app().request('/obligations');
      const [item] = (await res.json()) as any[];

      expect(item.recurrenceType).toBeUndefined();
      expect(item.recurrenceAutoRenew).toBeUndefined();
      expect(item.ceuRequired).toBeUndefined();
      expect(item.ceuCompleted).toBeUndefined();
      expect(item.notificationChannels).toBeUndefined();
      expect(item.reminderDaysBefore).toBeUndefined();
      expect(item.reminderFrequency).toBeUndefined();
      expect(item.notificationsMuted).toBeUndefined();
      expect(item.organizationId).toBeUndefined();
      expect(item.userId).toBeUndefined();
    });

    test('optional fields are undefined when DB values are null', async () => {
      mockObligationSvc.listObligations.mockImplementation(() => Promise.resolve([FAKE_OBLIGATION_ROW]));
      const res = await app().request('/obligations');
      const [item] = (await res.json()) as any[];

      expect(item.startDate).toBeUndefined();
      expect(item.referenceNumber).toBeUndefined();
      expect(item.links).toBeUndefined();
      expect(item.recurrence).toBeUndefined();
      expect(item.ceuTracking).toBeUndefined();
    });
  });
});

// =====================================================================
// PTO
// =====================================================================

describe('PTO contract', () => {
  describe('inbound: full create payload', () => {
    test('201 with all fields including notes', async () => {
      const res = await post('/pto/entries', FULL_PTO_CREATE);
      expect(res.status).toBe(201);
    });

    test('service receives all fields', async () => {
      await post('/pto/entries', FULL_PTO_CREATE);
      const data = mockPtoSvc.createEntry.mock.calls[0][2];
      expect(data.startDate).toBe('2025-07-01');
      expect(data.endDate).toBe('2025-07-05');
      expect(data.hours).toBe(40);
      expect(data.type).toBe('vacation');
      expect(data.notes).toBe('Summer family trip');
    });
  });

  describe('inbound: partial update', () => {
    test('200 updating only notes', async () => {
      const res = await patch(`/pto/entries/${FAKE_PTO_ID}`, { notes: 'Updated note' });
      expect(res.status).toBe(200);
    });

    test('200 updating type only', async () => {
      const res = await patch(`/pto/entries/${FAKE_PTO_ID}`, { type: 'sick' });
      expect(res.status).toBe(200);
    });
  });

  describe('outbound: response shape matches PTOEntry type', () => {
    test('GET response has all PTOEntry fields', async () => {
      const fullRow = { ...FAKE_PTO_ROW, notes: 'Trip notes' };
      mockPtoSvc.listEntries.mockImplementation(() => Promise.resolve([fullRow]));
      const res = await app().request('/pto/entries');
      const [item] = (await res.json()) as any[];

      expect(item.id).toBe(FAKE_PTO_ROW.id);
      expect(item.startDate).toBe('2025-03-15');
      expect(item.endDate).toBe('2025-03-15');
      expect(item.hours).toBe(8);
      expect(item.type).toBe('vacation');
      expect(item.notes).toBe('Trip notes');
      expect(typeof item.createdAt).toBe('string');
      expect(item.deletedAt).toBeUndefined();
    });

    test('null notes become undefined in response', async () => {
      mockPtoSvc.listEntries.mockImplementation(() => Promise.resolve([FAKE_PTO_ROW]));
      const res = await app().request('/pto/entries');
      const [item] = (await res.json()) as any[];
      expect(item.notes).toBeUndefined();
    });
  });
});

// =====================================================================
// CHECKLISTS
// =====================================================================

describe('Checklist contract', () => {
  describe('inbound: full create payload', () => {
    test('201 with items including notes', async () => {
      const res = await post('/checklists', FULL_CHECKLIST_CREATE);
      expect(res.status).toBe(201);
    });

    test('service receives all fields including item notes', async () => {
      await post('/checklists', FULL_CHECKLIST_CREATE);
      const data = mockChecklistSvc.createChecklist.mock.calls[0][2];
      expect(data.title).toBe('March 2025 Closing');
      expect(data.period).toBe('2025-03');
      expect(data.items).toHaveLength(3);
      expect(data.items[1].notes).toBe('All paid except #4521');
    });
  });

  describe('inbound: update with completedAt', () => {
    test('completedAt ISO string is converted to Date for service', async () => {
      const isoString = '2025-03-31T23:59:59.000Z';
      await patch(`/checklists/${FAKE_CL_ID}`, { completedAt: isoString });
      const data = mockChecklistSvc.updateChecklist.mock.calls[0][2];
      expect(data.completedAt).toBeInstanceOf(Date);
      expect((data.completedAt as Date).toISOString()).toBe(isoString);
    });

    test('completedAt null passes through as null', async () => {
      await patch(`/checklists/${FAKE_CL_ID}`, { completedAt: null });
      const data = mockChecklistSvc.updateChecklist.mock.calls[0][2];
      expect(data.completedAt).toBeNull();
    });
  });

  describe('inbound: update items array', () => {
    test('200 with full items array', async () => {
      const res = await patch(`/checklists/${FAKE_CL_ID}`, {
        items: [
          { id: 'a', label: 'Reconcile', completed: true, notes: 'Done' },
          { id: 'b', label: 'New task', completed: false },
        ],
      });
      expect(res.status).toBe(200);
    });
  });

  describe('outbound: response shape matches Checklist type', () => {
    test('GET response has all Checklist fields', async () => {
      const rowWithCompleted = {
        ...FAKE_CHECKLIST_ROW,
        completedAt: new Date('2025-03-31T23:59:59.000Z'),
      };
      mockChecklistSvc.listChecklists.mockImplementation(() => Promise.resolve([rowWithCompleted]));
      const res = await app().request('/checklists');
      const [item] = (await res.json()) as any[];

      expect(item.id).toBe(FAKE_CHECKLIST_ROW.id);
      expect(item.type).toBe('end-of-month');
      expect(item.title).toBe('March Close');
      expect(item.period).toBe('2025-03-01');
      expect(item.items).toEqual([{ id: 'a', label: 'Reconcile', completed: false }]);
      expect(item.completedAt).toBe('2025-03-31T23:59:59.000Z');
      expect(typeof item.createdAt).toBe('string');
      expect(item.deletedAt).toBeUndefined();
    });

    test('completedAt is undefined when null in DB', async () => {
      mockChecklistSvc.listChecklists.mockImplementation(() => Promise.resolve([FAKE_CHECKLIST_ROW]));
      const res = await app().request('/checklists');
      const [item] = (await res.json()) as any[];
      expect(item.completedAt).toBeUndefined();
    });
  });
});

// =====================================================================
// DOCUMENTS
// =====================================================================

describe('Document contract', () => {
  describe('inbound: upload-url payload', () => {
    test('200 with realistic upload request', async () => {
      const res = await post('/documents/upload-url', {
        fileName: 'nursing-license-2026.pdf',
        mimeType: 'application/pdf',
        size: 245760,
      });
      expect(res.status).toBe(200);
    });

    test('200 with image upload', async () => {
      const res = await post('/documents/upload-url', {
        fileName: 'insurance-card.jpg',
        mimeType: 'image/jpeg',
        size: 1048576,
      });
      expect(res.status).toBe(200);
    });
  });

  describe('inbound: update document', () => {
    test('200 updating displayName', async () => {
      const res = await patch(`/documents/${FAKE_DOC_ID}`, {
        displayName: 'My Nursing License',
      });
      expect(res.status).toBe(200);
    });

    test('200 setting obligationId to null (unlinking)', async () => {
      const res = await patch(`/documents/${FAKE_DOC_ID}`, {
        obligationId: null,
      });
      expect(res.status).toBe(200);
    });
  });

  describe('outbound: response shape matches DocumentMeta type', () => {
    test('GET response uses type not mimeType', async () => {
      mockDocumentSvc.listDocuments.mockImplementation(() => Promise.resolve([FAKE_DOCUMENT_ROW]));
      const res = await app().request('/documents');
      const [item] = (await res.json()) as any[];

      expect(item.type).toBe('application/pdf');
      expect(item.mimeType).toBeUndefined();
    });

    test('GET response has all DocumentMeta fields', async () => {
      mockDocumentSvc.listDocuments.mockImplementation(() => Promise.resolve([FAKE_DOCUMENT_ROW]));
      const res = await app().request('/documents');
      const [item] = (await res.json()) as any[];

      expect(item.id).toBe(FAKE_DOCUMENT_ROW.id);
      expect(item.name).toBe('nursing-license-2026.pdf');
      expect(item.displayName).toBe('Nursing License');
      expect(typeof item.size).toBe('number');
      expect(typeof item.addedAt).toBe('string');
      expect(item.obligationId).toBe(FAKE_DOCUMENT_ROW.obligationId);
    });

    test('GET response excludes internal fields', async () => {
      mockDocumentSvc.listDocuments.mockImplementation(() => Promise.resolve([FAKE_DOCUMENT_ROW]));
      const res = await app().request('/documents');
      const [item] = (await res.json()) as any[];

      expect(item.s3Key).toBeUndefined();
      expect(item.organizationId).toBeUndefined();
      expect(item.userId).toBeUndefined();
    });
  });
});

// =====================================================================
// SETTINGS
// =====================================================================

describe('Settings contract', () => {
  describe('inbound: update with full defaultReminder', () => {
    test('200 with nested defaultReminder object', async () => {
      const res = await patch('/settings', {
        theme: 'dark',
        defaultReminder: {
          channels: ['email', 'sms'],
          daysBefore: 14,
          frequency: 'daily',
          time: '08:00',
        },
      });
      expect(res.status).toBe(200);
    });

    test('200 with theme only', async () => {
      const res = await patch('/settings', { theme: 'light' });
      expect(res.status).toBe(200);
    });
  });
});

// =====================================================================
// PROFILE
// =====================================================================

describe('Profile contract', () => {
  describe('inbound: update all fields', () => {
    test('200 with all profile fields', async () => {
      const res = await patch('/profile', {
        name: 'Jane Doe',
        phone: '+15551234567',
        jobTitle: 'Senior Nurse',
        timezone: 'America/Chicago',
      });
      expect(res.status).toBe(200);
    });
  });

  describe('outbound: response shape', () => {
    test('GET response has expected profile fields', async () => {
      const res = await app().request('/profile');
      const body = (await res.json()) as any;

      expect(body.id).toBeDefined();
      expect(body.email).toBeDefined();
      expect(body.name).toBeDefined();
      expect(typeof body.name).toBe('string');
    });
  });
});
