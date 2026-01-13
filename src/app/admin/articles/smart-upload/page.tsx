
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Check, Loader2, Image as ImageIcon, ArrowRight, FileType, Clipboard, Sparkles, X } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
// Removed storage import completely. We will use Base64 string storage for now to BYPASS permissions.
import { db } from '@/lib/firebase-public';

export default function SmartUploadPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    // State
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'review' | 'saving' | 'complete'>('idle');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedModel, setSelectedModel] = useState<'claude' | 'gemini' | 'gemini2' | 'gptoss'>('claude');

    // Helper: Convert File to Base64 String
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    // Process file (common logic for file input, drag-drop, paste)
    const processFile = async (selectedFile: File) => {
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
        formData.append('model', selectedModel); // Add model selection

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

    // Handlers
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        await processFile(selectedFile);
    };

    // Drag and Drop Handlers
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files?.[0];
        if (!droppedFile) return;
        await processFile(droppedFile);
    };

    // Paste Handler (Alt+V or Ctrl+V)
    const handlePaste = async (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    const pastedFile = new File([file], `pasted_image_${Date.now()}.png`, { type: file.type });
                    await processFile(pastedFile);
                    break;
                }
            }
        }
    };

    // Keyboard Handler (Alt+V)
    const handleKeyDown = async (e: KeyboardEvent) => {
        if (e.altKey && e.key.toLowerCase() === 'v') {
            e.preventDefault();
            try {
                const clipboardItems = await navigator.clipboard.read();
                for (const item of clipboardItems) {
                    for (const type of item.types) {
                        if (type.startsWith('image/')) {
                            const blob = await item.getType(type);
                            const extension = type.split('/')[1] || 'png';
                            const file = new File([blob], `clipboard_image_${Date.now()}.${extension}`, { type });
                            await processFile(file);
                            return;
                        }
                    }
                }
            } catch (error) {
                console.error('Clipboard access failed:', error);
                alert('클립보드 접근에 실패했습니다. 브라우저 권한을 확인해주세요.');
            }
        }
    };

    // Setup event listeners
    useEffect(() => {
        if (status === 'idle') {
            document.addEventListener('paste', handlePaste);
            document.addEventListener('keydown', handleKeyDown);

            return () => {
                document.removeEventListener('paste', handlePaste);
                document.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [status]);

    const handleSave = async () => {
        if (!analysisResult || !file) {
            alert("분석 결과가 없습니다. 다시 시도해주세요.");
            return;
        }

        setStatus('saving');

        try {
            // Check Firebase auth
            const { auth } = await import('@/lib/firebase-public');
            const currentUser = auth.currentUser;

            console.log("현재 사용자:", currentUser?.email || "로그인 안됨");
            console.log("저장할 데이터:", {
                title: analysisResult.title,
                category: analysisResult.category,
                tags: analysisResult.tags
            });

            let imagesArray: string[] = [];

            // PRIORITY: Use images from Analysis Result (e.g. ZIP extraction)
            if (analysisResult.images && Array.isArray(analysisResult.images) && analysisResult.images.length > 0) {
                imagesArray = analysisResult.images;
                console.log(`${imagesArray.length}개 이미지 사용 (ZIP 추출)`);
            }
            // FALLBACK: Convert single uploaded image
            else if (file.type.startsWith('image/')) {
                console.log("단일 이미지 변환 중...");
                const singleImage = await fileToBase64(file);
                imagesArray = [singleImage];
                console.log("이미지 변환 완료");
            } else {
                console.log("이미지 없음 (PDF 또는 텍스트 파일)");
            }

            console.log("Firestore에 저장 중...");
            const docRef = await addDoc(collection(db, 'articles'), {
                title: analysisResult.title,
                type: analysisResult.category || 'disease',
                tags: [...(analysisResult.tags || []), 'SmartUpload'],
                summary: analysisResult.summary || '',
                content: analysisResult.content || '',
                images: imagesArray,
                base64Image: imagesArray.length > 0,
                isVisible: true,
                createdAt: serverTimestamp()
            });

            console.log("저장 완료! 문서 ID:", docRef.id);
            setStatus('complete');

            setTimeout(() => {
                router.push('/admin/articles');
            }, 1500);

        } catch (error: any) {
            console.error("저장 실패 상세:", error);
            alert(`저장 실패: ${error.message}\n\n브라우저 콘솔을 확인해주세요.`);
            setStatus('review');
        }
    };

    const handleCancel = () => {
        if (confirm("작업을 취소하고 처음으로 돌아가시겠습니까?")) {
            // Reset all state
            setStatus('idle');
            setFile(null);
            setPreviewUrl(null);
            setAnalysisResult(null);
            setIsDragging(false);

            // Clear file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8 font-sans text-slate-800">
            <h1 className="text-3xl font-extrabold mb-10 flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                    <FileText className="w-8 h-8" />
                </div>
                스마트 파일 업로드
                <span className="text-sm font-normal text-slate-500 bg-slate-100 px-3 py-1 rounded-full">v2.5 (AI 비교)</span>
            </h1>

            {/* Model Selection */}
            {status === 'idle' && (
                <div className="mb-6 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        AI 모델 선택 (4개 모델 비교 가능)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <label className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-lg border-2 border-transparent hover:border-purple-300 transition-all">
                            <input
                                type="radio"
                                name="model"
                                value="claude"
                                checked={selectedModel === 'claude'}
                                onChange={(e) => setSelectedModel(e.target.value as any)}
                                className="w-4 h-4 text-purple-600"
                            />
                            <div className="flex-1">
                                <div className="text-sm font-bold text-slate-800">Claude Opus 4.5</div>
                                <div className="text-xs text-slate-500">Anthropic</div>
                            </div>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-lg border-2 border-transparent hover:border-emerald-300 transition-all">
                            <input
                                type="radio"
                                name="model"
                                value="gemini"
                                checked={selectedModel === 'gemini'}
                                onChange={(e) => setSelectedModel(e.target.value as any)}
                                className="w-4 h-4 text-emerald-600"
                            />
                            <div className="flex-1">
                                <div className="text-sm font-bold text-slate-800">Gemini 3 Pro</div>
                                <div className="text-xs text-slate-500">Google (최신)</div>
                            </div>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-lg border-2 border-transparent hover:border-blue-300 transition-all">
                            <input
                                type="radio"
                                name="model"
                                value="gemini2"
                                checked={selectedModel === 'gemini2'}
                                onChange={(e) => setSelectedModel(e.target.value as any)}
                                className="w-4 h-4 text-blue-600"
                            />
                            <div className="flex-1">
                                <div className="text-sm font-bold text-slate-800">Gemini 2.0 Flash</div>
                                <div className="text-xs text-slate-500">Google</div>
                            </div>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-lg border-2 border-transparent hover:border-orange-300 transition-all">
                            <input
                                type="radio"
                                name="model"
                                value="gptoss"
                                checked={selectedModel === 'gptoss'}
                                onChange={(e) => setSelectedModel(e.target.value as any)}
                                className="w-4 h-4 text-orange-600"
                            />
                            <div className="flex-1">
                                <div className="text-sm font-bold text-slate-800">ChatGPT 4o</div>
                                <div className="text-xs text-slate-500">OpenAI</div>
                            </div>
                        </label>
                    </div>
                </div>
            )}

            {/* Step 1: Upload Zone */}
            {status === 'idle' && (
                <div
                    ref={dropZoneRef}
                    className={`border-3 border-dashed rounded-3xl p-20 text-center transition-all cursor-pointer group ${
                        isDragging
                            ? 'border-emerald-600 bg-emerald-100/50 scale-105'
                            : 'border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 transition-all ${
                        isDragging
                            ? 'bg-emerald-600 text-white scale-110 shadow-xl'
                            : 'bg-emerald-100 text-emerald-600 group-hover:scale-110 group-hover:shadow-lg'
                    }`}>
                        {isDragging ? <ImageIcon className="w-10 h-10" /> : <Upload className="w-10 h-10" />}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">
                        {isDragging ? '파일을 여기에 놓으세요!' : '파일을 여기에 놓거나 클릭하세요'}
                    </h3>
                    <p className="text-slate-500 text-lg mb-4 max-w-md mx-auto leading-relaxed">
                        <strong className="text-emerald-600">ZIP(웹툰)</strong>, 이미지, PDF 등<br />
                        모든 자료 등록 가능 (스토리지 우회 모드)
                    </p>
                    <div className="flex items-center justify-center gap-4 text-sm text-slate-400 mt-6">
                        <div className="flex items-center gap-2">
                            <Clipboard className="w-4 h-4" />
                            <span><b>Alt+V</b> 또는 <b>Ctrl+V</b>로 붙여넣기</span>
                        </div>
                    </div>
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
                <div className="space-y-6">
                    {/* AI Analysis Badge */}
                    <div className="flex items-center gap-3 bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl border border-purple-200">
                        <Sparkles className="w-6 h-6 text-purple-600" />
                        <div>
                            <h3 className="font-bold text-purple-900">AI 분석 완료</h3>
                            <p className="text-sm text-purple-600">
                                {analysisResult.analyzedBy || 'AI'}로 이미지를 분석했습니다. 내용을 확인하고 수정하세요.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Preview Panel */}
                        <div className="md:col-span-1 space-y-4">
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                                {previewUrl && (
                                    <div className="relative group cursor-pointer" onClick={() => window.open(previewUrl, '_blank')}>
                                        <img src={previewUrl} className="w-full rounded-xl shadow-sm" alt="Preview" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                            <div className="text-white text-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                                <span className="text-sm font-bold">원본 이미지 열기</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {analysisResult.images && analysisResult.images.length > 1 && (
                                    <p className="mt-2 text-xs text-center text-slate-500">
                                        총 {analysisResult.images.length}개 이미지 (클릭하여 원본 보기)
                                    </p>
                                )}
                            </div>

                            {/* Content Preview */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    내용 미리보기
                                </h4>
                                <div className="prose prose-sm max-w-none text-slate-600">
                                    <ReactMarkdown>{analysisResult.content || '내용 없음'}</ReactMarkdown>
                                </div>
                            </div>
                        </div>

                        {/* Edit Panel */}
                        <div className="md:col-span-2 space-y-6">
                            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                                <label className="block text-xs font-medium text-slate-500 mb-1">제목 (이미지 첫 줄 자동 추출)</label>
                                <input
                                    type="text"
                                    value={analysisResult.title}
                                    onChange={(e) => setAnalysisResult({ ...analysisResult, title: e.target.value })}
                                    className="w-full text-2xl font-bold border-b-2 mb-6 p-2 focus:outline-none focus:border-emerald-500 transition-colors"
                                    placeholder="자료 제목"
                                />

                                <label className="block text-xs font-medium text-slate-500 mb-2">요약 (2-3문장)</label>
                                <textarea
                                    value={analysisResult.summary || ''}
                                    onChange={(e) => setAnalysisResult({ ...analysisResult, summary: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-6 resize-none"
                                    rows={3}
                                    placeholder="자료 요약"
                                />

                                <label className="block text-xs font-medium text-slate-500 mb-2">본문 내용 (마크다운 지원)</label>
                                <textarea
                                    value={analysisResult.content || ''}
                                    onChange={(e) => setAnalysisResult({ ...analysisResult, content: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-6 font-mono text-sm resize-none"
                                    rows={12}
                                    placeholder="## 개요&#10;&#10;내용...&#10;&#10;## 증상&#10;&#10;내용..."
                                />

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-2">카테고리 (AI 자동 분류)</label>
                                        <select
                                            value={analysisResult.category || 'gallery'}
                                            onChange={(e) => setAnalysisResult({ ...analysisResult, category: e.target.value })}
                                            className="w-full p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        >
                                            <option value="disease">🏥 의학/질환 정보</option>
                                            <option value="guide">📖 의학 가이드</option>
                                            <option value="news">📰 건강 뉴스</option>
                                            <option value="gallery">🖼️ 갤러리</option>
                                            <option value="webtoon">🎨 웹툰</option>
                                            <option value="app">💡 AI/앱</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-2">태그</label>
                                        <input
                                            type="text"
                                            value={(analysisResult.tags || []).join(', ')}
                                            onChange={(e) => setAnalysisResult({
                                                ...analysisResult,
                                                tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                                            })}
                                            className="w-full p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            placeholder="태그1, 태그2, 태그3"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={handleCancel}
                                        className="w-full py-4 bg-slate-500 text-white rounded-xl font-bold hover:bg-slate-600 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <X className="w-5 h-5" />
                                        등록하지 않기
                                    </button>

                                    <button
                                        onClick={handleSave}
                                        disabled={status === 'saving'}
                                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 shadow-xl hover:shadow-2xl transition-all disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {status === 'saving' ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                저장 중...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-5 h-5" />
                                                등록하기
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
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
