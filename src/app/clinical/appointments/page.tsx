'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-clinical';
import { Calendar, Clock, User, Phone, FileText, Plus, Edit2, Trash2, Check, X, CalendarDays } from 'lucide-react';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Appointment {
    id: string;
    patientName: string;
    patientPhone: string;
    appointmentDate: any;
    appointmentTime: string;
    department: string;
    doctor: string;
    notes: string;
    status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
    createdAt: any;
}

export default function AppointmentsPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewForm, setShowNewForm] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Form state
    const [formData, setFormData] = useState({
        patientName: '',
        patientPhone: '',
        appointmentDate: format(new Date(), 'yyyy-MM-dd'),
        appointmentTime: '09:00',
        department: '일반진료',
        doctor: '원장님',
        notes: '',
        status: 'confirmed' as const // 예약 등록 시 자동으로 확정 상태
    });

    // Real-time subscription
    useEffect(() => {
        const startDate = startOfDay(selectedDate);
        const endDate = endOfDay(selectedDate);

        const q = query(
            collection(db, 'appointments'),
            where('appointmentDate', '>=', startDate),
            where('appointmentDate', '<=', endDate),
            orderBy('appointmentDate', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const appointmentData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Appointment[];

            setAppointments(appointmentData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [selectedDate]);

    // Filter appointments
    const filteredAppointments = filterStatus === 'all'
        ? appointments
        : appointments.filter(apt => apt.status === filterStatus);

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const appointmentDateTime = new Date(`${formData.appointmentDate}T${formData.appointmentTime}:00`);

            await addDoc(collection(db, 'appointments'), {
                ...formData,
                appointmentDate: Timestamp.fromDate(appointmentDateTime),
                createdAt: serverTimestamp()
            });

            // Reset form
            setFormData({
                patientName: '',
                patientPhone: '',
                appointmentDate: format(new Date(), 'yyyy-MM-dd'),
                appointmentTime: '09:00',
                department: '일반진료',
                doctor: '원장님',
                notes: '',
                status: 'scheduled'
            });

            setShowNewForm(false);
            alert('예약이 등록되었습니다.');
        } catch (error) {
            console.error('Error adding appointment:', error);
            alert('예약 등록에 실패했습니다.');
        }
    };

    // Update status
    const updateStatus = async (id: string, newStatus: Appointment['status']) => {
        try {
            await updateDoc(doc(db, 'appointments', id), {
                status: newStatus
            });
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    // Time slots for selection
    const timeSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00', '17:30', '18:00'
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <CalendarDays className="w-7 h-7 text-emerald-600" />
                        진료 예약 관리
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">환자 진료 예약을 등록하고 관리하세요.</p>
                </div>
                <button
                    onClick={() => setShowNewForm(!showNewForm)}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                    <Plus className="w-5 h-5" />
                    신규 예약 등록
                </button>
            </div>

            {/* Date selector */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-medium text-slate-600">예약 날짜:</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedDate(new Date())}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            오늘
                        </button>
                        <button
                            onClick={() => setSelectedDate(addDays(new Date(), 1))}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            내일
                        </button>
                        <input
                            type="date"
                            value={format(selectedDate, 'yyyy-MM-dd')}
                            onChange={(e) => setSelectedDate(new Date(e.target.value))}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>
                    <div className="flex-1"></div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="all">전체 상태</option>
                        <option value="scheduled">예약됨</option>
                        <option value="confirmed">확정됨</option>
                        <option value="completed">완료</option>
                        <option value="cancelled">취소</option>
                    </select>
                </div>
            </div>

            {/* New appointment form */}
            {showNewForm && (
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">신규 예약 등록</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">환자명 *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.patientName}
                                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="홍길동"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">연락처 *</label>
                                <input
                                    type="tel"
                                    required
                                    value={formData.patientPhone}
                                    onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="010-1234-5678"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">예약 날짜 *</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.appointmentDate}
                                    onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">예약 시간 *</label>
                                <select
                                    required
                                    value={formData.appointmentTime}
                                    onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                    {timeSlots.map(time => (
                                        <option key={time} value={time}>{time}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">진료 과목</label>
                                <select
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                    <option value="일반진료">일반진료</option>
                                    <option value="물리치료">물리치료</option>
                                    <option value="검사">검사</option>
                                    <option value="상담">상담</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">담당 의사</label>
                                <input
                                    type="text"
                                    value={formData.doctor}
                                    onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="원장님"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">메모</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                rows={3}
                                placeholder="특이사항이나 요청사항을 입력하세요"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowNewForm(false)}
                                className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                            >
                                예약 등록
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Appointments list */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800">
                        {format(selectedDate, 'yyyy년 M월 d일 (EEEE)', { locale: ko })} 예약 목록
                        <span className="ml-2 text-sm font-normal text-slate-500">
                            ({filteredAppointments.length}건)
                        </span>
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">시간</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">환자명</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">연락처</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">진료과목</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">담당의</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">상태</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">작업</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                                        로딩 중...
                                    </td>
                                </tr>
                            ) : filteredAppointments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                                        예약된 일정이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                filteredAppointments.map((appointment) => (
                                    <tr key={appointment.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm font-medium text-slate-900">
                                                <Clock className="w-4 h-4 mr-2 text-slate-400" />
                                                {appointment.appointmentTime}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm font-bold text-slate-900">
                                                <User className="w-4 h-4 mr-2 text-slate-400" />
                                                {appointment.patientName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            <div className="flex items-center">
                                                <Phone className="w-4 h-4 mr-2 text-slate-400" />
                                                {appointment.patientPhone}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {appointment.department}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {appointment.doctor}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select
                                                value={appointment.status}
                                                onChange={(e) => updateStatus(appointment.id, e.target.value as Appointment['status'])}
                                                className={`px-3 py-1 text-xs font-medium rounded-full border-0 focus:ring-2 focus:ring-emerald-500 ${
                                                    appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                                    appointment.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                                                    appointment.status === 'completed' ? 'bg-slate-100 text-slate-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}
                                            >
                                                <option value="scheduled">예약됨</option>
                                                <option value="confirmed">확정됨</option>
                                                <option value="completed">완료</option>
                                                <option value="cancelled">취소</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            {appointment.notes && (
                                                <button
                                                    title={appointment.notes}
                                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
