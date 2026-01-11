
"use client";

import { useState } from 'react';
import { Sparkles, BookOpen, Share2 } from 'lucide-react';

export default function MedicalReportPage() {
    const [topic, setTopic] = useState('');
    const [status, setStatus] = useState<'idle' | 'generating_text' | 'generating_images' | 'complete'>('idle');

    const [reportText, setReportText] = useState('');
    const [reportImages, setReportImages] = useState<string[]>([]);

    const [error, setError] = useState('');

    const handleStartResearch = async () => {
        if (!topic.trim()) return;

        // Reset State
        setStatus('generating_text');
        setReportText('');
        setReportImages([]);
        setError('');

        try {
            // Step 1: Get Text Report (Robust)
            const textResponse = await fetch('/api/medical-report/text', {
                method: 'POST',
                body: JSON.stringify({ topic }),
            });

            if (!textResponse.ok) throw new Error("텍스트 생성 실패");
            const textData = await textResponse.json();
            setReportText(textData.markdown);

            // Step 2: Get Images (Independent)
            setStatus('generating_images');
            const imgResponse = await fetch('/api/medical-report/images', {
                method: 'POST',
                body: JSON.stringify({ topic, context: textData.markdown.substring(0, 500) }),
            });

            if (imgResponse.ok) {
                const imgData = await imgResponse.json();
                setReportImages(imgData.images);
            }

            setStatus('complete');

        } catch (e: any) {
            setError(e.message);
            setStatus('idle');
        }
    };

    const handleSaveToLibrary = async () => {
        if (!confirm("자료실에 등록하시겠습니까?")) return;
        try {
            const { db, auth } = await import("@/lib/firebase-public");
            const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");

            if (!auth.currentUser) {
                alert("관리자 로그인이 필요합니다.");
                return;
            }

            // Append images to markdown
            let finalContent = reportText + "\n\n## 🎨 교육용 삽화 (Medical Illustrations)\n\n";
            reportImages.forEach((url, i) => {
                finalContent += `![필수 삽화 ${i + 1}](${url})\n\n`;
            });

            await addDoc(collection(db, 'articles'), {
                title: `${topic} - AI 의학 리포트`,
                type: 'disease',
                tags: [topic, 'AI리포트', 'Dr.Jay'],
                summary: reportText.substring(0, 100).replace(/[#*]/g, '') + "...",
                content: finalContent,
                images: reportImages, // for gallery view
                isVisible: true,
                createdAt: serverTimestamp()
            });
            alert("✅ 자료실에 성공적으로 등록되었습니다!");
        } catch (e: any) {
            alert("등록 실패: " + e.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10 transition-shadow hover:shadow-sm">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight text-slate-800">Dr.Jay's Medical Notebook</span>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-12">

                {/* Input Section */}
                <div className="mb-12 text-center">
                    <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                        어떤 질병을 연구할까요?
                    </h1>
                    <p className="text-slate-500 mb-10 text-lg leading-relaxed max-w-2xl mx-auto">
                        AI가 수천 건의 의학 자료를 분석하여<br className="hidden md:block" />
                        당신만을 위한 <strong>심층 리포트</strong>와 <strong>교육용 삽화</strong>를 생성합니다.
                    </p>

                    <div className="relative max-w-xl mx-auto group">
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleStartResearch()}
                            placeholder="예: 족저근막염, 대상포진, 거북목..."
                            className="w-full p-5 pl-8 pr-16 bg-white border-2 border-slate-200 rounded-full text-lg shadow-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none placeholder:text-slate-300"
                            disabled={status !== 'idle' && status !== 'complete'}
                        />
                        <button
                            onClick={handleStartResearch}
                            disabled={status !== 'idle' && status !== 'complete'}
                            className="absolute right-2 top-2 p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 hover:scale-105 transition-all shadow-md active:scale-95 disabled:bg-slate-300 disabled:shadow-none disabled:scale-100"
                        >
                            <Sparkles className="w-6 h-6" />
                        </button>
                    </div>
                    {error && <p className="text-red-500 mt-4 font-medium">{error}</p>}
                </div>

                {/* Loading State - NotebookLM inspired pulse */}
                {(status === 'generating_text' || status === 'generating_images') && (
                    <div className="my-12 p-10 border border-indigo-100 bg-white/80 backdrop-blur-sm rounded-2xl flex flex-col items-center shadow-lg animate-pulse ring-1 ring-indigo-50">
                        <div className="relative">
                            <Sparkles className="w-12 h-12 text-indigo-500 animate-spin-slow mb-6" />
                            <div className="absolute inset-0 bg-indigo-200 blur-xl opacity-20 rounded-full"></div>
                        </div>
                        <p className="text-indigo-900 font-bold text-xl mb-2">
                            {status === 'generating_text' ? 'AI가 문헌을 분석 중입니다...' : '교육용 삽화를 생성하고 있습니다...'}
                        </p>
                        <p className="text-indigo-600/80 text-sm">
                            {status === 'generating_text' ? '최신 의학 가이드라인을 기반으로 작성됩니다.' : '이해를 돕기 위한 이미지를 그리고 있습니다.'}
                        </p>
                    </div>
                )}

                {/* Report View (NotebookLM Style) */}
                {reportText && (
                    <div className="animate-fade-in-up">
                        {/* Paper Surface */}
                        <article className="bg-white p-8 md:p-14 rounded-2xl shadow-xl border border-slate-100/50 ring-1 ring-slate-200/50">
                            <div className="flex items-center gap-2 mb-8 text-xs text-indigo-600 font-bold uppercase tracking-widest">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                                AI Generated Report
                            </div>

                            {/* Render Markdown Content - Simple whitespace handling for now */}
                            {/* In a real app we'd use react-markdown here */}
                            <div className="whitespace-pre-wrap leading-loose text-slate-700 text-lg">
                                {reportText}
                            </div>

                            {/* Images Grid */}
                            {reportImages.length > 0 && (
                                <div className="mt-12 pt-12 border-t border-slate-100">
                                    <h3 className="text-xl font-bold mb-6 text-slate-900 flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-purple-500" />
                                        교육용 삽화
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {reportImages.map((url, idx) => (
                                            <div key={idx} className="group relative aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                <img src={url} alt="Generated visual" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                                <div className="absolute top-3 left-3 bg-white/90 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm backdrop-blur-md">
                                                    #{idx + 1}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </article>

                        {/* FAB / Action Bar */}
                        <div className="sticky bottom-8 mt-8 flex justify-center z-20">
                            <button
                                onClick={handleSaveToLibrary}
                                className="group flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-full shadow-2xl hover:bg-slate-800 hover:-translate-y-1 transition-all font-semibold active:scale-95 ring-4 ring-white"
                            >
                                <Share2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                자료실에 리포트 저장
                            </button>
                            {/* Add download/share logical later */}
                        </div>
                        <div className="h-12"></div>
                    </div>
                )}

            </main>
        </div>
    );
}
