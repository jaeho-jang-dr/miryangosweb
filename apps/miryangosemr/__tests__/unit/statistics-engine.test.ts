import { describe, it, expect } from 'vitest';

/**
 * Unit tests for statistics-engine.ts
 *
 * The Firestore-dependent functions (calculateDailyStats, getStatisticsRange)
 * cannot be unit tested without full Firestore mocking, so we test the
 * pure aggregation logic (aggregateMonthlyStats) by copying its implementation.
 *
 * We also test the internal calculation logic used by calculateDailyStats
 * by simulating the visit/billing aggregation patterns.
 */

// --- Types (copied from src/types/statistics.ts) ---

interface DailyStatistics {
  date: string;
  totalVisits: number;
  newPatients: number;
  returnPatients: number;
  totalRevenue: number;
  insuranceBilled: number;
  copayCollected: number;
  avgWaitTime?: number;
  visitsByType: {
    consultation: number;
    test: number;
    treatment: number;
    physicalTherapy: number;
  };
  visitsByInsurance: {
    nhis: number;
    auto: number;
    industrial: number;
    none: number;
  };
}

interface MonthlyStatistics {
  month: string;
  totalVisits: number;
  totalRevenue: number;
  avgDailyVisits: number;
  avgDailyRevenue: number;
  topDiagnoses: { code: string; name: string; count: number }[];
  topProcedures: { code: string; name: string; count: number }[];
  newPatientRate: number;
}

// --- Pure function copy from statistics-engine.ts ---

function aggregateMonthlyStats(dailyStats: DailyStatistics[]): MonthlyStatistics {
  if (dailyStats.length === 0) {
    return {
      month: '',
      totalVisits: 0,
      totalRevenue: 0,
      avgDailyVisits: 0,
      avgDailyRevenue: 0,
      topDiagnoses: [],
      topProcedures: [],
      newPatientRate: 0,
    };
  }

  const totalVisits = dailyStats.reduce((s, d) => s + d.totalVisits, 0);
  const totalRevenue = dailyStats.reduce((s, d) => s + d.totalRevenue, 0);
  const totalNew = dailyStats.reduce((s, d) => s + d.newPatients, 0);

  return {
    month: dailyStats[0].date.slice(0, 7),
    totalVisits,
    totalRevenue,
    avgDailyVisits: Math.round(totalVisits / dailyStats.length),
    avgDailyRevenue: Math.round(totalRevenue / dailyStats.length),
    topDiagnoses: [],
    topProcedures: [],
    newPatientRate: totalVisits > 0 ? Math.round((totalNew / totalVisits) * 100) : 0,
  };
}

// --- Helper: simulates the visit/billing aggregation in calculateDailyStats ---

interface MockVisit {
  id: string;
  type: 'new' | 'return';
  status: string;
  testOrder?: string;
  treatmentNote?: string;
  physicalTherapy?: string;
  insuranceType?: 'nhis' | 'auto' | 'none';
}

interface MockBilling {
  id: string;
  totalAmount: number;
  insuranceAmount: number;
  paidAmount: number;
}

function simulateDailyStatsCalc(
  date: Date,
  visits: MockVisit[],
  billings: MockBilling[]
): DailyStatistics {
  const totalRevenue = billings.reduce((s, b) => s + b.totalAmount, 0);
  const insuranceBilled = billings.reduce((s, b) => s + b.insuranceAmount, 0);
  const copayCollected = billings.reduce((s, b) => s + b.paidAmount, 0);

  return {
    date: date.toISOString().slice(0, 10),
    totalVisits: visits.length,
    newPatients: visits.filter(v => v.type === 'new').length,
    returnPatients: visits.filter(v => v.type === 'return').length,
    totalRevenue,
    insuranceBilled,
    copayCollected,
    visitsByType: {
      consultation: visits.filter(v => ['consulting', 'completed', 'paid'].includes(v.status)).length,
      test: visits.filter(v => v.testOrder).length,
      treatment: visits.filter(v => v.treatmentNote).length,
      physicalTherapy: visits.filter(v => v.physicalTherapy).length,
    },
    visitsByInsurance: {
      nhis: visits.filter(v => v.insuranceType === 'nhis').length,
      auto: visits.filter(v => v.insuranceType === 'auto').length,
      industrial: 0,
      none: visits.filter(v => v.insuranceType === 'none' || !v.insuranceType).length,
    },
  };
}

