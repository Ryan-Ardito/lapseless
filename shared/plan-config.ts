export const PLAN_LIMITS = {
  demo:   { obligations: 0 as const,    seatsPerOrg: 0,  storageMB: 0,      smsPerMonth: 0,   maxOrgs: 0  },
  solo:   { obligations: 60 as const,   seatsPerOrg: 1,  storageMB: 150,    smsPerMonth: 30,  maxOrgs: 1  },
  team:   { obligations: 400 as const,  seatsPerOrg: 3,  storageMB: 1000,   smsPerMonth: 150, maxOrgs: 2  },
  growth: { obligations: 1000 as const, seatsPerOrg: 7,  storageMB: 5000,   smsPerMonth: 250, maxOrgs: 3  },
  scale:  { obligations: null,          seatsPerOrg: 15, storageMB: 15000,  smsPerMonth: 750, maxOrgs: 5  },
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
    l.obligations ? `${l.obligations} Tracked Obligations` : l.obligations === 0 ? 'No Obligations' : 'Unlimited Obligations',
    'Compliance Dashboard',
    `${l.smsPerMonth} SMS Credits`,
    `${l.seatsPerOrg} ${l.seatsPerOrg === 1 ? 'Seat' : 'Seats'} per Org`,
    `${formatStorage(l.storageMB)} File Storage`,
    l.maxOrgs === 0 ? 'No Organizations' : `${l.maxOrgs} Organization${l.maxOrgs > 1 ? 's' : ''}`,
  ];
}

export function tierFeatureSummary(tier: Tier): string {
  const l = PLAN_LIMITS[tier];
  return [
    l.obligations ? `${l.obligations} obligations` : l.obligations === 0 ? 'No obligations' : 'Unlimited obligations',
    `${l.seatsPerOrg} ${l.seatsPerOrg === 1 ? 'seat' : 'seats'}/org`,
    `${formatStorage(l.storageMB)} storage`,
    `${l.smsPerMonth} SMS/mo`,
    `${l.maxOrgs} org${l.maxOrgs !== 1 ? 's' : ''}`,
  ].join(', ');
}
