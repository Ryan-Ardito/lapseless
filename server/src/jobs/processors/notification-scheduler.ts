import { db } from '../../db';
import { obligations, notifications, subscriptions, users, organizations, userSettings } from '../../db/schema';
import { eq, and, isNull, inArray, desc } from 'drizzle-orm';
import { PLAN_LIMITS, type Tier } from '../../lib/plan-limits';
import { createNotification } from '../../services/notification.service';
import { getTodayInTimezone } from '../../lib/date-math';

const LOOKBACK_DAYS = 7;

/** Convert a date + time in a timezone to a UTC Date object. */
function toUtcTimestamp(dateStr: string, timeStr: string, timezone: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);

  // Start with the target time as if it were UTC
  const utcGuess = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  const guessDate = new Date(utcGuess);

  // Find the timezone offset at this instant by round-tripping through the timezone
  const localStr = guessDate.toLocaleString('sv-SE', { timeZone: timezone });
  const localDate = new Date(localStr + 'Z');
  const offsetMs = localDate.getTime() - guessDate.getTime();

  // Adjust: target_utc = target_local_as_utc - offset
  return new Date(utcGuess - offsetMs);
}

/** Get YYYY-MM-DD strings for the last N days in a timezone, most recent first. */
function getLastNDays(timezone: string, n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    days.push(d.toLocaleDateString('en-CA', { timeZone: timezone }));
  }
  // Deduplicate in case of DST transitions producing the same date
  return [...new Set(days)];
}

/**
 * Find the most recent reminder date for an obligation within the lookback window.
 * Returns null if no reminder date applies.
 */