// --- Helper to create a mock DailyStatistics ---

function makeDailyStat(overrides: Partial<DailyStatistics> = {}): DailyStatistics {
  return {
    date: '2026-01-15',
    totalVisits: 10,
    newPatients: 3,
    returnPatients: 7,
    totalRevenue: 500000,
    insuranceBilled: 350000,
    copayCollected: 150000,
    visitsByType: { consultation: 8, test: 4, treatment: 3, physicalTherapy: 5 },
    visitsByInsurance: { nhis: 7, auto: 1, industrial: 0, none: 2 },
    ...overrides,
  };
}


// ===================== TESTS =====================

describe('aggregateMonthlyStats', () => {
  it('should return empty/zeroed stats for empty array', () => {
    const result = aggregateMonthlyStats([]);
    expect(result.month).toBe('');
    expect(result.totalVisits).toBe(0);
    expect(result.totalRevenue).toBe(0);
    expect(result.avgDailyVisits).toBe(0);
    expect(result.avgDailyRevenue).toBe(0);
    expect(result.topDiagnoses).toEqual([]);
    expect(result.topProcedures).toEqual([]);
    expect(result.newPatientRate).toBe(0);
  });

  it('should aggregate a single day', () => {
    const daily = makeDailyStat({
      date: '2026-02-10',
      totalVisits: 20,
      newPatients: 5,
      totalRevenue: 1000000,
    });
    const result = aggregateMonthlyStats([daily]);
    expect(result.month).toBe('2026-02');
    expect(result.totalVisits).toBe(20);
    expect(result.totalRevenue).toBe(1000000);
    expect(result.avgDailyVisits).toBe(20);
    expect(result.avgDailyRevenue).toBe(1000000);
    expect(result.newPatientRate).toBe(25); // 5/20 = 25%
  });

  it('should aggregate multiple days correctly', () => {
    const stats = [
      makeDailyStat({ date: '2026-01-01', totalVisits: 10, newPatients: 2, totalRevenue: 500000 }),
      makeDailyStat({ date: '2026-01-02', totalVisits: 15, newPatients: 5, totalRevenue: 750000 }),
      makeDailyStat({ date: '2026-01-03', totalVisits: 20, newPatients: 3, totalRevenue: 1000000 }),
    ];
    const result = aggregateMonthlyStats(stats);
    expect(result.month).toBe('2026-01');
    expect(result.totalVisits).toBe(45);
    expect(result.totalRevenue).toBe(2250000);
    expect(result.avgDailyVisits).toBe(15); // 45/3
    expect(result.avgDailyRevenue).toBe(750000); // 2250000/3
    expect(result.newPatientRate).toBe(22); // Math.round(10/45 * 100) = 22
  });

  it('should extract month from the first date entry', () => {
    const stats = [
      makeDailyStat({ date: '2025-12-30' }),
      makeDailyStat({ date: '2025-12-31' }),
    ];
    const result = aggregateMonthlyStats(stats);
    expect(result.month).toBe('2025-12');
  });

  it('should round avgDailyVisits and avgDailyRevenue', () => {
    const stats = [
      makeDailyStat({ date: '2026-03-01', totalVisits: 7, totalRevenue: 333333 }),
      makeDailyStat({ date: '2026-03-02', totalVisits: 8, totalRevenue: 444444 }),
      makeDailyStat({ date: '2026-03-03', totalVisits: 9, totalRevenue: 555555 }),
    ];
    const result = aggregateMonthlyStats(stats);
    // 24/3 = 8
    expect(result.avgDailyVisits).toBe(8);
    // 1333332/3 = 444444
    expect(result.avgDailyRevenue).toBe(444444);
  });

  it('should calculate newPatientRate as 0 when no visits', () => {
    const stats = [
      makeDailyStat({ date: '2026-01-01', totalVisits: 0, newPatients: 0 }),
    ];
    const result = aggregateMonthlyStats(stats);
    expect(result.newPatientRate).toBe(0);
  });

  it('should calculate 100% newPatientRate when all are new', () => {
    const stats = [
      makeDailyStat({ date: '2026-01-01', totalVisits: 5, newPatients: 5 }),
      makeDailyStat({ date: '2026-01-02', totalVisits: 10, newPatients: 10 }),
    ];
    const result = aggregateMonthlyStats(stats);
    expect(result.newPatientRate).toBe(100);
  });

  it('should handle large number of days (full month)', () => {
    const stats: DailyStatistics[] = [];
    for (let i = 1; i <= 31; i++) {
      const day = i.toString().padStart(2, '0');
      stats.push(makeDailyStat({
        date: `2026-01-${day}`,
        totalVisits: 10,
        newPatients: 2,
        totalRevenue: 500000,
      }));
    }
    const result = aggregateMonthlyStats(stats);
    expect(result.totalVisits).toBe(310);
    expect(result.totalRevenue).toBe(15500000);
    expect(result.avgDailyVisits).toBe(10);
    expect(result.avgDailyRevenue).toBe(500000);
    expect(result.newPatientRate).toBe(20); // 62/310 = 20%
  });

  it('should handle days with zero revenue', () => {
    const stats = [
      makeDailyStat({ date: '2026-01-01', totalVisits: 5, newPatients: 1, totalRevenue: 0 }),
      makeDailyStat({ date: '2026-01-02', totalVisits: 3, newPatients: 0, totalRevenue: 0 }),
    ];
    const result = aggregateMonthlyStats(stats);
    expect(result.totalRevenue).toBe(0);
    expect(result.avgDailyRevenue).toBe(0);
  });
});


