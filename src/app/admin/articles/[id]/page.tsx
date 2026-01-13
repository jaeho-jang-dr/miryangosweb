
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

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
        content: '',
        images: [] as string[], // Store image URLs or Base64
        attachmentUrl: '',
        attachmentName: ''
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
                        content: data.content || '',
                        images: data.images || [],
                        attachmentUrl: data.attachmentUrl || '',
                        attachmentName: data.attachmentName || ''
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
            {/* ... Header ... */}
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
                            <option value="guide">의학 가이드</option>
                            <option value="news">건강 뉴스</option>
                            <option value="gallery">갤러리</option>
                            <option value="webtoon">웹툰</option>
                            <option value="app">AI/앱</option>
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

                    {/* --- File Preview Section --- */}
                    <div className="col-span-2 space-y-4">
                        <label className="block text-sm font-medium text-slate-700">첨부 파일 / 이미지 미리보기</label>

                        {/* Attachment Link */}
                        {formData.attachmentUrl && (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                <Link
                                    href={formData.attachmentUrl}
                                    target="_blank"
                                    className="text-blue-600 hover:underline text-sm font-medium truncate"
                                >
                                    {formData.attachmentName || '첨부파일 열기'}
                                </Link>
                                <span className="text-xs text-slate-400">
                                    (클릭하여 다운로드/미리보기)
                                </span>
                            </div>
                        )}

                        {/* Image Gallery (Webtoon / Gallery / Single Image) */}
                        {formData.images && formData.images.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                {formData.images.map((imgUrl, idx) => (
                                    <div
                                        key={idx}
                                        className="relative group aspect-square bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-400"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            openImageInNewTab(imgUrl);
                                        }}
                                        title="클릭하여 원본 이미지 보기"
                                    >
                                        <img
                                            src={imgUrl}
                                            alt={`Preview ${idx + 1}`}
                                            className="w-full h-full object-cover pointer-events-none"
                                            loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white pointer-events-none">
                                            <span className="text-xs font-bold mb-1">{idx + 1}</span>
                                            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">🔍 원본 보기</span>
                                        </div>
                                    </div>
                                ))}
                                <div className="col-span-full text-xs text-center text-slate-400 mt-2">
                                    * 이미지를 클릭하면 원본을 볼 수 있습니다. 교체를 원하시면 새 자료 등록을 이용해주세요.
                                </div>
                            </div>
                        )}

                        {!formData.attachmentUrl && (!formData.images || formData.images.length === 0) && (
                            <div className="text-sm text-slate-400 italic p-2">
                                첨부된 파일이나 이미지가 없습니다.
                            </div>
                        )}
                    </div>
                    {/* --------------------------- */}

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
                            required={formData.type !== 'webtoon'}
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
