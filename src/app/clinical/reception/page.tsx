'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, limit, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-clinical';
import { Search, UserPlus, Clock, Calendar, User, ChevronRight, Stethoscope, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Patient, Visit } from '@/types/clinical';
import { startOfDay, subDays } from 'date-fns';

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
        case 'treatment': return 'bg-green-100 text-green-800 border-green-200'; // Changed to green/blue-ish or keep purple? I'll keep distinct.
        case 'testing': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'completed': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
        case 'paid': return 'bg-slate-100 text-slate-800 border-slate-200';
        default: return 'bg-slate-100 text-slate-500';
    }
};

export default function ReceptionPage() {
    const [activeTab, setActiveTab] = useState<'reception' | 'payment' | 'documents'>('reception');

    // Left Panel: Search
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Data Lists
    const [todayVisits, setTodayVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);

    // Selected Visit for Payment/Documents
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
    const [modalMode, setModalMode] = useState<'none' | 'invoice' | 'documents' | 'preview'>('none');
    const [previewType, setPreviewType] = useState<'prescription' | 'receipt' | 'detailed_receipt' | 'certificate' | 'diagnosis' | 'referral' | null>(null);

    // Initial Load & Real-time Subscription
    useEffect(() => {
        // Show last 7 days for testing purposes
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

    // ... (Search & Register Logic - Same as before) ...
    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (term.length < 2) { setSearchResults([]); return; }
        setIsSearching(true);
        try {
            const q = query(collection(db, 'patients'), where('name', '>=', term), where('name', '<=', term + '\uf8ff'), limit(5));
            const snapshot = await getDocs(q);
            setSearchResults(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Patient)));
        } catch (e) { console.error(e); } finally { setIsSearching(false); }
    };

    const handleRegister = async (patient: Patient) => {
        if (!confirm(`${patient.name}님을 대기목록에 등록하시겠습니까?`)) return;
        try {
            await addDoc(collection(db, 'visits'), {
                patientId: patient.id,
                patientName: patient.name,
                status: 'reception',
                type: 'return',
                date: serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            setSearchTerm(''); setSearchResults([]);
        } catch (e) { alert("접수 오류"); }
    };

    const handleCallPatient = async (visitId: string) => await updateDoc(doc(db, 'visits', visitId), { status: 'consulting', startedAt: serverTimestamp() });

    // Payment Logic
    const openInvoice = (visit: Visit) => {
        setSelectedVisit(visit);
        setModalMode('invoice');
    };

    const processPayment = async () => {
        if (!selectedVisit) return;
        if (!confirm("결제를 완료 처리하시겠습니까?")) return;
        try {
            await updateDoc(doc(db, 'visits', selectedVisit.id), { status: 'paid', paidAt: serverTimestamp() });
            setModalMode('none');
            setSelectedVisit(null);
            alert("수납이 완료되었습니다.");
        } catch (e) { alert("처리 실패"); }
    };

    // Document Logic
    const openDocuments = (visit: Visit) => {
        setSelectedVisit(visit);
        setModalMode('documents');
    };

    const showPreview = (type: 'prescription' | 'receipt' | 'certificate') => {
        setPreviewType(type);
        setModalMode('preview');
    };

    const handlePrint = () => {
        window.print();
    };

    // Filtered Lists
    const receptionList = todayVisits.filter(v => ['reception', 'consulting', 'treatment', 'testing'].includes(v.status));
    const paymentList = todayVisits.filter(v => v.status === 'completed');
    const historyList = todayVisits.filter(v => v.status === 'paid');

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)]">
            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-slate-200 px-4">
                <button
                    onClick={() => setActiveTab('reception')}
                    className={`pb-3 px-2 text-lg font-bold transition-all ${activeTab === 'reception' ? 'text-slate-800 border-b-4 border-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    접수/대기 ({receptionList.length})
                </button>
                <button
                    onClick={() => setActiveTab('payment')}
                    className={`pb-3 px-2 text-lg font-bold transition-all ${activeTab === 'payment' ? 'text-indigo-600 border-b-4 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    수납 대기 ({paymentList.length})
                </button>
                <button
                    onClick={() => setActiveTab('documents')}
                    className={`pb-3 px-2 text-lg font-bold transition-all ${activeTab === 'documents' ? 'text-emerald-600 border-b-4 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    제증명/완료 ({historyList.length})
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden px-4">

                {/* TAB 1: RECEPTION */}
                {activeTab === 'reception' && (
                    <div className="flex flex-col lg:flex-row gap-6 h-full">
                        {/* Left: Registration (Same as before) */}
                        <div className="flex-1 flex flex-col gap-6 min-w-0">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
                                <div className="mb-8">
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-2">
                                        <UserPlus className="w-6 h-6 text-slate-600" /> 접수 등록
                                    </h2>
                                    <p className="text-slate-500 text-sm">환자 이름을 검색하여 접수하거나 신규 등록하세요.</p>
                                </div>
                                <div className="relative mb-6">
                                    <Search className="absolute left-3 top-4 h-5 w-5 text-slate-400" />
                                    <input
                                        type="text"
                                        className="block w-full pl-10 pr-3 py-4 border border-slate-300 rounded-xl leading-5 bg-white sm:text-lg focus:ring-2 focus:ring-slate-500 transition-all"
                                        placeholder="환자 이름 검색 (2글자 이상)"
                                        value={searchTerm}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3">
                                    {searchResults.length > 0 && searchResults.map((patient) => (
                                        <div key={patient.id} onClick={() => handleRegister(patient)} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 cursor-pointer group">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${patient.gender === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>{patient.name[0]}</div>
                                                <div><h3 className="font-bold text-slate-900">{patient.name}</h3><p className="text-xs text-slate-500">{patient.birthDate}</p></div>
                                            </div>
                                            <span className="text-slate-600 font-bold text-sm opacity-0 group-hover:opacity-100">접수하기</span>
                                        </div>
                                    ))}
                                    {searchTerm.length > 1 && searchResults.length === 0 && !isSearching && (
                                        <div className="text-center py-10 px-4">
                                            <p className="text-slate-500 mb-4">"{searchTerm}"에 대한 검색 결과가 없습니다.</p>
                                            <Link href="/clinical/patients/new">
                                                <button className="bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-emerald-600 transition-all">
                                                    신규 환자 등록하기
                                                </button>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Right: Waiting List */}
                        <div className="w-full lg:w-[480px] bg-slate-800 text-white rounded-2xl flex flex-col overflow-hidden">
                            <div className="p-6 border-b border-slate-700"><h2 className="text-xl font-bold flex gap-2"><Clock className="text-emerald-400" /> 실시간 대기 현황 <span className="ml-auto text-3xl">{receptionList.length}</span></h2></div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white text-slate-800">
                                {receptionList.map(visit => (
                                    <div key={visit.id} className="relative bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${visit.status === 'reception' ? 'bg-yellow-400' : visit.status === 'consulting' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                                        <div className="pl-2 flex-1">
                                            <div className="flex justify-between"><h3 className="font-bold text-lg">{visit.patientName}</h3><span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(visit.status)}`}>{getStatusLabel(visit.status)}</span></div>
                                            <div className="text-xs text-slate-500 mt-1">{new Date(visit.date.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                        {visit.status === 'reception' && <button onClick={() => handleCallPatient(visit.id)} className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-bold">호출</button>}
                                    </div>
                                ))}
                                {receptionList.length === 0 && <div className="text-center py-10 text-slate-400">대기 환자가 없습니다.</div>}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: PAYMENT */}
                {activeTab === 'payment' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paymentList.length === 0 && <div className="col-span-full text-center py-20 text-slate-400">수납 대기 중인 환자가 없습니다.</div>}
                        {paymentList.map(visit => (
                            <div key={visit.id} className="bg-white p-6 rounded-2xl border-2 border-indigo-100 hover:border-indigo-300 shadow-sm transition-all cursor-pointer flex flex-col gap-4" onClick={() => openInvoice(visit)}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">{visit.patientName}</h3>
                                        <p className="text-sm text-slate-500">{new Date(visit.date.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 접수</p>
                                    </div>
                                    <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">수납대기</div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600">
                                    <div className="flex justify-between mb-1"><span>진찰료</span><span className="font-bold">5,000원</span></div>
                                    <div className="flex justify-between mb-1"><span>검사료</span><span className="font-bold">{visit.testOrder ? '15,000' : '0'}원</span></div>
                                    <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between text-indigo-700 font-bold text-lg">
                                        <span>총 진료비</span>
                                        <span>{visit.testOrder ? '20,000' : '5,000'}원</span>
                                    </div>
                                </div>
                                <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-all">결제/수납 하기</button>
                            </div>
                        ))}
                    </div>
                )}

                {/* TAB 3: DOCUMENTS */}
                {activeTab === 'documents' && (
                    <div className="space-y-4">
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-emerald-800 mb-6 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5" />
                            <p className="font-medium">수납이 완료된 환자의 처방전 및 각종 증명서를 발급할 수 있습니다.</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-500 text-sm uppercase">
                                    <tr>
                                        <th className="px-6 py-4">환자명</th>
                                        <th className="px-6 py-4">진료일시</th>
                                        <th className="px-6 py-4">주증상/진단</th>
                                        <th className="px-6 py-4">상태</th>
                                        <th className="px-6 py-4 text-right">증명서 발급</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {historyList.map(visit => (
                                        <tr key={visit.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-800">{visit.patientName}</td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">{new Date(visit.date.seconds * 1000).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-slate-600 text-sm max-w-xs truncate">{visit.diagnosis || visit.chiefComplaint || '-'}</td>
                                            <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs font-bold">수납완료</span></td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => openDocuments(visit)} className="text-emerald-600 hover:text-emerald-800 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded hover:bg-emerald-100 transition-colors">
                                                    서류 발급
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {historyList.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-400">발급 가능한 내역이 없습니다.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL: Invoice / Payment */}
            {modalMode === 'invoice' && selectedVisit && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-indigo-600 p-6 text-white text-center">
                            <h3 className="text-2xl font-bold mb-1">진료비 수납</h3>
                            <p className="opacity-80">{selectedVisit.patientName} 님</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">진찰료 (본인부담금)</span>
                                <span className="font-bold text-slate-800">5,000 원</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">검사/치료비</span>
                                <span className="font-bold text-slate-800">{selectedVisit.testOrder ? '15,000' : '0'} 원</span>
                            </div>
                            <div className="flex justify-between py-4 text-xl font-bold text-indigo-600">
                                <span>합계 금액</span>
                                <span>{selectedVisit.testOrder ? '20,000' : '5,000'} 원</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4">
                                <button onClick={() => processPayment()} className="py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg">카드 결제</button>
                                <button onClick={() => processPayment()} className="py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 shadow-lg">현금 결제</button>
                            </div>
                        </div>
                        <button onClick={() => setModalMode('none')} className="w-full py-4 text-slate-500 hover:bg-slate-50 font-medium border-t border-slate-100">취소</button>
                    </div>
                </div>
            )}

            {/* MODAL: Documents Selection */}
            {modalMode === 'documents' && selectedVisit && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 relative">
                        <button onClick={() => setModalMode('none')} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><CheckCircle className="w-6 h-6 rotate-45" /></button>
                        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Stethoscope className="w-6 h-6 text-emerald-600" /> 제증명 발급
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { id: 'prescription', label: '처방전', desc: '약국 제출용' },
                                { id: 'receipt', label: '진료비 영수증', desc: '환자 보관용' },
                                { id: 'detailed_receipt', label: '진료비 상세내역서', desc: '보험 청구용 상세 내역' },
                                { id: 'certificate', label: '진료 확인서', desc: '직장/학교 제출용 (단순확인)' },
                                { id: 'diagnosis', label: '진단서', desc: '병명/치료기간 명시 (정식)' },
                                { id: 'referral', label: '진료 의뢰서', desc: '상급병원 제출용' },
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => showPreview(item.id as any)}
                                    className="p-4 border border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition-all text-left group"
                                >
                                    <div className="font-bold text-lg mb-1">{item.label}</div>
                                    <div className="text-xs text-slate-400 group-hover:text-emerald-500">{item.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Document Preview (Printable) */}
            {modalMode === 'preview' && selectedVisit && previewType && (
                <div className="fixed inset-0 bg-slate-900/90 z-[60] flex flex-col items-center justify-center p-4">
                    <div className="bg-white w-[210mm] h-[297mm] h-[80vh] overflow-y-auto shadow-2xl rounded-sm p-12 text-slate-800 relative printable-area">
                        {/* Mock Document Content Based on Type */}
                        <div className="text-center border-b-2 border-black pb-4 mb-8">
                            <h1 className="text-3xl font-serif font-bold mb-2">
                                {previewType === 'prescription' ? '처 방 전' :
                                    previewType === 'receipt' ? '진료비 계산서 · 영수증' :
                                        previewType === 'detailed_receipt' ? '진료비 세부 산정 내역서' :
                                            previewType === 'diagnosis' ? '진 단 서' :
                                                previewType === 'referral' ? '진 료 의 뢰 서' :
                                                    '진 료 확 인 서'}
                            </h1>
                            <p className="text-sm">발행번호: {new Date().getTime().toString().slice(-8)}</p>
                        </div>

                        <div className="space-y-6 font-serif">
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <p className="font-bold border-b border-black mb-2">환자 정보</p>
                                    <p>성명: {selectedVisit.patientName}</p>
                                    <p>생년월일: {selectedVisit.patientId ? '1990-01-01 (예시)' : '-'}</p> {/* Mock data if not available */}
                                    <p>주소: 경남 밀양시 삼문동</p>
                                </div>
                                <div>
                                    <p className="font-bold border-b border-black mb-2">의료기관 정보</p>
                                    <p>명칭: 밀양 정형외과</p>
                                    <p>전화: 055-356-0202</p>
                                    <p>주소: 경남 밀양시 미리벌중앙로 55</p>
                                </div>
                            </div>

                            <div className="border-t-2 border-black pt-6 min-h-[400px]">
                                {/* 1. PRESCRIPTION */}
                                {previewType === 'prescription' && (
                                    <>
                                        <p className="font-bold mb-4 bg-slate-100 p-2">[ 처방 내역 ]</p>
                                        <div className="p-4 border border-slate-300 rounded font-mono text-sm whitespace-pre-wrap">
                                            {selectedVisit.treatmentNote ? selectedVisit.treatmentNote : '등록된 처방 내역이 없습니다.'}
                                        </div>
                                    </>
                                )}

                                {/* 2. CONFIRMATION (Simple) */}
                                {previewType === 'certificate' && (
                                    <>
                                        <p className="font-bold mb-4 bg-slate-100 p-2">[ 진단 및 소견 ]</p>
                                        <div className="space-y-4 px-2">
                                            <p><span className="font-bold inline-block w-24">병명:</span> {selectedVisit.diagnosis || '상세불명'}</p>
                                            <p><span className="font-bold inline-block w-24">진료일:</span> {new Date(selectedVisit.date.seconds * 1000).toLocaleDateString()}</p>
                                            <div className="mt-8">
                                                <p className="font-bold mb-2">소견:</p>
                                                <p className="leading-relaxed">
                                                    상기 환자는 본원에 내원하여 위와 같이 진단받고 치료받았음을 확인합니다.
                                                    <br />
                                                    (검사 및 통원 치료 시행함)
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* 3. DIAGNOSIS (Formal) */}
                                {previewType === 'diagnosis' && (
                                    <>
                                        <div className="space-y-4 px-2">
                                            <div className="flex border-b border-slate-200 py-2">
                                                <span className="font-bold w-32">병록번호</span>
                                                <span>{selectedVisit.patientId}</span>
                                            </div>
                                            <div className="flex border-b border-slate-200 py-2">
                                                <span className="font-bold w-32">임상적 추정<br />병명</span>
                                                <div className="flex-1">
                                                    {selectedVisit.diagnosis || '상세불명'}
                                                </div>
                                            </div>
                                            <div className="flex border-b border-slate-200 py-2">
                                                <span className="font-bold w-32">발병일</span>
                                                <span>{new Date(selectedVisit.date.seconds * 1000).toLocaleDateString()} (추정)</span>
                                            </div>
                                            <div className="flex border-b border-slate-200 py-2">
                                                <span className="font-bold w-32">진단일</span>
                                                <span>{new Date().toLocaleDateString()}</span>
                                            </div>
                                            <div className="mt-8">
                                                <span className="font-bold block mb-2">향후 치료 의견 :</span>
                                                <p className="leading-relaxed p-4 border border-slate-200 rounded min-h-[150px]">
                                                    상기 병명으로 현재 약물 치료 및 물리 치료 중이며, 향후 약 2주간의 안정 및 가료가 필요할 것으로 사료됨.
                                                    <br />(단, 환자의 경과에 따라 기간은 변동될 수 있음)
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* 4. REFERRAL */}
                                {previewType === 'referral' && (
                                    <>
                                        <div className="space-y-4 px-2">
                                            <p className="font-bold mb-4 bg-slate-100 p-2">수신: 귀하 / 귀 병원 진료과장 제위</p>
                                            <div className="flex border-b border-slate-200 py-2">
                                                <span className="font-bold w-32">환자 상태</span>
                                                <span className="flex-1">{selectedVisit.chiefComplaint}</span>
                                            </div>
                                            <div className="flex border-b border-slate-200 py-2">
                                                <span className="font-bold w-32">현재 진단</span>
                                                <span className="flex-1">{selectedVisit.diagnosis || '상세불명'}</span>
                                            </div>
                                            <div className="flex border-b border-slate-200 py-2">
                                                <span className="font-bold w-32">치료 내역</span>
                                                <span className="flex-1">{selectedVisit.treatmentNote || selectedVisit.testOrder || '약물 및 보존적 치료'}</span>
                                            </div>
                                            <div className="mt-8">
                                                <span className="font-bold block mb-2">의뢰 사유 및 소견 :</span>
                                                <p className="leading-relaxed p-4 border border-slate-200 rounded min-h-[150px]">
                                                    상기 환자는 지속적인 보존적 치료에도 불구하고 증상 호전이 미미하여, 귀 병원에서의 정밀 검사(MRI 등) 및 전문적인 소견을 구하고자 의뢰합니다.
                                                    <br />고견 부탁드립니다. 감사합니다.
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* 5. RECEIPT (Existing + Refined) */}
                                {previewType === 'receipt' && (
                                    <table className="w-full text-sm border-collapse border border-black">
                                        <thead>
                                            <tr className="bg-slate-100">
                                                <th className="border border-black p-2">항목</th>
                                                <th className="border border-black p-2 text-right">요양급여</th>
                                                <th className="border border-black p-2 text-right">비급여</th>
                                                <th className="border border-black p-2 text-right">금액</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="border border-black p-2">진찰료</td>
                                                <td className="border border-black p-2 text-right">5,000</td>
                                                <td className="border border-black p-2 text-right">0</td>
                                                <td className="border border-black p-2 text-right">5,000</td>
                                            </tr>
                                            <tr>
                                                <td className="border border-black p-2">검사료</td>
                                                <td className="border border-black p-2 text-right">{selectedVisit.testOrder ? '15,000' : '0'}</td>
                                                <td className="border border-black p-2 text-right">0</td>
                                                <td className="border border-black p-2 text-right">{selectedVisit.testOrder ? '15,000' : '0'}</td>
                                            </tr>
                                            <tr className="font-bold bg-slate-50">
                                                <td className="border border-black p-2">합계</td>
                                                <td className="border border-black p-2 text-right"></td>
                                                <td className="border border-black p-2 text-right"></td>
                                                <td className="border border-black p-2 text-right">{selectedVisit.testOrder ? '20,000' : '5,000'}</td>
                                            </tr>
                                        </tbody>
                                        <tfoot className="text-xs text-slate-500">
                                            <tr><td colSpan={4} className="p-2">* 본 영수증은 소득공제용으로 사용 가능합니다.</td></tr>
                                        </tfoot>
                                    </table>
                                )}

                                {/* 6. DETAILED STATEMENT */}
                                {previewType === 'detailed_receipt' && (
                                    <>
                                        <table className="w-full text-sm border-collapse border border-black mb-4">
                                            <thead>
                                                <tr className="bg-slate-100">
                                                    <th className="border border-black p-1 w-12 text-center">No</th>
                                                    <th className="border border-black p-1">분류</th>
                                                    <th className="border border-black p-1">코드/명칭</th>
                                                    <th className="border border-black p-1 text-right">단가</th>
                                                    <th className="border border-black p-1 text-center w-12">횟수</th>
                                                    <th className="border border-black p-1 text-center w-12">일수</th>
                                                    <th className="border border-black p-1 text-right">금액</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* Mock Data based on Visit Info */}
                                                <tr>
                                                    <td className="border border-black p-1 text-center">1</td>
                                                    <td className="border border-black p-1">기본진료</td>
                                                    <td className="border border-black p-1">AA154000 (초진진찰료)</td>
                                                    <td className="border border-black p-1 text-right">17,450</td>
                                                    <td className="border border-black p-1 text-center">1</td>
                                                    <td className="border border-black p-1 text-center">1</td>
                                                    <td className="border border-black p-1 text-right">17,450</td>
                                                </tr>
                                                {selectedVisit.testOrder && (
                                                    <tr>
                                                        <td className="border border-black p-1 text-center">2</td>
                                                        <td className="border border-black p-1">영상진단</td>
                                                        <td className="border border-black p-1">HA101 (X-ray L-spine AP/Lat)</td>
                                                        <td className="border border-black p-1 text-right">12,500</td>
                                                        <td className="border border-black p-1 text-center">1</td>
                                                        <td className="border border-black p-1 text-center">1</td>
                                                        <td className="border border-black p-1 text-right">12,500</td>
                                                    </tr>
                                                )}
                                                <tr>
                                                    <td className="border border-black p-1 text-center">3</td>
                                                    <td className="border border-black p-1">투약/처방</td>
                                                    <td className="border border-black p-1">원외처방전 발급</td>
                                                    <td className="border border-black p-1 text-right">0</td>
                                                    <td className="border border-black p-1 text-center">1</td>
                                                    <td className="border border-black p-1 text-center">1</td>
                                                    <td className="border border-black p-1 text-right">0</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <div className="flex justify-between items-center bg-slate-100 p-2 border-t-2 border-slate-800">
                                            <span className="font-bold">총 요양급여비용 합계</span>
                                            <span className="font-bold text-lg">{selectedVisit.testOrder ? '29,950' : '17,450'} 원</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="text-center mt-20">
                                <p className="text-lg mb-8">{new Date().toLocaleDateString()}</p>
                                <p className="text-2xl font-bold">밀 양 정 형 외 과 원 장 (인)</p>
                            </div>
                        </div>
                    </div>

                    {/* Print Controls */}
                    <div className="fixed bottom-8 flex gap-4">
                        <button onClick={() => setModalMode('documents')} className="px-6 py-3 bg-slate-700 text-white rounded-full font-bold shadow-lg hover:bg-slate-800">닫기</button>
                        <button onClick={handlePrint} className="px-8 py-3 bg-emerald-600 text-white rounded-full font-bold shadow-lg hover:bg-emerald-700 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" /> 인쇄하기
                        </button>
                    </div>

                    <style jsx global>{`
                        @media print {
                            body * { visibility: hidden; }
                            .printable-area, .printable-area * { visibility: visible; }
                            .printable-area { position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 20px; box-shadow: none; overflow: visible; }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
