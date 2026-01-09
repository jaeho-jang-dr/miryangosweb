'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase-public';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { Loader2, CheckCircle, AlertCircle, Calendar as CalendarIcon, Clock, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DayPicker } from 'react-day-picker';
import { format, isSunday, isSaturday, setHours, setMinutes, addMinutes, isAfter, isBefore, addMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { SocialLogin } from '@/components/social-login';

export default function InquiryPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clinicInfo, setClinicInfo] = useState({
        name: 'Miryang OS Hospital',
        phone: '055-123-4567',
        address: '경상남도 밀양시 시청로 123',
        lunchTime: '13:00 - 14:00',
        weekdayHours: '08:30 - 17:30',
        saturdayHours: '08:30 - 12:30 (1, 3주 휴무)',
        holidayInfo: '일요일, 공휴일'
    });

    // Auth State
    const [user, setUser] = useState<User | null>(null);

    // Form Stats
    const [formData, setFormData] = useState({
        type: 'reservation', // reservation | inquiry
        name: '',
        contact: '',
        message: '',
        agreedToPolicy: false
    });

    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [availableTimes, setAvailableTimes] = useState<string[]>([]);
    const [reservedSlots, setReservedSlots] = useState<Record<string, number>>({});

    const [activeTab, setActiveTab] = useState<'new' | 'check'>('new');
    const [checkForm, setCheckForm] = useState({ name: '', contact: '' });
    const [myReservations, setMyReservations] = useState<any[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [editingRes, setEditingRes] = useState<any | null>(null); // Modification State

    // Load Clinic Settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { doc, getDoc } = await import('firebase/firestore');
                const docRef = doc(db, 'settings', 'general');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setClinicInfo(prev => ({ ...prev, ...docSnap.data() }));
                }
            } catch (error) {
                console.error("Failed to load settings:", error);
            }
        };
        fetchSettings();
    }, []);

    // Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                if (!formData.name && currentUser.displayName) {
                    setFormData(prev => ({ ...prev, name: currentUser.displayName! }));
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // Fetch existing reservations for the selected date
    useEffect(() => {
        const fetchReservedSlots = async () => {
            if (!selectedDate) {
                setReservedSlots({});
                return;
            }

            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            try {
                const q = query(
                    collection(db, 'inquiries'),
                    where('reservationDate', '==', dateStr),
                    where('type', '==', 'reservation')
                );
                const snapshot = await getDocs(q);

                const counts: Record<string, number> = {};
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.reservationTime) {
                        counts[data.reservationTime] = (counts[data.reservationTime] || 0) + 1;
                    }
                });
                setReservedSlots(counts);
            } catch (error) {
                console.error("Failed to fetch slots:", error);
            }
        };

        fetchReservedSlots();
    }, [selectedDate]);

    // Function to generate time slots
    const getAvailableTimes = (date: Date) => {
        if (isSunday(date)) return [];

        const times: string[] = [];
        const isSat = isSaturday(date);

        let startTime = setMinutes(setHours(date, 8), 30); // 08:30
        const endTime = isSat
            ? setMinutes(setHours(date, 12), 30) // 12:30 for Saturday
            : setMinutes(setHours(date, 17), 30); // 17:30 for Weekday

        const lunchStart = setHours(date, 13); // 13:00
        const lunchEnd = setHours(date, 14); // 14:00

        while (isBefore(startTime, endTime)) {
            const timeString = format(startTime, 'HH:mm');

            // Skip lunch time on weekdays
            if (!isSat && (isAfter(startTime, lunchStart) || startTime.getTime() === lunchStart.getTime()) && isBefore(startTime, lunchEnd)) {
                startTime = addMinutes(startTime, 30);
                continue;
            }

            times.push(timeString);
            startTime = addMinutes(startTime, 30);
        }
        return times;
    };

    useEffect(() => {
        setSelectedTime(null);
        if (selectedDate) {
            setAvailableTimes(getAvailableTimes(selectedDate));
        } else {
            setAvailableTimes([]);
        }
    }, [selectedDate]);

    // Login Handlers
    // Removed individual handlers in favor of SocialLogin component
    // const handleGoogleLogin...
    // const handleKakaoLogin...
    // const handleNaverLogin...

    const handleLogout = async () => {
        await signOut(auth);
        setMyReservations([]);
        setHasSearched(false);
    };

    const fetchMyReservations = async () => {
        setIsLoading(true);
        try {
            let q;
            const inquiriesRef = collection(db, 'inquiries');

            if (user) {
                q = query(
                    inquiriesRef,
                    where('userId', '==', user.uid),
                    where('type', '==', 'reservation'),
                    where('status', 'in', ['new', 'confirmed']),
                    orderBy('createdAt', 'desc')
                );
            } else {
                q = query(
                    inquiriesRef,
                    where('name', '==', checkForm.name),
                    where('contact', '==', checkForm.contact),
                    where('type', '==', 'reservation'),
                    where('status', 'in', ['new', 'confirmed']),
                    orderBy('createdAt', 'desc')
                );
            }

            // Note: index might be required for compound queries
            const querySnapshot = await getDocs(q);
            const reservations = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as any[];

            setMyReservations(reservations);
            setHasSearched(true);
        } catch (error) {
            console.error("Error fetching reservations:", error);
            if ((error as any).code === 'failed-precondition') {
                // Index missing likely
                alert("시스템 초기화 중입니다. 잠시 후 다시 시도해주세요. (Index building)");
            } else {
                alert("예약 조회 중 오류가 발생했습니다.");
            }

        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.type === 'reservation') {
            if (!user) {
                alert("예약은 로그인이 필요합니다.");
                return;
            }
            if (!selectedDate || !selectedTime) {
                setError('예약 날짜와 시간을 선택해주세요.');
                return;
            }
        }

        if (!formData.agreedToPolicy) {
            setError('개인정보 수집 및 이용에 동의해주세요.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            if (!editingRes) { // Skip duplicate check if editing and user confirmed (or it's the same res)
                // 1. Check active reservation by User ID (if logged in)
                const inquiriesRef = collection(db, 'inquiries');
                if (user) {
                    const uidQuery = query(
                        inquiriesRef,
                        where('userId', '==', user.uid),
                        where('type', '==', 'reservation'),
                        where('status', 'in', ['new', 'confirmed'])
                    );
                    const uidSnapshot = await getDocs(uidQuery);
                    if (!uidSnapshot.empty) {
                        // Check if the found doc is NOT the one we are editing (if strictly checking duplications even during edit, 
                        // but usually edit implies updating THIS one. Logic below handles new reservations.)
                        // Since we are inside !editingRes block, this is only for NEW.
                        if (confirm('이미 회원님 계정으로 접수된 예약이 있습니다.\n확인하시겠습니까? (예약 조회 탭으로 이동)')) {
                            setActiveTab('check');
                            setCheckForm({ name: formData.name, contact: formData.contact });
                            setTimeout(() => fetchMyReservations(), 100);
                        }
                        setIsLoading(false);
                        return;
                    }
                }

                // 2. Check active reservation by Name + Contact (Cross-Account Identity Check)
                const identityQuery = query(
                    inquiriesRef,
                    where('name', '==', formData.name),
                    where('contact', '==', formData.contact),
                    where('type', '==', 'reservation'),
                    where('status', 'in', ['new', 'confirmed'])
                );
                const identitySnapshot = await getDocs(identityQuery);
                if (!identitySnapshot.empty) {
                    if (confirm('동일한 이름과 연락처로 이미 접수된 예약이 있습니다.\n확인하시겠습니까? (예약 조회 탭으로 이동)')) {
                        setActiveTab('check');
                        setCheckForm({ name: formData.name, contact: formData.contact });
                    }
                    setIsLoading(false);
                    return;
                }
            }

            if (editingRes) {
                // Update existing reservation
                await updateDoc(doc(db, 'inquiries', editingRes.id), {
                    ...formData,
                    reservationDate: formData.type === 'reservation' ? format(selectedDate!, 'yyyy-MM-dd') : null,
                    reservationTime: selectedTime,
                    // Keep original ownership info
                    updatedAt: serverTimestamp(),
                });
                alert('예약이 수정되었습니다.');

                // Reset Edit Mode
                setEditingRes(null);
                setActiveTab('check');
                // Auto refresh will happen in check tab due to useEffect or we trigger it
                if (user || hasSearched) {
                    setTimeout(() => fetchMyReservations(), 100);
                }
            } else {
                // Create New
                await addDoc(collection(db, 'inquiries'), {
                    ...formData,
                    reservationDate: formData.type === 'reservation' ? format(selectedDate!, 'yyyy-MM-dd') : null,
                    reservationTime: selectedTime,
                    userId: user?.uid || null,
                    userEmail: user?.email || null,
                    createdAt: serverTimestamp(),
                    status: 'new'
                });

                alert(formData.type === 'reservation' ? '예약이 접수되었습니다.' : '문의가 등록되었습니다.');
            }

            if (!editingRes) {
                setFormData({
                    type: 'reservation',
                    name: user?.displayName || '',
                    contact: '',
                    message: '',
                    agreedToPolicy: false
                });
                setSelectedDate(undefined);
                setSelectedTime(null);
            }

            // Switch to check tab if reservation made? Optional.

        } catch (err) {
            console.error(err);
            setError('처리 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckReservations = async (e: React.FormEvent) => {
        e.preventDefault();
        fetchMyReservations();
    };

    const handleCancelReservation = async (id: string, date: string, time: string) => {
        if (!confirm(`${date} ${time} 예약을 취소하시겠습니까?`)) return;

        try {
            await deleteDoc(doc(db, 'inquiries', id));
            alert('예약이 취소되었습니다.');

            // Refresh
            if (user || hasSearched) {
                fetchMyReservations();
            }
        } catch (error) {
            console.error("Cancel failed", error);
            alert('취소 중 오류가 발생했습니다.');
        }
    };

    const handleModifyReservation = (res: any) => {
        setEditingRes(res);
        setFormData({
            type: 'reservation',
            name: res.name,
            contact: res.contact,
            message: res.message || '',
            agreedToPolicy: true // Already agreed
        });

        // Parse date handling timezone issues if simplified string
        const [year, month, day] = res.reservationDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        setSelectedDate(dateObj);

        setSelectedTime(res.reservationTime);
        setActiveTab('new');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingRes(null);
        setFormData({
            type: 'reservation',
            name: user?.displayName || '',
            contact: '',
            message: '',
            agreedToPolicy: false
        });
        setSelectedDate(undefined);
        setSelectedTime(null);
    };

    // Auto-fetch reservations when entering Check tab if logged in
    useEffect(() => {
        if (activeTab === 'check' && user) {
            fetchMyReservations();
        }
    }, [activeTab, user]);

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 pt-24 pb-12">
            <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">예약 / 문의</h1>
                        <p className="text-slate-600 dark:text-slate-400">진료 예약이나 궁금한 점을 남겨주세요.<br className="hidden md:block" />빠르고 친절하게 답변해 드리겠습니다.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        <div className="md:col-span-1 space-y-4">
                            <div className="bg-blue-50 dark:bg-slate-900 p-6 rounded-2xl border border-blue-100 dark:border-slate-800">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">진료 시간</h3>
                                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                    <div className="flex justify-between">
                                        <span>평일</span>
                                        <span className="font-medium text-slate-900 dark:text-slate-200">{clinicInfo.weekdayHours}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>토요일</span>
                                        <span className="font-medium text-slate-900 dark:text-slate-200">{clinicInfo.saturdayHours}</span>
                                    </div>
                                    <div className="pt-2 border-t border-blue-100 dark:border-slate-800 mt-2">
                                        <p className="text-xs">점심시간 {clinicInfo.lunchTime}</p>
                                        <p className="text-xs text-red-500 mt-1">
                                            {clinicInfo.holidayInfo}{!clinicInfo.holidayInfo.includes('휴무') && !clinicInfo.holidayInfo.includes('휴진') && ' 휴진'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">병원 정보</h3>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">전화문의</p>
                                        <p className="text-xl font-bold text-blue-600">{clinicInfo.phone}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">주소</p>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 break-keep">
                                            {clinicInfo.address}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Area with Tabs */}
                        <div className="md:col-span-2">
                            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
                                <button
                                    onClick={() => setActiveTab('new')}
                                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'new'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    예약/문의 신청
                                </button>
                                <button
                                    onClick={() => setActiveTab('check')}
                                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'check'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    예약 조회/취소
                                </button>
                            </div>

                            {activeTab === 'new' ? (
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">

                                    {/* Inquiry Type Selection Check */}
                                    <div className="mb-8">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">문의 유형</label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                            aria-label="문의 유형 선택"
                                        >
                                            <option value="reservation">진료 예약</option>
                                            <option value="inquiry">일반 문의</option>
                                        </select>
                                    </div>

                                    {/* Authentication Check for Reservation */}
                                    {formData.type === 'reservation' && !user ? (
                                        <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">로그인이 필요합니다</h3>
                                            <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">진료 예약은 본인 확인을 위해 로그인이 필수입니다.</p>

                                            <div className="flex flex-col gap-3 max-w-xs mx-auto">
                                                <button
                                                    onClick={() => router.push('/login?next=/inquiry')}
                                                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                                                >
                                                    로그인하고 예약하기
                                                </button>
                                                <p className="text-xs text-center text-slate-500 mt-2">
                                                    SNS 계정으로 간편하게 시작하세요
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmit}>
                                            {/* Logged User Info Bar */}
                                            {user && (
                                                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        {user.photoURL ? (
                                                            <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                                {user.displayName?.charAt(0) || 'U'}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-bold text-slate-800 dark:text-slate-200">{user.displayName}님, 안녕하세요!</div>
                                                            <div className="text-xs text-slate-500">{user.email}</div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleLogout}
                                                        className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 underline"
                                                    >
                                                        로그아웃
                                                    </button>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-4 mb-6">
                                                <div className="col-span-2 sm:col-span-1">
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">이름</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={formData.name}
                                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                        placeholder="홍길동"
                                                    />
                                                </div>
                                                <div className="col-span-2 sm:col-span-1">
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">연락처</label>
                                                    <input
                                                        type="tel"
                                                        required
                                                        value={formData.contact}
                                                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                        placeholder="010-1234-5678"
                                                    />
                                                </div>
                                            </div>

                                            {editingRes && (
                                                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex justify-between items-center">
                                                    <div>
                                                        <div className="font-bold text-amber-800 dark:text-amber-200">예약 수정 모드</div>
                                                        <div className="text-xs text-amber-700 dark:text-amber-300">
                                                            기존 예약({editingRes.reservationDate} {editingRes.reservationTime})을 수정하고 있습니다.
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={cancelEdit}
                                                        className="text-sm px-3 py-1 bg-white border border-amber-300 rounded hover:bg-amber-50 text-amber-800 transition-colors"
                                                    >
                                                        수정 취소
                                                    </button>
                                                </div>
                                            )}

                                            {formData.type === 'reservation' && (
                                                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                                        <CalendarIcon className="w-4 h-4 text-blue-600" />
                                                        예약 일시 선택
                                                    </label>
                                                    <div className="flex flex-col xl:flex-row gap-8">
                                                        <div className="flex-none flex justify-center bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 mx-auto xl:mx-0">
                                                            <DayPicker
                                                                mode="single"
                                                                selected={selectedDate}
                                                                onSelect={setSelectedDate}
                                                                locale={ko}
                                                                disabled={[
                                                                    { before: new Date() }, // Disable past dates
                                                                    { after: addMonths(new Date(), 6) }, // Disable more than 6 months ahead
                                                                    (date) => isSunday(date) // Disable Sundays
                                                                ]}
                                                                classNames={{
                                                                    day_selected: "bg-blue-600 text-white font-bold rounded-full transition-all duration-300 transform scale-110 shadow-lg ring-2 ring-blue-300 hover:bg-blue-700 hover:scale-110",
                                                                    day_today: "text-blue-600 font-bold",
                                                                    day: "p-2 rounded-full hover:bg-slate-100 transition-colors"
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex-1 space-y-2 min-w-[200px]">
                                                            <label className="text-xs font-semibold text-slate-500">시간 선택 (최대 6명)</label>
                                                            {selectedDate ? (
                                                                availableTimes.length > 0 ? (
                                                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-[320px] overflow-y-auto pr-2">
                                                                        {availableTimes.map((time) => {
                                                                            const count = reservedSlots[time] || 0;
                                                                            const isFull = count >= 6;
                                                                            return (
                                                                                <button
                                                                                    key={time}
                                                                                    type="button"
                                                                                    disabled={isFull}
                                                                                    onClick={() => !isFull && setSelectedTime(time)}
                                                                                    className={`
                                                                        relative px-2 py-3 text-sm rounded-lg border transition-all flex flex-col items-center justify-center gap-1
                                                                        ${isFull
                                                                                            ? 'bg-red-50 text-red-300 border-red-100 cursor-not-allowed opacity-50'
                                                                                            : selectedTime === time
                                                                                                ? 'bg-blue-600 text-white border-blue-600'
                                                                                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                                                                                        }
                                                                    `}
                                                                                >
                                                                                    <span className={isFull ? 'text-red-300' : ''}>{time}</span>
                                                                                    <span className={`text-[10px] ${selectedTime === time ? 'text-blue-100' : isFull ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                                                                                        {isFull ? '(6/6)' : `(${count}/6)`}
                                                                                    </span>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-sm text-red-500 py-4 text-center bg-red-50 rounded-lg">예약 가능한 시간이 없습니다.</div>
                                                                )
                                                            ) : (
                                                                <div className="text-sm text-slate-400 py-4 text-center bg-slate-100 dark:bg-slate-800 rounded-lg">측면 달력에서<br />날짜를 먼저 선택해주세요.</div>
                                                            )}
                                                            {selectedDate && selectedTime && (
                                                                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-2 text-blue-600 dark:text-blue-300 text-sm font-medium">
                                                                    <Clock className="w-4 h-4" />
                                                                    선택함: {format(selectedDate, 'M월 d일', { locale: ko })} {selectedTime}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mb-6">
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                    {formData.type === 'reservation' ? '증상 및 요청사항' : '내용'}
                                                </label>
                                                <textarea
                                                    required
                                                    rows={5}
                                                    value={formData.message}
                                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                                                    placeholder={formData.type === 'reservation' ? "증상을 간단히 적어주세요." : "문의하실 내용을 상세히 적어주세요."}
                                                />
                                            </div>

                                            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg mb-6">
                                                <input
                                                    type="checkbox"
                                                    id="policy"
                                                    checked={formData.agreedToPolicy}
                                                    onChange={(e) => setFormData({ ...formData, agreedToPolicy: e.target.checked })}
                                                    className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                                />
                                                <label htmlFor="policy" className="text-sm text-slate-600 dark:text-slate-400">
                                                    <span className="font-bold text-slate-900 dark:text-slate-200">[필수] 개인정보 수집 및 이용 동의</span><br />
                                                    귀하는 개인정보 수집 및 이용에 동의하지 않을 권리가 있으며, 동의를 거부하실 경우 문의 접수가 제한됩니다.<br />
                                                    수집 항목: 이름, 연락처 / 이용 목적: 문의 상담 및 예약 처리 / 보유 기간: 처리 완료 후 1년
                                                </label>
                                            </div>

                                            {error && (
                                                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg dark:bg-red-900/20 dark:text-red-400 mb-6">
                                                    <AlertCircle className="w-4 h-4" />
                                                    {error}
                                                </div>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                        처리 중...
                                                    </>
                                                ) : (
                                                    formData.type === 'reservation'
                                                        ? (editingRes ? '예약 수정하기' : '예약 신청하기')
                                                        : '문의하기'
                                                )}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
                                    <h3 className="text-lg font-bold mb-6">내 예약 조회</h3>
                                    {user && (
                                        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl flex items-center justify-between">
                                            <div className="font-medium text-blue-800 dark:text-blue-200">
                                                {user.displayName}님의 예약 내역입니다.
                                            </div>
                                        </div>
                                    )}

                                    {!user && (
                                        <form onSubmit={handleCheckReservations} className="mb-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">이름</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={checkForm.name}
                                                        onChange={(e) => setCheckForm({ ...checkForm, name: e.target.value })}
                                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600"
                                                        placeholder="예약자 성함"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">연락처</label>
                                                    <input
                                                        type="tel"
                                                        required
                                                        value={checkForm.contact}
                                                        onChange={(e) => setCheckForm({ ...checkForm, contact: e.target.value })}
                                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600"
                                                        placeholder="010-1234-5678"
                                                    />
                                                </div>
                                            </div>
                                            <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
                                                비회원 예약 조회하기
                                            </button>
                                        </form>
                                    )}

                                    {hasSearched ? (
                                        <div className="space-y-4">
                                            {myReservations.length > 0 ? (
                                                myReservations.map((res) => (
                                                    <div key={res.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 dark:bg-slate-900/30 flex justify-between items-center">
                                                        <div>
                                                            <div className="font-bold text-lg text-blue-600 mb-1">
                                                                {res.reservationDate} {res.reservationTime}
                                                            </div>
                                                            <div className="text-sm text-slate-600">
                                                                {res.name}님 ({res.status === 'new' ? '접수 대기' : '예약 확정'})
                                                            </div>
                                                        </div>
                                                        <div className="flex">
                                                            <button
                                                                onClick={() => handleCancelReservation(res.id, res.reservationDate, res.reservationTime)}
                                                                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                                                            >
                                                                예약 취소
                                                            </button>
                                                            <button
                                                                onClick={() => handleModifyReservation(res)}
                                                                className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 ml-2"
                                                            >
                                                                예약 변경
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 text-slate-500">
                                                    예약 내역이 없습니다.
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        user && (
                                            <div className="text-center py-8">
                                                <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-600" />
                                                <div className="mt-2 text-slate-500">예약 내역을 불러오는 중입니다...</div>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
