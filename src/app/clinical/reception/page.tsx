'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, limit, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-clinical';
import { Search, UserPlus, Clock, Calendar, User, ChevronRight, Stethoscope, AlertCircle, CheckCircle, CalendarCheck, Plus, Phone, FileText, CalendarDays, Printer, FileDown, ShieldCheck, X } from 'lucide-react';
import Link from 'next/link';
import { Patient, Visit } from '@/types/clinical';
import { changeVisitStatus } from '@/lib/workflow-engine';
import { logAudit } from '@/lib/audit-client';
import PatientStatusBadges from '@/components/clinical/PatientStatusBadges';
import { startOfDay, subDays, format, addDays, startOfDay as startOfDayFns, endOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Appointment {
    id: string;
    patientName: string;
    patientPhone: string;
    appointmentDate: Timestamp;
    appointmentTime: string;
    department: string;
    doctor: string;
    notes: string;
    status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
    createdAt: Timestamp;
    [key: string]: any;
}

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'reception': return '접수실';
        case 'consulting': return '진료실';
        case 'treatment': return '치료실';
        case 'testing': return '검사실';
        case 'completed': return '수납대기';
        case 'paid': return '완료';
        default: return status;
    }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'reception': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'consulting': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'treatment': return 'bg-green-100 text-green-800 border-green-200';
        case 'testing': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'completed': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
        case 'paid': return 'bg-slate-100 text-slate-800 border-slate-200';
        default: return 'bg-slate-100 text-slate-500';
    }
};

type DocumentType = 'prescription' | 'receipt' | 'detailed_receipt' | 'certificate' | 'diagnosis' | 'referral' | 'chart_copy' | 'opinion';

