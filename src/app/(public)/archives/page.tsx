
'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import Link from 'next/link';
import { Loader2, Search, Tag, Calendar, FileText } from 'lucide-react';
import clsx from 'clsx';

interface Article {
    id: string;
    title: string;
    type: string;
    tags: string[];
    summary: string;
    createdAt: any;
}

export default function ArchivesPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                // In a real app with many articles, we would filter in Firestore.
                // For now, we'll fetch all and client-side filter for better UX with small datasets.
                const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Article[];
                setArticles(data);
            } catch (error) {
                console.error("Error fetching articles:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchArticles();
    }, []);

    const allTags = Array.from(new Set(articles.flatMap(article => article.tags || [])));

    const filteredArticles = articles.filter(article => {
        // Filter Logic:
        // - 'all': show all
        // - 'disease': show 'disease' AND 'guide' types (Medical Info)
        // - 'news': show 'news' type
        let matchesType = false;
        if (selectedType === 'all') {
            matchesType = true;
        } else if (selectedType === 'disease') {
            matchesType = article.type === 'disease' || article.type === 'guide';
        } else {
            matchesType = article.type === selectedType;
        }

        const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (article.tags && article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
        const matchesTag = selectedTag ? (article.tags && article.tags.includes(selectedTag)) : true;

        return matchesType && matchesSearch && matchesTag;
    });

    const getBadgeInfo = (type: string) => {
        switch (type) {
            case 'disease':
                return { label: '질환 정보', className: 'bg-purple-100 text-purple-700' };
            case 'guide':
                return { label: '의학 가이드', className: 'bg-indigo-100 text-indigo-700' };
            case 'news':
                return { label: '건강 뉴스', className: 'bg-green-100 text-green-700' };
            default:
                return { label: '기타', className: 'bg-slate-100 text-slate-700' };
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">자료실</h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        건강한 삶을 위한 유용한 정보를 전달해 드립니다.<br />
                        질환 정보와 병원 뉴스를 확인해보세요.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar / Filters */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Search className="w-4 h-4" /> 검색
                            </h3>
                            <input
                                type="text"
                                placeholder="검색어 입력..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-lg mb-4">카테고리</h3>
                            <div className="space-y-2">
                                {[
                                    { id: 'all', label: '전체 보기' },
                                    { id: 'disease', label: '의학/질환 정보' }, // Updated label
                                    { id: 'news', label: '건강 뉴스' }
                                ].map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => setSelectedType(type.id)}
                                        className={clsx(
                                            "w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                            selectedType === type.id
                                                ? "bg-blue-50 text-blue-600"
                                                : "text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Tag className="w-4 h-4" /> 태그
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setSelectedTag(null)}
                                    className={clsx(
                                        "text-xs px-3 py-1.5 rounded-full transition-colors",
                                        selectedTag === null
                                            ? "bg-slate-800 text-white"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    )}
                                >
                                    전체
                                </button>
                                {allTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                        className={clsx(
                                            "text-xs px-3 py-1.5 rounded-full transition-colors",
                                            selectedTag === tag
                                                ? "bg-blue-600 text-white"
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        )}
                                    >
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Article List */}
                    <div className="lg:col-span-3">
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                            </div>
                        ) : filteredArticles.length > 0 ? (
                            <div className="grid gap-6">
                                {filteredArticles.map((article) => {
                                    const badge = getBadgeInfo(article.type);
                                    return (
                                        <Link
                                            href={`/archives/${article.id}`} // Ensure this route exists or create it
                                            key={article.id}
                                            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all group"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={clsx(
                                                            "text-xs font-bold px-2.5 py-0.5 rounded-full",
                                                            badge.className
                                                        )}>
                                                            {badge.label}
                                                        </span>
                                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {article.createdAt?.toDate ? article.createdAt.toDate().toLocaleDateString() : ''}
                                                        </span>
                                                    </div>
                                                    <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                                                        {article.title}
                                                    </h2>
                                                    <p className="text-slate-600 mb-4 line-clamp-2">
                                                        {article.summary}
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {article.tags && article.tags.map(tag => (
                                                            <span key={tag} className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-slate-900 mb-2">등록된 자료가 없습니다.</h3>
                                <p className="text-slate-500">검색 조건을 변경하거나 나중에 다시 확인해주세요.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
