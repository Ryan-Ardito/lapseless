import { describe, expect, test, mock, beforeEach } from 'bun:test';
import { FAKE_USER, FAKE_PTO_ROW, createTestApp } from '../test/helpers';

mock.module('../lib/logger', () => ({
  logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
}));

const { errorHandler } = await import('../middleware/error-handler');

const mockSvc = {
  listEntries: mock(() => Promise.resolve([])),
  createEntry: mock(() => Promise.resolve(FAKE_PTO_ROW)),
  updateEntry: mock(() => Promise.resolve(FAKE_PTO_ROW)),
  softDeleteEntry: mock(() => Promise.resolve(FAKE_PTO_ROW)),
  getConfig: mock(() => Promise.resolve({ yearlyAllowance: 160, year: 2025 })),
  upsertConfig: mock(() => Promise.resolve({ yearlyAllowance: 160, year: 2025 })),
};

mock.module('../services/pto.service', () => mockSvc);

const ptoRoute = (await import('./pto')).default;

function app() {
  const a = createTestApp();
  a.route('/pto', ptoRoute);
  a.onError(errorHandler);
  return a;
}

const VALID_BODY = { startDate: '2025-03-15', endDate: '2025-03-15', hours: 8, type: 'vacation' };
const FAKE_ID = FAKE_PTO_ROW.id;

beforeEach(() => {
  mockSvc.listEntries.mockReset().mockImplementation(() => Promise.resolve([]));
  mockSvc.createEntry.mockReset().mockImplementation(() => Promise.resolve(FAKE_PTO_ROW));
  mockSvc.updateEntry.mockReset().mockImplementation(() => Promise.resolve(FAKE_PTO_ROW));
  mockSvc.softDeleteEntry.mockReset().mockImplementation(() => Promise.resolve(FAKE_PTO_ROW));
});

describe('GET /pto/entries', () => {
  test('returns entries', async () => {
    mockSvc.listEntries.mockImplementation(() => Promise.resolve([FAKE_PTO_ROW]));
    const res = await app().request('/pto/entries');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any[];
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(FAKE_ID);
  });

  test('year param passed to service', async () => {
    await app().request('/pto/entries?year=2025');
    expect(mockSvc.listEntries).toHaveBeenCalledWith(FAKE_USER.id, 2025);
  });

  test('invalid year ignored', async () => {
    await app().request('/pto/entries?year=abc');
    expect(mockSvc.listEntries).toHaveBeenCalledWith(FAKE_USER.id, undefined);
  });
});

describe('POST /pto/entries', () => {
  test('201 on valid', async () => {
    const res = await app().request('/pto/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_BODY),
    });
    expect(res.status).toBe(201);
  });

  test('201 on multi-day range', async () => {
    const rangeBody = { startDate: '2025-03-10', endDate: '2025-03-14', hours: 40, type: 'vacation' };
    const rangeRow = { ...FAKE_PTO_ROW, startDate: '2025-03-10', endDate: '2025-03-14', hours: 40 };
    mockSvc.createEntry.mockImplementation(() => Promise.resolve(rangeRow));
    const res = await app().request('/pto/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rangeBody),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.startDate).toBe('2025-03-10');
    expect(body.endDate).toBe('2025-03-14');
  });

  test('400 on invalid range (start > end)', async () => {
    const res = await app().request('/pto/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: '2025-03-20', endDate: '2025-03-15', hours: 8, type: 'vacation' }),
    });
    expect(res.status).toBe(400);
  });

  test('400 on invalid body', async () => {
    const res = await app().request('/pto/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: '2025-03-15', endDate: '2025-03-15', hours: 0, type: 'vacation' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /pto/entries/:id', () => {
  test('200 on valid', async () => {
    const res = await app().request(`/pto/entries/${FAKE_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours: 4 }),
    });
    expect(res.status).toBe(200);
  });

  test('404 not found', async () => {
    mockSvc.updateEntry.mockImplementation(() => Promise.resolve(undefined as any));
    const res = await app().request(`/pto/entries/${FAKE_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours: 4 }),
    });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /pto/entries/:id', () => {
  test('200 on success', async () => {
    const res = await app().request(`/pto/entries/${FAKE_ID}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
  });
});
