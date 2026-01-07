
'use client';

import { Users, Clock, AlertCircle, Calendar, FileText } from 'lucide-react';
import Link from 'next/link';

export default function ClinicalDashboard() {
    return (
        <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="금일 예약"
                    value="12"
                    subtext="오전 4 / 오후 8"
                    icon={<Calendar className="w-6 h-6 text-blue-500" />}
                    color="blue"
                />
                <StatCard
                    title="대기 환자"
                    value="3"
                    subtext="평균 대기 15분"
                    icon={<Clock className="w-6 h-6 text-orange-500" />}
                    color="orange"
                />
                <StatCard
                    title="진료 완료"
                    value="28"
                    subtext="전일 대비 +5"
                    icon={<Users className="w-6 h-6 text-emerald-500" />}
                    color="emerald"
                />
                <StatCard
                    title="중증/응급"
                    value="0"
                    subtext="특이사항 없음"
                    icon={<AlertCircle className="w-6 h-6 text-red-500" />}
                    color="red"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Action Area */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center justify-between">
                            실시간 대기 현황
                            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Live</span>
                        </h3>
                        <div className="overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-slate-500">순번</th>
                                        <th className="px-4 py-3 font-medium text-slate-500">이름</th>
                                        <th className="px-4 py-3 font-medium text-slate-500">생년월일</th>
                                        <th className="px-4 py-3 font-medium text-slate-500">접수시간</th>
                                        <th className="px-4 py-3 font-medium text-slate-500">상태</th>
                                        <th className="px-4 py-3 font-medium text-slate-500 text-right">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <WaitingRow order={1} name="김철수" birth="800101" time="09:30" status="waiting" />
                                    <WaitingRow order={2} name="이영희" birth="920505" time="09:45" status="waiting" />
                                    <WaitingRow order={3} name="박민수" birth="751225" time="10:00" status="in-progress" />
                                </tbody>
                            </table>
                            <div className="mt-4 text-center">
                                <Link href="/clinical/patients" className="text-sm text-emerald-600 font-medium hover:underline">
                                    전체 대기열 관리
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions & Recent */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">빠른 실행</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Link href="/clinical/patients/new" className="flex flex-col items-center justify-center p-4 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors">
                                <Users className="w-6 h-6 mb-2" />
                                <span className="text-sm font-semibold">신환 등록</span>
                            </Link>
                            <button className="flex flex-col items-center justify-center p-4 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors">
                                <FileText className="w-6 h-6 mb-2" />
                                <span className="text-sm font-semibold">진료 기록</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">최근 공지</h3>
                        <ul className="space-y-3">
                            <li className="text-sm">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 mr-2">중요</span>
                                <span className="text-slate-700">시스템 점검 안내 (22:00~)</span>
                            </li>
                            <li className="text-sm text-slate-600">
                                <span className="text-slate-400 mr-2 text-xs">01/07</span>
                                1월 진료 일정 변경 사항
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, subtext, icon, color }: any) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-slate-900 mb-1">{value}</h3>
                <p className={`text-xs font-medium text-${color}-600`}>{subtext}</p>
            </div>
            <div className={`p-3 rounded-xl bg-${color}-50`}>
                {icon}
            </div>
        </div>
    )
}

function WaitingRow({ order, name, birth, time, status }: any) {
    return (
        <tr className="hover:bg-slate-50">
            <td className="px-4 py-3 text-slate-900 font-medium">{order}</td>
            <td className="px-4 py-3 text-slate-700">{name}</td>
            <td className="px-4 py-3 text-slate-500">{birth}</td>
            <td className="px-4 py-3 text-slate-500">{time}</td>
            <td className="px-4 py-3">
                {status === 'waiting' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        대기중
                    </span>
                ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        진료중
                    </span>
                )}
            </td>
            <td className="px-4 py-3 text-right">
                <button className="text-xs font-medium text-blue-600 hover:underline">호출</button>
            </td>
        </tr>
    )
}
