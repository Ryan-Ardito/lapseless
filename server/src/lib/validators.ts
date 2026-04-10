import { z } from 'zod';

// --- Shared helpers ---

const uuidString = z.string().uuid();
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

// --- Obligations ---

export const createObligationSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.enum(['license', 'ceu', 'tax', 'certification', 'insurance', 'credit-card', 'mailbox', 'other']),
  dueDate: dateString,
  startDate: dateString.optional(),
  referenceNumber: z.string().max(255).optional(),
  notes: z.string().max(5000).optional(),
  links: z.array(z.object({ label: z.string().max(255), url: z.string().url() })).optional(),
  recurrence: z.object({
    type: z.enum(['monthly', 'quarterly', 'yearly', 'biennial']),
    autoRenew: z.boolean().optional(),
  }).optional(),
  ceuTracking: z.object({
    required: z.number().int().min(0),
    completed: z.number().int().min(0).optional(),
  }).optional(),
  notification: z.object({
    channels: z.array(z.enum(['sms', 'email', 'browser'])).optional(),
    reminderDaysBefore: z.number().int().min(0).max(365).optional(),
    reminderFrequency: z.enum(['once', 'daily', 'weekly', 'custom']).optional(),
    reminderDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    reminderTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  }).optional(),
});

export const updateObligationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category: z.enum(['license', 'ceu', 'tax', 'certification', 'insurance', 'credit-card', 'mailbox', 'other']).optional(),
  dueDate: dateString.optional(),
  startDate: dateString.nullable().optional(),
  referenceNumber: z.string().max(255).nullable().optional(),
  notes: z.string().max(5000).optional(),
  links: z.array(z.object({ label: z.string().max(255), url: z.string().url() })).nullable().optional(),
  recurrence: z.object({
    type: z.enum(['monthly', 'quarterly', 'yearly', 'biennial']),
    autoRenew: z.boolean().optional(),
  }).nullable().optional(),
  ceuTracking: z.object({
    required: z.number().int().min(0),
    completed: z.number().int().min(0).optional(),
  }).nullable().optional(),
  notification: z.object({
    channels: z.array(z.enum(['sms', 'email', 'browser'])).optional(),
    reminderDaysBefore: z.number().int().min(0).max(365).optional(),
    reminderFrequency: z.enum(['once', 'daily', 'weekly', 'custom']).optional(),
    reminderDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    reminderTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    muted: z.boolean().optional(),
  }).optional(),
  completed: z.boolean().optional(),
});

// --- Documents ---

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export const uploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  size: z.number().int().positive().max(MAX_UPLOAD_SIZE),
});

export const registerDocumentSchema = z.object({
  name: z.string().min(1).max(255),
  displayName: z.string().max(255).optional(),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  size: z.number().int().positive().max(MAX_UPLOAD_SIZE),
  s3Key: z.string().regex(/^uploads\/[0-9a-f-]{36}\//, 'Invalid s3Key format'),
  obligationId: uuidString.optional(),
});

export const updateDocumentSchema = z.object({
  displayName: z.string().max(255).optional(),
  obligationId: uuidString.nullable().optional(),
});

// --- PTO ---

export const createPtoEntrySchema = z.object({
  startDate: dateString,
  endDate: dateString,
  hours: z.number().int().min(1).max(240),
  type: z.enum(['vacation', 'sick', 'personal', 'holiday', 'other']),
  notes: z.string().max(1000).optional(),
}).refine((d) => d.startDate <= d.endDate, {
  message: 'startDate must be on or before endDate',
  path: ['endDate'],
});

export const updatePtoEntrySchema = z.object({
  startDate: dateString.optional(),
  endDate: dateString.optional(),
  hours: z.number().int().min(1).max(240).optional(),
  type: z.enum(['vacation', 'sick', 'personal', 'holiday', 'other']).optional(),
  notes: z.string().max(1000).nullable().optional(),
}).refine((d) => {
  if (d.startDate && d.endDate) return d.startDate <= d.endDate;
  return true;
}, {
  message: 'startDate must be on or before endDate',
  path: ['endDate'],
});

export const upsertPtoConfigSchema = z.object({
  yearlyAllowance: z.number().int().min(0).max(8760),
  year: z.number().int().min(2000).max(2100),
});

export const updateOrgPtoConfigSchema = z.object({
  defaultYearlyAllowance: z.number().int().min(0).max(8760),
});

// --- Checklists ---

export const createChecklistSchema = z.object({
  type: z.enum(['end-of-month', 'end-of-year', 'custom']),
  title: z.string().min(1).max(255),
  period: z.string().min(1).max(100),
  items: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1).max(500),
    completed: z.boolean(),
    notes: z.string().max(1000).optional(),
  })),
});

