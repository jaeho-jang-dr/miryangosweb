'use client';

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart, Area,
} from 'recharts';
import { MonthlyStatistics } from '@/types/statistics';
import { formatKRW } from '@/lib/fee-calculator';

interface MonthSummary {
  month: string;
  label: string;
  stats: MonthlyStatistics;
  workingDays: number;
  insuranceBilled: number;
  copayCollected: number;
}

export default function AnnualChart({ data }: { data: MonthSummary[] }) {
  const chartData = data.map(d => ({
    name: d.label,
    방문: d.stats.totalVisits,
    일평균: d.stats.avgDailyVisits,
    매출: d.stats.totalRevenue,
    보험: d.insuranceBilled,
    본인부담: d.copayCollected,
    신환율: d.stats.newPatientRate,
  }));

  return (
    <div className="space-y-6">
      {/* Visit & Revenue Combo */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-4">월별 방문자 & 매출 추이</h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
            <Tooltip formatter={(value, name) => {
              if (name === '매출' || name === '보험' || name === '본인부담') return formatKRW(Number(value));
              return value;
            }} />
            <Legend />
            <Bar yAxisId="left" dataKey="방문" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
            <Line yAxisId="right" type="monotone" dataKey="매출" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-4">월별 수입 구성</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
            <Tooltip formatter={(value) => formatKRW(Number(value))} />
            <Legend />
            <Bar dataKey="보험" stackId="a" fill="#3b82f6" />
            <Bar dataKey="본인부담" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* New Patient Rate Trend */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-4">월별 신환율 추이</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} unit="%" />
            <Tooltip formatter={(value) => `${value}%`} />
            <Area type="monotone" dataKey="신환율" fill="#a855f7" fillOpacity={0.1} stroke="#a855f7" strokeWidth={2} />
            <Line type="monotone" dataKey="신환율" stroke="#a855f7" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
