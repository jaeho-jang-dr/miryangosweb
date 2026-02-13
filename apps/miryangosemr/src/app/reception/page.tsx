'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, limit, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, UserPlus, Clock, Calendar, User, ChevronRight, Stethoscope, AlertCircle, CheckCircle, CalendarCheck, Plus, Phone, FileText, CalendarDays, Printer, FileDown, ShieldCheck, X } from 'lucide-react';
import Link from 'next/link';
import { Patient, Visit } from '@shared/types/clinical';
import { changeVisitStatus } from '@shared/lib/workflow-engine';
import { logAudit } from '@shared/lib/audit-client';
import PatientStatusBadges from '@/components/clinical/PatientStatusBadges';
import { startOfDay, subDays, format, addDays, startOfDay as startOfDayFns, endOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import EMRLayout from '@/components/layout/EMRLayout';

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
        case 'reception': return '\uC811\uC218\uC2E4';
        case 'consulting': return '\uC9C4\uB8CC\uC2E4';
        case 'treatment': return '\uCE58\uB8CC\uC2E4';
        case 'testing': return '\uAC80\uC0AC\uC2E4';
        case 'completed': return '\uC218\uB0A9\uB300\uAE30';
        case 'paid': return '\uC644\uB8CC';
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
    return (
        <EMRLayout>
            <ReceptionPageContent />
        </EMRLayout>
    );
}

