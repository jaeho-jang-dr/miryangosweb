'use client';

import React, { useState, useEffect } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Stethoscope, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function DoctorsSetupPage() {
  return <EMRLayout><DoctorsSetupContent /></EMRLayout>;
}

interface Doctor {
  id: string;
  name: string;
  licenseNo: string;
  specialtyCode: string;
  specialtyName: string;
  isSpecialist: boolean;
  isActive: boolean;
  phone?: string;
  email?: string;
}

const EMPTY_DOCTOR: Omit<Doctor, 'id'> = {
  name: '', licenseNo: '', specialtyCode: '', specialtyName: '',
  isSpecialist: false, isActive: true, phone: '', email: '',
};

function DoctorsSetupContent() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Omit<Doctor, 'id'> & { id?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadDoctors = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'doctors'), orderBy('name', 'asc')));
      setDoctors(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Doctor));
    } catch (e) {
      console.error('의사 목록 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDoctors(); }, []);

  const handleSave = async () => {
    if (!editing || !editing.name || !editing.licenseNo) {
      alert('이름과 면허번호는 필수입니다.');
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        const { id, ...data } = editing as Doctor;
        await updateDoc(doc(db, 'doctors', id), { ...data, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'doctors'), { ...editing, createdAt: serverTimestamp() });
      }
      setEditing(null);
      await loadDoctors();
    } catch (e) {
      console.error('의사 저장 실패:', e);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'doctors', id));
      await loadDoctors();
    } catch (e) {
      console.error('의사 삭제 실패:', e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/setup" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-emerald-600" /> 의사 관리
            </h1>
            <p className="text-sm text-slate-500">진료 의사 정보를 관리합니다.</p>
          </div>
        </div>
        <button onClick={() => setEditing({ ...EMPTY_DOCTOR })}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> 의사 추가
        </button>
      </div>

      {/* Edit Form */}
      {editing && (
        <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-4">{editing.id ? '의사 수정' : '새 의사 등록'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">성명 *</label>
              <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">면허번호 *</label>
              <input value={editing.licenseNo} onChange={e => setEditing({ ...editing, licenseNo: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">전문과목코드</label>
              <input value={editing.specialtyCode} onChange={e => setEditing({ ...editing, specialtyCode: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-lg" placeholder="예: 16" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">전문과목명</label>
              <input value={editing.specialtyName} onChange={e => setEditing({ ...editing, specialtyName: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-lg" placeholder="예: 정형외과" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">연락처</label>
              <input value={editing.phone || ''} onChange={e => setEditing({ ...editing, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">이메일</label>
              <input value={editing.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-lg" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.isSpecialist}
                onChange={e => setEditing({ ...editing, isSpecialist: e.target.checked })}
                className="rounded border-slate-300" /> 전문의
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.isActive}
                onChange={e => setEditing({ ...editing, isActive: e.target.checked })}
                className="rounded border-slate-300" /> 활성
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50 flex items-center gap-1">
              <X className="w-4 h-4" /> 취소
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 flex items-center gap-1 disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? '저장중...' : '저장'}
            </button>
          </div>
        </div>
      )}

      {/* Doctor List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">성명</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">면허번호</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">전문과목</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">전문의</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">상태</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : doctors.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">등록된 의사가 없습니다.</td></tr>
              ) : doctors.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{d.licenseNo}</td>
                  <td className="px-4 py-3">{d.specialtyName || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    {d.isSpecialist ? <Badge variant="info">전문의</Badge> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={d.isActive ? 'success' : 'default'}>{d.isActive ? '활성' : '비활성'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setEditing(d)} className="p-1.5 hover:bg-slate-100 rounded"><Pencil className="w-3.5 h-3.5 text-slate-400" /></button>
                      <button onClick={() => handleDelete(d.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
