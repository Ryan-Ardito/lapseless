import { describe, expect, test } from 'bun:test';
import { PLAN_LIMITS, type Tier } from './plan-limits';

const TIERS: Tier[] = ['solo', 'team', 'growth', 'scale'];

describe('PLAN_LIMITS', () => {
  test('all four tiers exist', () => {
    for (const tier of TIERS) {
      expect(PLAN_LIMITS[tier]).toBeDefined();
    }
  });

  test('all limits are positive integers (or null for unlimited)', () => {
    for (const tier of TIERS) {
      const limits = PLAN_LIMITS[tier];
      for (const [key, value] of Object.entries(limits)) {
        if (value === null) continue;
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThan(0);
      }
    }
  });

  test('tiers monotonically increase', () => {
    for (let i = 1; i < TIERS.length; i++) {
      const prev = PLAN_LIMITS[TIERS[i - 1]];
      const curr = PLAN_LIMITS[TIERS[i]];
      // null means unlimited, which is greater than any number
      if (prev.obligations !== null && curr.obligations !== null) {
        expect(curr.obligations).toBeGreaterThan(prev.obligations);
      } else if (prev.obligations !== null && curr.obligations === null) {
        // null > number — valid increase
      } else if (prev.obligations === null && curr.obligations !== null) {
        throw new Error('Obligations decreased from unlimited');
      }
      expect(curr.storageMB).toBeGreaterThan(prev.storageMB);
      expect(curr.smsPerMonth).toBeGreaterThan(prev.smsPerMonth);
    }
  });

  test('type safety: Tier is a union of keys', () => {
    const tier: Tier = 'solo';
    expect(PLAN_LIMITS[tier].obligations).toBe(75);
  });
});
