'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DailyStatistics } from '@/types/statistics';
import { formatKRW } from '@/lib/fee-calculator';

const COLORS = ['#3b82f6', '#f97316', '#a855f7', '#10b981'];
const INSURANCE_COLORS = ['#3b82f6', '#f97316', '#ef4444', '#64748b'];

export default function DailyChart({ data }: { data: DailyStatistics[] }) {
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  const barData = data.map(d => {
    const date = new Date(d.date);
    return {
      name: `${date.getMonth() + 1}/${date.getDate()} (${dayNames[date.getDay()]})`,
      방문: d.totalVisits,
      신환: d.newPatients,
      재진: d.returnPatients,
      매출: d.totalRevenue,
    };
  });

  const typeData = [
    { name: '진료', value: data.reduce((s, d) => s + d.visitsByType.consultation, 0) },
    { name: '검사', value: data.reduce((s, d) => s + d.visitsByType.test, 0) },
    { name: '치료', value: data.reduce((s, d) => s + d.visitsByType.treatment, 0) },
    { name: '물리치료', value: data.reduce((s, d) => s + d.visitsByType.physicalTherapy, 0) },
  ].filter(d => d.value > 0);

  const insuranceData = [
    { name: '건강보험', value: data.reduce((s, d) => s + d.visitsByInsurance.nhis, 0) },
    { name: '자동차보험', value: data.reduce((s, d) => s + d.visitsByInsurance.auto, 0) },
    { name: '산재보험', value: data.reduce((s, d) => s + d.visitsByInsurance.industrial, 0) },
    { name: '일반/비급여', value: data.reduce((s, d) => s + d.visitsByInsurance.none, 0) },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Visit Bar Chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-4">일별 방문자 수</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="신환" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="재진" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue Bar Chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-4">일별 매출</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
            <Tooltip formatter={(value) => formatKRW(Number(value))} />
            <Bar dataKey="매출" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {typeData.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-4">진료 유형 비율</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {insuranceData.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-4">보험 유형 비율</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={insuranceData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {insuranceData.map((_, i) => <Cell key={i} fill={INSURANCE_COLORS[i % INSURANCE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
