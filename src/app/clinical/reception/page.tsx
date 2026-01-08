'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, limit, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-clinical';
import { Search, UserPlus, Clock, Calendar, User, ChevronRight, Stethoscope, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Patient, Visit } from '@/types/clinical';
import { startOfDay } from 'date-fns';

export default function ReceptionPage() {
    // Left Panel: Search
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Right Panel: Waiting List
    const [waitingList, setWaitingList] = useState<Visit[]>([]);
    const [loadingWaiting, setLoadingWaiting] = useState(true);

    // Initial Load & Real-time Subscription
    useEffect(() => {
        // Subscribe to today's visits
        const today = startOfDay(new Date());

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

            // Filter locally for active reception items if needed, or just show all for today
            setWaitingList(visits);
            setLoadingWaiting(false);
        });

        return () => unsubscribe();
    }, []);

    // Search Logic
    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            // MVP Simple Search (Name-based)
            // Ideally use Algolia or a specific 'keywords' array in Firestore
            const q = query(
                collection(db, 'patients'),
                where('name', '>=', term),
                where('name', '<=', term + '\uf8ff'),
                limit(5)
            );

            const snapshot = await getDocs(q);
            const results = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Patient[];

            setSearchResults(results);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsSearching(false);
        }
    };

    // Registration Logic
    const handleRegister = async (patient: Patient) => {
        const isConfirmed = window.confirm(`${patient.name}님을 대기목록에 등록하시겠습니까?`);
        if (!isConfirmed) return;

        try {
            // Check if already waiting? (Optional validation)

            await addDoc(collection(db, 'visits'), {
                patientId: patient.id,
                patientName: patient.name,
                status: 'reception',
                type: 'return', // Logic to determine new/return could be added here
                date: serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Clear search after registration
            setSearchTerm('');
            setSearchResults([]);

        } catch (error) {
            console.error("Registration failed:", error);
            alert("접수 중 오류가 발생했습니다.");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'reception': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'consulting': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'completed': return 'bg-slate-100 text-slate-600 border-slate-200';
            default: return 'bg-slate-50 text-slate-500 border-slate-200';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'reception': return '대기중';
            case 'consulting': return '진료중';
            case 'completed': return '진료완료';
            default: return status;
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] gap-6">

            {/* Left Panel: Reception Desk */}
            <div className="flex-1 flex flex-col gap-6 min-w-0">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-2">
                            <UserPlus className="w-6 h-6 text-emerald-600" />
                            접수 등록
                        </h2>
                        <p className="text-slate-500 text-sm">환자 이름을 검색하여 접수하거나 신규 등록하세요.</p>
                    </div>

                    <div className="relative mb-6">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-4 border border-slate-300 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-lg transition-all"
                            placeholder="환자 이름 검색 (2글자 이상)"
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {searchTerm.length > 0 && searchResults.length === 0 && !isSearching && (
                            <div className="text-center py-10 text-slate-400">
                                <p>검색 결과가 없습니다.</p>
                                <Link href="/clinical/patients/new" className="inline-block mt-4 text-emerald-600 font-medium hover:underline">
                                    + 신규 환자 등록하기
                                </Link>
                            </div>
                        )}

                        <div className="space-y-3">
                            {searchResults.map((patient) => (
                                <div key={patient.id}
                                    className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-emerald-200 hover:bg-emerald-50 transition-all cursor-pointer group"
                                    onClick={() => handleRegister(patient)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${patient.gender === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                                            {patient.name[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">{patient.name}</h3>
                                            <p className="text-xs text-slate-500">{patient.birthDate} ({patient.gender === 'male' ? '남' : '여'})</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-emerald-600 font-bold text-sm">접수하기</span>
                                        <ChevronRight className="w-4 h-4 text-emerald-600" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel: Waiting Status */}
            <div className="w-full lg:w-[480px] flex flex-col min-w-0">
                <div className="bg-slate-800 text-white p-6 rounded-t-2xl flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Clock className="w-6 h-6 text-emerald-400" />
                            실시간 대기 현황
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">오늘의 진료 대기열입니다.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold">{waitingList.filter(v => v.status === 'reception').length}</div>
                        <div className="text-xs text-slate-400">대기 중</div>
                    </div>
                </div>

                <div className="bg-white border-x border-b border-slate-200 rounded-b-2xl flex-1 overflow-y-auto p-4 shadow-sm">
                    {loadingWaiting ? (
                        <div className="py-10 text-center text-slate-400">Loading...</div>
                    ) : waitingList.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                            <Calendar className="w-12 h-12 mb-4" />
                            <p>오늘 접수된 내역이 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {waitingList.map((visit) => (
                                <div key={visit.id} className="relative bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
                                    {/* Status Indicator Bar */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${visit.status === 'reception' ? 'bg-yellow-400' :
                                            visit.status === 'consulting' ? 'bg-blue-500' : 'bg-slate-300'
                                        }`} />

                                    <div className="pl-2 flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-bold text-lg text-slate-800">{visit.patientName}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(visit.status)}`}>
                                                {getStatusLabel(visit.status)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            {visit.date?.seconds && (
                                                <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(visit.date.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                            {visit.type === 'new' && <span className="text-emerald-600 font-medium">신환</span>}
                                        </div>
                                    </div>

                                    {visit.status === 'consulting' && (
                                        <div className="text-blue-600 animate-pulse">
                                            <Stethoscope className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
