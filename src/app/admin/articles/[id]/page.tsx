
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function EditArticlePage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        type: 'disease',
        tags: '',
        summary: '',
        content: ''
    });

    useEffect(() => {
        const fetchArticle = async () => {
            if (!params.id) return;
            try {
                const docRef = doc(db, 'articles', params.id as string);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setFormData({
                        title: data.title || '',
                        type: data.type || 'disease',
                        tags: data.tags ? data.tags.join(', ') : '',
                        summary: data.summary || '',
                        content: data.content || ''
                    });
                } else {
                    alert('자료를 찾을 수 없습니다.');
                    router.push('/admin/articles');
                }
            } catch (error) {
                console.error("Error loading article:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchArticle();
    }, [params.id, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const docRef = doc(db, 'articles', params.id as string);
            await updateDoc(docRef, {
                title: formData.title,
                type: formData.type,
                tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                summary: formData.summary,
                content: formData.content,
            });

            router.push('/admin/articles');
        } catch (error) {
            console.error("Error updating article:", error);
            alert("수정 중 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/admin/articles"
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold">자료 수정</h1>
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
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        수정사항 저장
                    </button>
                </div>
            </form>
        </div>
    );
}
