// Updated imports
import { Section3DBackground } from '@/components/Section3DBackground';

'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import Link from 'next/link';
import { ChevronRight, Megaphone, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface Notice {
    id: string;
    title: string;
    body: string;
    createdAt: any;
    isPinned: boolean;
    isVisible: boolean;
}

export default function NoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotices = async () => {
            try {
                const q = query(collection(db, 'notices'), where('isVisible', '==', true));
                const querySnapshot = await getDocs(q);
                const noticeData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notice[];
                noticeData.sort((a, b) => {
                    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                    const dateA = a.createdAt?.seconds || 0;
                    const dateB = b.createdAt?.seconds || 0;
                    return dateB - dateA;
                });
                setNotices(noticeData);
            } catch (error) {
                console.error('Error loading notices:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchNotices();
    }, []);

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <section className="section-3d relative bg-slate-50 dark:bg-slate-900 py-20 min-h-screen">
            <Section3DBackground variant="dots" />
            <div className="absolute inset-0 bg-white/30 dark:bg-black/30 backdrop-blur-sm" />
            <div className="max-w-4xl mx-auto px-4 relative z-10">
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">병원 소식</h1>
                    <p className="text-slate-600 dark:text-slate-400">밀양정형외과의 새로운 소식과 공지사항을 확인하세요.</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {notices.length > 0 ? (
                            notices.map(notice => (
                                <Link
                                    key={notice.id}
                                    href={`/notices/${notice.id}`}
                                    className={clsx(
                                        "block p-6 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50",
                                        notice.isPinned && "bg-blue-50/50 dark:bg-blue-900/10"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                {notice.isPinned && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                                        <Megaphone className="w-3 h-3 mr-1" />
                                                        공지
                                                    </span>
                                                )}
                                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                                    {notice.createdAt?.toDate ? notice.createdAt.toDate().toLocaleDateString() : '날짜 없음'}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600">
                                                {notice.title}
                                            </h3>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                                                {notice.body}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-400 mt-2" />
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="p-12 text-center text-slate-500">등록된 공지사항이 없습니다.</div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
