
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Tag, Share2, Loader2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import clsx from 'clsx';

interface Article {
    id: string;
    title: string;
    type: 'disease' | 'news';
    tags: string[];
    summary: string;
    content: string;
    createdAt: any;
}

export default function ArticleDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchArticle = async () => {
            if (!params.id) return;
            try {
                const docRef = doc(db, 'articles', params.id as string);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setArticle({ id: docSnap.id, ...docSnap.data() } as Article);
                } else {
                    setArticle(null);
                }
            } catch (error) {
                console.error("Error fetching article:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchArticle();
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!article) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <AlertCircle className="w-12 h-12 text-slate-400 mb-4" />
                <h1 className="text-2xl font-bold text-slate-900 mb-2">자료를 찾을 수 없습니다.</h1>
                <p className="text-slate-600 mb-6">삭제되었거나 존재하지 않는 주소입니다.</p>
                <Link
                    href="/archives"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    목록으로 돌아가기
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="container mx-auto px-4 max-w-4xl">
                <Link
                    href="/archives"
                    className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    목록으로
                </Link>

                <article className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Header */}
                    <div className="p-8 border-b border-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                            <span className={clsx(
                                "text-xs font-bold px-3 py-1 rounded-full",
                                article.type === 'disease'
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-green-100 text-green-700"
                            )}>
                                {article.type === 'disease' ? '질환 정보' : '건강 뉴스'}
                            </span>
                            <span className="text-sm text-slate-500 flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {article.createdAt?.toDate ? article.createdAt.toDate().toLocaleDateString() : ''}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
                            {article.title}
                        </h1>
                        <div className="flex flex-wrap gap-2">
                            {article.tags.map(tag => (
                                <span key={tag} className="flex items-center text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                                    <Tag className="w-3 h-3 mr-1" />
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 md:p-12 prose prose-slate max-w-none prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-img:rounded-xl">
                        <ReactMarkdown>
                            {article.content}
                        </ReactMarkdown>
                    </div>

                    {/* Footer / Share */}
                    <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <div className="text-sm text-slate-500">
                            Miryang OS Hospital Archives
                        </div>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                alert('주소가 복사되었습니다.');
                            }}
                            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors text-sm font-medium"
                        >
                            <Share2 className="w-4 h-4" />
                            공유하기
                        </button>
                    </div>
                </article>

                <div className="mt-8 flex justify-center">
                    <Link
                        href="/archives"
                        className="px-8 py-3 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
                    >
                        다른 자료 더 보기
                    </Link>
                </div>
            </div>
        </div>
    );
}
