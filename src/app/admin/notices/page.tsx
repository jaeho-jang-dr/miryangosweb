'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    collection,
    getDocs,
    query,
    orderBy,
    deleteDoc,
    doc,
    limit,
    startAfter,
    where,
    QueryDocumentSnapshot,
    DocumentData
} from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { Plus, Edit, Trash2, Pin, Loader2, Search, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

interface Notice {
    id: string;
    title: string;
    createdAt: any;
    isPinned: boolean;
    isVisible: boolean;
}

const ITEMS_PER_PAGE = 5;

export default function NoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination State
    const [lastDocs, setLastDocs] = useState<QueryDocumentSnapshot<DocumentData>[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        loadPage(1);
    }, []);

    const loadPage = async (page: number) => {
        setLoading(true);
        try {
            // Determine the anchor document
            let constraint = [];

            // Search Mode
            if (searchTerm) {
                // Client-side search optimization for MVP
                // Fetch a reasonable batch (latest 50) and filter
                const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(50));
                const snap = await getDocs(q);
                const results = snap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as Notice))
                    .filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()));

                setNotices(results);
                setHasMore(false); // Disable pagination in search mode
                setLoading(false);
                return;
            }

            // Normal Pagination
            if (page > 1) {
                const anchor = lastDocs[page - 2];
                if (anchor) constraint.push(startAfter(anchor));
            }

            const q = query(
                collection(db, 'notices'),
                orderBy('createdAt', 'desc'),
                ...constraint,
                limit(ITEMS_PER_PAGE)
            );

            const snap = await getDocs(q);
            setNotices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice)));

            // Determine if more pages available
            // Note: simple check is if we got full page, there MIGHT be more. 
            // Better check involves fetching +1, but this is acceptable for admin UI.
            setHasMore(snap.docs.length === ITEMS_PER_PAGE);

            // Manage Stack
            if (snap.docs.length > 0) {
                const last = snap.docs[snap.docs.length - 1];
                setLastDocs(prev => {
                    const newDocs = [...prev];
                    // Ensure we don't hold future pages if we jumped back (though unlikely in this flow)
                    // Just set the current page end doc.
                    newDocs[page - 1] = last;
                    return newDocs;
                });
            }
        } catch (error) {
            console.error('Error loading notices:', error);
        } finally {
            setLoading(false);
        }
        setCurrentPage(page);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        setLastDocs([]);
        loadPage(1);
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

            {/* Search and Filter Bar */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="제목으로 검색..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white"
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-medium text-sm transition-colors"
                    >
                        검색
                    </button>
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => { setSearchTerm(''); setTimeout(() => loadPage(1), 0); }}
                            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-medium text-sm transition-colors"
                        >
                            초기화
                        </button>
                    )}
                </form>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
                <div className="overflow-x-auto flex-1">
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
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-24 text-center">
                                        <div className="flex justify-center flex-col items-center gap-2">
                                            <Loader2 className="animate-spin text-blue-500 h-8 w-8" />
                                            <span className="text-slate-400 text-sm">로딩 중...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : notices.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-24 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText className="h-10 w-10 text-slate-200" />
                                            <p>등록된 공지사항이 없습니다.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                notices.map((notice) => (
                                    <tr key={notice.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                {notice.isPinned && <Pin className="h-4 w-4 text-orange-500 mr-2 flex-shrink-0" />}
                                                <div>
                                                    <span className="font-medium text-slate-900 dark:text-white block">{notice.title}</span>
                                                </div>
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
                                                <Link href={`/admin/notices/${notice.id}`} className="p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-full hover:bg-slate-100">
                                                    <Edit className="h-4 w-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(notice.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-full hover:bg-red-50"
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

                {/* Pagination Controls */}
                {!searchTerm && notices.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                            페이지 <span className="font-medium text-slate-900 dark:text-white">{currentPage}</span>
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => loadPage(currentPage - 1)}
                                disabled={currentPage === 1 || loading}
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => loadPage(currentPage + 1)}
                                disabled={!hasMore || loading}
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
