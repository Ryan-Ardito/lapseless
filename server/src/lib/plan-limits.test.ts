import { describe, expect, test } from 'bun:test';
import { PLAN_LIMITS, type Tier } from './plan-limits';

const TIERS: Tier[] = ['starter', 'basic', 'professional', 'business'];

describe('PLAN_LIMITS', () => {
  test('all four tiers exist', () => {
    for (const tier of TIERS) {
      expect(PLAN_LIMITS[tier]).toBeDefined();
    }
  });

  test('all limits are positive integers', () => {
    for (const tier of TIERS) {
      const limits = PLAN_LIMITS[tier];
      for (const [key, value] of Object.entries(limits)) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThan(0);
      }
    }
  });

  test('tiers monotonically increase', () => {
    for (let i = 1; i < TIERS.length; i++) {
      const prev = PLAN_LIMITS[TIERS[i - 1]];
      const curr = PLAN_LIMITS[TIERS[i]];
      expect(curr.obligations).toBeGreaterThan(prev.obligations);
      expect(curr.storageMB).toBeGreaterThan(prev.storageMB);
      expect(curr.smsPerMonth).toBeGreaterThan(prev.smsPerMonth);
    }
  });

  test('type safety: Tier is a union of keys', () => {
    const tier: Tier = 'starter';
    expect(PLAN_LIMITS[tier].obligations).toBe(25);
  });
});
