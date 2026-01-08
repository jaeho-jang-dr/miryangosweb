
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
    const [stats, setStats] = useState({
        totalReservations: 0,
        uncheckedInquiries: 0,
        todayVisits: 24, // Mock data for now as we don't track visits yet
        staffCount: 0
    });
    const [recentInquiries, setRecentInquiries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Stats
                const inquiriesRef = collection(db, 'inquiries');
                const staffRef = collection(db, 'staff');

                // Total Reservations (type == 'reservation')
                const reservationQuery = query(inquiriesRef, where('type', '==', 'reservation'));
                const reservationSnap = await getDocs(reservationQuery);
                const totalReservations = reservationSnap.size;

                // Unchecked Inquiries (status == 'pending')
                const pendingQuery = query(inquiriesRef, where('status', '==', 'pending'));
                const pendingSnap = await getDocs(pendingQuery);
                const uncheckedInquiries = pendingSnap.size;

                // Today Visits
                const visitsRef = collection(db, 'visits');
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Start of today
                const todayTimestamp = Timestamp.fromDate(today);

                const visitsQuery = query(visitsRef, where('visitDate', '>=', todayTimestamp));
                const visitsSnap = await getDocs(visitsQuery);
                const visitsCount = visitsSnap.size;

                // Staff Count (Employees: admin, manager, operator)
                const usersRef = collection(db, 'users');
                const staffQuery = query(usersRef, where('role', 'in', ['admin', 'manager', 'operator']));
                const staffSnap = await getDocs(staffQuery);
                const staffCount = staffSnap.size;

                setStats({
                    totalReservations,
                    uncheckedInquiries,
                    todayVisits: visitsCount,
                    staffCount
                });

                // 2. Fetch Recent Inquiries
                const recentQuery = query(inquiriesRef, orderBy('createdAt', 'desc'), limit(5));
                const recentSnap = await getDocs(recentQuery);
                const recentData = recentSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setRecentInquiries(recentData);

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">대시보드</h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="총 예약" value={stats.totalReservations.toString()} change="누적 예약" />
                <StatCard title="미확인 문의" value={stats.uncheckedInquiries.toString()} change="처리 필요" alert={stats.uncheckedInquiries > 0} />
                <StatCard title="오늘 방문" value={stats.todayVisits.toString()} change="예상 방문자" />
                <StatCard title="의료진" value={stats.staffCount.toString()} change="재직 중" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-medium mb-4">최근 문의/예약 현황</h3>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin h-6 w-6 text-slate-400" />
                        </div>
                    ) : recentInquiries.length > 0 ? (
                        <div className="space-y-4">
                            {recentInquiries.map((item) => (
                                <div key={item.id} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 last:border-0 last:pb-0">
                                    <div>
                                        <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                            {item.authorName}
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${item.type === 'reservation' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                                }`}>
                                                {item.type === 'reservation' ? '예약' : '문의'}
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-500 truncate max-w-[200px]">{item.content}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-sm font-medium ${item.status === 'pending' ? 'text-red-500' : 'text-slate-500'
                                            }`}>
                                            {item.status === 'pending' ? '대기중' : item.status === 'confirmed' ? '확인됨' : '완료'}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : '날짜 없음'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-slate-500 py-4 text-center">데이터가 없습니다.</div>
                    )}
                </div>
                <div className="col-span-3 p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-medium mb-4">빠른 작업</h3>
                    <div className="space-y-2">
                        <Link href="/admin/notices/new" className="block w-full">
                            <ActionButton label="새 공지사항 작성" />
                        </Link>
                        <Link href="/admin/staff" className="block w-full">
                            <ActionButton label="의료진 순서 변경" />
                        </Link>
                        <Link href="/admin/settings" className="block w-full">
                            <ActionButton label="병원 설정 / 데이터 초기화" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value, change, alert }: { title: string; value: string; change: string; alert?: boolean }) {
    return (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
            <p className={`text-xs ${alert ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                {change}
            </p>
        </div>
    )
}

function ActionButton({ label }: { label: string }) {
    return (
        <button className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            {label}
        </button>
    )
}
