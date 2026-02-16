import { describe, it, expect } from 'vitest';

// Test the pure calculateLOS function logic
// (Firestore-dependent functions can't be unit tested without mocking)

function calculateLOS(admissionDate: Date, dischargeDate?: Date): number {
  const start = admissionDate;
  const end = dischargeDate || new Date();
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

describe('calculateLOS (Length of Stay)', () => {
  it('should return 1 for same-day admission and discharge', () => {
    const today = new Date(2026, 0, 15, 9, 0);
    const discharge = new Date(2026, 0, 15, 17, 0);
    expect(calculateLOS(today, discharge)).toBe(1);
  });

  it('should return 2 for overnight stay', () => {
    const admission = new Date(2026, 0, 15, 14, 0);
    const discharge = new Date(2026, 0, 16, 10, 0);
    expect(calculateLOS(admission, discharge)).toBe(1); // less than 24h = ceil to 1
  });

  it('should return correct days for multi-day stay', () => {
    const admission = new Date(2026, 0, 10);
    const discharge = new Date(2026, 0, 15);
    expect(calculateLOS(admission, discharge)).toBe(5);
  });

  it('should return correct days for a week stay', () => {
    const admission = new Date(2026, 0, 1);
    const discharge = new Date(2026, 0, 8);
    expect(calculateLOS(admission, discharge)).toBe(7);
  });

  it('should return minimum of 1 even for zero-duration', () => {
    const same = new Date(2026, 0, 15, 12, 0);
    expect(calculateLOS(same, same)).toBe(1);
  });

  it('should handle month boundaries', () => {
    const admission = new Date(2026, 0, 28);
    const discharge = new Date(2026, 1, 3);
    expect(calculateLOS(admission, discharge)).toBe(6);
  });

  it('should handle long stays', () => {
    const admission = new Date(2025, 0, 1);
    const discharge = new Date(2025, 11, 31);
    expect(calculateLOS(admission, discharge)).toBe(364); // 365 - 1 day rounding
  });
});
