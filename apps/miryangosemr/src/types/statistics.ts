/** 일별 통계 */
export interface DailyStatistics {
  date: string;              // YYYY-MM-DD
  totalVisits: number;
  newPatients: number;
  returnPatients: number;
  totalRevenue: number;
  insuranceBilled: number;
  copayCollected: number;
  avgWaitTime?: number;      // 평균 대기시간 (분)
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

/** 월별 통계 */
export interface MonthlyStatistics {
  month: string;             // YYYY-MM
  totalVisits: number;
  totalRevenue: number;
  avgDailyVisits: number;
  avgDailyRevenue: number;
  topDiagnoses: { code: string; name: string; count: number }[];
  topProcedures: { code: string; name: string; count: number }[];
  newPatientRate: number;    // 신환 비율
}

/** 기간별 조회 옵션 */
export interface StatisticsQuery {
  startDate: string;
  endDate: string;
  groupBy: 'day' | 'week' | 'month';
  insuranceType?: string;
}
