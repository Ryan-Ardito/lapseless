export const PLAN_LIMITS = {
  demo:   { obligations: 10 as const,   users: 1,  storageMB: 0,      smsPerMonth: 0   },
  solo:   { obligations: 60 as const,   users: 1,  storageMB: 150,    smsPerMonth: 30  },
  team:   { obligations: 400 as const,  users: 3,  storageMB: 1000,   smsPerMonth: 150 },
  growth: { obligations: 1000 as const, users: 7,  storageMB: 5000,   smsPerMonth: 250 },
  scale:  { obligations: null,          users: 15, storageMB: 15000,  smsPerMonth: 750 },
} as const;

export type Tier = keyof typeof PLAN_LIMITS;
export type PaidTier = Exclude<Tier, 'demo'>;

export const TIER_ORDER: PaidTier[] = ['solo', 'team', 'growth', 'scale'];

export const TIER_PRICES: Record<PaidTier, string> = {
  solo: '$9',
  team: '$29',
  growth: '$49',
  scale: '$99',
};

export const TIER_NAMES: Record<Tier, string> = {
  demo: 'Demo',
  solo: 'Solo',
  team: 'Team',
  growth: 'Growth',
  scale: 'Scale',
};

export const TIER_COLORS: Record<Tier, string> = {
  demo: 'yellow',
  solo: 'gray',
  team: 'blue',
  growth: 'green',
  scale: 'violet',
};

export function formatStorage(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`;
  return `${mb} MB`;
}

export function tierFeatures(tier: Tier): string[] {
  const l = PLAN_LIMITS[tier];
  return [
    l.obligations ? `${l.obligations} Tracked Obligations` : 'Unlimited Obligations',
    'Compliance Dashboard',
    `${l.smsPerMonth} SMS Credits`,
    `${l.users} ${l.users === 1 ? 'User' : 'Users'}`,
    `${formatStorage(l.storageMB)} File Storage`,
  ];
}

export function tierFeatureSummary(tier: Tier): string {
  const l = PLAN_LIMITS[tier];
  return [
    l.obligations ? `${l.obligations} obligations` : 'Unlimited obligations',
    `${l.users} ${l.users === 1 ? 'user' : 'users'}`,
    `${formatStorage(l.storageMB)} storage`,
    `${l.smsPerMonth} SMS/mo`,
  ].join(', ');
}
