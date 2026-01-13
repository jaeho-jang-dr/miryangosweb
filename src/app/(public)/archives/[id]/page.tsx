
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Tag, Share2, Loader2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import clsx from 'clsx';

// 원본 이미지를 새 탭에서 보여주는 함수
const openImageInNewTab = (imageUrl: string) => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
        newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>원본 이미지</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        min-height: 100vh;
                        background: #1a1a1a;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 5vh 5vw;
                    }
                    img {
                        width: 80vw;
                        height: 80vh;
                        object-fit: contain;
                        border-radius: 8px;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    }
                </style>
            </head>
            <body>
                <img src="${imageUrl}" alt="원본 이미지" />
            </body>
            </html>
        `);
        newWindow.document.close();
    }
};

interface Article {
    id: string;
    title: string;
    type: string;
    tags: string[];
    summary: string;
    content: string;
    attachmentUrl?: string;
    attachmentName?: string;
    images?: string[];
    createdAt: any;
}

const getBadgeInfo = (type: string) => {
    switch (type) {
        case 'disease': return { label: '질환 정보', className: 'bg-purple-100 text-purple-700' };
        case 'guide': return { label: '의학 가이드', className: 'bg-indigo-100 text-indigo-700' };
        case 'news': return { label: '건강 뉴스', className: 'bg-green-100 text-green-700' };
        case 'webtoon': return { label: '웹툰', className: 'bg-yellow-100 text-yellow-700' };
        case 'gallery': return { label: '갤러리', className: 'bg-orange-100 text-orange-700' };
        case 'app': return { label: 'AI/앱', className: 'bg-teal-100 text-teal-700' };
        default: return { label: '기타', className: 'bg-slate-100 text-slate-700' };
    }
};

// 내부용 태그 필터링
const HIDDEN_TAGS = ['SmartUpload', 'smartupload', '자동생성', '검토필요'];
const cleanTag = (tag: string): string => tag.replace(/^#+/, '').trim();
const isVisibleTag = (tag: string): boolean => {
    const cleaned = cleanTag(tag);
    if (!cleaned) return false;
    return !HIDDEN_TAGS.some(hidden => cleaned.toLowerCase() === hidden.toLowerCase());
};
const cleanTags = (tags: string[] | undefined): string[] => {
    if (!tags) return [];
    return tags.map(cleanTag).filter(isVisibleTag).filter((tag, i, arr) => arr.indexOf(tag) === i);
};

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
        <div className="min-h-screen bg-slate-50 pt-24 pb-12">
            <div className="container mx-auto px-4 max-w-4xl">
                <Link
                    href="/archives"
                    className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-6 transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm hover:shadow"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    목록으로 돌아가기
                </Link>

                <article className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Header */}
                    {/* Header */}
                    <div className="p-8 border-b border-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                            {article && (
                                <span className={clsx(
                                    "text-xs font-bold px-3 py-1 rounded-full",
                                    getBadgeInfo(article.type).className
                                )}>
                                    {getBadgeInfo(article.type).label}
                                </span>
                            )}
                            <span className="text-sm text-slate-500 flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {article.createdAt?.toDate ? article.createdAt.toDate().toLocaleDateString() : ''}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
                            {article.title}
                        </h1>
                        <div className="flex flex-wrap gap-2">
                            {cleanTags(article.tags).map(tag => (
                                <span key={tag} className="flex items-center text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                                    <Tag className="w-3 h-3 mr-1" />
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 md:p-12 prose prose-slate max-w-none prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-img:rounded-xl">
                        {/* File Attachment Button */}
                        {article.attachmentUrl && (
                            <div className="not-prose mb-8 p-6 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-blue-900 mb-1">첨부 파일</h3>
                                    <p className="text-sm text-blue-700">{article.attachmentName || '파일 보기'}</p>
                                </div>
                                <a
                                    href={article.attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    첨부파일 열기
                                </a>
                            </div>
                        )}

                        {/* Standard Content */}
                        <ReactMarkdown>
                            {article.content}
                        </ReactMarkdown>

                        {/* Webtoon Images */}
                        {article.images && article.images.length > 0 && (
                            <div className="mt-8 flex flex-col items-center">
                                {article.images.map((url, index) => (
                                    <div
                                        key={index}
                                        className="relative group cursor-pointer w-full max-w-3xl"
                                        onClick={() => openImageInNewTab(url)}
                                        title="클릭하여 원본 이미지 보기"
                                    >
                                        <img
                                            src={url}
                                            alt={`Webtoon Page ${index + 1}`}
                                            className="w-full mb-0 rounded-none shadow-sm"
                                            loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="bg-white/90 text-slate-800 px-4 py-2 rounded-lg font-medium text-sm shadow-lg">
                                                🔍 원본 이미지 보기
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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
