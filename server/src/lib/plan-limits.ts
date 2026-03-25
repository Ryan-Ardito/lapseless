// Keep in sync with src/lib/plan-display.ts
export const PLAN_LIMITS = {
  demo:   { obligations: 10 as const,   users: 1,  storageMB: 0,      smsPerMonth: 0   },
  solo:   { obligations: 75 as const,   users: 1,  storageMB: 250,    smsPerMonth: 50  },
  team:   { obligations: 500 as const,  users: 3,  storageMB: 2048,   smsPerMonth: 150 },
  growth: { obligations: null,          users: 7,  storageMB: 10240,  smsPerMonth: 300 },
  scale:  { obligations: null,          users: 15, storageMB: 25600,  smsPerMonth: 750 },
} as const;

export type Tier = keyof typeof PLAN_LIMITS;
