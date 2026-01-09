'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, startAfter, limit, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, User, Clock, Search, List as ListIcon, Grid as GridIcon, Phone } from 'lucide-react';
import Link from 'next/link';

interface Reservation {
    id: string;
    name: string;
    contact: string;
    reservationDate: string;
    reservationTime: string;
    status: string;
    message: string;
    createdAt?: any;
    type?: string;
}

const ITEMS_PER_PAGE = 10;

export default function GlobalReservationsPage() {
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [calendarReservations, setCalendarReservations] = useState<Reservation[]>([]);

    // List State
    const [listReservations, setListReservations] = useState<Reservation[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [listLoading, setListLoading] = useState(false);

    // List Pagination
    const [listPage, setListPage] = useState(1);
    const [listHasMore, setListHasMore] = useState(true);
    const [lastDocs, setLastDocs] = useState<QueryDocumentSnapshot<DocumentData>[]>([]);

    // Shared State
    const [loading, setLoading] = useState(true);

    // --- Calendar Logic ---
    useEffect(() => {
        if (viewMode === 'calendar') {
            fetchCalendarReservations();
        } else {
            loadListReservations(1);
        }
    }, [currentMonth, viewMode]);

    const fetchCalendarReservations = async () => {
        setLoading(true);
        try {
            const monthStart = startOfMonth(currentMonth);
            const monthEnd = endOfMonth(currentMonth);
            const startStr = format(startOfWeek(monthStart), 'yyyy-MM-dd');
            const endStr = format(endOfWeek(monthEnd), 'yyyy-MM-dd');

            const q = query(
                collection(db, 'inquiries'),
                where('type', '==', 'reservation'),
                where('reservationDate', '>=', startStr),
                where('reservationDate', '<=', endStr)
            );

            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Reservation[];

            setCalendarReservations(data);
        } catch (error) {
            console.error('Error fetching calendar reservations:', error);
            // Fallback for missing index
            const q = query(collection(db, 'inquiries'), where('type', '==', 'reservation'));
            const snap = await getDocs(q);
            const all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Reservation[];
            const startStr = format(startOfWeek(startOfMonth(currentMonth)), 'yyyy-MM-dd');
            const endStr = format(endOfWeek(endOfMonth(currentMonth)), 'yyyy-MM-dd');
            setCalendarReservations(all.filter(r => r.reservationDate >= startStr && r.reservationDate <= endStr));
        } finally {
            setLoading(false);
        }
    };

    const loadListReservations = async (page: number, isSearch: boolean = false) => {
        setListLoading(true);
        try {
            // Search Logic
            if (searchTerm) {
                // Client-side search (fetch latest 100)
                const q = query(
                    collection(db, 'inquiries'),
                    where('type', '==', 'reservation'),
                    orderBy('reservationDate', 'desc'),
                    limit(100)
                );
                const snap = await getDocs(q);
                const all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Reservation[];
                const term = searchTerm.toLowerCase();
                const filtered = all.filter(r => r.name.toLowerCase().includes(term) || r.contact?.includes(term));
                setListReservations(filtered);
                setListHasMore(false);
                setListLoading(false);
                return; // Exit normal pagination
            }

            // Pagination Logic
            let constraints: any[] = [
                orderBy('reservationDate', 'desc'),
                limit(ITEMS_PER_PAGE)
            ];

            if (page > 1) {
                const anchor = lastDocs[page - 2];
                if (anchor) constraints.push(startAfter(anchor));
            }

            const q = query(
                collection(db, 'inquiries'),
                where('type', '==', 'reservation'),
                ...constraints
            );

            const snap = await getDocs(q);
            setListReservations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation)));

            // Check More
            setListHasMore(snap.docs.length === ITEMS_PER_PAGE);

            // Stack
            if (snap.docs.length > 0) {
                const last = snap.docs[snap.docs.length - 1];
                setLastDocs(prev => {
                    const next = [...prev];
                    next[page - 1] = last;
                    return next;
                });
            }

        } catch (error) {
            console.error('Error list fetch:', error);
            // Fallback query (no order)
            const q = query(collection(db, 'inquiries'), where('type', '==', 'reservation'), limit(20));
            const snap = await getDocs(q);
            setListReservations(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Reservation[]);
        } finally {
            setListLoading(false);
        }
        if (!isSearch) setListPage(page);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadListReservations(1, true);
    };

    const clearSearch = () => {
        setSearchTerm('');
        setLastDocs([]);
        setTimeout(() => loadListReservations(1), 0);
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">예약 관리</h1>

                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'calendar' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <CalendarIcon className="w-4 h-4" /> 캘린더
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ListIcon className="w-4 h-4" /> 목록/검색
                    </button>
                </div>
            </div>

            {viewMode === 'calendar' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-center space-x-4 bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                            <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        </button>
                        <span className="text-xl font-bold text-slate-900 dark:text-white w-40 text-center">
                            {format(currentMonth, 'yyyy년 M월', { locale: ko })}
                        </span>
                        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                            <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        </button>
                        <button
                            onClick={() => setCurrentMonth(new Date())}
                            className="ml-4 text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors uppercase"
                        >
                            Today
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                            {weekDays.map((day, i) => (
                                <div key={day} className={`py-3 text-center text-sm font-semibold ${i === 0 ? 'text-red-500' : 'text-slate-500'}`}>
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 dark:bg-slate-700 gap-[1px]">
                            {days.map((day: Date) => {
                                const dayString = format(day, 'yyyy-MM-dd');
                                const dayReservations = calendarReservations.filter(r => r.reservationDate === dayString)
                                    .sort((a, b) => (a.reservationTime || '').localeCompare(b.reservationTime || ''));
                                const isCurrentMonth = isSameMonth(day, monthStart);
                                const isToday = isSameDay(day, new Date());

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
                                                ${isToday ? 'bg-blue-600 text-white shadow-md' : ''}
                                            `}>
                                                {format(day, 'd')}
                                            </span>
                                            {dayReservations.length > 0 && (
                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100">
                                                    {dayReservations.length}
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-1 overflow-y-auto max-h-[100px] custom-scrollbar">
                                            {loading ? (
                                                isCurrentMonth && <div className="space-y-1">
                                                    <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                                                </div>
                                            ) : (
                                                dayReservations.map((res) => (
                                                    <Link
                                                        key={res.id}
                                                        href={`/admin/inquiries/${res.id}`}
                                                        className={`
                                                            block text-[11px] p-1.5 rounded border transition-all hover:scale-[1.02] hover:shadow-sm
                                                            ${res.status === 'confirmed'
                                                                ? 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100'
                                                                : res.status === 'completed'
                                                                    ? 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                                                                    : 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100'
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
            )}

            {viewMode === 'list' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="예약자 이름 또는 연락처로 검색..."
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white"
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-medium transition-colors"
                            >
                                검색
                            </button>
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-medium transition-colors"
                                >
                                    초기화
                                </button>
                            )}
                        </form>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">예약 일시</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">예약자</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">연락처</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">상태</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">관리</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                {listLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-24 text-center">
                                            <Loader2 className="animate-spin h-8 w-8 text-blue-500 mx-auto" />
                                        </td>
                                    </tr>
                                ) : listReservations.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            {searchTerm ? '검색 결과가 없습니다.' : '예약 내역이 없습니다.'}
                                        </td>
                                    </tr>
                                ) : (
                                    listReservations.map((res) => (
                                        <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold text-slate-900 dark:text-white">{res.reservationDate}</div>
                                                <div className="text-xs text-blue-600 font-medium">{res.reservationTime}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-slate-900 dark:text-white font-medium">{res.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center text-sm text-slate-500">
                                                    <Phone className="w-3 h-3 mr-1" />
                                                    {res.contact}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                    ${res.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                                        res.status === 'completed' ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-800'}`}>
                                                    {res.status === 'confirmed' ? '승인됨' : res.status === 'completed' ? '완료' : '대기중'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                <Link href={`/admin/inquiries/${res.id}`} className="text-blue-600 hover:text-blue-900 font-medium">
                                                    상세보기
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination Controls */}
                    {!searchTerm && listReservations.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between rounded-b-xl">
                            <span className="text-sm text-slate-500">
                                페이지 <span className="font-medium text-slate-900 dark:text-white">{listPage}</span>
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => loadListReservations(listPage - 1)}
                                    disabled={listPage === 1 || listLoading}
                                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => loadListReservations(listPage + 1)}
                                    disabled={!listHasMore || listLoading}
                                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
