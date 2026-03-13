import { describe, expect, test } from 'bun:test';
import { getNextDueDate } from './date-math';

describe('getNextDueDate', () => {
  test('monthly: 2025-01-15 → 2025-02-15', () => {
    expect(getNextDueDate('2025-01-15', 'monthly')).toBe('2025-02-15');
  });

  test('monthly year rollover: 2025-12-15 → 2026-01-15', () => {
    expect(getNextDueDate('2025-12-15', 'monthly')).toBe('2026-01-15');
  });

  test('monthly overflow: 2025-01-31 pins to JS Date behavior', () => {
    // JS Date: Jan 31 + 1 month → Mar 3 (31 days after Jan 31)
    const result = getNextDueDate('2025-01-31', 'monthly');
    expect(result).toBe('2025-03-03');
  });

  test('quarterly: 2025-01-15 → 2025-04-15', () => {
    expect(getNextDueDate('2025-01-15', 'quarterly')).toBe('2025-04-15');
  });

  test('quarterly year rollover: 2025-11-15 → 2026-02-15', () => {
    expect(getNextDueDate('2025-11-15', 'quarterly')).toBe('2026-02-15');
  });

  test('yearly: 2025-06-15 → 2026-06-15', () => {
    expect(getNextDueDate('2025-06-15', 'yearly')).toBe('2026-06-15');
  });

  test('yearly leap day: 2024-02-29 pins to JS Date behavior', () => {
    // JS Date: 2024-02-29 + 1 year → 2025-03-01 (no Feb 29 in 2025)
    const result = getNextDueDate('2024-02-29', 'yearly');
    expect(result).toBe('2025-03-01');
  });

  test('unknown type: date unchanged', () => {
    expect(getNextDueDate('2025-06-15', 'biweekly')).toBe('2025-06-15');
  });
});
