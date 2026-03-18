import { db } from './index';
import {
  users,
  subscriptions,
  obligations,
  documents,
  ptoEntries,
  ptoConfig,
  checklists,
} from './schema';

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function dateInCurrentYear(month: number, day: number): string {
  const year = new Date().getFullYear();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function seed() {
  console.log('Seeding database...');

  // Create dev user
  const [user] = await db
    .insert(users)
    .values({
      googleId: 'dev-google-id-12345',
      email: 'dev@lapseless.local',
      name: 'Dev User',
      phone: '+15551234567',
      jobTitle: 'Registered Nurse',
      timezone: 'America/New_York',
    })
    .onConflictDoUpdate({
      target: users.googleId,
      set: { name: 'Dev User', updatedAt: new Date() },
    })
    .returning();

  console.log(`  User: ${user.email} (${user.id})`);

  // Create subscription (professional tier for dev)
  await db
    .insert(subscriptions)
    .values({
      userId: user.id,
      tier: 'growth',
      status: 'active',
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: { tier: 'growth', updatedAt: new Date() },
    });

  // Seed obligations
  const oblData = [
    {
      name: 'Nursing License Renewal',
      category: 'license' as const,
      dueDate: daysFromNow(-3),
      startDate: daysFromNow(-368),
      referenceNumber: 'RN-2024-58291',
      notes: 'State Board of Nursing - submit online portal',
      links: [{ label: 'State Board Portal', url: 'https://example.com/nursing-board' }],
      recurrenceType: 'yearly' as const,
      recurrenceAutoRenew: true,
      notificationChannels: ['email', 'sms'],
      reminderDaysBefore: 30,
      reminderFrequency: 'daily' as const,
    },
    {
      name: 'CEU - Ethics in Healthcare',
      category: 'ceu' as const,
      dueDate: daysFromNow(7),
      notes: '3 credit hours required. Complete via approved online provider.',
      ceuRequired: 3,
      ceuCompleted: 1,
      links: [{ label: 'Course Provider', url: 'https://example.com/ceu-ethics' }],
      notificationChannels: ['email'],
      reminderDaysBefore: 14,
      reminderFrequency: 'weekly' as const,
    },
    {
      name: 'Quarterly Tax Payment (Q1)',
      category: 'tax' as const,
      dueDate: daysFromNow(22),
      notes: 'Estimated tax payment due to IRS',
      recurrenceType: 'quarterly' as const,
      recurrenceAutoRenew: true,
      notificationChannels: ['email', 'sms'],
      reminderDaysBefore: 7,
      reminderFrequency: 'once' as const,
    },
    {
      name: 'Professional Liability Insurance',
      category: 'insurance' as const,
      dueDate: daysFromNow(60),
      referenceNumber: 'PLI-9928-2024',
      notes: 'Annual renewal with current provider. Compare rates.',
      recurrenceType: 'yearly' as const,
      recurrenceAutoRenew: false,
      notificationChannels: ['email'],
      reminderDaysBefore: 30,
      reminderFrequency: 'weekly' as const,
    },
    {
      name: 'CPR/BLS Certification',
      category: 'certification' as const,
      dueDate: daysFromNow(120),
      referenceNumber: 'AHA-BLS-44012',
      notes: 'American Heart Association - in-person skills check required',
      notificationChannels: ['whatsapp'],
      reminderDaysBefore: 30,
      reminderFrequency: 'once' as const,
    },
    {
      name: 'Credit Card Payment',
      category: 'credit-card' as const,
      dueDate: daysFromNow(12),
      notes: 'Monthly minimum payment due',
      recurrenceType: 'monthly' as const,
      recurrenceAutoRenew: true,
      notificationChannels: ['email', 'browser'],
      reminderDaysBefore: 3,
      reminderFrequency: 'daily' as const,
    },
  ];

  for (const obl of oblData) {
    await db.insert(obligations).values({ userId: user.id, ...obl });
  }
  console.log(`  ${oblData.length} obligations created`);

  // Seed standalone documents (metadata only, no actual S3 files)
  const docData = [
    { name: 'nursing-license-2026.pdf', displayName: 'Nursing License', mimeType: 'application/pdf', size: 245760, s3Key: 'seed/nursing-license-2026.pdf' },
    { name: 'liability-insurance-policy.pdf', displayName: 'Liability Insurance Policy', mimeType: 'application/pdf', size: 1048576, s3Key: 'seed/liability-insurance-policy.pdf' },
    { name: 'cpr-card-photo.jpg', displayName: 'CPR Card Photo', mimeType: 'image/jpeg', size: 524288, s3Key: 'seed/cpr-card-photo.jpg' },
  ];

  for (const doc of docData) {
    await db.insert(documents).values({ userId: user.id, ...doc });
  }
  console.log(`  ${docData.length} documents created`);

  // Seed PTO entries
  const now = new Date();
  const ptoData = [
    { date: dateInCurrentYear(1, 1), hours: 8, type: 'holiday' as const, notes: "New Year's Day" },
    { date: dateInCurrentYear(1, 20), hours: 8, type: 'holiday' as const, notes: 'MLK Day' },
    { date: dateInCurrentYear(2, 17), hours: 8, type: 'holiday' as const, notes: "Presidents' Day" },
    { date: dateInCurrentYear(5, 26), hours: 8, type: 'holiday' as const, notes: 'Memorial Day' },
    { date: dateInCurrentYear(4, 14), hours: 8, type: 'vacation' as const, notes: 'Spring getaway day 1' },
    { date: dateInCurrentYear(4, 15), hours: 8, type: 'vacation' as const, notes: 'Spring getaway day 2' },
    { date: dateInCurrentYear(7, 3), hours: 8, type: 'vacation' as const, notes: 'Summer day off' },
    { date: dateInCurrentYear(3, 10), hours: 8, type: 'sick' as const, notes: 'Flu' },
    { date: dateInCurrentYear(6, 5), hours: 4, type: 'sick' as const, notes: 'Doctor appointment (half day)' },
    { date: dateInCurrentYear(5, 2), hours: 8, type: 'personal' as const, notes: 'Moving day' },
  ];

  for (const pto of ptoData) {
    await db.insert(ptoEntries).values({ userId: user.id, ...pto });
  }
  console.log(`  ${ptoData.length} PTO entries created`);

  // Seed PTO config
  await db
    .insert(ptoConfig)
    .values({ userId: user.id, yearlyAllowance: 160, year: now.getFullYear() })
    .onConflictDoNothing();
  console.log('  PTO config created');

  // Seed checklists
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const month = now.getMonth();
  const year = now.getFullYear();

  const checklistData = [
    {
      type: 'end-of-month' as const,
      title: 'End of Month',
      period: `${monthNames[month]} ${year}`,
      items: [
        { id: crypto.randomUUID(), label: 'Review all upcoming obligation due dates', completed: true },
        { id: crypto.randomUUID(), label: 'Verify insurance policies are current', completed: true },
        { id: crypto.randomUUID(), label: 'Submit any pending CEU documentation', completed: false },
        { id: crypto.randomUUID(), label: 'Review and reconcile expenses', completed: false },
        { id: crypto.randomUUID(), label: 'Back up important documents', completed: false },
      ],
    },
    {
      type: 'end-of-year' as const,
      title: 'End of Year / Tax',
      period: String(year),
      items: [
        { id: crypto.randomUUID(), label: 'Gather W-2 and 1099 forms', completed: false },
        { id: crypto.randomUUID(), label: 'Organize business expense receipts', completed: false },
        { id: crypto.randomUUID(), label: 'Review retirement contributions', completed: false },
        { id: crypto.randomUUID(), label: 'Complete all remaining CEU requirements', completed: false },
        { id: crypto.randomUUID(), label: 'Verify all licenses are renewed or scheduled', completed: false },
        { id: crypto.randomUUID(), label: 'Review and update insurance coverage', completed: false },
        { id: crypto.randomUUID(), label: 'Back up all digital records', completed: false },
      ],
    },
    {
      type: 'custom' as const,
      title: 'Onboarding Tasks',
      period: `${monthNames[month]} ${year}`,
      items: [
        { id: crypto.randomUUID(), label: 'Complete HR paperwork', completed: true },
        { id: crypto.randomUUID(), label: 'Set up direct deposit', completed: false },
        { id: crypto.randomUUID(), label: 'Review employee handbook', completed: false },
        { id: crypto.randomUUID(), label: 'Complete HIPAA training', completed: false },
      ],
    },
  ];

  for (const cl of checklistData) {
    await db.insert(checklists).values({ userId: user.id, ...cl });
  }
  console.log(`  ${checklistData.length} checklists created`);

  console.log('Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
