
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase-clinical';
import Link from 'next/link';
import { ArrowLeft, User, Phone, MapPin, Calendar, FileText, Plus, Clock, Stethoscope, Loader2 } from 'lucide-react';

interface Patient {
    id: string;
    name: string;
    birthDate: string;
    gender: 'male' | 'female';
    phone: string;
    address: string;
    notes?: string;
    lastVisit?: any;
}

interface Visit {
    id: string;
    date: any;
    cc: string;      // Chief Complaint
    diagnosis: string;
    plan: string;
}

export default function PatientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [patient, setPatient] = useState<Patient | null>(null);
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchPatientData();
        }
    }, [id]);

    const fetchPatientData = async () => {
        try {
            // 1. Fetch Patient Info
            const docRef = doc(db, 'patients', id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setPatient({ id: docSnap.id, ...docSnap.data() } as Patient);

                // 2. Fetch Visit History
                // Note: Need composite index for query(where, orderBy) usually.
                // If it fails, we might need to fetch all and sort client-side for MVP if index not ready.
                // Try simple query first.
                try {
                    const q = query(
                        collection(db, 'visits'),
                        where('patientId', '==', id),
                        orderBy('date', 'desc')
                    );
                    const querySnapshot = await getDocs(q);
                    const visitsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Visit));
                    setVisits(visitsData);
                } catch (idxError) {
                    console.warn("Index ensuring error likely, falling back to client sort", idxError);
                    const q = query(
                        collection(db, 'visits'),
                        where('patientId', '==', id)
                    );
                    const querySnapshot = await getDocs(q);
                    const visitsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Visit));
                    // Client side sort
                    visitsData.sort((a, b) => b.date.seconds - a.date.seconds);
                    setVisits(visitsData);
                }

            } else {
                console.error("No such patient!");
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-slate-800">환자 정보를 찾을 수 없습니다.</h2>
                <Link href="/clinical/patients" className="text-emerald-600 hover:underline mt-2 inline-block">
                    목록으로 돌아가기
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/clinical/patients" className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            {patient.name}
                            <span className="text-base font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                                #{patient.id}
                            </span>
                        </h1>
                        <p className="text-sm text-slate-500">
                            {patient.gender === 'male' ? '남성' : '여성'} / {patient.birthDate} ({calculateAge(patient.birthDate)}세)
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => router.push(`/clinical/records/new?patientId=${patient.id}`)}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 shadow-sm transition-all"
                    >
                        <Stethoscope className="w-4 h-4" />
                        진료 시작
                    </button>
                    <button className="flex items-center gap-2 bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 shadow-sm transition-all">
                        <FileText className="w-4 h-4" />
                        증명서 발급
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Patient Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-semibold text-slate-700">인적 사항</h3>
                            <button className="text-xs text-blue-600 hover:underline">수정</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <InfoItem icon={<Phone className="w-4 h-4" />} label="연락처" value={patient.phone} />
                            <InfoItem icon={<MapPin className="w-4 h-4" />} label="주소" value={patient.address || '-'} />
                            <InfoItem icon={<Calendar className="w-4 h-4" />} label="최근 내원" value={patient.lastVisit ? new Date(patient.lastVisit.seconds * 1000).toLocaleDateString() : '없음'} />

                            {patient.notes && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <p className="text-xs font-semibold text-slate-500 mb-1">메모/특이사항</p>
                                    <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm">
                                        {patient.notes}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Visit History */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px]">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-semibold text-slate-700">진료 기록 ({visits.length})</h3>
                            <div className="flex gap-2">
                                {/* Filter placeholders could go here */}
                            </div>
                        </div>

                        <div className="p-6">
                            {visits.length > 0 ? (
                                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                    {visits.map((visit) => (
                                        <div key={visit.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            {/* Icon */}
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 group-[.is-active]:bg-emerald-500 text-slate-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                                <FileText className="w-5 h-5" />
                                            </div>

                                            {/* Date/Time (opposite side) */}
                                            {/* Mobile: Hidden or inline. Desktop: Opposite side. */}
                                            {/* Since implementing intricate timeline CSS is verbose, let's stick to a simpler vertical list for stability. */}
                                        </div>
                                    ))}
                                    {/* Reverting to standard vertical list for cleaner implementation */}
                                    <div className="space-y-4">
                                        {visits.map((visit) => (
                                            <div key={visit.id} className="border border-slate-200 rounded-xl p-4 hover:border-emerald-300 transition-colors bg-slate-50/50">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded">진료</span>
                                                        <span className="text-slate-900 font-medium">
                                                            {new Date(visit.date.seconds * 1000).toLocaleDateString()}
                                                        </span>
                                                        <span className="text-slate-400 text-xs flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(visit.date.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <button className="text-xs text-slate-400 hover:text-slate-600">상세보기</button>
                                                </div>
                                                <div className="space-y-2">
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-400 uppercase mr-2">C.C</span>
                                                        <span className="text-slate-800 font-medium">{visit.cc}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-400 uppercase mr-2">Diag</span>
                                                        <span className="text-slate-700">{visit.diagnosis}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 bg-white p-2 rounded border border-slate-100 mt-2">
                                                        <span className="font-bold text-slate-400 mr-2">Plan:</span>
                                                        {visit.plan}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-500">
                                    <Stethoscope className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                                    <p>아직 진료 기록이 없습니다.</p>
                                    <button
                                        onClick={() => router.push(`/clinical/records/new?patientId=${patient.id}`)}
                                        className="text-emerald-600 hover:underline font-medium mt-2"
                                    >
                                        첫 진료 시작하기
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="text-slate-400 mt-0.5">{icon}</div>
            <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">{label}</p>
                <p className="text-slate-700 font-medium">{value}</p>
            </div>
        </div>
    );
}

function calculateAge(birthDateStr: string) {
    if (!birthDateStr || birthDateStr.length !== 8) return '-';
    const year = parseInt(birthDateStr.substring(0, 4));
    const month = parseInt(birthDateStr.substring(4, 6)) - 1;
    const day = parseInt(birthDateStr.substring(6, 8));
    const today = new Date();
    let age = today.getFullYear() - year;
    const m = today.getMonth() - month;
    if (m < 0 || (m === 0 && today.getDate() < day)) {
        age--;
    }
    return age;
}
