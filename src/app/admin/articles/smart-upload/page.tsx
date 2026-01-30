
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Check, Loader2, Image as ImageIcon, ArrowRight, FileType, Clipboard, Sparkles, X, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
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
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [showImageModal, setShowImageModal] = useState(false);

    // Helper: Convert File to Base64 String
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    // Helper: 이미지 압축 (Firestore 1MB 제한 대응)
    const compressImage = (base64: string, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // 최대 너비 제한
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // JPEG로 압축
                const compressed = canvas.toDataURL('image/jpeg', quality);
                resolve(compressed);
            };
            img.onerror = () => resolve(base64); // 실패시 원본 반환
            img.src = base64;
        });
    };

    // Helper: 모든 이미지 압축
    const compressAllImages = async (images: string[]): Promise<string[]> => {
        const compressed: string[] = [];
        for (const img of images) {
            const compressedImg = await compressImage(img, 600, 0.6);
            compressed.push(compressedImg);
        }
        return compressed;
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

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`서버 오류 (${res.status}): ${errorText}`);
            }

            const data = await res.json();

            // 에러 응답 체크
            if (data.error) {
                console.error("AI 분석 오류:", data.errorDetails);
                const continueAnyway = confirm(
                    `⚠️ ${data.errorMessage}\n\n` +
                    `상세: ${data.errorDetails}\n\n` +
                    `그래도 계속 진행하시겠습니까? (수동으로 수정 가능)`
                );

                if (!continueAnyway) {
                    setStatus('idle');
                    setFile(null);
                    return;
                }
                // 계속 진행하면 기본값으로 review 상태로 이동
            }

            setAnalysisResult(data);
            // If we got images back (from ZIP), set preview to the first one
            if (data.images && data.images.length > 0) {
                setPreviewUrl(data.images[0]); // Base64 url
            }
            setStatus('review');
        } catch (error: any) {
            console.error("파일 처리 오류:", error);
            alert(
                `❌ 파일 분석 실패\n\n` +
                `${error.message}\n\n` +
                `다른 파일을 시도하거나, 다른 AI 모델을 선택해보세요.`
            );
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

    // 모달 키보드 네비게이션
    useEffect(() => {
        const handleModalKeyDown = (e: KeyboardEvent) => {
            if (!showImageModal || !analysisResult?.images) return;

            if (e.key === 'Escape') {
                setShowImageModal(false);
            } else if (e.key === 'ArrowLeft' && selectedImageIndex > 0) {
                setSelectedImageIndex(selectedImageIndex - 1);
            } else if (e.key === 'ArrowRight' && selectedImageIndex < analysisResult.images.length - 1) {
                setSelectedImageIndex(selectedImageIndex + 1);
            }
        };

        document.addEventListener('keydown', handleModalKeyDown);
        return () => document.removeEventListener('keydown', handleModalKeyDown);
    }, [showImageModal, selectedImageIndex, analysisResult]);

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
                console.log(`${analysisResult.images.length}개 이미지 압축 중...`);
                // 이미지 압축 (Firestore 1MB 제한 대응)
                imagesArray = await compressAllImages(analysisResult.images);
                console.log(`이미지 압축 완료`);

                // 여전히 너무 크면 이미지 개수 제한
                const totalSize = imagesArray.reduce((acc, img) => acc + img.length, 0);
                if (totalSize > 900000) { // 900KB 이상이면
                    console.warn(`총 크기 ${(totalSize / 1024).toFixed(0)}KB - 이미지 개수 제한`);
                    const maxImages = Math.floor(900000 / (totalSize / imagesArray.length));
                    imagesArray = imagesArray.slice(0, Math.max(1, maxImages));
                    console.log(`${imagesArray.length}개 이미지로 제한됨`);
                }
            }
            // FALLBACK: Convert single uploaded image
            else if (file.type.startsWith('image/')) {
                console.log("단일 이미지 압축 중...");
                const singleImage = await fileToBase64(file);
                const compressed = await compressImage(singleImage, 800, 0.7);
                imagesArray = [compressed];
                console.log("이미지 압축 완료");
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
                                <div className="text-sm font-bold text-slate-800">Gemini 1.5 Pro</div>
                                <div className="text-xs text-slate-500">Google</div>
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
                        <strong className="text-emerald-600">ZIP(웹툰)</strong>, 이미지, PDF<br />
                        Word, Excel, 텍스트 등 모든 자료 등록 가능
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-400 max-w-lg mx-auto">
                        <span className="bg-slate-100 px-2 py-1 rounded">📦 ZIP</span>
                        <span className="bg-slate-100 px-2 py-1 rounded">🖼️ PNG/JPG</span>
                        <span className="bg-slate-100 px-2 py-1 rounded">📄 PDF</span>
                        <span className="bg-slate-100 px-2 py-1 rounded">📝 DOCX</span>
                        <span className="bg-slate-100 px-2 py-1 rounded">📊 XLSX</span>
                        <span className="bg-slate-100 px-2 py-1 rounded">📃 TXT</span>
                    </div>
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
                        accept=".pdf,.txt,.md,.jpg,.jpeg,.png,.webp,.zip,.docx,.xlsx,.xls,.doc"
                        onChange={handleFileSelect}
                    />
                </div>
            )}

            {/* Step 2: Analyzing */}
            {status === 'analyzing' && (
                <div className="text-center py-24 bg-gradient-to-br from-white to-emerald-50 rounded-3xl border-2 border-emerald-200 shadow-2xl">
                    <div className="relative">
                        <Loader2 className="w-20 h-20 text-emerald-600 animate-spin mx-auto mb-6" />
                        <Sparkles className="w-8 h-8 text-yellow-500 absolute top-0 left-1/2 -translate-x-1/2 animate-pulse" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-3">AI가 파일을 분석하고 있습니다</h2>
                    <p className="text-slate-600 mb-6">
                        {selectedModel === 'claude' && '🤖 Claude Opus 4.5 - 정밀 OCR 분석 중 (예상: 20-40초)'}
                        {selectedModel === 'gemini' && '🤖 Gemini 1.5 Pro - 고성능 분석 중 (예상: 15-30초)'}
                        {selectedModel === 'gemini2' && '🤖 Gemini 2.0 Flash - 고속 분석 중 (예상: 10-20초)'}
                        {selectedModel === 'gptoss' && '🤖 ChatGPT 4o - 자연어 생성 중 (예상: 20-40초)'}
                    </p>
                    <div className="max-w-md mx-auto bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                        <div className="space-y-3 text-left text-sm text-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span>이미지에서 텍스트 추출 중</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                                <span>제목과 카테고리 자동 분류 중</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                                <span>태그 및 요약 생성 중</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-6">잠시만 기다려주세요. 파일 크기에 따라 시간이 다를 수 있습니다.</p>
                </div>
            )}

            {/* Step 3: Review */}
            {(status === 'review' || status === 'saving') && analysisResult && (
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
                            {/* 웹툰/ZIP 갤러리 모드 */}
                            {analysisResult.images && analysisResult.images.length > 1 ? (
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-bold text-purple-700 flex items-center gap-2">
                                            🎨 웹툰 갤러리
                                        </h4>
                                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                            {analysisResult.images.length}장
                                        </span>
                                    </div>

                                    {/* 메인 이미지 뷰어 */}
                                    <div
                                        className="relative group cursor-pointer mb-3"
                                        onClick={() => setShowImageModal(true)}
                                    >
                                        <img
                                            src={analysisResult.images[selectedImageIndex]}
                                            className="w-full rounded-xl shadow-sm"
                                            alt={`웹툰 ${selectedImageIndex + 1}페이지`}
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                            <div className="text-white text-center">
                                                <ZoomIn className="h-8 w-8 mx-auto mb-2" />
                                                <span className="text-sm font-bold">원본 크기로 보기</span>
                                            </div>
                                        </div>
                                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                            {selectedImageIndex + 1} / {analysisResult.images.length}
                                        </div>
                                    </div>

                                    {/* 이전/다음 버튼 */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <button
                                            onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                                            disabled={selectedImageIndex === 0}
                                            className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium flex items-center justify-center gap-1"
                                        >
                                            <ChevronLeft className="w-4 h-4" /> 이전
                                        </button>
                                        <button
                                            onClick={() => setSelectedImageIndex(Math.min(analysisResult.images.length - 1, selectedImageIndex + 1))}
                                            disabled={selectedImageIndex === analysisResult.images.length - 1}
                                            className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium flex items-center justify-center gap-1"
                                        >
                                            다음 <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* 썸네일 그리드 */}
                                    <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                                        {analysisResult.images.map((img: string, idx: number) => (
                                            <div
                                                key={idx}
                                                onClick={() => setSelectedImageIndex(idx)}
                                                className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                                                    selectedImageIndex === idx
                                                        ? 'border-purple-500 ring-2 ring-purple-300'
                                                        : 'border-transparent hover:border-slate-300'
                                                }`}
                                            >
                                                <img
                                                    src={img}
                                                    alt={`썸네일 ${idx + 1}`}
                                                    className="w-full h-16 object-cover"
                                                />
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">
                                                    {idx + 1}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                /* 단일 이미지 모드 */
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                                    {previewUrl && (
                                        <div className="relative group cursor-pointer" onClick={() => window.open(previewUrl, '_blank')}>
                                            <img src={previewUrl} className="w-full rounded-xl shadow-sm" alt="Preview" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                                <div className="text-white text-center">
                                                    <ZoomIn className="h-8 w-8 mx-auto mb-2" />
                                                    <span className="text-sm font-bold">원본 이미지 열기</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

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

            {/* 원본 이미지 모달 */}
            {showImageModal && analysisResult?.images && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                    onClick={() => setShowImageModal(false)}
                >
                    <div className="relative max-w-6xl max-h-[90vh] w-full">
                        {/* 닫기 버튼 */}
                        <button
                            onClick={() => setShowImageModal(false)}
                            className="absolute -top-12 right-0 text-white hover:text-gray-300 flex items-center gap-2"
                        >
                            <X className="w-6 h-6" />
                            <span>닫기 (ESC)</span>
                        </button>

                        {/* 이미지 카운터 */}
                        <div className="absolute -top-12 left-0 text-white text-lg font-bold">
                            {selectedImageIndex + 1} / {analysisResult.images.length} 페이지
                        </div>

                        {/* 메인 이미지 */}
                        <img
                            src={analysisResult.images[selectedImageIndex]}
                            alt={`웹툰 ${selectedImageIndex + 1}페이지`}
                            className="max-h-[85vh] mx-auto rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />

                        {/* 이전 버튼 */}
                        {selectedImageIndex > 0 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedImageIndex(selectedImageIndex - 1);
                                }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition-all"
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                        )}

                        {/* 다음 버튼 */}
                        {selectedImageIndex < analysisResult.images.length - 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedImageIndex(selectedImageIndex + 1);
                                }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition-all"
                            >
                                <ChevronRight className="w-8 h-8" />
                            </button>
                        )}

                        {/* 새 탭에서 열기 버튼 */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(analysisResult.images[selectedImageIndex], '_blank');
                            }}
                            className="absolute bottom-4 right-4 bg-white text-slate-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 flex items-center gap-2 shadow-lg"
                        >
                            <ZoomIn className="w-4 h-4" />
                            새 탭에서 원본 열기
                        </button>

                        {/* 썸네일 스트립 */}
                        <div className="absolute bottom-4 left-4 right-24 overflow-x-auto">
                            <div className="flex gap-2">
                                {analysisResult.images.map((img: string, idx: number) => (
                                    <img
                                        key={idx}
                                        src={img}
                                        alt={`썸네일 ${idx + 1}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedImageIndex(idx);
                                        }}
                                        className={`h-16 w-auto rounded cursor-pointer transition-all ${
                                            selectedImageIndex === idx
                                                ? 'ring-2 ring-white scale-110'
                                                : 'opacity-60 hover:opacity-100'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
