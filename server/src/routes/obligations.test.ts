import { describe, expect, test, mock, beforeEach } from 'bun:test';
import { FAKE_USER, FAKE_OBLIGATION_ROW, createTestApp } from '../test/helpers';

// Mock logger before importing error handler
mock.module('../lib/logger', () => ({
  logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
}));

const { errorHandler } = await import('../middleware/error-handler');

// --- Mocks ---

const mockSvc = {
  listObligations: mock(() => Promise.resolve([])),
  createObligation: mock(() => Promise.resolve(FAKE_OBLIGATION_ROW)),
  updateObligation: mock(() => Promise.resolve(FAKE_OBLIGATION_ROW)),
  softDeleteObligation: mock(() => Promise.resolve(FAKE_OBLIGATION_ROW)),
  toggleComplete: mock(() => Promise.resolve({ updated: FAKE_OBLIGATION_ROW, renewed: null })),
};

mock.module('../services/obligation.service', () => mockSvc);
mock.module('../middleware/plan-enforcement', () => ({
  checkObligationLimit: mock(() => Promise.resolve()),
}));

// Must import after mocks
const obligationsRoute = (await import('./obligations')).default;

function app() {
  const a = createTestApp();
  a.route('/obligations', obligationsRoute);
  a.onError(errorHandler);
  return a;
}

const VALID_BODY = { name: 'License', category: 'license', dueDate: '2025-06-15' };
const FAKE_ID = FAKE_OBLIGATION_ROW.id;
const BAD_UUID = 'not-a-uuid';

beforeEach(() => {
  mockSvc.listObligations.mockReset();
  mockSvc.createObligation.mockReset();
  mockSvc.updateObligation.mockReset();
  mockSvc.softDeleteObligation.mockReset();
  mockSvc.toggleComplete.mockReset();

  mockSvc.listObligations.mockImplementation(() => Promise.resolve([]));
  mockSvc.createObligation.mockImplementation(() => Promise.resolve(FAKE_OBLIGATION_ROW));
  mockSvc.updateObligation.mockImplementation(() => Promise.resolve(FAKE_OBLIGATION_ROW));
  mockSvc.softDeleteObligation.mockImplementation(() => Promise.resolve(FAKE_OBLIGATION_ROW));
  mockSvc.toggleComplete.mockImplementation(() =>
    Promise.resolve({ updated: FAKE_OBLIGATION_ROW, renewed: null }),
  );
});

// --- GET / ---

describe('GET /obligations', () => {
  test('empty list', async () => {
    const res = await app().request('/obligations');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test('response shape mapping', async () => {
    mockSvc.listObligations.mockImplementation(() => Promise.resolve([FAKE_OBLIGATION_ROW]));
    const res = await app().request('/obligations');
    const [item] = (await res.json()) as any[];
    expect(item.id).toBe(FAKE_ID);
    expect(item.name).toBe('State License');
    expect(item.notification.channels).toEqual(['email']);
    // DB fields should be mapped, not raw
    expect(item.recurrenceType).toBeUndefined();
  });

  test('category filter passed to service', async () => {
    await app().request('/obligations?category=license');
    expect(mockSvc.listObligations).toHaveBeenCalledWith(FAKE_USER.id, {
      category: 'license',
      completed: undefined,
    });
  });

  test('status filter: completed', async () => {
    await app().request('/obligations?status=completed');
    expect(mockSvc.listObligations).toHaveBeenCalledWith(FAKE_USER.id, {
      category: undefined,
      completed: true,
    });
  });
});

// --- POST / ---

describe('POST /obligations', () => {
  test('201 on valid body', async () => {
    const res = await app().request('/obligations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_BODY),
    });
    expect(res.status).toBe(201);
  });

  test('correct service args', async () => {
    await app().request('/obligations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_BODY),
    });
    expect(mockSvc.createObligation).toHaveBeenCalledWith(FAKE_USER.id, expect.objectContaining({
      name: 'License',
      category: 'license',
      dueDate: '2025-06-15',
    }));
  });

  test('400 on empty name', async () => {
    const res = await app().request('/obligations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_BODY, name: '' }),
    });
    expect(res.status).toBe(400);
  });

  test('400 on missing fields', async () => {
    const res = await app().request('/obligations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x' }),
    });
    expect(res.status).toBe(400);
  });
});

// --- PATCH /:id ---

describe('PATCH /obligations/:id', () => {
  test('200 on valid update', async () => {
    const res = await app().request(`/obligations/${FAKE_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(200);
  });

  test('400 on bad UUID', async () => {
    const res = await app().request(`/obligations/${BAD_UUID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x' }),
    });
    expect(res.status).toBe(400);
  });

  test('404 not found', async () => {
    mockSvc.updateObligation.mockImplementation(() => Promise.resolve(undefined as any));
    const res = await app().request(`/obligations/${FAKE_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x' }),
    });
    expect(res.status).toBe(404);
  });

  test('nested field mapping (recurrence → recurrenceType)', async () => {
    await app().request(`/obligations/${FAKE_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recurrence: { type: 'monthly', autoRenew: true } }),
    });
    expect(mockSvc.updateObligation).toHaveBeenCalledWith(
      FAKE_USER.id,
      FAKE_ID,
      expect.objectContaining({ recurrenceType: 'monthly', recurrenceAutoRenew: true }),
    );
  });
});

// --- DELETE /:id ---

describe('DELETE /obligations/:id', () => {
  test('200 on success', async () => {
    const res = await app().request(`/obligations/${FAKE_ID}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
  });

  test('400 on bad UUID', async () => {
    const res = await app().request(`/obligations/${BAD_UUID}`, { method: 'DELETE' });
    expect(res.status).toBe(400);
  });

  test('404 not found', async () => {
    mockSvc.softDeleteObligation.mockImplementation(() => Promise.resolve(undefined as any));
    const res = await app().request(`/obligations/${FAKE_ID}`, { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});

// --- POST /:id/toggle ---

describe('POST /obligations/:id/toggle', () => {
  test('200 response shape', async () => {
    const res = await app().request(`/obligations/${FAKE_ID}/toggle`, { method: 'POST' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.updated.id).toBe(FAKE_ID);
  });

  test('renewed undefined when null', async () => {
    const res = await app().request(`/obligations/${FAKE_ID}/toggle`, { method: 'POST' });
    const body = (await res.json()) as any;
    expect(body.renewed).toBeUndefined();
  });

  test('404 not found', async () => {
    mockSvc.toggleComplete.mockImplementation(() => Promise.resolve(null as any));
    const res = await app().request(`/obligations/${FAKE_ID}/toggle`, { method: 'POST' });
    expect(res.status).toBe(404);
  });
});
