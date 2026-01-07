
'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import Link from 'next/link';
import { Plus, Edit, Trash2, Loader2, FileText, Search } from 'lucide-react';

interface Article {
    id: string;
    title: string;
    type: 'disease' | 'news';
    tags: string[];
    createdAt: any;
    isVisible: boolean;
}

export default function ArticlesPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
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

    const handleDelete = async (id: string) => {
        if (!window.confirm('정말 이 자료를 삭제하시겠습니까?')) return;

        try {
            await deleteDoc(doc(db, 'articles', id));
            setArticles(articles.filter(article => article.id !== id));
        } catch (error) {
            console.error("Error deleting article:", error);
            alert("삭제 중 오류가 발생했습니다.");
        }
    };

    const filteredArticles = articles.filter(article =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900">자료실 관리</h1>
                <Link
                    href="/admin/articles/new"
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    새 자료 등록
                </Link>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex items-center gap-2">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="제목 또는 태그 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 outline-none text-sm"
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-slate-700">분류</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">제목</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">태그</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">등록일</th>
                            <th className="px-6 py-4 font-semibold text-slate-700 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredArticles.length > 0 ? filteredArticles.map((article) => (
                            <tr key={article.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${article.type === 'disease'
                                            ? 'bg-purple-100 text-purple-800'
                                            : 'bg-green-100 text-green-800'
                                        }`}>
                                        {article.type === 'disease' ? '질환정보' : '건강뉴스'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-900">
                                    {article.title}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {article.tags.map(tag => (
                                            <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                    {article.createdAt?.toDate ? article.createdAt.toDate().toLocaleDateString() : '-'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Link
                                            href={`/admin/articles/${article.id}`}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(article.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    등록된 자료가 없습니다.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
