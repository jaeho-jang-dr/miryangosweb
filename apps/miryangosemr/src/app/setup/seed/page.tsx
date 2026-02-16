'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Trash2, Database, ArrowLeft } from 'lucide-react';
import EMRLayout from '@/components/layout/EMRLayout';
import Link from 'next/link';

export default function SeedPage() {
  return <EMRLayout><SeedPageContent /></EMRLayout>;
}

function SeedPageContent() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

  const seedPatients = async () => {
    setLoading(true);
    addLog("Starting Patient Seeding...");
    try {
      const patientsRef = collection(db, 'patients');
      const dummyPatients = [
        { name: "테스트환자01", rrn: "800101-1234567", gender: "male", birthDate: "1980-01-01", phone: "010-1111-2222", address: "경남 밀양시 중앙로", memo: "고혈압 병력", createdAt: serverTimestamp() },
        { name: "테스트환자02", rrn: "900505-2345678", gender: "female", birthDate: "1990-05-05", phone: "010-3333-4444", address: "부산 해운대구", createdAt: serverTimestamp() },
        { name: "테스트환자03", rrn: "151225-3456789", gender: "male", birthDate: "2015-12-25", phone: "010-5555-6666", address: "경남 밀양시 삼문동", memo: "소아환자", createdAt: serverTimestamp() },
      ];

      let count = 0;
      for (const p of dummyPatients) {
        const q = query(patientsRef, where("name", "==", p.name));
        const snap = await getDocs(q);
        if (!snap.empty) {
          addLog(`건너뜀: ${p.name} (이미 존재)`);
        } else {
          await addDoc(patientsRef, p);
          addLog(`생성: ${p.name}`);
          count++;
        }
      }
      addLog(`완료. ${count}명 추가됨.`);
    } catch (e: unknown) {
      addLog(`오류: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const clearVisits = async () => {
    if (!confirm("모든 진료기록을 삭제하시겠습니까?")) return;
    setLoading(true);
    addLog("진료기록 삭제중...");
    try {
      const q = query(collection(db, 'visits'));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach(doc => { batch.delete(doc.ref); });
      await batch.commit();
      addLog(`${snap.size}건 삭제됨.`);
    } catch (e: unknown) {
      addLog(`오류: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/setup" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-amber-600" /> 테스트 데이터
          </h1>
          <p className="text-sm text-slate-500">더미 환자 데이터 생성 및 진료 데이터 초기화</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button onClick={seedPatients} disabled={loading}
          className="flex items-center justify-center gap-3 p-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg transition-all disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" /> : <Database />}
          <div className="text-left">
            <div className="font-bold text-lg">더미 환자 생성</div>
            <div className="text-emerald-100 text-sm">테스트용 환자 3명 생성</div>
          </div>
        </button>

        <button onClick={clearVisits} disabled={loading}
          className="flex items-center justify-center gap-3 p-6 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg transition-all disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" /> : <Trash2 />}
          <div className="text-left">
            <div className="font-bold text-lg">진료기록 초기화</div>
            <div className="text-rose-100 text-sm">모든 진료기록 삭제</div>
          </div>
        </button>
      </div>

      <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-sm h-64 overflow-y-auto">
        {logs.length === 0 ? <span className="text-slate-600">대기중...</span> : logs.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
