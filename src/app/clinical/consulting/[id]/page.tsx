'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-clinical';
import { Visit } from '@/types/clinical';
import { Loader2, Mic, ArrowLeft, Save, Square, Play, Pause, ChevronDown, CheckCircle } from 'lucide-react';

interface Transcript {
    text: string;
    isFinal: boolean;
}

export default function ConsultingDetailPage() {
    const params = useParams();
    const router = useRouter();
    const visitId = params.id as string;

    // State
    const [visit, setVisit] = useState<Visit | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // STT State
    const [isListening, setIsListening] = useState(false);
    const [activeField, setActiveField] = useState<'cc' | 'diagnosis' | 'plan' | null>('plan'); // Default dictating to Plan
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<any>(null);

    // Form Data
    const [formData, setFormData] = useState({
        cc: '',
        diagnosis: '',
        plan: ''
    });

    useEffect(() => {
        if (visitId) fetchVisit();
    }, [visitId]);

    // Initialize Web Speech API
    useEffect(() => {
        if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'ko-KR';

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);

            recognition.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                // If we have final text, append it to the ACTIVE field
                if (finalTranscript && activeField) {
                    setFormData(prev => ({
                        ...prev,
                        [activeField]: (prev[activeField] || '') + ' ' + finalTranscript
                    }));
                }

                // Show interim results (feedback)
                setTranscript(interimTranscript);
            };

            recognitionRef.current = recognition;
        } else {
            console.warn("Web Usage API not supported in this browser");
        }
    }, [activeField]);

    const fetchVisit = async () => {
        try {
            const docRef = doc(db, 'visits', visitId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                setVisit({ ...data, id: snap.id } as Visit);
                setFormData({
                    cc: data.chiefComplaint || '',
                    diagnosis: data.diagnosis || '',
                    plan: data.treatmentNote || ''
                });

                // If status is 'reception', auto-switch to 'consulting' (Start Visit)
                if (data.status === 'reception') {
                    await updateDoc(docRef, {
                        status: 'consulting',
                        startedAt: serverTimestamp() // Add this field to schema later if needed
                    });
                }
            } else {
                alert("존재하지 않는 차트입니다.");
                router.push('/clinical/consulting');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleRecording = () => {
        if (!recognitionRef.current) {
            alert("이 브라우저는 음성 인식을 지원하지 않습니다. Chrome을 사용해주세요.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
    };

    const handleSave = async (complete: boolean = false) => {
        if (!visitId) return;
        setSaving(true);
        try {
            const docRef = doc(db, 'visits', visitId);
            const updates: any = {
                chiefComplaint: formData.cc,
                diagnosis: formData.diagnosis,
                treatmentNote: formData.plan,
                updatedAt: serverTimestamp()
            };

            if (complete) {
                updates.status = 'completed';
                updates.completedAt = serverTimestamp();
            }

            await updateDoc(docRef, updates);

            if (complete) {
                router.push('/clinical/consulting');
            } else {
                // Just notify save
            }
        } catch (e) {
            console.error(e);
            alert("저장 실패");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center">Loading...</div>;
    if (!visit) return null;

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col max-w-7xl mx-auto">
            {/* Top Bar: Patient Info & Actions */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-700">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            {visit.patientName}
                            <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                {visit.type === 'new' ? '신환' : '재진'}
                            </span>
                        </h1>
                        <p className="text-xs text-slate-500">
                            접수: {new Date(visit.date.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Voice Controls */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${isListening ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                        <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} />
                        <span className="text-sm font-medium text-slate-700">
                            {isListening ? 'Listening...' : '마이크 대기'}
                        </span>
                    </div>

                    <button
                        onClick={() => toggleRecording()}
                        className={`p-3 rounded-full shadow-md transition-all ${isListening ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
                        title={isListening ? "기록 중지 (Space)" : "기록 시작 (Space)"}
                    >
                        {isListening ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                    </button>

                    <div className="w-px h-8 bg-slate-200 mx-2" />

                    <button
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-medium"
                    >
                        <Save className="w-4 h-4" /> 저장
                    </button>
                    <button
                        onClick={() => handleSave(true)}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700 text-white font-bold shadow-md"
                    >
                        <CheckCircle className="w-4 h-4" /> 진료 완료
                    </button>
                </div>
            </div>

            {/* Main Workspace: 3-Column Layout */}
            <div className="flex-1 overflow-hidden flex bg-slate-50">
                {/* 1. History / Profile (Left) */}
                <div className="w-80 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
                    <div className="p-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-700 mb-2">환자 정보</h3>
                        <div className="space-y-2 text-sm text-slate-600">
                            <p>성별/나이: 생략</p>
                            <p>연락처: 생략</p>
                            <p className="text-red-500 font-bold">특이사항: 페니실린 알러지</p>
                        </div>
                    </div>
                    <div className="p-4 flex-1">
                        <h3 className="font-bold text-slate-700 mb-4">과거 진료 기록</h3>
                        <div className="text-center text-slate-400 text-sm mt-10">
                            기록 없음
                        </div>
                    </div>
                </div>

                {/* 2. Charting Area (Center - Dynamic Inputs) */}
                <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 max-w-4xl mx-auto w-full">

                    {/* Live Transcript Feedback */}
                    {isListening && transcript && (
                        <div className="bg-slate-800 text-white p-4 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2 mb-4">
                            <p className="text-lg">{transcript}</p>
                        </div>
                    )}

                    {/* Section: Chief Complaint */}
                    <div
                        onClick={() => setActiveField('cc')}
                        className={`bg-white rounded-xl border-2 p-6 transition-all cursor-text ${activeField === 'cc' ? 'border-emerald-500 shadow-md ring-4 ring-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <label className={`block text-sm font-bold uppercase tracking-wider mb-2 ${activeField === 'cc' ? 'text-emerald-700' : 'text-slate-500'}`}>
                            Subjective (C.C / 증상)
                        </label>
                        <textarea
                            value={formData.cc}
                            onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
                            placeholder="환자가 호소하는 증상을 말씀하세요..."
                            className="w-full min-h-[80px] text-lg resize-none outline-none placeholder:text-slate-300"
                        />
                        {activeField === 'cc' && isListening && (
                            <div className="flex items-center gap-2 text-red-500 text-sm animate-pulse mt-2">
                                <Mic className="w-3 h-3" /> 듣고 있습니다...
                            </div>
                        )}
                    </div>

                    {/* Section: Diagnosis */}
                    <div
                        onClick={() => setActiveField('diagnosis')}
                        className={`bg-white rounded-xl border-2 p-6 transition-all cursor-text ${activeField === 'diagnosis' ? 'border-emerald-500 shadow-md ring-4 ring-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <label className={`block text-sm font-bold uppercase tracking-wider mb-2 ${activeField === 'diagnosis' ? 'text-emerald-700' : 'text-slate-500'}`}>
                            Assessment (진단)
                        </label>
                        <textarea
                            value={formData.diagnosis}
                            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                            placeholder="진단명을 말씀하세요..."
                            className="w-full min-h-[60px] text-lg resize-none outline-none placeholder:text-slate-300"
                        />
                        {activeField === 'diagnosis' && isListening && (
                            <div className="flex items-center gap-2 text-red-500 text-sm animate-pulse mt-2">
                                <Mic className="w-3 h-3" /> 듣고 있습니다...
                            </div>
                        )}
                    </div>

                    {/* Section: Plan */}
                    <div
                        onClick={() => setActiveField('plan')}
                        className={`bg-white rounded-xl border-2 p-6 transition-all cursor-text flex-1 ${activeField === 'plan' ? 'border-emerald-500 shadow-md ring-4 ring-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <label className={`block text-sm font-bold uppercase tracking-wider mb-2 ${activeField === 'plan' ? 'text-emerald-700' : 'text-slate-500'}`}>
                            Plan (치료 및 처방)
                        </label>
                        <textarea
                            value={formData.plan}
                            onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                            placeholder="처방 내용을 말씀하세요..."
                            className="w-full h-full min-h-[150px] text-lg resize-none outline-none placeholder:text-slate-300 bg-transparent"
                        />
                        {activeField === 'plan' && isListening && (
                            <div className="flex items-center gap-2 text-red-500 text-sm animate-pulse mt-2">
                                <Mic className="w-3 h-3" /> 듣고 있습니다...
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Orders / Bundles (Right) - Placeholder */}
                <div className="w-72 border-l border-slate-200 bg-slate-50 p-4 hidden xl:block">
                    <h3 className="font-bold text-slate-700 mb-4">빠른 처방 (Bundles)</h3>
                    <div className="space-y-2">
                        <button className="w-full text-left p-3 bg-white border border-slate-200 rounded-lg hover:border-emerald-300 hover:shadow-sm transition-all text-sm">
                            <span className="font-bold block text-slate-800">감기 세트 A</span>
                            <span className="text-slate-400 text-xs">AAP, Cough syrup</span>
                        </button>
                        <button className="w-full text-left p-3 bg-white border border-slate-200 rounded-lg hover:border-emerald-300 hover:shadow-sm transition-all text-sm">
                            <span className="font-bold block text-slate-800">물리치료 (기본)</span>
                            <span className="text-slate-400 text-xs">IR, TENS, ICT</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
