
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, User, Clock } from 'lucide-react';
import Link from 'next/link';

interface Reservation {
    id: string;
    name: string;
    contact: string;
    reservationDate: string;
    reservationTime: string;
    status: string;
    message: string;
}

export default function GlobalReservationsPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReservations();
    }, [currentMonth]);

    const fetchReservations = async () => {
        setLoading(true);
        try {
            // Fetch reservations for the current month range (plus overlap) is ideal, 
            // but for simplicity/robustness with small datasets, we'll simple query all 'reservation' types and filter client-side 
            // or query properly if volume allows. Given likely low volume, filtering is safe.
            // Better: Query where reservationDate >= startOfMonth and <= endOfMonth.
            // However, Firestore string comparison on dates works if format is yyyy-MM-dd.

            const start = format(startOfWeek(startOfMonth(currentMonth)), 'yyyy-MM-dd');
            const end = format(endOfWeek(endOfMonth(currentMonth)), 'yyyy-MM-dd');

            // Note: Simplest reliable way without complex indexes is to fetch all active reservations or filter in memory
            // Let's try to filter by type at least.
            const q = query(
                collection(db, 'inquiries'),
                where('type', '==', 'reservation')
                // orderBy('reservationDate') // Requires index
            );

            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Reservation[];

            // Client-side filter for the view range (optional but good for performance if thousands)
            // For now, just keep all to show.
            setReservations(data);

        } catch (error) {
            console.error('Error fetching reservations:', error);
        } finally {
            setLoading(false);
        }
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const today = new Date();

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">전체 예약 현황</h1>
                <div className="flex items-center space-x-4 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                    <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="이전 달">
                        <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </button>
                    <span className="text-lg font-bold text-slate-900 dark:text-white w-32 text-center">
                        {format(currentMonth, 'yyyy년 M월', { locale: ko })}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="다음 달">
                        <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </button>
                    <button
                        onClick={() => setCurrentMonth(new Date())}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                        오늘
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    {weekDays.map((day, i) => (
                        <div key={day} className={`py-3 text-center text-sm font-semibold ${i === 0 ? 'text-red-500' : 'text-slate-500'}`}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 dark:bg-slate-700 gap-[1px]">
                    {days.map((day: Date) => {
                        const dayString = format(day, 'yyyy-MM-dd');
                        const dayReservations = reservations.filter(r => r.reservationDate === dayString)
                            .sort((a, b) => (a.reservationTime || '').localeCompare(b.reservationTime || ''));

                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const isToday = isSameDay(day, today);

                        return (
                            <div
                                key={day.toString()}
                                className={`min-h-[140px] bg-white dark:bg-slate-800 p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-750
                                    ${!isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-800/50 text-slate-400' : ''}
                                `}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`
                                        text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                                        ${isToday ? 'bg-blue-600 text-white' : ''}
                                    `}>
                                        {format(day, dateFormat)}
                                    </span>
                                    {dayReservations.length > 0 && (
                                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                            {dayReservations.length}건
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-1 overflow-y-auto max-h-[100px] custom-scrollbar">
                                    {loading ? (
                                        isCurrentMonth && <div className="h-2 w-12 bg-slate-100 rounded animate-pulse mt-2"></div>
                                    ) : (
                                        dayReservations.map((res) => (
                                            <Link
                                                key={res.id}
                                                href={`/admin/inquiries/${res.id}`}
                                                className={`
                                                    block text-xs p-1.5 rounded border transition-all hover:scale-[1.02]
                                                    ${res.status === 'confirmed'
                                                        ? 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100'
                                                        : res.status === 'completed'
                                                            ? 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
                                                            : 'bg-red-50 border-red-100 text-red-700 hover:bg-red-100'
                                                    }
                                                `}
                                            >
                                                <div className="font-bold flex items-center gap-1">
                                                    <Clock className="w-3 h-3 opacity-70" />
                                                    {res.reservationTime}
                                                </div>
                                                <div className="truncate flex items-center gap-1 mt-0.5">
                                                    <User className="w-3 h-3 opacity-70" />
                                                    {res.name}
                                                </div>
                                            </Link>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