export default function ReceptionPage() {
    const [activeTab, setActiveTab] = useState<'reception' | 'payment' | 'documents' | 'appointments'>('reception');

    // Left Panel: Search
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Data Lists
    const [todayVisits, setTodayVisits] = useState<Visit[]>([]);
    const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    // Selected Visit for Payment/Documents
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
    const [modalMode, setModalMode] = useState<'none' | 'invoice' | 'documents' | 'preview' | 'next_appointment'>('none');
    const [previewType, setPreviewType] = useState<DocumentType | null>(null);

    // Appointments Tab State
    const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
    const [showNewAppointmentForm, setShowNewAppointmentForm] = useState(false);
    const [selectedAppointmentDate, setSelectedAppointmentDate] = useState(new Date());
    const [filterStatus, setFilterStatus] = useState<string>('all');
    // Documents State
    const [selectedDocuments, setSelectedDocuments] = useState<{ type: DocumentType; label: string; price: number }[]>([]);
    const [showPreview, setShowPreview] = useState(false); // To toggle preview modal from calculation modal
    // 수납 후 다음 예약 확인용
    const [paidVisitForAppointment, setPaidVisitForAppointment] = useState<Visit | null>(null);

    const [appointmentFormData, setAppointmentFormData] = useState({
        patientName: '',
        patientPhone: '',
        appointmentDate: format(new Date(), 'yyyy-MM-dd'),
        appointmentTime: '09:00',
        department: '일반진료',
        doctor: '원장님',
        notes: '',
        status: 'confirmed' as const
    });

    // Initial Load & Real-time Subscription
    useEffect(() => {
        const today = subDays(startOfDay(new Date()), 7);
        const q = query(
            collection(db, 'visits'),
            where('date', '>=', today),
            orderBy('date', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const visits = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Visit[];
            setTodayVisits(visits);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Real-time subscription for today's appointments
    useEffect(() => {
        const startOfToday = startOfDay(new Date());
        const endOfToday = new Date(startOfToday);
        endOfToday.setHours(23, 59, 59, 999);

        const q = query(
            collection(db, 'appointments'),
            where('appointmentDate', '>=', Timestamp.fromDate(startOfToday)),
            where('appointmentDate', '<=', Timestamp.fromDate(endOfToday)),
            where('status', '==', 'confirmed'),
            orderBy('appointmentDate', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const appointments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Appointment[];
            setTodayAppointments(appointments);
        });

        return () => unsubscribe();
    }, []);

    // Real-time subscription for all appointments
    useEffect(() => {
        if (activeTab !== 'appointments') return;

        const startDate = startOfDayFns(selectedAppointmentDate);
        const endDate = endOfDay(selectedAppointmentDate);

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
            setAllAppointments(appointmentData);
        });

        return () => unsubscribe();
    }, [selectedAppointmentDate, activeTab]);

    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (term.length < 2) { setSearchResults([]); return; }
        setIsSearching(true);
        try {
            const q = query(collection(db, 'patients'), where('name', '>=', term), where('name', '<=', term + '\uf8ff'), limit(5));
            const snapshot = await getDocs(q);
            setSearchResults(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as unknown as Patient)));
        } catch (e) { console.error(e); } finally { setIsSearching(false); }
    };

    const handleRegister = async (patient: Patient) => {
        if (!confirm(`${patient.name}님을 대기목록에 등록하시겠습니까?`)) return;
        try {
            // 3개월 이내 완료된 visit이 있으면 재진, 없으면 초진
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

            const recentQ = query(
                collection(db, 'visits'),
                where('patientId', '==', patient.id),
                where('date', '>=', Timestamp.fromDate(threeMonthsAgo)),
                orderBy('date', 'desc'),
                limit(1)
            );
            const recentSnap = await getDocs(recentQ);
            const visitType = recentSnap.empty ? 'new' : 'return';

            const visitRef = await addDoc(collection(db, 'visits'), {
                patientId: patient.id,
                patientName: patient.name,
                status: 'reception',
                type: visitType,
                date: serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            logAudit({
                action: 'create',
                collection: 'visits',
                documentId: visitRef.id,
                after: { patientId: patient.id, patientName: patient.name, type: visitType, status: 'reception' },
                description: `접수 (${visitType === 'new' ? '초진' : '재진'})`,
            });
            setSearchTerm(''); setSearchResults([]);
        } catch (e) { alert("접수 오류"); }
    };

    const handleCallPatient = async (visitId: string) => await updateDoc(doc(db, 'visits', visitId), { status: 'consulting', statusChangedAt: serverTimestamp(), startedAt: serverTimestamp() });

    const hasAppointment = (patientName: string) => {
        return todayAppointments.some(apt => apt.patientName === patientName);
    };

    const openInvoice = (visit: Visit) => {
        setSelectedVisit(visit);
        setModalMode('invoice');
    };

    const processPayment = async () => {
        if (!selectedVisit) return;
        try {
            await updateDoc(doc(db, 'visits', selectedVisit.id), {
                status: 'paid',
                statusChangedAt: serverTimestamp(),
                paidAt: serverTimestamp()
            });
            logAudit({
                action: 'status_change',
                collection: 'visits',
                documentId: selectedVisit.id,
                after: { status: 'paid' },
                description: '수납 완료',
            });
            // 수납 완료 → 다음 예약 확인 모달로 전환
            setPaidVisitForAppointment(selectedVisit);
            setModalMode('next_appointment');
        } catch (e) {
            console.error('Payment processing error:', e);
            alert("처리 실패: " + (e as Error).message);
        }
    };

    // 다음 예약 "예" → 예약 탭으로 이동 (환자 정보 자동 입력)
    const handleNextAppointmentYes = () => {
        if (paidVisitForAppointment) {
            // 다음 영업일 기본값
            const nextDate = addDays(new Date(), 7);
            setAppointmentFormData(prev => ({
                ...prev,
                patientName: paidVisitForAppointment.patientName,
                patientPhone: '',
                appointmentDate: format(nextDate, 'yyyy-MM-dd'),
                appointmentTime: '09:00',
                department: '일반진료',
                doctor: '원장님',
                notes: paidVisitForAppointment.diagnosis || '',
                status: 'confirmed',
            }));
            setShowNewAppointmentForm(true);
        }
        setModalMode('none');
        setSelectedVisit(null);
        setSelectedDocuments([]);
        setPaidVisitForAppointment(null);
        setActiveTab('appointments');
    };

    // 다음 예약 "아니오" → 완전 종료
    const handleNextAppointmentNo = () => {
        setModalMode('none');
        setSelectedVisit(null);
        setSelectedDocuments([]);
        setPaidVisitForAppointment(null);
    };

    const openDocuments = (visit: Visit) => {
        setSelectedVisit(visit);
        setModalMode('documents');
    };

    const triggerPreview = (type: any) => {
        setPreviewType(type);
        setModalMode('preview');
    };

    const handlePrint = () => {
        window.print();
    };

    const handleAppointmentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const appointmentDateTime = new Date(`${appointmentFormData.appointmentDate}T${appointmentFormData.appointmentTime}:00`);
            await addDoc(collection(db, 'appointments'), {
                ...appointmentFormData,
                appointmentDate: Timestamp.fromDate(appointmentDateTime),
                createdAt: serverTimestamp()
            });
            setAppointmentFormData({
                patientName: '',
                patientPhone: '',
                appointmentDate: format(new Date(), 'yyyy-MM-dd'),
                appointmentTime: '09:00',
                department: '일반진료',
                doctor: '원장님',
                notes: '',
                status: 'confirmed'
            });
            setShowNewAppointmentForm(false);
            alert('예약이 등록되었습니다.');
        } catch (error) {
            console.error('Error adding appointment:', error);
            alert('예약 등록에 실패했습니다.');
        }
    };

    const updateAppointmentStatus = async (id: string, newStatus: Appointment['status']) => {
        try {
            await updateDoc(doc(db, 'appointments', id), { status: newStatus });
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    // Helper: Smart Document Suggestion
    const getRecommendedDocs = (visit: Visit) => {
        const recs = [];
        if (visit.diagnosis) recs.push('diagnosis');
        if (visit.orders && visit.orders.length > 0) recs.push('detailed_receipt');
        if (visit.type === 'new') recs.push('chart_copy');
        return recs;
    };

    const receptionList = todayVisits.filter(v => ['reception', 'consulting', 'treatment', 'testing'].includes(v.status));
    const paymentList = todayVisits.filter(v => v.status === 'completed');
    const activeNonCompletedList = todayVisits.filter(v => ['consulting', 'testing', 'treatment'].includes(v.status));
    const historyList = todayVisits.filter(v => v.status === 'paid');

    // 강제 수납: 어떤 상태에서든 수납대기(completed)로 당겨옴
    const handleForceToPayment = async (visit: Visit) => {
        if (!confirm(`${visit.patientName}님을 현재 상태(${getStatusLabel(visit.status)})에서 수납대기로 당겨오시겠습니까?`)) return;
        try {
            await changeVisitStatus(visit.id, 'completed');
        } catch (e) {
            console.error(e);
            alert('상태 변경 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)]">
            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-slate-200 px-4">
                <button onClick={() => setActiveTab('reception')} className={`pb-3 px-2 text-lg font-bold transition-all ${activeTab === 'reception' ? 'text-slate-800 border-b-4 border-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>접수/대기 ({receptionList.length})</button>
                <button onClick={() => setActiveTab('payment')} className={`pb-3 px-2 text-lg font-bold transition-all ${activeTab === 'payment' ? 'text-indigo-600 border-b-4 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>수납 대기 ({paymentList.length})</button>
                <button onClick={() => setActiveTab('documents')} className={`pb-3 px-2 text-lg font-bold transition-all ${activeTab === 'documents' ? 'text-emerald-600 border-b-4 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>제증명/완료 ({historyList.length})</button>
                <button onClick={() => setActiveTab('appointments')} className={`pb-3 px-2 text-lg font-bold transition-all ${activeTab === 'appointments' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>진료예약 ({todayAppointments.length})</button>
            </div>

            <div className="flex-1 overflow-hidden px-4">
                {activeTab === 'reception' && (
                    <div className="flex flex-col lg:flex-row gap-6 h-full">
                        <div className="flex-1 flex flex-col gap-6 min-w-0">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
                                <div className="mb-8">
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-2"><UserPlus className="w-6 h-6 text-slate-600" /> 접수 등록</h2>
                                    <p className="text-slate-500 text-sm">환자 이름을 검색하여 접수하거나 신규 등록하세요.</p>
                                </div>
                                <div className="relative mb-6">
                                    <Search className="absolute left-3 top-4 h-5 w-5 text-slate-400" />
                                    <input type="text" className="block w-full pl-10 pr-3 py-4 border border-slate-300 rounded-xl leading-5 bg-white sm:text-lg focus:ring-2 focus:ring-slate-500 transition-all" placeholder="환자 이름 검색 (2글자 이상)" value={searchTerm} onChange={(e) => handleSearch(e.target.value)} autoFocus />
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3">
                                    {searchResults.map((patient) => (
                                        <div key={patient.id} onClick={() => handleRegister(patient)} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 cursor-pointer group">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${patient.gender === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>{patient.name[0]}</div>
                                                <div><h3 className="font-bold text-slate-900">{patient.name}</h3><p className="text-xs text-slate-500">{patient.birthDate}</p></div>
                                            </div>
                                            <span className="text-slate-600 font-bold text-sm opacity-0 group-hover:opacity-100">접수하기</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="w-full lg:w-[480px] bg-slate-800 text-white rounded-2xl flex flex-col overflow-hidden">
                            <div className="p-6 border-b border-slate-700"><h2 className="text-xl font-bold flex gap-2"><Clock className="text-emerald-400" /> 실시간 대기 현황 <span className="ml-auto text-3xl">{receptionList.length}</span></h2></div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white text-slate-800">
                                {receptionList.map(visit => {
                                    const isAppointment = hasAppointment(visit.patientName);
                                    return (
                                        <div key={visit.id} className={`relative border rounded-xl p-4 shadow-sm flex items-center gap-4 transition-all ${isAppointment ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200' : 'bg-white border-slate-200'}`}>
                                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${isAppointment ? 'bg-emerald-500' : visit.status === 'reception' ? 'bg-yellow-400' : visit.status === 'consulting' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                                            <div className="pl-2 flex-1">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-lg">{visit.patientName}</h3>
                                                        {isAppointment && <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full font-bold"><CalendarCheck className="w-3 h-3" /> 예약 확정</span>}
                                                    </div>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(visit.status)}`}>{getStatusLabel(visit.status)}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1 mb-1">{new Date(visit.date.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                <PatientStatusBadges visit={visit} />
                                            </div>
                                            {visit.status === 'reception' && <button onClick={() => handleCallPatient(visit.id)} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${isAppointment ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>호출</button>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'payment' && (
                    <div className="space-y-6">
                        {/* 수납 대기 환자 (completed 상태) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paymentList.map(visit => (
                                <div key={visit.id} className="bg-white p-6 rounded-2xl border-2 border-indigo-100 hover:border-indigo-300 shadow-sm transition-all cursor-pointer flex flex-col gap-4" onClick={() => openInvoice(visit)}>
                                    <div className="flex justify-between items-start">
                                        <div><h3 className="text-xl font-bold text-slate-800">{visit.patientName}</h3><p className="text-sm text-slate-500">{new Date(visit.date.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 접수</p></div>
                                        <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">수납대기</div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600">
                                        <div className="flex justify-between mb-1"><span>진찰료</span><span className="font-bold">5,000원</span></div>
                                        <div className="flex justify-between mb-1"><span>검사료</span><span className="font-bold">{visit.testOrder ? '15,000' : '0'}원</span></div>
                                        <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between text-indigo-700 font-bold text-lg"><span>총 진료비</span><span>{visit.testOrder ? '20,000' : '5,000'}원</span></div>
                                    </div>
                                    <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-all">결제/수납 하기</button>
                                </div>
                            ))}
                        </div>

                        {/* 강제 수납: 진료/검사/치료 중인 환자를 당겨올 수 있음 */}
                        {activeNonCompletedList.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <ChevronRight className="w-4 h-4" />
                                    진행 중인 환자 — 강제 수납
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {activeNonCompletedList.map(visit => (
                                        <div key={visit.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-amber-300 shadow-sm transition-all flex items-center justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-slate-800 truncate">{visit.patientName}</h4>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${getStatusColor(visit.status)}`}>{getStatusLabel(visit.status)}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5">{new Date(visit.date.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 접수</p>
                                            </div>
                                            <button
                                                onClick={() => handleForceToPayment(visit)}
                                                className="flex-shrink-0 px-3 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                                            >
                                                수납으로
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="space-y-4">
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-emerald-800 mb-6 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5" />
                            <p className="font-medium">수납이 완료된 환자의 처방전 및 각종 증명서를 발급할 수 있습니다.</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-500 text-sm uppercase">
                                    <tr><th className="px-6 py-4">환자명</th><th className="px-6 py-4">진료일시</th><th className="px-6 py-4">주증상/진단</th><th className="px-6 py-4">상태</th><th className="px-6 py-4 text-right">증명서 발급</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {historyList.map(visit => (
                                        <tr key={visit.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-800">{visit.patientName}</td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">{new Date(visit.date.seconds * 1000).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-slate-600 text-sm max-w-xs truncate">{visit.diagnosis || visit.chiefComplaint || '-'}</td>
                                            <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs font-bold">수납완료</span></td>
                                            <td className="px-6 py-4 text-right"><button onClick={() => openDocuments(visit)} className="text-emerald-600 hover:text-emerald-800 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded hover:bg-emerald-100 transition-colors">서류 발급</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'appointments' && (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div><h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><CalendarDays className="w-7 h-7 text-emerald-600" /> 진료 예약 관리</h2><p className="text-slate-500 text-sm mt-1">환자 진료 예약을 등록하고 관리하세요.</p></div>
                            <button onClick={() => setShowNewAppointmentForm(!showNewAppointmentForm)} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl"><Plus className="w-5 h-5" /> {showNewAppointmentForm ? '폼 닫기' : '신규 예약 등록'}</button>
                        </div>

                        {/* 예약 등록 폼 */}
                        {showNewAppointmentForm && (
                            <form onSubmit={handleAppointmentSubmit} className="bg-white rounded-2xl shadow-sm border-2 border-emerald-200 p-6">
                                <h3 className="text-lg font-bold text-emerald-800 mb-4 flex items-center gap-2">
                                    <CalendarCheck className="w-5 h-5" />
                                    {appointmentFormData.patientName ? `${appointmentFormData.patientName}님 다음 예약 등록` : '신규 예약 등록'}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">환자명 *</label>
                                        <input
                                            type="text"
                                            required
                                            value={appointmentFormData.patientName}
                                            onChange={(e) => setAppointmentFormData(prev => ({ ...prev, patientName: e.target.value }))}
                                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                            placeholder="환자 이름"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">연락처</label>
                                        <input
                                            type="tel"
                                            value={appointmentFormData.patientPhone}
                                            onChange={(e) => setAppointmentFormData(prev => ({ ...prev, patientPhone: e.target.value }))}
                                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                            placeholder="010-0000-0000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">예약 날짜 *</label>
                                        <input
                                            type="date"
                                            required
                                            value={appointmentFormData.appointmentDate}
                                            onChange={(e) => setAppointmentFormData(prev => ({ ...prev, appointmentDate: e.target.value }))}
                                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">예약 시간 *</label>
                                        <select
                                            value={appointmentFormData.appointmentTime}
                                            onChange={(e) => setAppointmentFormData(prev => ({ ...prev, appointmentTime: e.target.value }))}
                                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        >
                                            {Array.from({ length: 18 }, (_, i) => {
                                                const hour = Math.floor(i / 2) + 9;
                                                const min = i % 2 === 0 ? '00' : '30';
                                                const time = `${hour.toString().padStart(2, '0')}:${min}`;
                                                return <option key={time} value={time}>{time}</option>;
                                            })}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">담당의</label>
                                        <input
                                            type="text"
                                            value={appointmentFormData.doctor}
                                            onChange={(e) => setAppointmentFormData(prev => ({ ...prev, doctor: e.target.value }))}
                                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">메모</label>
                                        <input
                                            type="text"
                                            value={appointmentFormData.notes}
                                            onChange={(e) => setAppointmentFormData(prev => ({ ...prev, notes: e.target.value }))}
                                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                            placeholder="진단명, 특이사항 등"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowNewAppointmentForm(false);
                                            setAppointmentFormData({
                                                patientName: '', patientPhone: '',
                                                appointmentDate: format(new Date(), 'yyyy-MM-dd'),
                                                appointmentTime: '09:00', department: '일반진료',
                                                doctor: '원장님', notes: '', status: 'confirmed'
                                            });
                                        }}
                                        className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        예약 등록
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50">
                                        <tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">시간</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">환자명</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">상태</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {allAppointments.map((appointment) => (
                                            <tr key={appointment.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{appointment.appointmentTime}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{appointment.patientName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <select value={appointment.status} onChange={(e) => updateAppointmentStatus(appointment.id, e.target.value as Appointment['status'])} className={`px-3 py-1 text-xs font-medium rounded-full border-0 focus:ring-2 focus:ring-emerald-500 ${appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : appointment.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                                                        <option value="scheduled">예약됨</option><option value="confirmed">확정됨</option><option value="completed">완료</option><option value="cancelled">취소</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL: Payment & Issuance Console */}
            {modalMode === 'invoice' && selectedVisit && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex overflow-hidden h-[85vh] animate-in fade-in zoom-in duration-200">
                        {/* LEFT: Bill & Medical Info */}
                        <div className="w-1/3 bg-slate-50 border-r border-slate-200 p-6 flex flex-col">
                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <User className="w-6 h-6 text-slate-500" />
                                    {selectedVisit.patientName} 님
                                </h3>
                                <p className="text-slate-500 text-sm mt-1">접수번호: {selectedVisit.id.slice(0, 8)}</p>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                                <h4 className="font-bold text-slate-700 mb-3 border-b pb-2">진료비 내역</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">진찰료 (본인부담)</span>
                                        <span className="font-bold">5,000</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">처치/수술료</span>
                                        <span className="font-bold">15,000</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">검사료</span>
                                        <span className="font-bold">{selectedVisit.testOrder ? '30,000' : '0'}</span>
                                    </div>
                                    <div className="border-t border-dashed pt-2 mt-2 flex justify-between font-bold text-lg text-slate-800">
                                        <span>진료비 소계</span>
                                        <span>{(20000 + (selectedVisit.testOrder ? 30000 : 0)).toLocaleString()}원</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto mb-4">
                                <h4 className="font-bold text-slate-700 mb-2 flex items-center justify-between">
                                    <span>제증명 발급 내역</span>
                                    {previewType && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">작성중</span>}
                                </h4>
                                {selectedDocuments.length === 0 ? (
                                    <div className="p-4 border border-dashed rounded-xl text-center text-slate-400 text-sm">
                                        추가된 증명서가 없습니다.<br />우측에서 선택해주세요.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedDocuments.map((doc, idx) => (
                                            <div key={idx} className="bg-white p-3 rounded-xl border border-emerald-200 shadow-sm flex justify-between items-center group">
                                                <div>
                                                    <div className="font-bold text-slate-800">{doc.label}</div>
                                                    <div className="text-xs text-slate-500 cursor-pointer hover:text-emerald-600 underline" onClick={() => { setPreviewType(doc.type); setShowPreview(true); }}>
                                                        [내용 보기/수정]
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-emerald-700">{doc.price.toLocaleString()}원</div>
                                                    <button
                                                        onClick={() => setSelectedDocuments(prev => prev.filter((_, i) => i !== idx))}
                                                        className="text-xs text-red-400 hover:text-red-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="mt-auto bg-slate-900 text-white p-5 rounded-2xl shadow-lg">
                                <div className="flex justify-between text-sm opacity-80 mb-1">
                                    <span>총 결제 금액</span>
                                    <span>(진료비 + 제증명)</span>
                                </div>
                                <div className="text-3xl font-bold text-right">
                                    {(
                                        20000 + (selectedVisit.testOrder ? 30000 : 0) +
                                        selectedDocuments.reduce((sum, doc) => sum + doc.price, 0)
                                    ).toLocaleString()}
                                    <span className="text-lg font-normal ml-1">원</span>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Document Selection & Payment */}
                        <div className="w-2/3 p-8 bg-white flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                        <FileText className="w-7 h-7 text-indigo-600" />
                                        제증명 발급 및 수납
                                    </h2>
                                    <p className="text-slate-500">발급할 서류를 선택하면 비용이 자동으로 합산됩니다.</p>
                                </div>
                                <button onClick={() => { setModalMode('none'); setSelectedDocuments([]); }} className="p-2 hover:bg-slate-100 rounded-full">
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8 overflow-y-auto max-h-[400px] p-1">
                                {[
                                    { id: 'diagnosis', label: '일반 진단서', price: 20000, desc: '병명, 치료기간이 명시된 주진단서' },
                                    { id: 'opinion', label: '진료 소견서', price: 15000, desc: '의사의 의학적 소견이 포함된 서류' },
                                    { id: 'referral', label: '진료 의뢰서', price: 0, desc: '상급 병원 진료를 위한 요양급여의뢰서' },
                                    { id: 'certificate', label: '통원 확인서', price: 3000, desc: '학교/직장 제출용 내원 사실 확인' },
                                    { id: 'chart_copy', label: '의무기록 사본', price: 3000, desc: '초진차트 및 검사결과지 사본' },
                                    { id: 'receipt', label: '진료비 영수증', price: 0, desc: '연말정산용 진료비 납입 확인서' },
                                    { id: 'detailed_receipt', label: '세부내역서', price: 0, desc: '산정 진료비에 대한 상세 내역' },
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            const newDoc = { type: item.id as DocumentType, label: item.label, price: item.price };
                                            setSelectedDocuments(prev => [...prev, newDoc]);
                                            // Optional: Auto open preview to fill content?
                                            // setPreviewType(item.id); setShowPreview(true);
                                        }}
                                        className="flex flex-col text-left p-4 border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-md transition-all group"
                                    >
                                        <div className="flex justify-between items-start w-full mb-2">
                                            <span className="font-bold text-slate-800">{item.label}</span>
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.price > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                                                {item.price > 0 ? `${item.price.toLocaleString()}원` : '무료'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 group-hover:text-slate-600">{item.desc}</p>
                                        <div className="mt-4 pt-4 border-t border-dashed border-slate-200 w-full text-center text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                            + 목록에 추가
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="mt-auto pt-6 border-t border-slate-100">
                                <h4 className="font-bold text-slate-800 mb-4">결제 수단 선택</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            processPayment();
                                        }}
                                        className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
                                    >
                                        <CheckCircle className="w-6 h-6" />
                                        카드 결제 완료
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            processPayment();
                                        }}
                                        className="py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                                    >
                                        현금 결제 완료
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Documents Selection & Calculation */}
            {modalMode === 'documents' && selectedVisit && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex overflow-hidden max-h-[90vh]">
                        {/* Left: Document List */}
                        <div className="w-2/3 p-8 bg-white overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                    <ShieldCheck className="w-8 h-8 text-emerald-600" /> 제증명 발급 신청
                                </h3>
                                <button onClick={() => setModalMode('none')} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                            </div>
                            <p className="text-slate-500 mb-6">발급할 서류를 선택해주세요. 자동으로 합계 금액이 계산됩니다.</p>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: 'diagnosis', label: '일반 진단서', price: 20000, desc: '병명/치료기간 명시' },
                                    { id: 'opinion', label: '진료 소견서', price: 15000, desc: '의사 소견 포함' },
                                    { id: 'certificate', label: '진료 확인서', price: 3000, desc: '통원 확인용' },
                                    { id: 'chart_copy', label: '초진차트복사', price: 1000, desc: '의무기록 사본 (1매당)' },
                                    { id: 'receipt', label: '진료비 영수증', price: 0, desc: '무료 발급' },
                                    { id: 'detailed_receipt', label: '진료비 상세내역서', price: 0, desc: '무료 발급' },
                                ].map(docItem => (
                                    <div
                                        key={docItem.id}
                                        className="p-4 border-2 border-slate-100 rounded-xl hover:border-emerald-200 hover:bg-emerald-50 cursor-pointer transition-all flex flex-col justify-between"
                                        onClick={() => triggerPreview(docItem.id as any)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-slate-800 text-lg">{docItem.label}</span>
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${docItem.price > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {docItem.price > 0 ? `${docItem.price.toLocaleString()}원` : '무료'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mb-4">{docItem.desc}</p>
                                        <div className="flex gap-2 mt-auto">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); triggerPreview(docItem.id as any); }}
                                                className="flex-1 py-2 text-xs font-bold border border-slate-200 rounded-lg hover:bg-white text-slate-600"
                                            >
                                                미리보기
                                            </button>
                                            <button
                                                className="flex-1 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    alert(`${docItem.label} 발급 비용 ${docItem.price.toLocaleString()}원이 추가되었습니다.`);
                                                }}
                                            >
                                                발급/추가
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: Summary & Pay */}
                        <div className="w-1/3 bg-slate-50 border-l border-slate-200 p-8 flex flex-col">
                            <h4 className="font-bold text-slate-500 uppercase tracking-wider mb-6 text-sm">발급 내역 (Summary)</h4>

                            <div className="flex-1 space-y-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <h5 className="font-bold text-slate-800 mb-2">{selectedVisit.patientName} 님</h5>
                                    <div className="text-sm text-slate-500 space-y-1">
                                        <p>진료일: {new Date(selectedVisit.date.seconds * 1000).toLocaleDateString()}</p>
                                        <p>담당의: 장재호 원장</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {/* Mock selected items for display */}
                                    <div className="flex justify-between text-sm text-slate-600"><span>진료 확인서</span><span>3,000원</span></div>
                                    <div className="flex justify-between text-sm text-slate-600"><span>초진차트복사 (5매)</span><span>5,000원</span></div>
                                    <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-lg text-slate-900 mt-4">
                                        <span>총 합계</span>
                                        <span className="text-emerald-600">8,000원</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 space-y-3">
                                <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    수납 및 발급 완료
                                </button>
                                <p className="text-xs text-center text-slate-400">수납 완료 시 서류가 즉시 출력됩니다.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Document Preview (Printable) - Rendered on top if showPreview is true */}
            {(modalMode === 'preview' || showPreview) && selectedVisit && previewType && (
                <div className="fixed inset-0 bg-slate-900/90 z-[60] flex flex-col items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl p-16 text-slate-800 relative printable-area my-8 scale-[0.8] md:scale-100 origin-top">
                        {/* Header */}
                        <div className="text-center border-b-4 border-double border-slate-800 pb-6 mb-10">
                            <h1 className="text-4xl font-serif font-bold mb-4 tracking-[0.5em]">
                                {previewType === 'diagnosis' ? '진 단 서' :
                                    previewType === 'opinion' ? '소 견 서' :
                                        previewType === 'certificate' ? '진 료 확 인 서' :
                                            previewType === 'receipt' ? '진료비 계산서·영수증' :
                                                previewType === 'detailed_receipt' ? '진료비 세부내역서' :
                                                    '의무기록 사본 (초진차트)'}
                            </h1>
                            <div className="flex justify-between text-sm font-mono px-4 text-slate-500">
                                <span suppressHydrationWarning>발행번호: {new Date().getFullYear()}-{Math.floor(Math.random() * 9000) + 1000}</span>
                                <span>등록번호: {selectedVisit.patientId.slice(0, 8)}</span>
                            </div>
                        </div>

                        {/* Patient Info Table */}
                        <table className="w-full border-collapse border-2 border-slate-800 mb-10 text-sm">
                            <tbody>
                                <tr>
                                    <td className="border border-slate-800 bg-slate-50 p-2 font-bold w-24 text-center">환자 성명</td>
                                    <td className="border border-slate-800 p-2">{selectedVisit.patientName}</td>
                                    <td className="border border-slate-800 bg-slate-50 p-2 font-bold w-24 text-center">주민번호</td>
                                    <td className="border border-slate-800 p-2">******-*******</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-800 bg-slate-50 p-2 font-bold text-center">주 소</td>
                                    <td colSpan={3} className="border border-slate-800 p-2">경상남도 밀양시 (상세 주소)</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Specific Content per Type */}
                        <div className="min-h-[500px] border border-slate-300 p-8 relative">
                            {previewType === 'certificate' && (
                                <div className="space-y-8 font-serif leading-loose">
                                    <div className="flex"><span className="font-bold w-32">병 &nbsp; &nbsp; &nbsp; &nbsp; 명 :</span> <span className="font-bold border-b border-black flex-1">{selectedVisit.diagnosis || '상세불명의 통증'}</span></div>
                                    <div className="flex"><span className="font-bold w-32">진 료 기 간 :</span> <span className="border-b border-black flex-1">{new Date(selectedVisit.date.seconds * 1000).toLocaleDateString()} (1일간)</span></div>
                                    <div className="flex"><span className="font-bold w-32">용 &nbsp; &nbsp; &nbsp; &nbsp; 도 :</span> <span className="border-b border-black flex-1">회사/학교 제출용</span></div>
                                    <div className="mt-12 text-center text-lg">
                                        <p>상기 환자는 위와 같이 본원에서 진료를 받았음을 확인합니다.</p>
                                    </div>
                                </div>
                            )}

                            {previewType === 'receipt' && (
                                <div className="text-xs">
                                    <table className="w-full border-collapse border border-black mb-4">
                                        <thead><tr className="bg-slate-100"><th className="border border-black p-1">항목</th><th className="border border-black p-1">요양급여</th><th className="border border-black p-1">비급여</th><th className="border border-black p-1">금액</th></tr></thead>
                                        <tbody>
                                            <tr><td className="border border-black p-1 text-center">진찰료</td><td className="border border-black p-1 text-right">5,000</td><td className="border border-black p-1 text-right">0</td><td className="border border-black p-1 text-right">5,000</td></tr>
                                            <tr><td className="border border-black p-1 text-center">투약/조제료</td><td className="border border-black p-1 text-right">0</td><td className="border border-black p-1 text-right">0</td><td className="border border-black p-1 text-right">0</td></tr>
                                            <tr><td className="border border-black p-1 text-center">주사료</td><td className="border border-black p-1 text-right">0</td><td className="border border-black p-1 text-right">0</td><td className="border border-black p-1 text-right">0</td></tr>
                                            <tr><td className="border border-black p-1 text-center">처치/수술료</td><td className="border border-black p-1 text-right">15,000</td><td className="border border-black p-1 text-right">0</td><td className="border border-black p-1 text-right">15,000</td></tr>
                                            <tr><td className="border border-black p-1 text-center">검사료</td><td className="border border-black p-1 text-right">0</td><td className="border border-black p-1 text-right">30,000</td><td className="border border-black p-1 text-right">30,000</td></tr>
                                            <tr className="bg-slate-100 font-bold"><td className="border border-black p-1 text-center">합 계</td><td className="border border-black p-1 text-right">20,000</td><td className="border border-black p-1 text-right">30,000</td><td className="border border-black p-1 text-right text-lg">50,000</td></tr>
                                        </tbody>
                                    </table>
                                    <p className="text-center mt-4">부가가치세법 시행령 제33조의 규정에 의한 영수증입니다.</p>
                                </div>
                            )}

                            {previewType === 'chart_copy' && (
                                <div className="space-y-4 font-mono text-sm leading-relaxed">
                                    <div className="border p-4 mb-4 bg-slate-50"><h3 className="font-bold underline mb-2">S (Subjective)</h3><p>{selectedVisit.chiefComplaint || '허리가 아파요'}</p></div>
                                    <div className="border p-4 mb-4 bg-slate-50"><h3 className="font-bold underline mb-2">O (Objective)</h3><p>P/E: L-spine tenderness (+)<br />SLRT: 70/70</p><p>X-ray: L-Spine spondylosis</p></div>
                                    <div className="border p-4 mb-4 bg-slate-50"><h3 className="font-bold underline mb-2">A (Assessment)</h3><p>{selectedVisit.diagnosis || 'M54.5 Low Back Pain'}</p></div>
                                    <div className="border p-4 bg-slate-50"><h3 className="font-bold underline mb-2">P (Plan)</h3><p>{selectedVisit.treatmentNote || 'Medication & PT'}</p></div>
                                </div>
                            )}

                            {/* Basic Fallback for Diagnosis/Opinion/Detailed */}
                            {(previewType === 'diagnosis' || previewType === 'opinion' || previewType === 'detailed_receipt') && (
                                <div className="space-y-6">
                                    <div><h3 className="font-bold border-b border-black pb-1 mb-2">[ 내 용 ]</h3>
                                        <p className="leading-loose whitespace-pre-wrap">{selectedVisit.treatmentNote || '상기 환자는 본원에서 진료를 받았습니다.'}</p>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Footer */}
                        <div className="mt-12 text-center space-y-6">
                            <p className="text-xl tracking-widest font-serif" suppressHydrationWarning>{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <div className="flex flex-col items-center">
                                <p className="text-3xl font-bold font-serif flex items-center justify-center gap-4 relative">
                                    밀 양 정 형 외 과 원 장
                                    <span className="absolute -right-20 top-1/2 -translate-y-1/2 w-16 h-16 border-4 border-red-600 rounded-lg text-red-600 text-sm flex items-center justify-center font-black rotate-12 opacity-80 backdrop-blend-multiply">원장인</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Preview Controls */}
                    <div className="fixed bottom-8 flex gap-4 print:hidden z-[70]">
                        <button onClick={() => {
                            if (showPreview) setShowPreview(false);
                            else setModalMode('documents'); // Fallback if regular preview
                        }} className="px-8 py-4 bg-white/10 text-white backdrop-blur-md rounded-2xl font-bold border border-white/20 hover:bg-white/20">
                            {showPreview ? '닫기' : '뒤로 가기'}
                        </button>
                        <button onClick={handlePrint} className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-2xl hover:bg-emerald-500 flex items-center gap-3 transform hover:scale-105 transition-all"><Printer className="w-6 h-6" /> 인쇄 (Print)</button>
                    </div>

                    <style jsx global>{`
                        @media print {
                            body * { visibility: hidden; }
                            .printable-area, .printable-area * { visibility: visible; }
                            .printable-area { 
                                position: absolute; left: 0; top: 0; 
                                width: 210mm; min-height: 297mm; 
                                margin: 0; padding: 15mm; 
                                box-shadow: none; transform: none !important;
                                overflow: visible !important;
                            }
                            @page { size: A4; margin: 0; }
                        }
                    `}</style>
                </div>
            )}

            {/* ═══ MODAL: 수납 후 다음 예약 확인 ═══ */}
            {modalMode === 'next_appointment' && paidVisitForAppointment && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                        {/* 헤더 */}
                        <div className="bg-emerald-600 p-6 text-white text-center">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                <CheckCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold">수납이 완료되었습니다</h3>
                            <p className="text-emerald-100 mt-1 text-sm">
                                {paidVisitForAppointment.patientName}님
                            </p>
                        </div>

                        {/* 본문 */}
                        <div className="p-6 text-center">
                            <div className="mb-6">
                                <CalendarDays className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                                <h4 className="text-lg font-bold text-slate-800">
                                    다음 진료 예약을 등록하시겠습니까?
                                </h4>
                                <p className="text-sm text-slate-500 mt-2">
                                    환자 정보가 자동으로 입력된 예약 화면으로 이동합니다.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleNextAppointmentNo}
                                    className="flex-1 py-3.5 text-slate-600 font-bold border-2 border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    예약 없이 종료
                                </button>
                                <button
                                    onClick={handleNextAppointmentYes}
                                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <CalendarCheck className="w-5 h-5" />
                                    다음 예약 등록
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
