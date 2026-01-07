
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { ChevronLeft, Save, Loader2 } from 'lucide-react';

export default function NewNoticePage() {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [isPinned, setIsPinned] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await addDoc(collection(db, 'notices'), {
                title,
                body,
                isPinned,
                isVisible,
                createdAt: serverTimestamp(),
            });
            router.push('/admin/notices');
        } catch (error) {
            console.error('Error creating notice:', error);
            alert('저장에 실패했습니다.');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link href="/admin/notices" className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <ChevronLeft className="h-5 w-5 text-slate-500" />
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">새 공지사항 작성</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">제목</label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700"
                                placeholder="공지사항 제목을 입력하세요"
                            />
                        </div>

                        <div className="flex items-center space-x-6">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isPinned}
                                    onChange={(e) => setIsPinned(e.target.checked)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">상단 고정 (중요)</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isVisible}
                                    onChange={(e) => setIsVisible(e.target.checked)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">공개 여부</span>
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">내용 (Markdown 지원)</label>
                            <textarea
                                required
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                rows={15}
                                className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 font-mono text-sm"
                                placeholder="# 제목\n\n내용을 입력하세요..."
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-4">
                    <Link
                        href="/admin/notices"
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700"
                    >
                        취소
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70"
                    >
                        {loading && <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                        <Save className="h-4 w-4 mr-2" />
                        저장하기
                    </button>
                </div>
            </form>
        </div>
    );
}
