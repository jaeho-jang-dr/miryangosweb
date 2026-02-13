import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DailyStatistics, MonthlyStatistics, StatisticsQuery } from '@/types/statistics';
import { Visit } from '@shared/types/clinical';
import { BillingRecord } from '@/types/billing';

/**
 * 통계 집계 엔진
 */

/** 일별 통계 계산 */
export async function calculateDailyStats(date: Date): Promise<DailyStatistics> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // 방문 조회
  const visitsQ = query(
    collection(db, 'visits'),
    where('date', '>=', Timestamp.fromDate(startOfDay)),
    where('date', '<=', Timestamp.fromDate(endOfDay))
  );
  const visitsSnap = await getDocs(visitsQ);
  const visits = visitsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Visit[];

  // 수납 조회
  const billingsQ = query(
    collection(db, 'billing'),
    where('billedAt', '>=', Timestamp.fromDate(startOfDay)),
    where('billedAt', '<=', Timestamp.fromDate(endOfDay))
  );
  const billingsSnap = await getDocs(billingsQ);
  const billings = billingsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as BillingRecord[];

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

/** 기간별 통계 조회 */
export async function getStatisticsRange(startDate: Date, endDate: Date): Promise<DailyStatistics[]> {
  const stats: DailyStatistics[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dailyStat = await calculateDailyStats(new Date(current));
    stats.push(dailyStat);
    current.setDate(current.getDate() + 1);
  }

  return stats;
}

/** 월별 통계 요약 */
export function aggregateMonthlyStats(dailyStats: DailyStatistics[]): MonthlyStatistics {
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
    topDiagnoses: [],  // Would require visit diagnosis aggregation
    topProcedures: [],
    newPatientRate: totalVisits > 0 ? Math.round((totalNew / totalVisits) * 100) : 0,
  };
}