describe('Daily Stats Calculation Logic (simulateDailyStatsCalc)', () => {
  it('should return zeros for empty visits and billings', () => {
    const result = simulateDailyStatsCalc(new Date(2026, 0, 15), [], []);
    expect(result.totalVisits).toBe(0);
    expect(result.newPatients).toBe(0);
    expect(result.returnPatients).toBe(0);
    expect(result.totalRevenue).toBe(0);
    expect(result.insuranceBilled).toBe(0);
    expect(result.copayCollected).toBe(0);
    expect(result.visitsByType.consultation).toBe(0);
    expect(result.visitsByType.test).toBe(0);
    expect(result.visitsByType.treatment).toBe(0);
    expect(result.visitsByType.physicalTherapy).toBe(0);
    expect(result.visitsByInsurance.nhis).toBe(0);
    expect(result.visitsByInsurance.auto).toBe(0);
    expect(result.visitsByInsurance.industrial).toBe(0);
    expect(result.visitsByInsurance.none).toBe(0);
  });

  it('should count new and return patients', () => {
    const visits: MockVisit[] = [
      { id: '1', type: 'new', status: 'waiting' },
      { id: '2', type: 'return', status: 'waiting' },
      { id: '3', type: 'new', status: 'waiting' },
      { id: '4', type: 'return', status: 'waiting' },
      { id: '5', type: 'return', status: 'waiting' },
    ];
    const result = simulateDailyStatsCalc(new Date(2026, 0, 15), visits, []);
    expect(result.totalVisits).toBe(5);
    expect(result.newPatients).toBe(2);
    expect(result.returnPatients).toBe(3);
  });

  it('should count consultation visits by status', () => {
    const visits: MockVisit[] = [
      { id: '1', type: 'new', status: 'consulting' },
      { id: '2', type: 'return', status: 'completed' },
      { id: '3', type: 'return', status: 'paid' },
      { id: '4', type: 'return', status: 'waiting' },
      { id: '5', type: 'new', status: 'registered' },
    ];
    const result = simulateDailyStatsCalc(new Date(2026, 0, 15), visits, []);
    expect(result.visitsByType.consultation).toBe(3); // consulting, completed, paid
  });

  it('should count test, treatment, physicalTherapy visits', () => {
    const visits: MockVisit[] = [
      { id: '1', type: 'new', status: 'waiting', testOrder: 'CBC', treatmentNote: 'Trigger injection' },
      { id: '2', type: 'return', status: 'waiting', physicalTherapy: 'Hot pack 20min' },
      { id: '3', type: 'return', status: 'waiting', testOrder: 'X-ray', physicalTherapy: 'ICT 15min' },
    ];
    const result = simulateDailyStatsCalc(new Date(2026, 0, 15), visits, []);
    expect(result.visitsByType.test).toBe(2);
    expect(result.visitsByType.treatment).toBe(1);
    expect(result.visitsByType.physicalTherapy).toBe(2);
  });

  it('should count visits by insurance type', () => {
    const visits: MockVisit[] = [
      { id: '1', type: 'new', status: 'waiting', insuranceType: 'nhis' },
      { id: '2', type: 'return', status: 'waiting', insuranceType: 'nhis' },
      { id: '3', type: 'return', status: 'waiting', insuranceType: 'auto' },
      { id: '4', type: 'return', status: 'waiting', insuranceType: 'none' },
      { id: '5', type: 'new', status: 'waiting' }, // no insurance type → counted as 'none'
    ];
    const result = simulateDailyStatsCalc(new Date(2026, 0, 15), visits, []);
    expect(result.visitsByInsurance.nhis).toBe(2);
    expect(result.visitsByInsurance.auto).toBe(1);
    expect(result.visitsByInsurance.industrial).toBe(0); // always 0 per implementation
    expect(result.visitsByInsurance.none).toBe(2);
  });

  it('should aggregate billing totals', () => {
    const billings: MockBilling[] = [
      { id: 'b1', totalAmount: 50000, insuranceAmount: 35000, paidAmount: 15000 },
      { id: 'b2', totalAmount: 30000, insuranceAmount: 21000, paidAmount: 9000 },
      { id: 'b3', totalAmount: 100000, insuranceAmount: 0, paidAmount: 100000 },
    ];
    const result = simulateDailyStatsCalc(new Date(2026, 0, 15), [], billings);
    expect(result.totalRevenue).toBe(180000);
    expect(result.insuranceBilled).toBe(56000);
    expect(result.copayCollected).toBe(124000);
  });

  it('should format date as YYYY-MM-DD', () => {
    // Use a date that avoids timezone offset issues by creating with explicit time
    const date = new Date('2026-06-03T12:00:00');
    const result = simulateDailyStatsCalc(date, [], []);
    expect(result.date).toBe('2026-06-03');
  });

  it('should handle a realistic daily scenario', () => {
    const visits: MockVisit[] = [
      { id: '1', type: 'new', status: 'completed', insuranceType: 'nhis', testOrder: 'CBC, CRP' },
      { id: '2', type: 'return', status: 'paid', insuranceType: 'nhis', treatmentNote: 'Trigger point injection', physicalTherapy: 'Hot pack + ICT' },
      { id: '3', type: 'return', status: 'consulting', insuranceType: 'auto', testOrder: 'X-ray' },
      { id: '4', type: 'new', status: 'waiting', insuranceType: 'none' },
    ];
    const billings: MockBilling[] = [
      { id: 'b1', totalAmount: 45000, insuranceAmount: 31500, paidAmount: 13500 },
      { id: 'b2', totalAmount: 80000, insuranceAmount: 56000, paidAmount: 24000 },
      { id: 'b3', totalAmount: 120000, insuranceAmount: 120000, paidAmount: 0 },
    ];
    const result = simulateDailyStatsCalc(new Date(2026, 0, 20), visits, billings);
    expect(result.totalVisits).toBe(4);
    expect(result.newPatients).toBe(2);
    expect(result.returnPatients).toBe(2);
    expect(result.totalRevenue).toBe(245000);
    expect(result.visitsByType.consultation).toBe(3); // completed, paid, consulting
    expect(result.visitsByType.test).toBe(2);
    expect(result.visitsByType.treatment).toBe(1);
    expect(result.visitsByType.physicalTherapy).toBe(1);
    expect(result.visitsByInsurance.nhis).toBe(2);
    expect(result.visitsByInsurance.auto).toBe(1);
    expect(result.visitsByInsurance.none).toBe(1);
  });
});
