import { describe, expect, test } from 'bun:test';
import {
  createObligationSchema,
  updateObligationSchema,
  uploadUrlSchema,
  registerDocumentSchema,
  createPtoEntrySchema,
  createChecklistSchema,
  updateProfileSchema,
  updateSettingsSchema,
  upsertConsentSchema,
  createCheckoutSchema,
  parseCategoryParam,
  parseYearParam,
} from './validators';

// --- createObligationSchema ---

describe('createObligationSchema', () => {
  const minimal = { name: 'License', category: 'license', dueDate: '2025-06-15' };

  test('accepts minimal valid input', () => {
    expect(createObligationSchema.parse(minimal)).toMatchObject(minimal);
  });

  test('accepts full input', () => {
    const full = {
      ...minimal,
      startDate: '2025-01-01',
      referenceNumber: 'REF-123',
      notes: 'Some notes',
      links: [{ label: 'Portal', url: 'https://example.com' }],
      recurrence: { type: 'monthly', autoRenew: true },
      ceuTracking: { required: 40, completed: 10 },
      notification: { channels: ['email', 'sms'], reminderDaysBefore: 14, reminderFrequency: 'weekly' },
    };
    expect(() => createObligationSchema.parse(full)).not.toThrow();
  });

  test('rejects empty name', () => {
    expect(() => createObligationSchema.parse({ ...minimal, name: '' })).toThrow();
  });

  test('rejects bad category', () => {
    expect(() => createObligationSchema.parse({ ...minimal, category: 'invalid' })).toThrow();
  });

  test('rejects bad date format', () => {
    expect(() => createObligationSchema.parse({ ...minimal, dueDate: '06/15/2025' })).toThrow();
  });

  test('rejects invalid URL in links', () => {
    expect(() =>
      createObligationSchema.parse({ ...minimal, links: [{ label: 'x', url: 'not-a-url' }] }),
    ).toThrow();
  });

  test('rejects reminderDaysBefore > 365', () => {
    expect(() =>
      createObligationSchema.parse({
        ...minimal,
        notification: { reminderDaysBefore: 366 },
      }),
    ).toThrow();
  });

  test('rejects negative CEU', () => {
    expect(() =>
      createObligationSchema.parse({ ...minimal, ceuTracking: { required: -1 } }),
    ).toThrow();
  });

  test('rejects name > 255 chars', () => {
    expect(() =>
      createObligationSchema.parse({ ...minimal, name: 'x'.repeat(256) }),
    ).toThrow();
  });
});

// --- updateObligationSchema ---

describe('updateObligationSchema', () => {
  test('accepts empty object', () => {
    expect(updateObligationSchema.parse({})).toEqual({});
  });

  test('accepts nullable fields', () => {
    const result = updateObligationSchema.parse({ startDate: null, links: null });
    expect(result.startDate).toBeNull();
    expect(result.links).toBeNull();
  });

  test('rejects bad values', () => {
    expect(() => updateObligationSchema.parse({ category: 'nope' })).toThrow();
  });

  test('completed must be boolean', () => {
    expect(() => updateObligationSchema.parse({ completed: 'yes' })).toThrow();
    expect(updateObligationSchema.parse({ completed: true }).completed).toBe(true);
  });
});

// --- uploadUrlSchema ---

describe('uploadUrlSchema', () => {
  test('accepts valid input', () => {
    expect(() => uploadUrlSchema.parse({ fileName: 'doc.pdf', mimeType: 'application/pdf', size: 1024 })).not.toThrow();
  });

  test('rejects size <= 0', () => {
    expect(() => uploadUrlSchema.parse({ fileName: 'doc.pdf', mimeType: 'application/pdf', size: 0 })).toThrow();
  });

  test('rejects missing fileName', () => {
    expect(() => uploadUrlSchema.parse({ mimeType: 'application/pdf', size: 1024 })).toThrow();
  });
});

// --- registerDocumentSchema ---

describe('registerDocumentSchema', () => {
  const valid = {
    name: 'doc.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    s3Key: 'uploads/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/doc.pdf',
  };

  test('accepts valid input', () => {
    expect(() => registerDocumentSchema.parse(valid)).not.toThrow();
  });

  test('rejects invalid s3Key format', () => {
    expect(() => registerDocumentSchema.parse({ ...valid, s3Key: 'bad/path' })).toThrow();
  });

  test('accepts optional UUID obligationId', () => {
    const result = registerDocumentSchema.parse({
      ...valid,
      obligationId: '11111111-2222-3333-4444-555555555555',
    });
    expect(result.obligationId).toBe('11111111-2222-3333-4444-555555555555');
  });
});

// --- createPtoEntrySchema ---

