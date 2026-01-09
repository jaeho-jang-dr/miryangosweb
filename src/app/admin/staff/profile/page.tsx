'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, User } from 'lucide-react';
import Link from 'next/link';
import ImageUpload from '@/components/image-upload';

interface ProfileData {
    name: string;
    role: string;
    greeting: string;
    history: string;
    imageUrl: string;
}

export default function DoctorProfileAdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<ProfileData>({
        name: '',
        role: '병원장',
        greeting: '',
        history: '',
        imageUrl: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const docRef = doc(db, 'settings', 'director_profile');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as ProfileData;
                setFormData({
                    name: data.name || '',
                    role: data.role || '병원장',
                    greeting: data.greeting || '',
                    history: data.history || '',
                    imageUrl: data.imageUrl || ''
                });
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            await setDoc(doc(db, 'settings', 'director_profile'), {
                ...formData,
                updatedAt: serverTimestamp(),
            });

            alert("프로필이 저장되었습니다.");
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("프로필 저장 중 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600">
                    <User className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">의료진 프로필 관리</h1>
                    <p className="text-sm text-slate-500">병원장 인사말 및 프로필 정보를 관리합니다.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Image */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-900 mb-4">프로필 사진</h3>
                        <ImageUpload
                            directory="staff"
                            currentImageUrl={formData.imageUrl}
                            onImageUploaded={(url) => setFormData({ ...formData, imageUrl: url })}
                            onImageRemoved={() => setFormData({ ...formData, imageUrl: '' })}
                            label="사진 업로드"
                        />
                    </div>
                </div>

                {/* Right Column - Info */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">이름</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="예: 장재호"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">직책</label>
                                <input
                                    type="text"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="예: 병원장"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">인사말</label>
                            <textarea
                                value={formData.greeting}
                                onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                                rows={6}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                placeholder="환영 인사말을 입력하세요..."
                            />
                            <p className="text-xs text-slate-500 mt-1">줄바꿈이 그대로 반영됩니다.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">약력 및 경력 (Markdown 지원)</label>
                            <div className="bg-slate-50 rounded-lg border border-slate-300 overflow-hidden">
                                <div className="px-3 py-2 border-b border-slate-200 bg-slate-100 text-xs text-slate-500 flex gap-4">
                                    <span><b>**굵게**</b></span>
                                    <span># 제목 (큰 글씨)</span>
                                    <span>## 부제목 (중간 글씨)</span>
                                    <span>- 리스트</span>
                                </div>
                                <textarea
                                    value={formData.history}
                                    onChange={(e) => setFormData({ ...formData, history: e.target.value })}
                                    rows={15}
                                    className="w-full px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm leading-relaxed resize-y"
                                    placeholder={`# 학력
- 00대학교 의과대학 졸업
- 00대학교 대학원 의학석사

# 경력
- **현) 밀양정형외과 병원장**
- 전) 00대학교 병원 교수
- 대한정형외과학회 정회원`}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Markdown 문법을 사용하여 자유롭게 내용을 꾸밀 수 있습니다.</p>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                저장하기
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
