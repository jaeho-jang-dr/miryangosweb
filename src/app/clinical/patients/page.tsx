
'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase-clinical';
import Link from 'next/link';
import { Plus, Search, User, Phone, MapPin, Calendar, MoreHorizontal, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Patient {
    id: string; // Document ID (Chart Number usually)
    name: string;
    birthDate: string;
    gender: 'male' | 'female';
    phone: string;
    lastVisit?: any;
}

export default function PatientsPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            // For MVP, limit to recent 50. Real app needs pagination/algolia.
            const q = query(collection(db, 'patients'), orderBy('lastVisit', 'desc'), limit(50));

            // Fallback if lastVisit doesn't exist on all docs yet
            // const q = query(collection(db, 'patients'), limit(50));

            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Patient[];
            setPatients(data);
        } catch (error) {
            console.error("Error fetching patients:", error);
            // Fallback for initial empty state or index issues
            try {
                const q = query(collection(db, 'patients'), limit(20));
                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Patient[];
                setPatients(data);
            } catch (e) {
                console.error("Retry failed", e);
            }
        } finally {
            setLoading(false);
        }
    };

    // Client-side filtering for MVP
    const filteredPatients = patients.filter(p =>
        p.name.includes(searchTerm) ||
        p.phone.includes(searchTerm) ||
        p.id.includes(searchTerm)
    );

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900">환자 관리</h1>
                <Link
                    href="/clinical/patients/new"
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    신규 환자 등록
                </Link>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex items-center gap-2">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="이름, 연락처, 차트번호 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 outline-none text-sm p-1"
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
                        <p className="text-slate-500">환자 목록을 불러오는 중...</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700">차트번호</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">이름/성별/나이</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">생년월일</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">연락처</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">최근 내원</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredPatients.length > 0 ? filteredPatients.map((patient) => (
                                <tr key={patient.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => router.push(`/clinical/patients/${patient.id}`)}>
                                    <td className="px-6 py-4 font-mono text-slate-500">
                                        {patient.id.substring(0, 8)}...
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${patient.gender === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                                                {patient.name[0]}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{patient.name}</p>
                                                <p className="text-xs text-slate-500">{patient.gender === 'male' ? '남성' : '여성'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {patient.birthDate}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {patient.phone}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {patient.lastVisit ? new Date(patient.lastVisit.seconds * 1000).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <button className="p-2 text-slate-400 hover:text-emerald-600 rounded-full hover:bg-slate-100">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        등록된 환자가 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