export const updateChecklistSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  period: z.string().min(1).max(100).optional(),
  items: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1).max(500),
    completed: z.boolean(),
    notes: z.string().max(1000).optional(),
  })).optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

// --- Checklist Templates ---

export const createChecklistTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  items: z.array(z.string().min(1).max(500)).min(1).max(100),
  isOrg: z.boolean().optional(),
});

export const updateChecklistTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  items: z.array(z.string().min(1).max(500)).min(1).max(100).optional(),
});

// --- Profile ---

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  jobTitle: z.string().max(255).optional(),
  timezone: z.string().max(100).optional(),
});

// --- Settings ---

export const updateSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  defaultReminder: z.object({
    channels: z.array(z.enum(['sms', 'email', 'browser'])),
    daysBefore: z.number().int().min(0).max(365),
    frequency: z.enum(['once', 'daily', 'weekly']),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  }).optional(),
});

// --- Consent ---

export const upsertConsentSchema = z.object({
  version: z.string().min(1).max(50),
  essential: z.boolean().optional(),
  documentStorage: z.boolean().optional(),
  notificationData: z.boolean().optional(),
  analytics: z.boolean().optional(),
});

// --- 2FA ---

export const phoneE164Schema = z.string().regex(/^\+[1-9]\d{1,14}$/, 'Must be E.164 format (e.g. +15551234567)');
export const otpCodeSchema = z.string().length(6).regex(/^\d{6}$/, 'Must be a 6-digit code');

// --- Stripe ---

export const createCheckoutSchema = z.object({
  tier: z.enum(['solo', 'team', 'growth', 'scale']),
  orgId: z.string().uuid().optional(),
});

export const changeTierSchema = z.object({
  tier: z.enum(['solo', 'team', 'growth', 'scale']),
  orgId: z.string().uuid().optional(),
});

export const cancelDowngradeSchema = z.object({
  orgId: z.string().uuid().optional(),
});

// --- History ---

export const createHistoryEntrySchema = z.object({
  entityType: z.enum(['obligation', 'checklist', 'pto-entry', 'document']),
  entityId: z.string().uuid(),
  entityName: z.string().min(1).max(255),
  action: z.enum(['create', 'update', 'delete', 'complete', 'uncomplete']),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
  renewedId: z.string().uuid().optional(),
});

export const updateHistoryEntrySchema = z.object({
  undone: z.boolean(),
});

// --- Path param helpers ---

export const uuidParam = uuidString;

// --- Query param helpers ---

const obligationCategoryValues = ['license', 'ceu', 'tax', 'certification', 'insurance', 'credit-card', 'mailbox', 'other'] as const;
export type ObligationCategory = (typeof obligationCategoryValues)[number];

const validCategories = new Set<string>(obligationCategoryValues);

export function parseCategoryParam(raw: string | undefined): ObligationCategory | undefined {
  if (!raw || !validCategories.has(raw)) return undefined;
  return raw as ObligationCategory;
}

export function parseYearParam(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 2000 || n > 2100) return undefined;
  return n;
}