function ReceptionPageContent() {
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
    const [showPreview, setShowPreview] = useState(false);
    const [paidVisitForAppointment, setPaidVisitForAppointment] = useState<Visit | null>(null);

    const [appointmentFormData, setAppointmentFormData] = useState({
        patientName: '',
        patientPhone: '',
        appointmentDate: format(new Date(), 'yyyy-MM-dd'),
        appointmentTime: '09:00',
        department: '\uC77C\uBC18\uC9C4\uB8CC',
        doctor: '\uC6D0\uC7A5\uB2D8',
        notes: '',
        status: 'confirmed' as const
    });

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
        if (!confirm(`${patient.name}\uB2D8\uC744 \uB300\uAE30\uBAA9\uB85D\uC5D0 \uB4F1\uB85D\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?`)) return;
        try {
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
                description: `\uC811\uC218 (${visitType === 'new' ? '\uCD08\uC9C4' : '\uC7AC\uC9C4'})`,
            });
            setSearchTerm(''); setSearchResults([]);
        } catch (e) { alert("\uC811\uC218 \uC624\uB958"); }
    };

    // Toast state
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000); };

    const handleCallPatient = async (visitId: string) => {
        const visit = todayVisits.find(v => v.id === visitId);
        await updateDoc(doc(db, 'visits', visitId), { status: 'consulting', statusChangedAt: serverTimestamp(), startedAt: serverTimestamp() });
        logAudit({
            action: 'status_change',
            collection: 'visits',
            documentId: visitId,
            after: { status: 'consulting' },
            description: `${visit?.patientName || ''}님 호출 (접수→진료)`,
        });
        showToast(`${visit?.patientName || '환자'}님 호출 완료`);
    };

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
                description: '\uC218\uB0A9 \uC644\uB8CC',
            });
            setPaidVisitForAppointment(selectedVisit);
            setModalMode('next_appointment');
        } catch (e) {
            console.error('Payment processing error:', e);
            alert("\uCC98\uB9AC \uC2E4\uD328: " + (e as Error).message);
        }
    };

    const handleNextAppointmentYes = () => {
        if (paidVisitForAppointment) {
            const nextDate = addDays(new Date(), 7);
            setAppointmentFormData(prev => ({
                ...prev,
                patientName: paidVisitForAppointment.patientName,
                patientPhone: '',
                appointmentDate: format(nextDate, 'yyyy-MM-dd'),
                appointmentTime: '09:00',
                department: '\uC77C\uBC18\uC9C4\uB8CC',
                doctor: '\uC6D0\uC7A5\uB2D8',
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
                department: '\uC77C\uBC18\uC9C4\uB8CC',
                doctor: '\uC6D0\uC7A5\uB2D8',
                notes: '',
                status: 'confirmed'
            });
            setShowNewAppointmentForm(false);
            alert('\uC608\uC57D\uC774 \uB4F1\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4.');
        } catch (error) {
            console.error('Error adding appointment:', error);
            alert('\uC608\uC57D \uB4F1\uB85D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.');
        }
    };

    const updateAppointmentStatus = async (id: string, newStatus: Appointment['status']) => {
        try {
            await updateDoc(doc(db, 'appointments', id), { status: newStatus });
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const getRecommendedDocs = (visit: Visit) => {
        const recs = [];
        if (visit.diagnosis) recs.push('diagnosis');
        if (visit.orders && visit.orders.length > 0) recs.push('detailed_receipt');
        if (visit.type === 'new') recs.push('chart_copy');
        return recs;
    };

    const receptionList = useMemo(() => todayVisits.filter(v => ['reception', 'consulting', 'treatment', 'testing'].includes(v.status)), [todayVisits]);
    const paymentList = useMemo(() => todayVisits.filter(v => v.status === 'completed'), [todayVisits]);
    const activeNonCompletedList = useMemo(() => todayVisits.filter(v => ['consulting', 'testing', 'treatment'].includes(v.status)), [todayVisits]);
    const historyList = useMemo(() => todayVisits.filter(v => v.status === 'paid'), [todayVisits]);

    const handleForceToPayment = async (visit: Visit) => {
        if (!confirm(`${visit.patientName}\uB2D8\uC744 \uD604\uC7AC \uC0C1\uD0DC(${getStatusLabel(visit.status)})\uC5D0\uC11C \uC218\uB0A9\uB300\uAE30\uB85C \uB2F9\uACA8\uC624\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?`)) return;
        try {
            await changeVisitStatus(visit.id, 'completed');
        } catch (e) {
            console.error(e);
            alert('\uC0C1\uD0DC \uBCC0\uACBD \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.');
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)]">
            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-slate-200 px-4">
                <button onClick={() => setActiveTab('reception')} className={`pb-3 px-2 text-lg font-bold transition-all ${activeTab === 'reception' ? 'text-slate-800 border-b-4 border-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>\uC811\uC218/\uB300\uAE30 ({receptionList.length})</button>
                <button onClick={() => setActiveTab('payment')} className={`pb-3 px-2 text-lg font-bold transition-all ${activeTab === 'payment' ? 'text-indigo-600 border-b-4 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>\uC218\uB0A9 \uB300\uAE30 ({paymentList.length})</button>
                <button onClick={() => setActiveTab('documents')} className={`pb-3 px-2 text-lg font-bold transition-all ${activeTab === 'documents' ? 'text-emerald-600 border-b-4 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>\uC81C\uC99D\uBA85/\uC644\uB8CC ({historyList.length})</button>
                <button onClick={() => setActiveTab('appointments')} className={`pb-3 px-2 text-lg font-bold transition-all ${activeTab === 'appointments' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>\uC9C4\uB8CC\uC608\uC57D ({todayAppointments.length})</button>
            </div>

            <div className="flex-1 overflow-hidden px-4">
                {activeTab === 'reception' && (
                    <div className="flex flex-col lg:flex-row gap-6 h-full">
                        <div className="flex-1 flex flex-col gap-6 min-w-0">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
                                <div className="mb-8">
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-2"><UserPlus className="w-6 h-6 text-slate-600" /> \uC811\uC218 \uB4F1\uB85D</h2>
                                    <p className="text-slate-500 text-sm">\uD658\uC790 \uC774\uB984\uC744 \uAC80\uC0C9\uD558\uC5EC \uC811\uC218\uD558\uAC70\uB098 \uC2E0\uADDC \uB4F1\uB85D\uD558\uC138\uC694.</p>
                                </div>
                                <div className="relative mb-6">
                                    <Search className="absolute left-3 top-4 h-5 w-5 text-slate-400" />
                                    <input type="text" className="block w-full pl-10 pr-3 py-4 border border-slate-300 rounded-xl leading-5 bg-white sm:text-lg focus:ring-2 focus:ring-slate-500 transition-all" placeholder="\uD658\uC790 \uC774\uB984 \uAC80\uC0C9 (2\uAE00\uC790 \uC774\uC0C1)" value={searchTerm} onChange={(e) => handleSearch(e.target.value)} autoFocus />
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3">
                                    {searchResults.map((patient) => (
                                        <div key={patient.id} onClick={() => handleRegister(patient)} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 cursor-pointer group">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${patient.gender === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>{patient.name[0]}</div>
                                                <div><h3 className="font-bold text-slate-900">{patient.name}</h3><p className="text-xs text-slate-500">{patient.birthDate}</p></div>
                                            </div>
                                            <span className="text-slate-600 font-bold text-sm opacity-0 group-hover:opacity-100">\uC811\uC218\uD558\uAE30</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="w-full lg:w-[480px] bg-slate-800 text-white rounded-2xl flex flex-col overflow-hidden">
                            <div className="p-6 border-b border-slate-700"><h2 className="text-xl font-bold flex gap-2"><Clock className="text-emerald-400" /> \uC2E4\uC2DC\uAC04 \uB300\uAE30 \uD604\uD669 <span className="ml-auto text-3xl">{receptionList.length}</span></h2></div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white text-slate-800">
                                {receptionList.map((visit, idx) => {
                                    const isAppointment = hasAppointment(visit.patientName);
                                    const queueNumber = visit.status === 'reception' ? receptionList.filter((v, i) => i <= idx && v.status === 'reception').length : null;
                                    return (
                                        <div key={visit.id} className={`relative border rounded-xl p-4 shadow-sm flex items-center gap-4 transition-all ${isAppointment ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200' : 'bg-white border-slate-200'}`}>
                                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${isAppointment ? 'bg-emerald-500' : visit.status === 'reception' ? 'bg-yellow-400' : visit.status === 'consulting' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                                            {queueNumber && (
                                                <div className="w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                    #{queueNumber}
                                                </div>
                                            )}
                                            <div className="pl-2 flex-1">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-lg">{visit.patientName}</h3>
                                                        {isAppointment && <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full font-bold"><CalendarCheck className="w-3 h-3" /> \uC608\uC57D \uD655\uC815</span>}
                                                    </div>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(visit.status)}`}>{getStatusLabel(visit.status)}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1 mb-1">{new Date(visit.date.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                <PatientStatusBadges visit={visit} />
                                            </div>
                                            {visit.status === 'reception' && <button onClick={() => handleCallPatient(visit.id)} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${isAppointment ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>\uD638\uCD9C</button>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'payment' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paymentList.map(visit => (
                                <div key={visit.id} className="bg-white p-6 rounded-2xl border-2 border-indigo-100 hover:border-indigo-300 shadow-sm transition-all cursor-pointer flex flex-col gap-4" onClick={() => openInvoice(visit)}>
                                    <div className="flex justify-between items-start">
                                        <div><h3 className="text-xl font-bold text-slate-800">{visit.patientName}</h3><p className="text-sm text-slate-500">{new Date(visit.date.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} \uC811\uC218</p></div>
                                        <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">\uC218\uB0A9\uB300\uAE30</div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600">
                                        <div className="flex justify-between mb-1"><span>\uC9C4\uCC30\uB8CC</span><span className="font-bold">5,000\uC6D0</span></div>
                                        <div className="flex justify-between mb-1"><span>\uAC80\uC0AC\uB8CC</span><span className="font-bold">{visit.testOrder ? '15,000' : '0'}\uC6D0</span></div>
                                        <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between text-indigo-700 font-bold text-lg"><span>\uCD1D \uC9C4\uB8CC\uBE44</span><span>{visit.testOrder ? '20,000' : '5,000'}\uC6D0</span></div>
                                    </div>
                                    <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-all">\uACB0\uC81C/\uC218\uB0A9 \uD558\uAE30</button>
                                </div>
                            ))}
                        </div>

                        {activeNonCompletedList.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <ChevronRight className="w-4 h-4" />
                                    \uC9C4\uD589 \uC911\uC778 \uD658\uC790 \u2014 \uAC15\uC81C \uC218\uB0A9
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {activeNonCompletedList.map(visit => (
                                        <div key={visit.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-amber-300 shadow-sm transition-all flex items-center justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-slate-800 truncate">{visit.patientName}</h4>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${getStatusColor(visit.status)}`}>{getStatusLabel(visit.status)}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5">{new Date(visit.date.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} \uC811\uC218</p>
                                            </div>
                                            <button
                                                onClick={() => handleForceToPayment(visit)}
                                                className="flex-shrink-0 px-3 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                                            >
                                                \uC218\uB0A9\uC73C\uB85C
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
                            <p className="font-medium">\uC218\uB0A9\uC774 \uC644\uB8CC\uB41C \uD658\uC790\uC758 \uCC98\uBC29\uC804 \uBC0F \uAC01\uC885 \uC99D\uBA85\uC11C\uB97C \uBC1C\uAE09\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-500 text-sm uppercase">
                                    <tr><th className="px-6 py-4">\uD658\uC790\uBA85</th><th className="px-6 py-4">\uC9C4\uB8CC\uC77C\uC2DC</th><th className="px-6 py-4">\uC8FC\uC99D\uC0C1/\uC9C4\uB2E8</th><th className="px-6 py-4">\uC0C1\uD0DC</th><th className="px-6 py-4 text-right">\uC99D\uBA85\uC11C \uBC1C\uAE09</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {historyList.map(visit => (
                                        <tr key={visit.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-800">{visit.patientName}</td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">{new Date(visit.date.seconds * 1000).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-slate-600 text-sm max-w-xs truncate">{visit.diagnosis || visit.chiefComplaint || '-'}</td>
                                            <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs font-bold">\uC218\uB0A9\uC644\uB8CC</span></td>
                                            <td className="px-6 py-4 text-right"><button onClick={() => openDocuments(visit)} className="text-emerald-600 hover:text-emerald-800 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded hover:bg-emerald-100 transition-colors">\uC11C\uB958 \uBC1C\uAE09</button></td>
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
                            <div><h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><CalendarDays className="w-7 h-7 text-emerald-600" /> \uC9C4\uB8CC \uC608\uC57D \uAD00\uB9AC</h2><p className="text-slate-500 text-sm mt-1">\uD658\uC790 \uC9C4\uB8CC \uC608\uC57D\uC744 \uB4F1\uB85D\uD558\uACE0 \uAD00\uB9AC\uD558\uC138\uC694.</p></div>
                            <button onClick={() => setShowNewAppointmentForm(!showNewAppointmentForm)} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl"><Plus className="w-5 h-5" /> {showNewAppointmentForm ? '\uD3FC \uB2EB\uAE30' : '\uC2E0\uADDC \uC608\uC57D \uB4F1\uB85D'}</button>
                        </div>

                        {showNewAppointmentForm && (
                            <form onSubmit={handleAppointmentSubmit} className="bg-white rounded-2xl shadow-sm border-2 border-emerald-200 p-6">
                                <h3 className="text-lg font-bold text-emerald-800 mb-4 flex items-center gap-2">
                                    <CalendarCheck className="w-5 h-5" />
                                    {appointmentFormData.patientName ? `${appointmentFormData.patientName}\uB2D8 \uB2E4\uC74C \uC608\uC57D \uB4F1\uB85D` : '\uC2E0\uADDC \uC608\uC57D \uB4F1\uB85D'}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">\uD658\uC790\uBA85 *</label>
                                        <input type="text" required value={appointmentFormData.patientName} onChange={(e) => setAppointmentFormData(prev => ({ ...prev, patientName: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="\uD658\uC790 \uC774\uB984" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">\uC5F0\uB77D\uCC98</label>
                                        <input type="tel" value={appointmentFormData.patientPhone} onChange={(e) => setAppointmentFormData(prev => ({ ...prev, patientPhone: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="010-0000-0000" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">\uC608\uC57D \uB0A0\uC9DC *</label>
                                        <input type="date" required value={appointmentFormData.appointmentDate} onChange={(e) => setAppointmentFormData(prev => ({ ...prev, appointmentDate: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">\uC608\uC57D \uC2DC\uAC04 *</label>
                                        <select value={appointmentFormData.appointmentTime} onChange={(e) => setAppointmentFormData(prev => ({ ...prev, appointmentTime: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                                            {Array.from({ length: 18 }, (_, i) => {
                                                const hour = Math.floor(i / 2) + 9;
                                                const min = i % 2 === 0 ? '00' : '30';
                                                const time = `${hour.toString().padStart(2, '0')}:${min}`;
                                                return <option key={time} value={time}>{time}</option>;
                                            })}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">\uB2F4\uB2F9\uC758</label>
                                        <input type="text" value={appointmentFormData.doctor} onChange={(e) => setAppointmentFormData(prev => ({ ...prev, doctor: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">\uBA54\uBAA8</label>
                                        <input type="text" value={appointmentFormData.notes} onChange={(e) => setAppointmentFormData(prev => ({ ...prev, notes: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="\uC9C4\uB2E8\uBA85, \uD2B9\uC774\uC0AC\uD56D \uB4F1" />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
                                    <button type="button" onClick={() => { setShowNewAppointmentForm(false); setAppointmentFormData({ patientName: '', patientPhone: '', appointmentDate: format(new Date(), 'yyyy-MM-dd'), appointmentTime: '09:00', department: '\uC77C\uBC18\uC9C4\uB8CC', doctor: '\uC6D0\uC7A5\uB2D8', notes: '', status: 'confirmed' }); }} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">\uCDE8\uC18C</button>
                                    <button type="submit" className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"><CheckCircle className="w-4 h-4" />\uC608\uC57D \uB4F1\uB85D</button>
                                </div>
                            </form>
                        )}

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50">
                                        <tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">\uC2DC\uAC04</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">\uD658\uC790\uBA85</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">\uC0C1\uD0DC</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {allAppointments.map((appointment) => (
                                            <tr key={appointment.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{appointment.appointmentTime}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{appointment.patientName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <select value={appointment.status} onChange={(e) => updateAppointmentStatus(appointment.id, e.target.value as Appointment['status'])} className={`px-3 py-1 text-xs font-medium rounded-full border-0 focus:ring-2 focus:ring-emerald-500 ${appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : appointment.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                                                        <option value="scheduled">\uC608\uC57D\uB428</option><option value="confirmed">\uD655\uC815\uB428</option><option value="completed">\uC644\uB8CC</option><option value="cancelled">\uCDE8\uC18C</option>
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
                        <div className="w-1/3 bg-slate-50 border-r border-slate-200 p-6 flex flex-col">
                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><User className="w-6 h-6 text-slate-500" />{selectedVisit.patientName} \uB2D8</h3>
                                <p className="text-slate-500 text-sm mt-1">\uC811\uC218\uBC88\uD638: {selectedVisit.id.slice(0, 8)}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                                <h4 className="font-bold text-slate-700 mb-3 border-b pb-2">\uC9C4\uB8CC\uBE44 \uB0B4\uC5ED</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-slate-500">\uC9C4\uCC30\uB8CC (\uBCF8\uC778\uBD80\uB2F4)</span><span className="font-bold">5,000</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">\uCC98\uCE58/\uC218\uC220\uB8CC</span><span className="font-bold">15,000</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">\uAC80\uC0AC\uB8CC</span><span className="font-bold">{selectedVisit.testOrder ? '30,000' : '0'}</span></div>
                                    <div className="border-t border-dashed pt-2 mt-2 flex justify-between font-bold text-lg text-slate-800"><span>\uC9C4\uB8CC\uBE44 \uC18C\uACC4</span><span>{(20000 + (selectedVisit.testOrder ? 30000 : 0)).toLocaleString()}\uC6D0</span></div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto mb-4">
                                <h4 className="font-bold text-slate-700 mb-2 flex items-center justify-between"><span>\uC81C\uC99D\uBA85 \uBC1C\uAE09 \uB0B4\uC5ED</span>{previewType && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">\uC791\uC131\uC911</span>}</h4>
                                {selectedDocuments.length === 0 ? (
                                    <div className="p-4 border border-dashed rounded-xl text-center text-slate-400 text-sm">\uCD94\uAC00\uB41C \uC99D\uBA85\uC11C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.<br />\uC6B0\uCE21\uC5D0\uC11C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedDocuments.map((doc, idx) => (
                                            <div key={idx} className="bg-white p-3 rounded-xl border border-emerald-200 shadow-sm flex justify-between items-center group">
                                                <div>
                                                    <div className="font-bold text-slate-800">{doc.label}</div>
                                                    <div className="text-xs text-slate-500 cursor-pointer hover:text-emerald-600 underline" onClick={() => { setPreviewType(doc.type); setShowPreview(true); }}>[내용 보기/수정]</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-emerald-700">{doc.price.toLocaleString()}\uC6D0</div>
                                                    <button onClick={() => setSelectedDocuments(prev => prev.filter((_, i) => i !== idx))} className="text-xs text-red-400 hover:text-red-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">\uC0AD\uC81C</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="mt-auto bg-slate-900 text-white p-5 rounded-2xl shadow-lg">
                                <div className="flex justify-between text-sm opacity-80 mb-1"><span>\uCD1D \uACB0\uC81C \uAE08\uC561</span><span>(\uC9C4\uB8CC\uBE44 + \uC81C\uC99D\uBA85)</span></div>
                                <div className="text-3xl font-bold text-right">{(20000 + (selectedVisit.testOrder ? 30000 : 0) + selectedDocuments.reduce((sum, doc) => sum + doc.price, 0)).toLocaleString()}<span className="text-lg font-normal ml-1">\uC6D0</span></div>
                            </div>
                        </div>
                        <div className="w-2/3 p-8 bg-white flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><FileText className="w-7 h-7 text-indigo-600" />\uC81C\uC99D\uBA85 \uBC1C\uAE09 \uBC0F \uC218\uB0A9</h2>
                                    <p className="text-slate-500">\uBC1C\uAE09\uD560 \uC11C\uB958\uB97C \uC120\uD0DD\uD558\uBA74 \uBE44\uC6A9\uC774 \uC790\uB3D9\uC73C\uB85C \uD569\uC0B0\uB429\uB2C8\uB2E4.</p>
                                </div>
                                <button onClick={() => { setModalMode('none'); setSelectedDocuments([]); }} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8 overflow-y-auto max-h-[400px] p-1">
                                {[
                                    { id: 'diagnosis', label: '\uC77C\uBC18 \uC9C4\uB2E8\uC11C', price: 20000, desc: '\uBCD1\uBA85, \uCE58\uB8CC\uAE30\uAC04\uC774 \uBA85\uC2DC\uB41C \uC8FC\uC9C4\uB2E8\uC11C' },
                                    { id: 'opinion', label: '\uC9C4\uB8CC \uC18C\uACAC\uC11C', price: 15000, desc: '\uC758\uC0AC\uC758 \uC758\uD559\uC801 \uC18C\uACAC\uC774 \uD3EC\uD568\uB41C \uC11C\uB958' },
                                    { id: 'referral', label: '\uC9C4\uB8CC \uC758\uB8B0\uC11C', price: 0, desc: '\uC0C1\uAE09 \uBCD1\uC6D0 \uC9C4\uB8CC\uB97C \uC704\uD55C \uC694\uC591\uAE09\uC5EC\uC758\uB8B0\uC11C' },
                                    { id: 'certificate', label: '\uD1B5\uC6D0 \uD655\uC778\uC11C', price: 3000, desc: '\uD559\uAD50/\uC9C1\uC7A5 \uC81C\uCD9C\uC6A9 \uB0B4\uC6D0 \uC0AC\uC2E4 \uD655\uC778' },
                                    { id: 'chart_copy', label: '\uC758\uBB34\uAE30\uB85D \uC0AC\uBCF8', price: 3000, desc: '\uCD08\uC9C4\uCC28\uD2B8 \uBC0F \uAC80\uC0AC\uACB0\uACFC\uC9C0 \uC0AC\uBCF8' },
                                    { id: 'receipt', label: '\uC9C4\uB8CC\uBE44 \uC601\uC218\uC99D', price: 0, desc: '\uC5F0\uB9D0\uC815\uC0B0\uC6A9 \uC9C4\uB8CC\uBE44 \uB0A9\uC785 \uD655\uC778\uC11C' },
                                    { id: 'detailed_receipt', label: '\uC138\uBD80\uB0B4\uC5ED\uC11C', price: 0, desc: '\uC0B0\uC815 \uC9C4\uB8CC\uBE44\uC5D0 \uB300\uD55C \uC0C1\uC138 \uB0B4\uC5ED' },
                                ].map((item) => (
                                    <button key={item.id} onClick={() => { const newDoc = { type: item.id as DocumentType, label: item.label, price: item.price }; setSelectedDocuments(prev => [...prev, newDoc]); }} className="flex flex-col text-left p-4 border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start w-full mb-2">
                                            <span className="font-bold text-slate-800">{item.label}</span>
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.price > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>{item.price > 0 ? `${item.price.toLocaleString()}\uC6D0` : '\uBB34\uB8CC'}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 group-hover:text-slate-600">{item.desc}</p>
                                        <div className="mt-4 pt-4 border-t border-dashed border-slate-200 w-full text-center text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">+ \uBAA9\uB85D\uC5D0 \uCD94\uAC00</div>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-auto pt-6 border-t border-slate-100">
                                <h4 className="font-bold text-slate-800 mb-4">\uACB0\uC81C \uC218\uB2E8 \uC120\uD0DD</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); processPayment(); }} className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all cursor-pointer"><CheckCircle className="w-6 h-6" />\uCE74\uB4DC \uACB0\uC81C \uC644\uB8CC</button>
                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); processPayment(); }} className="py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer">\uD604\uAE08 \uACB0\uC81C \uC644\uB8CC</button>
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
                        <div className="w-2/3 p-8 bg-white overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ShieldCheck className="w-8 h-8 text-emerald-600" /> \uC81C\uC99D\uBA85 \uBC1C\uAE09 \uC2E0\uCCAD</h3>
                                <button onClick={() => setModalMode('none')} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                            </div>
                            <p className="text-slate-500 mb-6">\uBC1C\uAE09\uD560 \uC11C\uB958\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694. \uC790\uB3D9\uC73C\uB85C \uD569\uACC4 \uAE08\uC561\uC774 \uACC4\uC0B0\uB429\uB2C8\uB2E4.</p>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: 'diagnosis', label: '\uC77C\uBC18 \uC9C4\uB2E8\uC11C', price: 20000, desc: '\uBCD1\uBA85/\uCE58\uB8CC\uAE30\uAC04 \uBA85\uC2DC' },
                                    { id: 'opinion', label: '\uC9C4\uB8CC \uC18C\uACAC\uC11C', price: 15000, desc: '\uC758\uC0AC \uC18C\uACAC \uD3EC\uD568' },
                                    { id: 'certificate', label: '\uC9C4\uB8CC \uD655\uC778\uC11C', price: 3000, desc: '\uD1B5\uC6D0 \uD655\uC778\uC6A9' },
                                    { id: 'chart_copy', label: '\uCD08\uC9C4\uCC28\uD2B8\uBCF5\uC0AC', price: 1000, desc: '\uC758\uBB34\uAE30\uB85D \uC0AC\uBCF8 (1\uB9E4\uB2F9)' },
                                    { id: 'receipt', label: '\uC9C4\uB8CC\uBE44 \uC601\uC218\uC99D', price: 0, desc: '\uBB34\uB8CC \uBC1C\uAE09' },
                                    { id: 'detailed_receipt', label: '\uC9C4\uB8CC\uBE44 \uC0C1\uC138\uB0B4\uC5ED\uC11C', price: 0, desc: '\uBB34\uB8CC \uBC1C\uAE09' },
                                ].map(docItem => (
                                    <div key={docItem.id} className="p-4 border-2 border-slate-100 rounded-xl hover:border-emerald-200 hover:bg-emerald-50 cursor-pointer transition-all flex flex-col justify-between" onClick={() => triggerPreview(docItem.id as any)}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-slate-800 text-lg">{docItem.label}</span>
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${docItem.price > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{docItem.price > 0 ? `${docItem.price.toLocaleString()}\uC6D0` : '\uBB34\uB8CC'}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mb-4">{docItem.desc}</p>
                                        <div className="flex gap-2 mt-auto">
                                            <button onClick={(e) => { e.stopPropagation(); triggerPreview(docItem.id as any); }} className="flex-1 py-2 text-xs font-bold border border-slate-200 rounded-lg hover:bg-white text-slate-600">\uBBF8\uB9AC\uBCF4\uAE30</button>
                                            <button className="flex-1 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm" onClick={(e) => { e.stopPropagation(); alert(`${docItem.label} \uBC1C\uAE09 \uBE44\uC6A9 ${docItem.price.toLocaleString()}\uC6D0\uC774 \uCD94\uAC00\uB418\uC5C8\uC2B5\uB2C8\uB2E4.`); }}>\uBC1C\uAE09/\uCD94\uAC00</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="w-1/3 bg-slate-50 border-l border-slate-200 p-8 flex flex-col">
                            <h4 className="font-bold text-slate-500 uppercase tracking-wider mb-6 text-sm">\uBC1C\uAE09 \uB0B4\uC5ED (Summary)</h4>
                            <div className="flex-1 space-y-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <h5 className="font-bold text-slate-800 mb-2">{selectedVisit.patientName} \uB2D8</h5>
                                    <div className="text-sm text-slate-500 space-y-1">
                                        <p>\uC9C4\uB8CC\uC77C: {new Date(selectedVisit.date.seconds * 1000).toLocaleDateString()}</p>
                                        <p>\uB2F4\uB2F9\uC758: \uC7A5\uC7AC\uD638 \uC6D0\uC7A5</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm text-slate-600"><span>\uC9C4\uB8CC \uD655\uC778\uC11C</span><span>3,000\uC6D0</span></div>
                                    <div className="flex justify-between text-sm text-slate-600"><span>\uCD08\uC9C4\uCC28\uD2B8\uBCF5\uC0AC (5\uB9E4)</span><span>5,000\uC6D0</span></div>
                                    <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-lg text-slate-900 mt-4"><span>\uCD1D \uD569\uACC4</span><span className="text-emerald-600">8,000\uC6D0</span></div>
                                </div>
                            </div>
                            <div className="mt-8 space-y-3">
                                <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" />\uC218\uB0A9 \uBC0F \uBC1C\uAE09 \uC644\uB8CC</button>
                                <p className="text-xs text-center text-slate-400">\uC218\uB0A9 \uC644\uB8CC \uC2DC \uC11C\uB958\uAC00 \uC989\uC2DC \uCD9C\uB825\uB429\uB2C8\uB2E4.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Document Preview (Printable) */}
            {(modalMode === 'preview' || showPreview) && selectedVisit && previewType && (
                <div className="fixed inset-0 bg-slate-900/90 z-[60] flex flex-col items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl p-16 text-slate-800 relative printable-area my-8 scale-[0.8] md:scale-100 origin-top">
                        <div className="text-center border-b-4 border-double border-slate-800 pb-6 mb-10">
                            <h1 className="text-4xl font-serif font-bold mb-4 tracking-[0.5em]">
                                {previewType === 'diagnosis' ? '\uC9C4 \uB2E8 \uC11C' : previewType === 'opinion' ? '\uC18C \uACAC \uC11C' : previewType === 'certificate' ? '\uC9C4 \uB8CC \uD655 \uC778 \uC11C' : previewType === 'receipt' ? '\uC9C4\uB8CC\uBE44 \uACC4\uC0B0\uC11C\xB7\uC601\uC218\uC99D' : previewType === 'detailed_receipt' ? '\uC9C4\uB8CC\uBE44 \uC138\uBD80\uB0B4\uC5ED\uC11C' : '\uC758\uBB34\uAE30\uB85D \uC0AC\uBCF8 (\uCD08\uC9C4\uCC28\uD2B8)'}
                            </h1>
                            <div className="flex justify-between text-sm font-mono px-4 text-slate-500">
                                <span suppressHydrationWarning>\uBC1C\uD589\uBC88\uD638: {new Date().getFullYear()}-{Math.floor(Math.random() * 9000) + 1000}</span>
                                <span>\uB4F1\uB85D\uBC88\uD638: {selectedVisit.patientId.slice(0, 8)}</span>
                            </div>
                        </div>
                        <table className="w-full border-collapse border-2 border-slate-800 mb-10 text-sm">
                            <tbody>
                                <tr>
                                    <td className="border border-slate-800 bg-slate-50 p-2 font-bold w-24 text-center">\uD658\uC790 \uC131\uBA85</td>
                                    <td className="border border-slate-800 p-2">{selectedVisit.patientName}</td>
                                    <td className="border border-slate-800 bg-slate-50 p-2 font-bold w-24 text-center">\uC8FC\uBBFC\uBC88\uD638</td>
                                    <td className="border border-slate-800 p-2">******-*******</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-800 bg-slate-50 p-2 font-bold text-center">\uC8FC \uC18C</td>
                                    <td colSpan={3} className="border border-slate-800 p-2">\uACBD\uC0C1\uB0A8\uB3C4 \uBC00\uC591\uC2DC (\uC0C1\uC138 \uC8FC\uC18C)</td>
                                </tr>
                            </tbody>
                        </table>
                        <div className="min-h-[500px] border border-slate-300 p-8 relative">
                            {previewType === 'certificate' && (
                                <div className="space-y-8 font-serif leading-loose">
                                    <div className="flex"><span className="font-bold w-32">\uBCD1 &nbsp; &nbsp; &nbsp; &nbsp; \uBA85 :</span> <span className="font-bold border-b border-black flex-1">{selectedVisit.diagnosis || '\uC0C1\uC138\uBD88\uBA85\uC758 \uD1B5\uC99D'}</span></div>
                                    <div className="flex"><span className="font-bold w-32">\uC9C4 \uB8CC \uAE30 \uAC04 :</span> <span className="border-b border-black flex-1">{new Date(selectedVisit.date.seconds * 1000).toLocaleDateString()} (1\uC77C\uAC04)</span></div>
                                    <div className="flex"><span className="font-bold w-32">\uC6A9 &nbsp; &nbsp; &nbsp; &nbsp; \uB3C4 :</span> <span className="border-b border-black flex-1">\uD68C\uC0AC/\uD559\uAD50 \uC81C\uCD9C\uC6A9</span></div>
                                    <div className="mt-12 text-center text-lg"><p>\uC0C1\uAE30 \uD658\uC790\uB294 \uC704\uC640 \uAC19\uC774 \uBCF8\uC6D0\uC5D0\uC11C \uC9C4\uB8CC\uB97C \uBC1B\uC558\uC74C\uC744 \uD655\uC778\uD569\uB2C8\uB2E4.</p></div>
                                </div>
                            )}
                            {previewType === 'receipt' && (
                                <div className="text-xs">
                                    <table className="w-full border-collapse border border-black mb-4">
                                        <thead><tr className="bg-slate-100"><th className="border border-black p-1">\uD56D\uBAA9</th><th className="border border-black p-1">\uC694\uC591\uAE09\uC5EC</th><th className="border border-black p-1">\uBE44\uAE09\uC5EC</th><th className="border border-black p-1">\uAE08\uC561</th></tr></thead>
                                        <tbody>
                                            <tr><td className="border border-black p-1 text-center">\uC9C4\uCC30\uB8CC</td><td className="border border-black p-1 text-right">5,000</td><td className="border border-black p-1 text-right">0</td><td className="border border-black p-1 text-right">5,000</td></tr>
                                            <tr><td className="border border-black p-1 text-center">\uD22C\uC57D/\uC870\uC81C\uB8CC</td><td className="border border-black p-1 text-right">0</td><td className="border border-black p-1 text-right">0</td><td className="border border-black p-1 text-right">0</td></tr>
                                            <tr><td className="border border-black p-1 text-center">\uC8FC\uC0AC\uB8CC</td><td className="border border-black p-1 text-right">0</td><td className="border border-black p-1 text-right">0</td><td className="border border-black p-1 text-right">0</td></tr>
                                            <tr><td className="border border-black p-1 text-center">\uCC98\uCE58/\uC218\uC220\uB8CC</td><td className="border border-black p-1 text-right">15,000</td><td className="border border-black p-1 text-right">0</td><td className="border border-black p-1 text-right">15,000</td></tr>
                                            <tr><td className="border border-black p-1 text-center">\uAC80\uC0AC\uB8CC</td><td className="border border-black p-1 text-right">0</td><td className="border border-black p-1 text-right">30,000</td><td className="border border-black p-1 text-right">30,000</td></tr>
                                            <tr className="bg-slate-100 font-bold"><td className="border border-black p-1 text-center">\uD569 \uACC4</td><td className="border border-black p-1 text-right">20,000</td><td className="border border-black p-1 text-right">30,000</td><td className="border border-black p-1 text-right text-lg">50,000</td></tr>
                                        </tbody>
                                    </table>
                                    <p className="text-center mt-4">\uBD80\uAC00\uAC00\uCE58\uC138\uBC95 \uC2DC\uD589\uB839 \uC81C33\uC870\uC758 \uADDC\uC815\uC5D0 \uC758\uD55C \uC601\uC218\uC99D\uC785\uB2C8\uB2E4.</p>
                                </div>
                            )}
                            {previewType === 'chart_copy' && (
                                <div className="space-y-4 font-mono text-sm leading-relaxed">
                                    <div className="border p-4 mb-4 bg-slate-50"><h3 className="font-bold underline mb-2">S (Subjective)</h3><p>{selectedVisit.chiefComplaint || '\uD5C8\uB9AC\uAC00 \uC544\uD30C\uC694'}</p></div>
                                    <div className="border p-4 mb-4 bg-slate-50"><h3 className="font-bold underline mb-2">O (Objective)</h3><p>P/E: L-spine tenderness (+)<br />SLRT: 70/70</p><p>X-ray: L-Spine spondylosis</p></div>
                                    <div className="border p-4 mb-4 bg-slate-50"><h3 className="font-bold underline mb-2">A (Assessment)</h3><p>{selectedVisit.diagnosis || 'M54.5 Low Back Pain'}</p></div>
                                    <div className="border p-4 bg-slate-50"><h3 className="font-bold underline mb-2">P (Plan)</h3><p>{selectedVisit.treatmentNote || 'Medication & PT'}</p></div>
                                </div>
                            )}
                            {(previewType === 'diagnosis' || previewType === 'opinion' || previewType === 'detailed_receipt') && (
                                <div className="space-y-6">
                                    <div><h3 className="font-bold border-b border-black pb-1 mb-2">[ \uB0B4 \uC6A9 ]</h3>
                                        <p className="leading-loose whitespace-pre-wrap">{selectedVisit.treatmentNote || '\uC0C1\uAE30 \uD658\uC790\uB294 \uBCF8\uC6D0\uC5D0\uC11C \uC9C4\uB8CC\uB97C \uBC1B\uC558\uC2B5\uB2C8\uB2E4.'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-12 text-center space-y-6">
                            <p className="text-xl tracking-widest font-serif" suppressHydrationWarning>{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <div className="flex flex-col items-center">
                                <p className="text-3xl font-bold font-serif flex items-center justify-center gap-4 relative">
                                    \uBC00 \uC591 \uC815 \uD615 \uC678 \uACFC \uC6D0 \uC7A5
                                    <span className="absolute -right-20 top-1/2 -translate-y-1/2 w-16 h-16 border-4 border-red-600 rounded-lg text-red-600 text-sm flex items-center justify-center font-black rotate-12 opacity-80 backdrop-blend-multiply">\uC6D0\uC7A5\uC778</span>
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="fixed bottom-8 flex gap-4 print:hidden z-[70]">
                        <button onClick={() => { if (showPreview) setShowPreview(false); else setModalMode('documents'); }} className="px-8 py-4 bg-white/10 text-white backdrop-blur-md rounded-2xl font-bold border border-white/20 hover:bg-white/20">{showPreview ? '\uB2EB\uAE30' : '\uB4A4\uB85C \uAC00\uAE30'}</button>
                        <button onClick={handlePrint} className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-2xl hover:bg-emerald-500 flex items-center gap-3 transform hover:scale-105 transition-all"><Printer className="w-6 h-6" /> \uC778\uC1C4 (Print)</button>
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

            {/* Toast Notification */}
            {toastMsg && (
                <div className="fixed bottom-6 right-6 z-[100] bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{toastMsg}</span>
                </div>
            )}

            {/* MODAL: Next Appointment */}
            {modalMode === 'next_appointment' && paidVisitForAppointment && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                        <div className="bg-emerald-600 p-6 text-white text-center">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3"><CheckCircle className="w-8 h-8" /></div>
                            <h3 className="text-xl font-bold">\uC218\uB0A9\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4</h3>
                            <p className="text-emerald-100 mt-1 text-sm">{paidVisitForAppointment.patientName}\uB2D8</p>
                        </div>
                        <div className="p-6 text-center">
                            <div className="mb-6">
                                <CalendarDays className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                                <h4 className="text-lg font-bold text-slate-800">\uB2E4\uC74C \uC9C4\uB8CC \uC608\uC57D\uC744 \uB4F1\uB85D\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?</h4>
                                <p className="text-sm text-slate-500 mt-2">\uD658\uC790 \uC815\uBCF4\uAC00 \uC790\uB3D9\uC73C\uB85C \uC785\uB825\uB41C \uC608\uC57D \uD654\uBA74\uC73C\uB85C \uC774\uB3D9\uD569\uB2C8\uB2E4.</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleNextAppointmentNo} className="flex-1 py-3.5 text-slate-600 font-bold border-2 border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">\uC608\uC57D \uC5C6\uC774 \uC885\uB8CC</button>
                                <button onClick={handleNextAppointmentYes} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"><CalendarCheck className="w-5 h-5" />\uB2E4\uC74C \uC608\uC57D \uB4F1\uB85D</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
