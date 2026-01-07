
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { Plus, Edit, Trash2, Pin, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Notice {
    id: string;
    title: string;
    createdAt: any;
    isPinned: boolean;
    isVisible: boolean;
}

export default function NoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        try {
            const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const noticesData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Notice[];
            setNotices(noticesData);
        } catch (error) {
            console.error('Error fetching notices:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 이 공지사항을 삭제하시겠습니까?')) return;
        try {
            await deleteDoc(doc(db, 'notices', id));
            setNotices(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Error deleting notice:', error);
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
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">공지사항 관리</h1>
                    <p className="text-sm text-slate-500 mt-2">병원 홈페이지에 노출될 공지사항을 관리합니다.</p>
                </div>
                <Link
                    href="/admin/notices/new"
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    새 공지사항
                </Link>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">제목</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">상태</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">등록일</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">관리</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {notices.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                    등록된 공지사항이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            notices.map((notice) => (
                                <tr key={notice.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {notice.isPinned && <Pin className="h-4 w-4 text-orange-500 mr-2" />}
                                            <span className="font-medium text-slate-900 dark:text-white">{notice.title}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {notice.isVisible ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                공개
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400">
                                                비공개
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {notice.createdAt?.toDate ? notice.createdAt.toDate().toLocaleDateString() : '날짜 없음'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2">
                                            <Link href={`/admin/notices/${notice.id}`} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                                                <Edit className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(notice.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
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
