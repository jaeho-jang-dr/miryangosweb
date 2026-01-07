
'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewArticlePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        type: 'disease', // 'disease' | 'news'
        tags: '',
        summary: '',
        content: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await addDoc(collection(db, 'articles'), {
                title: formData.title,
                type: formData.type,
                tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                summary: formData.summary,
                content: formData.content,
                isVisible: true,
                createdAt: serverTimestamp(),
            });

            router.push('/admin/articles');
        } catch (error) {
            console.error("Error creating article:", error);
            alert("자료 등록 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/admin/articles"
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold">새 자료 등록</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="제목을 입력하세요"
                        />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">분류</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="disease">질환 정보</option>
                            <option value="news">건강 뉴스</option>
                        </select>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">태그 (쉼표로 구분)</label>
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="예: 척추, 디스크, 운동법"
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">요약</label>
                        <input
                            type="text"
                            required
                            value={formData.summary}
                            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="리스트에 표시될 간단한 요약글을 입력하세요"
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">본문 (Markdown 지원)</label>
                        <textarea
                            required
                            rows={15}
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            placeholder="# 제목
**굵게**
- 리스트 아이템 1
- 리스트 아이템 2"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            Markdown 문법을 사용하여 작성할 수 있습니다.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        등록완료
                    </button>
                </div>
            </form>
        </div>
    );
}
