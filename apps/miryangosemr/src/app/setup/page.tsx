'use client';

import React from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import Link from 'next/link';
import {
  Settings, Building2, UserCog, Shield, Wifi, HardDrive,
  Stethoscope, CreditCard, Database, Trash2,
} from 'lucide-react';

export default function SetupPage() {
  return <EMRLayout><SetupContent /></EMRLayout>;
}

const settingsCategories = [
  {
    title: '기관 설정',
    items: [
      { href: '/setup/hospital', label: '병원정보', desc: '명칭, 기호, 주소, 계좌, 대표자', icon: Building2, color: 'bg-blue-100 text-blue-600' },
      { href: '/setup/doctors', label: '의사 관리', desc: '의사코드, 면허번호, 전문의', icon: Stethoscope, color: 'bg-emerald-100 text-emerald-600' },
    ],
  },
  {
    title: '보험/청구 설정',
    items: [
      { href: '/setup/insurance', label: '보험 설정', desc: '본인부담율, 절사, 가산율', icon: CreditCard, color: 'bg-purple-100 text-purple-600' },
      { href: '/setup/edi', label: 'EDI 설정', desc: 'HIRA 심평원 전송 설정', icon: Wifi, color: 'bg-orange-100 text-orange-600' },
    ],
  },
  {
    title: '시스템 관리',
    items: [
      { href: '/setup/security', label: '보안 설정', desc: '사용자 인증, 접근 제어', icon: Shield, color: 'bg-red-100 text-red-600' },
      { href: '/setup/backup', label: '백업/복원', desc: '데이터 백업, 복원 관리', icon: HardDrive, color: 'bg-slate-100 text-slate-600' },
    ],
  },
  {
    title: '개발/테스트',
    items: [
      { href: '/setup/seed', label: '테스트 데이터', desc: '더미 환자/진료 데이터 생성', icon: Database, color: 'bg-amber-100 text-amber-600' },
    ],
  },
];

function SetupContent() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-600" /> 환경설정
        </h1>
        <p className="text-sm text-slate-500 mt-1">병원 운영에 필요한 설정을 관리합니다.</p>
      </div>

    const seedPatients = async () => {
        setLoading(true);
        addLog("Starting Patient Seeding...");
        try {
            const patientsRef = collection(db, 'patients');

            const dummyPatients = [
                {
                    name: "Test Subject 01",
                    rrn: "800101-1234567",
                    gender: "male",
                    birthDate: "1980-01-01",
                    phone: "010-1111-2222",
                    address: "Seoul, Gangnam-gu",
                    memo: "Hypertension History",
                    createdAt: serverTimestamp()
                },
                {
                    name: "Test Subject 02",
                    rrn: "900505-2345678",
                    gender: "female",
                    birthDate: "1990-05-05",
                    phone: "010-3333-4444",
                    address: "Busan, Haeundae",
                    createdAt: serverTimestamp()
                },
                {
                    name: "Test Subject 03",
                    rrn: "151225-3456789",
                    gender: "male",
                    birthDate: "2015-12-25",
                    phone: "010-5555-6666",
                    address: "Miryang, City Center",
                    memo: " Pediatric Patient",
                    createdAt: serverTimestamp()
                }
            ];

            let count = 0;
            for (const p of dummyPatients) {
                const q = query(patientsRef, where("name", "==", p.name));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    addLog(`Skipped: ${p.name} (Already exists)`);
                } else {
                    await addDoc(patientsRef, p);
                    addLog(`Created: ${p.name}`);
                    count++;
                }
            }
            addLog(`Seeding Complete. Added ${count} patients.`);

        } catch (e: unknown) {
            addLog(`Error: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setLoading(false);
        }
    };

    const clearVisits = async () => {
        if (!confirm("Are you sure you want to delete all visits?")) return;

        setLoading(true);
        addLog("Clearing Visits...");
        try {
            const q = query(collection(db, 'visits'));
            const snap = await getDocs(q);
            const batch = writeBatch(db);
            snap.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            addLog(`Deleted ${snap.size} visits.`);
        } catch (e: unknown) {
            addLog(`Error clearing visits: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-10 max-w-2xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-slate-800">Clinical Test Setup</h1>
            <p className="text-slate-500">Use this page to populate dummy data for testing the clinical workflow.</p>

            <div className="grid grid-cols-1 gap-4">
                <button
                    onClick={seedPatients}
                    disabled={loading}
                    className="flex items-center justify-center gap-3 p-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Database />}
                    <div className="text-left">
                        <div className="font-bold text-lg">Seed Dummy Patients</div>
                        <div className="text-emerald-100 text-sm">Creates 3 test patients</div>
                    </div>
                </button>

                <button
                    onClick={clearVisits}
                    disabled={loading}
                    className="flex items-center justify-center gap-3 p-6 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Trash2 />}
                    <div className="text-left">
                        <div className="font-bold text-lg">Reset Visits</div>
                        <div className="text-rose-100 text-sm">Clears all active/past visits</div>
                    </div>
                </button>
            </div>

            <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-sm h-64 overflow-y-auto">
                {logs.length === 0 ? <span className="text-slate-600">No activity yet...</span> : logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
        </div>
      ))}
    </div>
  );
}
