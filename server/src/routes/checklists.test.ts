import { describe, expect, test, mock, beforeEach } from 'bun:test';
import { FAKE_USER, FAKE_CHECKLIST_ROW, createTestApp } from '../test/helpers';

mock.module('../lib/logger', () => ({
  logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
}));

const { errorHandler } = await import('../middleware/error-handler');

const mockSvc = {
  listChecklists: mock(() => Promise.resolve([])),
  createChecklist: mock(() => Promise.resolve(FAKE_CHECKLIST_ROW)),
  updateChecklist: mock(() => Promise.resolve(FAKE_CHECKLIST_ROW)),
  softDeleteChecklist: mock(() => Promise.resolve(FAKE_CHECKLIST_ROW)),
};

mock.module('../services/checklist.service', () => mockSvc);

const checklistsRoute = (await import('./checklists')).default;

function app() {
  const a = createTestApp();
  a.route('/checklists', checklistsRoute);
  a.onError(errorHandler);
  return a;
}

const VALID_BODY = {
  type: 'end-of-month',
  title: 'March Close',
  period: '2025-03-01',
  items: [{ id: 'a', label: 'Reconcile', completed: false }],
};
const FAKE_ID = FAKE_CHECKLIST_ROW.id;

beforeEach(() => {
  mockSvc.listChecklists.mockReset().mockImplementation(() => Promise.resolve([]));
  mockSvc.createChecklist.mockReset().mockImplementation(() => Promise.resolve(FAKE_CHECKLIST_ROW));
  mockSvc.updateChecklist.mockReset().mockImplementation(() => Promise.resolve(FAKE_CHECKLIST_ROW));
  mockSvc.softDeleteChecklist.mockReset().mockImplementation(() => Promise.resolve(FAKE_CHECKLIST_ROW));
});

describe('GET /checklists', () => {
  test('returns list', async () => {
    mockSvc.listChecklists.mockImplementation(() => Promise.resolve([FAKE_CHECKLIST_ROW]));
    const res = await app().request('/checklists');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any[];
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('March Close');
  });
});

describe('POST /checklists', () => {
  test('201 on valid', async () => {
    const res = await app().request('/checklists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_BODY),
    });
    expect(res.status).toBe(201);
  });

  test('400 on invalid body', async () => {
    const res = await app().request('/checklists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_BODY, title: '' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /checklists/:id', () => {
  test('404 not found', async () => {
    mockSvc.updateChecklist.mockImplementation(() => Promise.resolve(undefined as any));
    const res = await app().request(`/checklists/${FAKE_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated' }),
    });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /checklists/:id', () => {
  test('200 on success', async () => {
    const res = await app().request(`/checklists/${FAKE_ID}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
  });
});
