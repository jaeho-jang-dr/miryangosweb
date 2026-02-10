'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Upload, FileText, Check, Loader2, Sparkles, X, Eye, AlertCircle, ArrowLeft
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase-public';
import Link from 'next/link';

interface AnalysisResult {
    title: string;
    category: string;
    tags: string[];
    summary: string;
    content: string;
    analyzedBy?: string;
    error?: boolean;
    errorMessage?: string;
}

export default function SmartMaterialPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'review' | 'saving' | 'complete'>('idle');
    const [file, setFile] = useState<File | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string>('');

    // PDF/PPTX 파일 처리
    const processFile = async (selectedFile: File) => {
        const ext = selectedFile.name.toLowerCase();
        const isPdf = selectedFile.type === 'application/pdf' || ext.endsWith('.pdf');
        const isPptx = selectedFile.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || ext.endsWith('.pptx');

        if (!isPdf && !isPptx) {
            alert('PDF 또는 PPTX 파일만 업로드 가능합니다.');
            return;
        }

        setFile(selectedFile);
        setStatus('analyzing');

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const res = await fetch('/api/analyze-pdf-vision', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`서버 오류 (${res.status}): ${errorText}`);
            }

            const data = await res.json();

            // API 응답을 폼 형식에 맞게 변환
            const result: AnalysisResult = {
                title: data.title || selectedFile.name.replace(/\.[^/.]+$/, ''),
                category: data.category || mapFileTypeToCategory(data.fileType),
                tags: data.tags || ['자동생성'],
                summary: data.summary || '',
                content: data.content || '',
                analyzedBy: data.analyzedBy,
                error: data.error,
                errorMessage: data.errorMessage,
            };

            setAnalysisResult(result);
            setStatus('review');
        } catch (error: any) {
            console.error("분석 오류:", error);
            // 오류 시에도 기본값으로 review 상태로 이동
            setAnalysisResult({
                title: selectedFile.name.replace(/\.[^/.]+$/, ''),
                category: 'disease',
                tags: ['자동생성', '검토필요'],
                summary: '텍스트 추출 실패',
                content: '## 내용\n\n텍스트를 추출할 수 없습니다.',
                error: true,
                errorMessage: error.message,
            });
            setStatus('review');
        }
    };

    // 파일타입을 카테고리로 매핑
    const mapFileTypeToCategory = (fileType: string): string => {
        const map: Record<string, string> = {
            '질환정보': 'disease',
            '건강가이드': 'guide',
            '의학뉴스': 'news',
            '교육자료': 'guide',
            '기타': 'disease',
        };
        return map[fileType] || 'disease';
    };

    // 파일 선택 핸들러
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        await processFile(selectedFile);
    };

    // 드래그 앤 드롭 핸들러
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

    // 저장 핸들러
    const handleSave = async () => {
        if (!analysisResult || !file) {
            alert("분석 결과가 없습니다.");
            return;
        }

        setStatus('saving');

        try {
            // 1. 파일 업로드 (PDF/PPTX)
            const timestamp = Date.now();
            const safeName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
            const fileRef = ref(storage, `materials/${timestamp}_${safeName}`);

            await uploadBytes(fileRef, file);
            const uploadedFileUrl = await getDownloadURL(fileRef);
            setPdfUrl(uploadedFileUrl);
            console.log('파일 업로드 완료:', uploadedFileUrl);

            // 2. Firestore에 문서 저장
            const docRef = await addDoc(collection(db, 'articles'), {
                title: analysisResult.title,
                type: analysisResult.category,
                tags: analysisResult.tags,
                summary: analysisResult.summary,
                content: analysisResult.content,

                // 첨부 파일 정보
                attachmentUrl: uploadedFileUrl,
                attachmentName: file.name,
                pdfUrl: uploadedFileUrl,

                // 메타데이터
                analyzedBy: analysisResult.analyzedBy || 'AI',
                isVisible: true,
                createdAt: serverTimestamp(),
            });

            console.log('문서 저장 완료:', docRef.id);
            setStatus('complete');

            setTimeout(() => {
                router.push('/admin/articles');
            }, 1500);

        } catch (error: any) {
            console.error("저장 실패:", error);
            alert(`저장 실패: ${error.message}`);
            setStatus('review');
        }
    };

    // 취소 핸들러
    const handleCancel = () => {
        setStatus('idle');
        setFile(null);
        setAnalysisResult(null);
        setPdfUrl('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6">
            {/* 헤더 */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin/articles" className="text-slate-500 hover:text-slate-700">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">스마트 자료 등록</h1>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    PDF / PPTX + AI
                </span>
            </div>

            {/* Step 1: 업로드 영역 */}
            {status === 'idle' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                    <p className="text-slate-600 mb-6 text-center">
                        PDF/PPTX 파일을 업로드하면 <strong className="text-blue-600">AI</strong>가 텍스트를 추출하고
                        자동으로 분류합니다.
                    </p>

                    <div
                        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                            isDragging
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                        }`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    >
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                            isDragging ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                            <Upload className="w-8 h-8" />
                        </div>

                        <p className="text-lg font-medium text-slate-700 mb-2">
                            {isDragging ? '여기에 놓으세요' : 'PDF / PPTX 파일을 드래그하거나 클릭'}
                        </p>
                        <p className="text-sm text-slate-500">
                            PDF, PowerPoint 파일을 AI가 자동 분석합니다
                        </p>

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                            onChange={handleFileSelect}
                        />
                    </div>
                </div>
            )}

            {/* Step 2: 분석 중 */}
            {status === 'analyzing' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">AI가 분석 중입니다</h2>
                    <p className="text-slate-500 mb-4">파일에서 텍스트를 추출하고 분류합니다</p>

                    <div className="max-w-xs mx-auto text-left text-sm text-slate-600 space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span>파일에서 텍스트 추출 중...</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
                            <span>제목, 분류 자동 분석 중...</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: 검토 및 수정 (기존 자료 수정 폼과 동일한 형식) */}
            {(status === 'review' || status === 'saving') && analysisResult && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    {analysisResult.error && (
                        <div className="flex items-center gap-2 bg-yellow-50 text-yellow-800 p-3 rounded-lg mb-4 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            <span>{analysisResult.errorMessage || '일부 정보를 추출하지 못했습니다. 직접 수정해주세요.'}</span>
                        </div>
                    )}

                    {/* 제목 */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
                        <input
                            type="text"
                            value={analysisResult.title}
                            onChange={(e) => setAnalysisResult({ ...analysisResult, title: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="자료 제목"
                        />
                    </div>

                    {/* 분류 & 태그 */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">분류</label>
                            <select
                                value={analysisResult.category}
                                onChange={(e) => setAnalysisResult({ ...analysisResult, category: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="disease">질환 정보</option>
                                <option value="guide">의학 가이드</option>
                                <option value="news">건강 뉴스</option>
                                <option value="gallery">갤러리</option>
                                <option value="webtoon">웹툰</option>
                                <option value="app">AI/앱</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">태그 (쉼표로 구분)</label>
                            <input
                                type="text"
                                value={analysisResult.tags.join(', ')}
                                onChange={(e) => setAnalysisResult({
                                    ...analysisResult,
                                    tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                                })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="태그1, 태그2"
                            />
                        </div>
                    </div>

                    {/* 첨부 파일 */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">첨부 파일 / 이미지 미리보기</label>
                        <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                            {file && (
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-red-500" />
                                    <span className="text-blue-600 font-medium">{file.name}</span>
                                    <span className="text-slate-400 text-sm">
                                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 요약 */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">요약</label>
                        <input
                            type="text"
                            value={analysisResult.summary}
                            onChange={(e) => setAnalysisResult({ ...analysisResult, summary: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="자료 요약"
                        />
                    </div>

                    {/* 본문 */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-1">본문 (Markdown 지원)</label>
                        <textarea
                            value={analysisResult.content}
                            onChange={(e) => setAnalysisResult({ ...analysisResult, content: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            rows={12}
                            placeholder="## 내용&#10;&#10;본문 내용..."
                        />
                    </div>

                    {/* 버튼 */}
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={status === 'saving'}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                        >
                            {status === 'saving' ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    저장 중...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    수정사항 저장
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 4: 완료 */}
            {status === 'complete' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-green-600 mb-2">등록 완료!</h2>
                    <p className="text-slate-500">목록으로 이동합니다...</p>
                </div>
            )}
        </div>
    );
}
