'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-clinical';
import { Search, FileText, User, Calendar, Clock, ChevronRight, Activity, AlertCircle } from 'lucide-react';
import { Patient, Visit } from '@/types/clinical';
import { format } from 'date-fns';

export default function RecordsPage() {
    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Selection State
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [patientHistory, setPatientHistory] = useState<Visit[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Search Patients
    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            // Simple prefix search (this might need improvement based on Firestore capabilities)
            const q = query(
                collection(db, 'patients'),
                where('name', '>=', term),
                where('name', '<=', term + '\uf8ff'),
                limit(10)
            );

            const snapshot = await getDocs(q);
            const results = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Patient[];

            setSearchResults(results);
        } catch (error) {
            console.error("Error searching patients:", error);
        } finally {
            setIsSearching(false);
        }
    };

    // Load Patient History
    const selectPatient = async (patient: Patient) => {
        setSelectedPatient(patient);
        setLoadingHistory(true);
        setPatientHistory([]);

        try {
            // In a real app, you might query by patientId directly in 'visits' collection
            // Assuming 'visits' has a 'patientId' field based on reception page code
            // Firestore query modified to avoid "Missing Index" error.
            // We verify patientId equality solely, then sort by date in memory.
            const q = query(
                collection(db, 'visits'),
                where('patientId', '==', patient.id),
                limit(50)
            );

            const snapshot = await getDocs(q);
            const history = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Visit[];

            // Client-side sorting (descending date)
            history.sort((a, b) => {
                const dateA = a.date?.seconds || 0;
                const dateB = b.date?.seconds || 0;
                return dateB - dateA;
            });

            setPatientHistory(history);
        } catch (error) {
            console.error("Error loading patient history:", error);
            // Fallback for demo if index is missing or query fails: show empty or mock
        } finally {
            setLoadingHistory(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">

            {/* LEFT PANEL: Patient Search */}
            <div className="w-full lg:w-1/3 flex flex-col gap-4 min-w-[320px]">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-2">
                            <Search className="w-6 h-6 text-emerald-600" /> 기록 조회
                        </h2>
                        <p className="text-slate-500 text-sm">환자 이름 또는 차트 번호를 검색하여 과거 진료 기록을 조회합니다.</p>
                    </div>

                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-4 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-4 border border-slate-300 rounded-xl leading-5 bg-slate-50 text-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                            placeholder="환자 검색..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {searchResults.map((patient) => (
                            <button
                                key={patient.id}
                                onClick={() => selectPatient(patient)}
                                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-4 group ${selectedPatient?.id === patient.id
                                    ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-500'
                                    : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-300'
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${patient.gender === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'
                                    }`}>
                                    {patient.name[0]}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{patient.name}</h3>
                                    <div className="text-xs text-slate-500 flex gap-2 mt-1">
                                        <span>{patient.birthDate}</span>
                                        <span className="text-slate-300">|</span>
                                        <span>{patient.gender === 'male' ? '남' : '여'}</span>
                                    </div>
                                </div>
                                <ChevronRight className={`w-5 h-5 transition-colors ${selectedPatient?.id === patient.id ? 'text-emerald-600' : 'text-slate-300 group-hover:text-slate-400'}`} />
                            </button>
                        ))}
                        {searchTerm.length > 0 && searchResults.length === 0 && !isSearching && (
                            <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                검색 결과가 없습니다.
                            </div>
                        )}
                        {searchTerm.length === 0 && (
                            <div className="text-center py-20 text-slate-400 flex flex-col items-center">
                                <User className="w-12 h-12 mb-3 opacity-20" />
                                <p>환자를 검색해주세요</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: Medical History */}
            <div className="flex-1 bg-slate-50/50 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 flex flex-col overflow-hidden relative">
                {!selectedPatient ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                            <FileText className="w-10 h-10 opacity-30" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-600 mb-2">선택된 환자가 없습니다</h3>
                        <p>좌측 목록에서 환자를 선택하여 진료 기록을 확인하세요.</p>
                    </div>
                ) : (
                    <>
                        {/* Patient Header */}
                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
                            <div className="flex items-center gap-4">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-sm ${selectedPatient.gender === 'male' ? 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600' : 'bg-gradient-to-br from-pink-50 to-pink-100 text-pink-600'
                                    }`}>
                                    {selectedPatient.name[0]}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                        {selectedPatient.name}
                                        <span className="text-sm font-normal text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                                            {selectedPatient.birthDate} ({selectedPatient.gender === 'male' ? '남' : '여'})
                                        </span>
                                    </h2>
                                    <p className="text-slate-500 mt-1 flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-emerald-500" />
                                        최근 내원일: {patientHistory.length > 0 ? format(patientHistory[0].date.toDate(), 'yyyy-MM-dd') : '-'}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm text-center min-w-[120px]">
                                <span className="block text-xs text-slate-400 font-bold uppercase tracking-wider">총 내원 수</span>
                                <span className="block text-2xl font-bold text-emerald-600">{patientHistory.length}</span>
                            </div>
                        </div>

                        {/* Timeline / History List */}
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                            {loadingHistory ? (
                                <div className="text-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div></div>
                            ) : patientHistory.length > 0 ? (
                                patientHistory.map((visit, index) => (
                                    <div key={visit.id} className="relative pl-8 pb-8 last:pb-0 group">
                                        {/* Timeline Line */}
                                        {index !== patientHistory.length - 1 && (
                                            <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-slate-200 group-hover:bg-slate-300 transition-colors" />
                                        )}
                                        {/* Timeline Dot */}
                                        <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border-4 border-emerald-100 group-hover:border-emerald-200 ring-2 ring-emerald-500/20 shadow-sm z-10 transition-all">
                                            <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-emerald-500" />
                                        </div>

                                        {/* Content Card */}
                                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all group-hover:border-emerald-200">
                                            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="font-bold text-lg text-slate-800">
                                                            {format(visit.date.toDate(), 'yyyy년 MM월 dd일')}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                                            {format(visit.date.toDate(), 'HH:mm')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-500">담당의: {visit.doctorName || 'Dr. Jang'}</p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold self-start ${visit.status === 'paid' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                    {visit.status === 'paid' ? '진료완료' : '진행중'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                <div className="bg-slate-50 p-3 rounded-lg">
                                                    <span className="block text-xs font-bold text-slate-400 mb-1 uppercase">CC (주호소) & Diagnosis</span>
                                                    <p className="font-medium text-slate-700 mb-2">{visit.chiefComplaint || '-'}</p>
                                                    {visit.diagnosis && (
                                                        <div className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded text-xs font-bold inline-block">
                                                            {visit.diagnosis}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded-lg">
                                                    <span className="block text-xs font-bold text-slate-400 mb-1 uppercase">Treatment (처방/치료)</span>
                                                    <p className="text-slate-600 whitespace-pre-wrap">
                                                        {visit.treatmentNote || visit.physicalTherapy || visit.testOrder || <span className="text-slate-400 italic">기록 없음</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
                                    <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500">진료 기록이 없습니다.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
