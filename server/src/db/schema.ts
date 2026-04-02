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
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// --- Enums ---

export const categoryEnum = pgEnum('category', [
  'license', 'ceu', 'tax', 'certification', 'insurance', 'credit-card', 'mailbox', 'other',
]);

export const channelEnum = pgEnum('channel', ['sms', 'email', 'browser']);

export const recurrenceTypeEnum = pgEnum('recurrence_type', ['monthly', 'quarterly', 'yearly', 'biennial']);

export const reminderFrequencyEnum = pgEnum('reminder_frequency', ['once', 'daily', 'weekly', 'custom']);

export const ptoTypeEnum = pgEnum('pto_type', ['vacation', 'sick', 'personal', 'holiday', 'other']);

export const checklistTypeEnum = pgEnum('checklist_type', ['end-of-month', 'end-of-year', 'custom']);

export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'demo', 'solo', 'team', 'growth', 'scale',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete',
]);

export const deliveryStatusEnum = pgEnum('delivery_status', [
  'pending', 'delivered', 'failed', 'skipped',
]);

export const orgRoleEnum = pgEnum('org_role', ['owner', 'admin', 'member']);

export const historyActionEnum = pgEnum('history_action', [
  'create', 'update', 'delete', 'complete', 'uncomplete',
]);

export const historyEntityTypeEnum = pgEnum('history_entity_type', [
  'obligation', 'checklist', 'pto-entry', 'document',
]);

export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending', 'accepted', 'expired', 'revoked',
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
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripePriceId: text('stripe_price_id'),
  tier: subscriptionTierEnum('tier').notNull().default('demo'),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  smsUsedThisMonth: integer('sms_used_this_month').notNull().default(0),
  smsResetAt: timestamp('sms_reset_at', { withTimezone: true }),
  pendingTier: subscriptionTierEnum('pending_tier'),
  pendingTierScheduledAt: timestamp('pending_tier_scheduled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('organizations_owner_id_idx').on(t.ownerId),
]);

export const organizationMembers = pgTable('organization_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: orgRoleEnum('role').notNull().default('member'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('org_members_org_user_idx').on(t.organizationId, t.userId),
  index('org_members_user_id_idx').on(t.userId),
  index('org_members_org_id_idx').on(t.organizationId),
]);

export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  invitedByUserId: uuid('invited_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  email: text('email').notNull(),
  role: orgRoleEnum('role').notNull().default('member'),
  token: text('token').notNull().unique(),
  status: invitationStatusEnum('status').notNull().default('pending'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  acceptedByUserId: uuid('accepted_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('invitations_org_id_idx').on(t.organizationId),
  uniqueIndex('invitations_token_idx').on(t.token),
  index('invitations_email_idx').on(t.email),
  uniqueIndex('invitations_org_email_pending_idx').on(t.organizationId, t.email).where(sql`${t.status} = 'pending'`),
  check('invitations_role_check', sql`${t.role} IN ('admin', 'member')`),
]);

export const obligations = pgTable('obligations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
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
  reminderDates: jsonb('reminder_dates').$type<string[]>().notNull().default([]),
  reminderTime: text('reminder_time'),
  completed: boolean('completed').notNull().default(false),
  notificationsMuted: boolean('notifications_muted').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('obligations_org_id_idx').on(t.organizationId),
  index('obligations_due_date_idx').on(t.dueDate),
  index('obligations_org_completed_idx').on(t.organizationId, t.completed),
  index('obligations_org_user_idx').on(t.organizationId, t.userId),
  check('ceu_validity_check', sql`${t.ceuCompleted} IS NULL OR ${t.ceuRequired} IS NULL OR ${t.ceuCompleted} <= ${t.ceuRequired}`),
]);

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
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
  index('documents_org_id_idx').on(t.organizationId),
  index('documents_obligation_id_idx').on(t.obligationId),
  index('documents_org_user_idx').on(t.organizationId, t.userId),
]);

export const ptoEntries = pgTable('pto_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
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
  index('pto_entries_org_id_idx').on(t.organizationId),
  index('pto_entries_org_user_idx').on(t.organizationId, t.userId),
]);

export const ptoConfig = pgTable('pto_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  yearlyAllowance: integer('yearly_allowance').notNull().default(160),
  year: integer('year').notNull(),
}, (t) => [
  uniqueIndex('pto_config_org_user_year_idx').on(t.organizationId, t.userId, t.year),
]);

export const checklists = pgTable('checklists', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: checklistTypeEnum('type').notNull(),
  title: text('title').notNull(),
  period: text('period').notNull(),
  items: jsonb('items').$type<{ id: string; label: string; completed: boolean; notes?: string }[]>().notNull().default([]),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('checklists_org_id_idx').on(t.organizationId),
  index('checklists_org_user_idx').on(t.organizationId, t.userId),
]);

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
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
  scheduledDate: date('scheduled_date', { mode: 'string' }),
  deliverAfter: timestamp('deliver_after', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('notifications_org_user_idx').on(t.organizationId, t.userId),
  index('notifications_org_user_read_idx').on(t.organizationId, t.userId, t.read),
  index('notifications_delivery_pending_idx').on(t.deliveryStatus, t.channel),
  uniqueIndex('notifications_obligation_channel_date_idx')
    .on(t.obligationId, t.channel, t.scheduledDate)
    .where(sql`${t.obligationId} IS NOT NULL AND ${t.scheduledDate} IS NOT NULL`),
]);

export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  theme: text('theme').notNull().default('system'),
  defaultReminder: jsonb('default_reminder').$type<{
    channels: string[];
    daysBefore: number;
    frequency: string;
    time?: string;
  }>().notNull().default({ channels: ['email'], daysBefore: 7, frequency: 'once', time: '09:00' }),
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

export const stripeWebhookEvents = pgTable('stripe_webhook_events', {
  id: text('id').primaryKey(), // Stripe event ID (evt_xxx)
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pending2faTokens = pgTable('pending_2fa_tokens', {
  id: text('id').primaryKey(), // hashed token
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (t) => [
  index('pending_2fa_tokens_user_id_idx').on(t.userId),
  index('pending_2fa_tokens_expires_at_idx').on(t.expiresAt),
]);

export const pendingEmails = pgTable('pending_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  to: text('to').notNull(),
  subject: text('subject').notNull(),
  html: text('html').notNull(),
  textContent: text('text_content').notNull(),
  status: deliveryStatusEnum('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('pending_emails_status_idx').on(t.status),
]);

export const historyEntries = pgTable('history_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entityType: historyEntityTypeEnum('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  entityName: text('entity_name').notNull(),
  action: historyActionEnum('action').notNull(),
  before: jsonb('before'),
  after: jsonb('after'),
  undone: boolean('undone').notNull().default(false),
  renewedId: uuid('renewed_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('history_entries_org_id_idx').on(t.organizationId),
  index('history_entries_org_user_idx').on(t.organizationId, t.userId),
  index('history_entries_created_at_idx').on(t.createdAt),
]);
