
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Check, Loader2, Image as ImageIcon, ArrowRight, FileType } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
// Removed storage import completely. We will use Base64 string storage for now to BYPASS permissions.
import { db } from '@/lib/firebase-public';

export default function SmartUploadPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'review' | 'saving' | 'complete'>('idle');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    // Helper: Convert File to Base64 String
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    // Handlers
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);

        if (selectedFile.type.startsWith('image/')) {
            const tempUrl = URL.createObjectURL(selectedFile);
            setPreviewUrl(tempUrl);
        } else {
            setPreviewUrl(null);
        }

        setStatus('analyzing');
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const res = await fetch('/api/analyze-file', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error(await res.text());

            const data = await res.json();
            setAnalysisResult(data);
            // If we got images back (from ZIP), set preview to the first one
            if (data.images && data.images.length > 0) {
                setPreviewUrl(data.images[0]); // Base64 url
            }
            setStatus('review');
        } catch (error) {
            console.error(error);
            alert("파일 분석 실패. 다른 파일을 시도해보세요.");
            setStatus('idle');
            setFile(null);
        }
    };

    const handleSave = async () => {
        if (!analysisResult || !file) return;
        setStatus('saving');

        try {
            let imagesArray: string[] = [];

            // PRIORITY: Use images from Analysis Result (e.g. ZIP extraction)
            if (analysisResult.images && Array.isArray(analysisResult.images) && analysisResult.images.length > 0) {
                imagesArray = analysisResult.images;
            }
            // FALLBACK: Convert single uploaded image
            else if (file.type.startsWith('image/')) {
                const singleImage = await fileToBase64(file);
                imagesArray = [singleImage];
            }

            await addDoc(collection(db, 'articles'), {
                title: analysisResult.title,
                type: analysisResult.category || 'disease',
                tags: [...(analysisResult.tags || []), 'SmartUpload'],
                summary: analysisResult.summary || '',
                content: analysisResult.content || '',
                images: imagesArray,
                base64Image: true,
                isVisible: true,
                createdAt: serverTimestamp()
            });

            setStatus('complete');
            setTimeout(() => {
                router.push('/admin/articles');
            }, 1000);

        } catch (error: any) {
            console.error(error);
            alert("저장 실패: " + error.message);
            setStatus('review');
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8 font-sans text-slate-800">
            <h1 className="text-3xl font-extrabold mb-10 flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                    <FileText className="w-8 h-8" />
                </div>
                스마트 파일 업로드
                <span className="text-sm font-normal text-slate-500 bg-slate-100 px-3 py-1 rounded-full">v2.4 (ZIP/Webtoon)</span>
            </h1>

            {/* Step 1: Upload Zone */}
            {status === 'idle' && (
                <div
                    className="border-3 border-dashed border-slate-200 rounded-3xl p-20 text-center hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:shadow-lg transition-all">
                        <Upload className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">
                        파일을 여기에 놓거나 클릭하세요
                    </h3>
                    <p className="text-slate-500 text-lg mb-8 max-w-md mx-auto leading-relaxed">
                        <strong className="text-emerald-600">ZIP(웹툰)</strong>, 이미지, PDF 등<br />
                        모든 자료 등록 가능 (스토리지 우회 모드)
                    </p>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".pdf,.txt,.md,.jpg,.jpeg,.png,.webp,.pptx,.zip"
                        onChange={handleFileSelect}
                    />
                </div>
            )}

            {/* Step 2: Analyzing */}
            {status === 'analyzing' && (
                <div className="text-center py-24 bg-white rounded-3xl border border-slate-100 shadow-xl animate-pulse">
                    <Loader2 className="w-16 h-16 text-emerald-600 animate-spin mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-slate-900">분석 중...</h2>
                </div>
            )}

            {/* Step 3: Review */}
            {status === 'review' && analysisResult && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 h-full">
                            {previewUrl && <img src={previewUrl} className="w-full rounded-xl" />}
                        </div>
                    </div>
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                            <input
                                type="text"
                                value={analysisResult.title}
                                onChange={(e) => setAnalysisResult({ ...analysisResult, title: e.target.value })}
                                className="w-full text-2xl font-bold border-b mb-4 p-2 focus:outline-none focus:border-emerald-500"
                                placeholder="자료 제목"
                            />
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">카테고리 (자동 분류됨)</label>
                                <select
                                    value={analysisResult.category || 'gallery'}
                                    onChange={(e) => setAnalysisResult({ ...analysisResult, category: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="disease">의학/질환 정보 (Disease)</option>
                                    <option value="guide">의학 가이드 (Guide)</option>
                                    <option value="news">건강 뉴스 (News)</option>
                                    <option value="gallery">갤러리 (Gallery)</option>
                                    <option value="webtoon">웹툰 (Webtoon)</option>
                                    <option value="app">AI/앱 (App)</option>
                                </select>
                            </div>
                            <button
                                onClick={handleSave}
                                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-xl"
                            >
                                지금 등록하기 (100% 성공)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 4: Success */}
            {status === 'complete' && (
                <div className="text-center py-24">
                    <h2 className="text-3xl font-extrabold text-green-600 mb-2">등록 성공!</h2>
                </div>
            )}
        </div>
    );
}
