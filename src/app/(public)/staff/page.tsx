
'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import Image from 'next/image';
import { Loader2, User } from 'lucide-react';

interface Staff {
    id: string;
    name: string;
    role: string;
    specialties: string[];
    imageUrl?: string;
    order?: number;
}

export default function StaffPage() {
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const q = query(collection(db, 'staff'), orderBy('order', 'asc'));
                const querySnapshot = await getDocs(q);
                const staffData = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    // Handle both 'specialties' (array) and legacy 'specialty' (string)
                    let specialties: string[] = [];
                    if (Array.isArray(data.specialties)) {
                        specialties = data.specialties;
                    } else if (typeof data.specialty === 'string') {
                        specialties = [data.specialty];
                    }

                    return {
                        id: doc.id,
                        ...data,
                        specialties
                    };
                }) as Staff[];
                setStaffList(staffData);
            } catch (error) {
                console.error("Error loading staff:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStaff();
    }, []);

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="flex flex-col py-20 bg-slate-50 dark:bg-slate-900/20">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">의료진 소개</h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        밀양OS병원의 전문 의료진을 소개합니다.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {staffList.map((staff) => (
                        <div key={staff.id} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-700 transition-transform hover:-translate-y-1">
                            <div className="aspect-[3/4] relative bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden group">
                                {staff.imageUrl ? (
                                    <img
                                        src={staff.imageUrl}
                                        alt={staff.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <User className="h-24 w-24 text-slate-400" />
                                )}
                            </div>
                            <div className="p-6">
                                <div className="mb-4">
                                    <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-xs font-bold rounded-full mb-2">
                                        {staff.role}
                                    </span>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{staff.name}</h3>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">진료 분야</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {staff.specialties.map((specialty, index) => (
                                            <span
                                                key={index}
                                                className="text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded"
                                            >
                                                {specialty}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {staffList.length === 0 && (
                    <div className="text-center py-20 text-slate-500">
                        등록된 의료진 정보가 없습니다.
                    </div>
                )}
            </div>
        </div>
    );
}
