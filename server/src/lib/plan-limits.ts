export const PLAN_LIMITS = {
  starter:      { obligations: 25,   users: 1,  storageMB: 100,   smsPerMonth: 20  },
  basic:        { obligations: 200,  users: 2,  storageMB: 1024,  smsPerMonth: 75  },
  professional: { obligations: 500,  users: 5,  storageMB: 5120,  smsPerMonth: 150 },
  business:     { obligations: 1500, users: 10, storageMB: 10240, smsPerMonth: 400 },
} as const;

export type Tier = keyof typeof PLAN_LIMITS;
