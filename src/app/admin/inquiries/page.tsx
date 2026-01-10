
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { Loader2, Calendar, MessageSquare, CheckCircle, Circle, Clock, Trash2 } from 'lucide-react';

interface Inquiry {
    id: string;
    type: 'reservation' | 'general';
    name: string;
    contact: string;
    message: string;
    status: 'new' | 'confirmed' | 'completed';
    createdAt: any;
    reservationDate?: string;
    reservationTime?: string;
}

export default function InquiriesPage() {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInquiries();
    }, []);

    const fetchInquiries = async () => {
        try {
            const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Inquiry[];
            setInquiries(data);
        } catch (error) {
            console.error('Error fetching inquiries:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'new': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">신규</span>;
            case 'confirmed': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">확인됨</span>;
            case 'completed': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">완료</span>;
            default: return null;
        }
    };

    const getTypeIcon = (type: string) => {
        return type === 'reservation'
            ? <Calendar className="h-4 w-4 text-orange-500" />
            : <MessageSquare className="h-4 w-4 text-purple-500" />;
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">문의 및 예약 관리</h1>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">상태</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">구분</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">이름/연락처</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">예약 일시 / 내용</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">접수일</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">상세보기</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {inquiries.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    접수된 문의 내역이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            inquiries.map((inquiry) => (
                                <tr key={inquiry.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(inquiry.status)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center space-x-2">
                                            {getTypeIcon(inquiry.type)}
                                            <span className="text-sm text-slate-900 dark:text-white capitalize">
                                                {inquiry.type === 'reservation' ? '진료 예약' : '일반 문의'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900 dark:text-white">{inquiry.name}</div>
                                        <div className="text-sm text-slate-500">{inquiry.contact}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {inquiry.type === 'reservation' && inquiry.reservationDate ? (
                                            <div className="flex flex-col">
                                                <div className="flex items-center text-sm font-medium text-blue-600 gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {inquiry.reservationDate} {inquiry.reservationTime}
                                                </div>
                                                <div className="text-xs text-slate-400 truncate max-w-xs">{inquiry.message}</div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-slate-500 truncate max-w-xs">{inquiry.message}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {inquiry.createdAt?.toDate ? inquiry.createdAt.toDate().toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-3">
                                            <Link href={`/admin/inquiries/${inquiry.id}`} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                                                상세보기
                                            </Link>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation(); // Prevent row click
                                                    if (!confirm('정말 삭제하시겠습니까?')) return;
                                                    try {
                                                        await deleteDoc(doc(db, 'inquiries', inquiry.id));
                                                        setInquiries(prev => prev.filter(i => i.id !== inquiry.id));
                                                    } catch (error) {
                                                        console.error('Error deleting:', error);
                                                        alert('삭제 실패');
                                                    }
                                                }}
                                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