function findMostRecentReminderDate(
  obl: { reminderDates: unknown; reminderFrequency: string | null; reminderDaysBefore: number; dueDate: string },
  timezone: string,
): string | null {
  const reminderDates = (obl.reminderDates ?? []) as string[];
  const frequency = obl.reminderFrequency ?? 'once';
  const recentDays = getLastNDays(timezone, LOOKBACK_DAYS);

  if (frequency === 'custom') {
    if (reminderDates.length === 0) return null;
    return recentDays.find((d) => reminderDates.includes(d)) ?? null;
  } else if (reminderDates.length > 0) {
    // Rule-based with pre-computed dates
    return recentDays.find((d) => reminderDates.includes(d)) ?? null;
  } else {
    // Legacy path: check which recent days fall within reminderDaysBefore of dueDate
    const dueDate = new Date(obl.dueDate + 'T00:00:00');
    for (const day of recentDays) {
      const dayDate = new Date(day + 'T00:00:00');
      const daysUntilDue = Math.ceil((dueDate.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue >= 0 && daysUntilDue <= obl.reminderDaysBefore) return day;
    }
    return null;
  }
}

export async function processNotificationScheduler() {
  // 1. Fetch all active obligations (excluding soft-deleted orgs)
  const allObligations = await db
    .select({
      id: obligations.id,
      organizationId: obligations.organizationId,
      userId: obligations.userId,
      name: obligations.name,
      category: obligations.category,
      dueDate: obligations.dueDate,
      completed: obligations.completed,
      notificationsMuted: obligations.notificationsMuted,
      notificationChannels: obligations.notificationChannels,
      reminderDaysBefore: obligations.reminderDaysBefore,
      reminderFrequency: obligations.reminderFrequency,
      reminderDates: obligations.reminderDates,
      reminderTime: obligations.reminderTime,
    })
    .from(obligations)
    .innerJoin(organizations, eq(organizations.id, obligations.organizationId))
    .where(and(eq(obligations.completed, false), isNull(obligations.deletedAt), isNull(organizations.deletedAt)));

  if (allObligations.length === 0) return;

  const now = new Date();

  // 2. Pre-fetch users (with timezone) and user settings in bulk
  const userIds = [...new Set(allObligations.map((o) => o.userId))];

  const allUsers = await db
    .select({ id: users.id, phone: users.phone, email: users.email, phoneVerified: users.phoneVerified, timezone: users.timezone })
    .from(users)
    .where(inArray(users.id, userIds));
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const allSettings = await db
    .select({ userId: userSettings.userId, defaultReminder: userSettings.defaultReminder })
    .from(userSettings)
    .where(inArray(userSettings.userId, userIds));
  const settingsMap = new Map(allSettings.map((s) => [s.userId, s]));

  // 3. Find obligations with a reminder date in the lookback window
  type EligibleObligation = (typeof allObligations)[number] & { scheduledDate: string };
  const eligibleObligations: EligibleObligation[] = [];

  for (const obl of allObligations) {
    if (obl.notificationsMuted) continue;

    const user = userMap.get(obl.userId);
    const timezone = user?.timezone ?? 'America/New_York';

    const scheduledDate = findMostRecentReminderDate(obl, timezone);
    if (!scheduledDate) continue;

    eligibleObligations.push({ ...obl, scheduledDate });
  }

  // 4. For legacy obligations (no reminderDates), apply frequency-based deduplication
  const legacyObligationIds = eligibleObligations
    .filter((o) => !((o.reminderDates ?? []) as string[]).length)
    .map((o) => o.id);

  const existingLegacyNotifs =
    legacyObligationIds.length > 0
      ? await db
          .select({ obligationId: notifications.obligationId, triggeredAt: notifications.triggeredAt })
          .from(notifications)
          .where(inArray(notifications.obligationId, legacyObligationIds))
          .orderBy(desc(notifications.triggeredAt))
      : [];

  const latestLegacyNotifMap = new Map<string, Date>();
  for (const notif of existingLegacyNotifs) {
    if (notif.obligationId && !latestLegacyNotifMap.has(notif.obligationId)) {
      latestLegacyNotifMap.set(notif.obligationId, notif.triggeredAt);
    }
  }

  const filteredObligations = eligibleObligations.filter((obl) => {
    const reminderDates = (obl.reminderDates ?? []) as string[];
    if (reminderDates.length > 0) return true; // date-based: unique index handles dedup

    const frequency = obl.reminderFrequency ?? 'once';
    const lastTriggered = latestLegacyNotifMap.get(obl.id);
    if (!lastTriggered) return true;

    const elapsed = now.getTime() - lastTriggered.getTime();
    if (frequency === 'once') return false;
    if (frequency === 'daily' && elapsed < 24 * 60 * 60 * 1000) return false;
    if (frequency === 'weekly' && elapsed < 7 * 24 * 60 * 60 * 1000) return false;
    return true;
  });

  // 5. Pre-fetch org owners and subscriptions in bulk
  const orgIds = [...new Set(allObligations.map((o) => o.organizationId))];

  const orgOwners = await db
    .select({ orgId: organizations.id, ownerId: organizations.ownerId })
    .from(organizations)
    .where(inArray(organizations.id, orgIds));
  const orgOwnerMap = new Map(orgOwners.map((o) => [o.orgId, o.ownerId]));

  const ownerIds = [...new Set(orgOwners.map((o) => o.ownerId))];
  const allSubs =
    ownerIds.length > 0
      ? await db
          .select({ userId: subscriptions.userId, tier: subscriptions.tier, smsUsed: subscriptions.smsUsedThisMonth })
          .from(subscriptions)
          .where(inArray(subscriptions.userId, ownerIds))
      : [];
  const subMap = new Map(allSubs.map((s) => [s.userId, s]));

  // 6. Create notifications with deliverAfter timestamp
  for (const obl of filteredObligations) {
    const oblUser = userMap.get(obl.userId);
    const oblTimezone = oblUser?.timezone ?? 'America/New_York';
    const settings = settingsMap.get(obl.userId);
    const effectiveTime = obl.reminderTime ?? settings?.defaultReminder?.time ?? '09:00';
    const todayInTz = getTodayInTimezone(oblTimezone);

    // Past dates → deliver immediately, today → deliver at preferred time
    const deliverAfter =
      obl.scheduledDate < todayInTz ? now : toUtcTimestamp(obl.scheduledDate, effectiveTime, oblTimezone);

    const dueDate = new Date(obl.dueDate + 'T00:00:00');
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const channels = (obl.notificationChannels ?? []) as string[];
    const message = `"${obl.name}" is due ${daysUntilDue <= 0 ? 'today or overdue' : `in ${daysUntilDue} day(s)`}`;

    for (const channel of channels) {
      let deliveryStatus: 'pending' | 'skipped' = 'skipped';

      if (channel === 'sms') {
        const user = userMap.get(obl.userId);
        if (user?.phone && user.phoneVerified) {
          const ownerId = orgOwnerMap.get(obl.organizationId);
          const sub = ownerId ? subMap.get(ownerId) : undefined;
          const tier = (sub?.tier ?? 'solo') as Tier;
          const limit = PLAN_LIMITS[tier].smsPerMonth;
          const used = sub?.smsUsed ?? 0;
          if (used < limit) {
            deliveryStatus = 'pending';
          }
        }
      } else if (channel === 'email') {
        const user = userMap.get(obl.userId);
        if (user?.email) {
          deliveryStatus = 'pending';
        }
      }
      // browser → stays 'skipped'

      await createNotification({
        organizationId: obl.organizationId,
        userId: obl.userId,
        obligationId: obl.id,
        obligationName: obl.name,
        channel,
        message,
        deliveryStatus,
        scheduledDate: obl.scheduledDate,
        deliverAfter,
      });
    }
  }

  // 7. Schedule overdue notifications
  for (const obl of allObligations) {
    if (obl.notificationsMuted) continue;

    const oblUser = userMap.get(obl.userId);
    const oblTimezone = oblUser?.timezone ?? 'America/New_York';
    const todayInTz = getTodayInTimezone(oblTimezone);

    // Only process overdue obligations
    if (obl.dueDate >= todayInTz) continue;

    // Use day after due date as scheduledDate (deduplicates via unique index)
    const dayAfterDue = new Date(obl.dueDate + 'T00:00:00');
    dayAfterDue.setDate(dayAfterDue.getDate() + 1);
    const scheduledDate = dayAfterDue.toISOString().split('T')[0];

    const settings = settingsMap.get(obl.userId);
    const effectiveTime = obl.reminderTime ?? settings?.defaultReminder?.time ?? '09:00';

    const deliverAfter =
      scheduledDate < todayInTz ? now : toUtcTimestamp(scheduledDate, effectiveTime, oblTimezone);

    const daysOverdue = Math.floor(
      (new Date(todayInTz + 'T00:00:00').getTime() - new Date(obl.dueDate + 'T00:00:00').getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const message = `"${obl.name}" is ${daysOverdue === 1 ? '1 day overdue' : `${daysOverdue} days overdue`}`;

    const channels = (obl.notificationChannels ?? []) as string[];

    for (const channel of channels) {
      let deliveryStatus: 'pending' | 'skipped' = 'skipped';

      if (channel === 'sms') {
        if (oblUser?.phone && oblUser.phoneVerified) {
          const ownerId = orgOwnerMap.get(obl.organizationId);
          const sub = ownerId ? subMap.get(ownerId) : undefined;
          const tier = (sub?.tier ?? 'solo') as Tier;
          const limit = PLAN_LIMITS[tier].smsPerMonth;
          const used = sub?.smsUsed ?? 0;
          if (used < limit) {
            deliveryStatus = 'pending';
          }
        }
      } else if (channel === 'email') {
        if (oblUser?.email) {
          deliveryStatus = 'pending';
        }
      }

      await createNotification({
        organizationId: obl.organizationId,
        userId: obl.userId,
        obligationId: obl.id,
        obligationName: obl.name,
        channel,
        message,
        deliveryStatus,
        scheduledDate,
        deliverAfter,
      });
    }
  }
}
