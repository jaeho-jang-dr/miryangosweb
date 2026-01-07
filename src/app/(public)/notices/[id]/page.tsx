
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

interface Notice {
    id: string;
    title: string;
    body: string;
    createdAt: any;
    isPinned: boolean;
    isVisible: boolean;
}

export default function NoticeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [notice, setNotice] = useState<Notice | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotice = async () => {
            if (!params.id) return;
            try {
                const docRef = doc(db, 'notices', params.id as string);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setNotice({ id: docSnap.id, ...docSnap.data() } as Notice);
                } else {
                    console.log("No such document!");
                    router.push('/notices');
                }
            } catch (error) {
                console.error("Error getting document:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotice();
    }, [params.id, router]);

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!notice) return null;

    return (
        <div className="max-w-3xl mx-auto px-4 py-20">
            <div className="mb-8">
                <Link
                    href="/notices"
                    className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    목록으로 돌아가기
                </Link>

                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                    {notice.title}
                </h1>

                <div className="flex items-center gap-4 text-sm text-slate-500 border-b border-slate-200 dark:border-slate-700 pb-6">
                    <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {notice.createdAt?.toDate ? notice.createdAt.toDate().toLocaleDateString() : '날짜 없음'}
                    </span>
                    {notice.isPinned && (
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-bold">
                            공지
                        </span>
                    )}
                </div>
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown>
                    {notice.body}
                </ReactMarkdown>
            </div>

            <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
                <Link
                    href="/notices"
                    className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    다른 소식 보기
                </Link>
            </div>
        </div>
    );
}
