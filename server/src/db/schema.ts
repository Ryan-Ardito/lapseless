import {
  pgTable,
  uuid,
  text,
  date,
  boolean,
  integer,
  bigint,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// --- Enums ---

export const categoryEnum = pgEnum('category', [
  'license', 'ceu', 'tax', 'certification', 'insurance', 'credit-card', 'mailbox', 'other',
]);

export const channelEnum = pgEnum('channel', ['sms', 'email', 'whatsapp', 'browser']);

export const recurrenceTypeEnum = pgEnum('recurrence_type', ['monthly', 'quarterly', 'yearly']);

export const reminderFrequencyEnum = pgEnum('reminder_frequency', ['once', 'daily', 'weekly']);

export const ptoTypeEnum = pgEnum('pto_type', ['vacation', 'sick', 'personal', 'holiday', 'other']);

export const checklistTypeEnum = pgEnum('checklist_type', ['end-of-month', 'end-of-year', 'custom']);

export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'solo', 'team', 'growth', 'scale',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete',
]);

export const deliveryStatusEnum = pgEnum('delivery_status', [
  'pending', 'delivered', 'failed', 'skipped',
]);

// --- Tables ---

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  googleId: text('google_id').unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull().default(''),
  phone: text('phone').notNull().default(''),
  jobTitle: text('job_title').notNull().default(''),
  timezone: text('timezone').notNull().default('America/New_York'),
  avatarUrl: text('avatar_url'),
  phoneVerified: boolean('phone_verified').notNull().default(false),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('sessions_user_id_idx').on(t.userId),
  index('sessions_expires_at_idx').on(t.expiresAt),
]);

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripePriceId: text('stripe_price_id'),
  tier: subscriptionTierEnum('tier').notNull().default('solo'),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  smsUsedThisMonth: integer('sms_used_this_month').notNull().default(0),
  smsResetAt: timestamp('sms_reset_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const obligations = pgTable('obligations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: categoryEnum('category').notNull(),
  dueDate: date('due_date', { mode: 'string' }).notNull(),
  startDate: date('start_date', { mode: 'string' }),
  referenceNumber: text('reference_number'),
  notes: text('notes').notNull().default(''),
  links: jsonb('links').$type<{ label: string; url: string }[]>(),
  recurrenceType: recurrenceTypeEnum('recurrence_type'),
  recurrenceAutoRenew: boolean('recurrence_auto_renew').notNull().default(false),
  ceuRequired: integer('ceu_required'),
  ceuCompleted: integer('ceu_completed'),
  notificationChannels: jsonb('notification_channels').$type<string[]>().notNull().default([]),
  reminderDaysBefore: integer('reminder_days_before').notNull().default(7),
  reminderFrequency: reminderFrequencyEnum('reminder_frequency').default('once'),
  completed: boolean('completed').notNull().default(false),
  notificationsMuted: boolean('notifications_muted').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('obligations_user_id_idx').on(t.userId),
  index('obligations_due_date_idx').on(t.dueDate),
  index('obligations_user_completed_idx').on(t.userId, t.completed),
]);

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  obligationId: uuid('obligation_id').references(() => obligations.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  displayName: text('display_name'),
  mimeType: text('mime_type').notNull(),
  size: bigint('size', { mode: 'number' }).notNull(),
  s3Key: text('s3_key').notNull(),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('documents_user_id_idx').on(t.userId),
  index('documents_obligation_id_idx').on(t.obligationId),
]);

export const ptoEntries = pgTable('pto_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  startDate: date('start_date', { mode: 'string' }).notNull(),
  endDate: date('end_date', { mode: 'string' }).notNull(),
  hours: integer('hours').notNull(),
  type: ptoTypeEnum('type').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('pto_entries_user_id_idx').on(t.userId),
]);

export const ptoConfig = pgTable('pto_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  yearlyAllowance: integer('yearly_allowance').notNull().default(160),
  year: integer('year').notNull(),
}, (t) => [
  uniqueIndex('pto_config_user_year_idx').on(t.userId, t.year),
]);

export const checklists = pgTable('checklists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: checklistTypeEnum('type').notNull(),
  title: text('title').notNull(),
  period: date('period', { mode: 'string' }).notNull(),
  items: jsonb('items').$type<{ id: string; label: string; completed: boolean; notes?: string }[]>().notNull().default([]),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('checklists_user_id_idx').on(t.userId),
]);

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  obligationId: uuid('obligation_id').references(() => obligations.id, { onDelete: 'cascade' }),
  obligationName: text('obligation_name').notNull(),
  channel: channelEnum('channel').notNull(),
  message: text('message').notNull(),
  triggeredAt: timestamp('triggered_at', { withTimezone: true }).notNull().defaultNow(),
  read: boolean('read').notNull().default(false),
  deliveryStatus: deliveryStatusEnum('delivery_status').notNull().default('pending'),
  deliveryAttempts: integer('delivery_attempts').notNull().default(0),
  deliveryError: text('delivery_error'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('notifications_user_id_idx').on(t.userId),
  index('notifications_user_read_idx').on(t.userId, t.read),
  index('notifications_delivery_pending_idx').on(t.deliveryStatus, t.channel),
]);

export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  theme: text('theme').notNull().default('system'),
  defaultReminder: jsonb('default_reminder').$type<{
    channels: string[];
    daysBefore: number;
    frequency: string;
  }>().notNull().default({ channels: ['email'], daysBefore: 7, frequency: 'once' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const consent = pgTable('consent', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  version: text('version').notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  essential: boolean('essential').notNull().default(true),
  documentStorage: boolean('document_storage').notNull().default(false),
  notificationData: boolean('notification_data').notNull().default(false),
  analytics: boolean('analytics').notNull().default(false),
});

export const otpCodes = pgTable('otp_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  type: text('type').notNull(), // 'phone_verification' | '2fa_login'
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').notNull().default(false),
  attempts: integer('attempts').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('otp_codes_user_id_idx').on(t.userId),
  index('otp_codes_expires_at_idx').on(t.expiresAt),
]);

export const pending2faTokens = pgTable('pending_2fa_tokens', {
  id: text('id').primaryKey(), // hashed token
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (t) => [
  index('pending_2fa_tokens_user_id_idx').on(t.userId),
  index('pending_2fa_tokens_expires_at_idx').on(t.expiresAt),
]);
