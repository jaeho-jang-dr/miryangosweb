
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import ImageUpload from '@/components/image-upload';

export default function EditStaffPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        role: '',
        specialties: '',
        imageUrl: '',
        order: 0
    });

    useEffect(() => {
        const fetchStaff = async () => {
            if (!params.id) return;
            try {
                const docRef = doc(db, 'staff', params.id as string);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setFormData({
                        name: data.name,
                        role: data.role || '',
                        specialties: data.specialties ? data.specialties.join(', ') : '',
                        imageUrl: data.imageUrl || '',
                        order: data.order || 0
                    });
                } else {
                    alert("해당 의료진을 찾을 수 없습니다.");
                    router.push('/admin/staff');
                }
            } catch (error) {
                console.error("Error loading staff:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStaff();
    }, [params.id, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const docRef = doc(db, 'staff', params.id as string);
            await updateDoc(docRef, {
                name: formData.name,
                role: formData.role,
                specialties: formData.specialties.split(',').map(s => s.trim()).filter(s => s),
                imageUrl: formData.imageUrl,
                order: Number(formData.order)
            });

            router.push('/admin/staff');
        } catch (error) {
            console.error("Error updating staff:", error);
            alert("수정 중 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/admin/staff"
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold">의료진 수정</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">이름</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">직책</label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">선택하세요</option>
                            <option value="원장">원장</option>
                            <option value="과장">과장</option>
                            <option value="간호팀장">간호팀장</option>
                            <option value="물리치료사">물리치료사</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">전문 분야 (쉼표로 구분)</label>
                    <input
                        type="text"
                        value={formData.specialties}
                        onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <ImageUpload
                        directory="staff"
                        currentImageUrl={formData.imageUrl}
                        onImageUploaded={(url) => setFormData({ ...formData, imageUrl: url })}
                        onImageRemoved={() => setFormData({ ...formData, imageUrl: '' })}
                        label="프로필 사진"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">정렬 순서</label>
                    <input
                        type="number"
                        value={formData.order}
                        onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
