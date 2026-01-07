
'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getAuth } from "firebase/auth";

export default function NewArticlePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        type: 'disease', // 'disease' | 'news' | 'webtoon'
        tags: '',
        summary: '',
        content: ''
    });
    const [attachment, setAttachment] = useState<File | null>(null);
    const [webtoonImages, setWebtoonImages] = useState<File[]>([]);

    const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAttachment(e.target.files[0]);
        }
    };

    const handleZipChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;

        const file = e.target.files[0];
        setUploadProgress('ZIP 파일 분석 중...');

        try {
            const JSZip = (await import('jszip')).default;
            const zip = await JSZip.loadAsync(file);
            const imageFiles: File[] = [];

            // Filter and sort files
            const entries = Object.entries(zip.files)
                .filter(([filename, entry]) =>
                    !entry.dir &&
                    !filename.startsWith('__MACOSX') &&
                    /\.(jpg|jpeg|png|webp)$/i.test(filename)
                )
                .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' }));

            for (const [filename, entry] of entries) {
                const blob = await entry.async('blob');
                const imageFile = new File([blob], filename, { type: 'image/webp' });
                imageFiles.push(imageFile);
            }

            setWebtoonImages(imageFiles);
            setUploadProgress(`이미지 ${imageFiles.length}장 추출 완료`);
        } catch (error) {
            console.error("Error unzipping:", error);
            alert("ZIP 파일 처리 중 오류가 발생했습니다.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setUploadProgress('업로드 시작...');

        try {
            const { auth } = await import("@/lib/firebase-public");

            // Get ID Token for server-side auth
            const user = auth.currentUser;
            if (!user) throw new Error("로그인이 필요합니다.");
            const idToken = await user.getIdToken();

            let attachmentUrl = null;
            let attachmentName = null;
            let imageUrls: string[] = [];

            // Helper function for API route upload
            const uploadToServer = async (file: File, path: string) => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('path', path);

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${idToken}`,
                    },
                    body: formData,
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Upload failed: ${response.status} ${errorText}`);
                }

                const result = await response.json();
                if (!result.success) throw new Error(result.error);
                return result.url;
            };

            // 1. General Attachment Upload
            if (attachment) {
                setUploadProgress('첨부파일 업로드 중...');
                const path = `attachments/${Date.now()}_${attachment.name}`;
                attachmentUrl = await uploadToServer(attachment, path);
                attachmentName = attachment.name;
            }

            // 2. Webtoon Images Upload
            if (formData.type === 'webtoon' && webtoonImages.length > 0) {
                for (let i = 0; i < webtoonImages.length; i++) {
                    setUploadProgress(`웹툰 이미지 업로드 중 (${i + 1}/${webtoonImages.length})...`);
                    const img = webtoonImages[i];
                    const path = `webtoons/${Date.now()}_${i.toString().padStart(3, '0')}_${img.name}`;
                    const url = await uploadToServer(img, path);
                    if (url) imageUrls.push(url);
                }
            }

            // 3. Save to Firestore (Client-side SDK is fine for Firestore as it handles CORS better or we reuse auth)
            // Note: If Firestore allows write, it works.
            setUploadProgress('저장 중...');
            await addDoc(collection(db, 'articles'), {
                title: formData.title,
                type: formData.type,
                tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                summary: formData.summary,
                content: formData.content,
                attachmentUrl,
                attachmentName,
                images: imageUrls.length > 0 ? imageUrls : null,
                isVisible: true,
                createdAt: serverTimestamp(),
            });

            router.push('/admin/articles');
        } catch (error: any) {
            console.error("Error creating article:", error);
            alert(`자료 등록 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setLoading(false);
            setUploadProgress('');
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
                            <option value="webtoon">웹툰</option>
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

                    {/* File Attachment Section */}
                    {formData.type !== 'webtoon' && (
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                파일 첨부 (HTML, PDF 등)
                                <span className="ml-2 text-xs text-slate-400 font-normal">자료실에서 클릭 시 열립니다.</span>
                            </label>
                            <input
                                type="file"
                                accept=".html,.htm,.pdf,.doc,.docx"
                                onChange={handleAttachmentChange}
                                className="w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                            />
                        </div>
                    )}

                    {/* Webtoon Zip Section */}
                    {formData.type === 'webtoon' && (
                        <div className="col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <label className="block text-sm font-medium text-slate-700 mb-2">웹툰 이미지 ZIP 파일 업로드</label>
                            <input
                                type="file"
                                accept=".zip"
                                onChange={handleZipChange}
                                className="w-full text-sm text-slate-500 mb-2"
                            />
                            <p className="text-xs text-slate-500">
                                * 압축 파일 내의 이미지(jpg, png, webp)를 자동으로 추출하여 순서대로 업로드합니다.<br />
                                * 파일명 순서대로 정렬됩니다 (예: 01.webp, 02.webp).
                            </p>
                            {uploadProgress && (
                                <div className="mt-2 text-sm text-blue-600 font-medium">
                                    {uploadProgress}
                                </div>
                            )}
                        </div>
                    )}

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
                            required={formData.type !== 'webtoon'}
                            rows={15}
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            placeholder="# 제목..."
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {uploadProgress || '처리 중...'}
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                등록완료
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
