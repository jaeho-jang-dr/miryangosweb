
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { Plus, Edit, Trash2, GripVertical, Loader2 } from 'lucide-react';

interface Staff {
    id: string;
    name: string;
    role: string; // e.g., 'Doctor', 'Nurse'
    specialties?: string[];
    imageUrl?: string;
    photoUrl?: string; // Legacy support
    order?: number;
}

export default function StaffPage() {
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            // Assume we add 'order' field for sorting
            const q = query(collection(db, 'staff'), orderBy('order', 'asc'));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Staff[];
            setStaffList(data);
        } catch (error) {
            console.error('Error fetching staff:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await deleteDoc(doc(db, 'staff', id));
            setStaffList(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting staff:', error);
            alert('삭제에 실패했습니다.');
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">의료진 관리</h1>
                    <p className="text-sm text-slate-500 mt-2">홈페이지에 소개될 의료진 정보를 관리합니다.</p>
                </div>
                <Link
                    href="/admin/staff/new"
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    새 의료진 등록
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staffList.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <p className="text-slate-500">등록된 의료진이 없습니다.</p>
                    </div>
                ) : (
                    staffList.map((staff) => (
                        <div key={staff.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                            <div className="aspect-w-16 aspect-h-9 bg-slate-100 dark:bg-slate-700 flex items-center justify-center relative group">
                                {staff.imageUrl || staff.photoUrl ? (
                                    <img
                                        src={staff.imageUrl || staff.photoUrl}
                                        alt={staff.name}
                                        className="object-cover w-full h-48 block"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            // Find the fallback div which is next sibling
                                            const fallback = e.currentTarget.parentElement?.querySelector('.fallback-text') as HTMLElement;
                                            if (fallback) fallback.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <div
                                    className={`fallback-text flex items-center justify-center h-48 w-full text-slate-400 text-sm ${staff.imageUrl || staff.photoUrl ? 'hidden' : ''}`}
                                >
                                    {staff.imageUrl || staff.photoUrl ? '이미지 로드 실패 (재업로드)' : '사진 없음'}
                                </div>
                            </div>
                            <div className="p-4 flex-1">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{staff.name}</h3>
                                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                            {staff.role === '원장' ? (
                                                <Link href="/" className="hover:underline cursor-pointer">
                                                    {staff.role}
                                                </Link>
                                            ) : (
                                                staff.role
                                            )}
                                        </p>
                                    </div>
                                    <div className="p-1 bg-slate-100 dark:bg-slate-700 rounded cursor-grab active:cursor-grabbing">
                                        <GripVertical className="h-4 w-4 text-slate-400" />
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {staff.specialties?.map((spec, idx) => (
                                        <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                            {spec}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end space-x-2">
                                <Link
                                    href={`/admin/staff/${staff.id}`}
                                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                >
                                    <Edit className="h-4 w-4" />
                                </Link>
                                <button
                                    onClick={() => handleDelete(staff.id)}
                                    className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
