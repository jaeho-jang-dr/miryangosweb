'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase-clinical';
import { Button } from '@/components/ui/button'; // Assuming I can Use standard UI or just plain HTML buttons if not sure. I'll use Tailwind classes to be safe.
import { Loader2, CheckCircle, Trash2, Database } from 'lucide-react';

export default function ClinicalSetupPage() {
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

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
                // Check dupes simply by name for this test
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

        } catch (e: any) {
            addLog(`Error: ${e.message}`);
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
        } catch (e: any) {
            addLog(`Error clearing visits: ${e.message}`);
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
    );
}