describe('createPtoEntrySchema', () => {
  const valid = { startDate: '2025-03-15', endDate: '2025-03-15', hours: 8, type: 'vacation' };

  test('accepts valid input', () => {
    expect(() => createPtoEntrySchema.parse(valid)).not.toThrow();
  });

  test('accepts multi-day range', () => {
    expect(() => createPtoEntrySchema.parse({ ...valid, startDate: '2025-03-10', endDate: '2025-03-14', hours: 40 })).not.toThrow();
  });

  test('rejects start > end', () => {
    expect(() => createPtoEntrySchema.parse({ ...valid, startDate: '2025-03-20', endDate: '2025-03-15' })).toThrow();
  });

  test('rejects hours = 0', () => {
    expect(() => createPtoEntrySchema.parse({ ...valid, hours: 0 })).toThrow();
  });

  test('rejects hours = 241', () => {
    expect(() => createPtoEntrySchema.parse({ ...valid, hours: 241 })).toThrow();
  });

  test('rejects bad type', () => {
    expect(() => createPtoEntrySchema.parse({ ...valid, type: 'nope' })).toThrow();
  });

  test('rejects notes > 1000', () => {
    expect(() => createPtoEntrySchema.parse({ ...valid, notes: 'x'.repeat(1001) })).toThrow();
  });
});

// --- createChecklistSchema ---

describe('createChecklistSchema', () => {
  const valid = {
    type: 'end-of-month',
    title: 'March Close',
    period: '2025-03-01',
    items: [{ id: 'a', label: 'Reconcile', completed: false }],
  };

  test('accepts valid with items', () => {
    expect(() => createChecklistSchema.parse(valid)).not.toThrow();
  });

  test('rejects empty title', () => {
    expect(() => createChecklistSchema.parse({ ...valid, title: '' })).toThrow();
  });

  test('rejects empty item id', () => {
    expect(() =>
      createChecklistSchema.parse({ ...valid, items: [{ id: '', label: 'x', completed: false }] }),
    ).toThrow();
  });
});

// --- updateProfileSchema ---

describe('updateProfileSchema', () => {
  test('accepts partial', () => {
    expect(updateProfileSchema.parse({ name: 'New Name' })).toEqual({ name: 'New Name' });
  });

  test('rejects name > 255', () => {
    expect(() => updateProfileSchema.parse({ name: 'x'.repeat(256) })).toThrow();
  });
});

// --- updateSettingsSchema ---

describe('updateSettingsSchema', () => {
  test('accepts valid theme', () => {
    expect(updateSettingsSchema.parse({ theme: 'dark' }).theme).toBe('dark');
  });

  test('rejects invalid theme', () => {
    expect(() => updateSettingsSchema.parse({ theme: 'blue' })).toThrow();
  });

  test('accepts nested defaultReminder', () => {
    const result = updateSettingsSchema.parse({
      defaultReminder: { channels: ['email'], daysBefore: 7, frequency: 'daily' },
    });
    expect(result.defaultReminder!.daysBefore).toBe(7);
  });
});

// --- upsertConsentSchema ---

describe('upsertConsentSchema', () => {
  test('accepts valid input', () => {
    expect(() => upsertConsentSchema.parse({ version: '1.0' })).not.toThrow();
  });

  test('rejects empty version', () => {
    expect(() => upsertConsentSchema.parse({ version: '' })).toThrow();
  });
});

// --- createCheckoutSchema ---

describe('createCheckoutSchema', () => {
  test('accepts valid tier', () => {
    expect(createCheckoutSchema.parse({ tier: 'growth' }).tier).toBe('growth');
  });

  test('rejects invalid tier', () => {
    expect(() => createCheckoutSchema.parse({ tier: 'enterprise' })).toThrow();
  });
});

// --- parseCategoryParam ---

describe('parseCategoryParam', () => {
  test('undefined → undefined', () => {
    expect(parseCategoryParam(undefined)).toBeUndefined();
  });

  test('empty → undefined', () => {
    expect(parseCategoryParam('')).toBeUndefined();
  });

  test('invalid → undefined', () => {
    expect(parseCategoryParam('nope')).toBeUndefined();
  });

  test('valid → value', () => {
    expect(parseCategoryParam('license')).toBe('license');
    expect(parseCategoryParam('credit-card')).toBe('credit-card');
  });
});

// --- parseYearParam ---

describe('parseYearParam', () => {
  test('undefined → undefined', () => {
    expect(parseYearParam(undefined)).toBeUndefined();
  });

  test('NaN → undefined', () => {
    expect(parseYearParam('abc')).toBeUndefined();
  });

  test('< 2000 → undefined', () => {
    expect(parseYearParam('1999')).toBeUndefined();
  });

  test('> 2100 → undefined', () => {
    expect(parseYearParam('2101')).toBeUndefined();
  });

  test('valid → number', () => {
    expect(parseYearParam('2025')).toBe(2025);
  });
});
