export const PLAN_LIMITS = {
  demo:   { obligations: 10 as const,   users: 1,  storageMB: 0,      smsPerMonth: 0   },
  solo:   { obligations: 75 as const,   users: 1,  storageMB: 250,    smsPerMonth: 50  },
  team:   { obligations: 500 as const,  users: 3,  storageMB: 2048,   smsPerMonth: 150 },
  growth: { obligations: null,          users: 7,  storageMB: 10240,  smsPerMonth: 300 },
  scale:  { obligations: null,          users: 15, storageMB: 25600,  smsPerMonth: 750 },
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
