'use client';

import { useState } from 'react';
import { collection, addDoc, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';

export default function DebugPage() {
    const [status, setStatus] = useState<string[]>([]);

    const log = (msg: string) => setStatus(prev => [...prev, msg]);

    const seedStaff = async () => {
        log("Seeding Staff...");
        try {
            const staffRef = collection(db, 'staff');
            await addDoc(staffRef, {
                name: 'Dr. Jang',
                role: '원장',
                specialties: ['척추', '관절', '외상'],
                imageUrl: '',
                order: 1
            });
            await addDoc(staffRef, {
                name: 'Dr. Yi',
                role: '과장',
                specialties: ['내과', '소아과'],
                imageUrl: '',
                order: 2
            });
            log("Staff seeded successfully.");
        } catch (e: any) {
            log(`Error seeding staff: ${e.message}`);
        }
    };

    const seedNotices = async () => {
        log("Seeding Notices...");
        try {
            const noticesRef = collection(db, 'notices');
            await addDoc(noticesRef, {
                title: '홈페이지 개편 안내',
                body: '밀양정형외과 홈페이지가 새롭게 개편되었습니다. 많은 이용 바랍니다.',
                createdAt: Timestamp.now(),
                isVisible: true,
                isPinned: true
            });
            await addDoc(noticesRef, {
                title: '3월 진료 일정 안내',
                body: '3월 1일은 휴진입니다. 진료에 착오 없으시기 바랍니다.',
                createdAt: Timestamp.now(),
                isVisible: true,
                isPinned: false
            });
            log("Notices seeded successfully.");
        } catch (e: any) {
            log(`Error seeding notices: ${e.message}`);
        }
    };

    const checkNoticesQuery = async () => {
        log("Checking Notices Query (Index Check)...");
        try {
            const q = query(
                collection(db, 'notices'),
                where('isVisible', '==', true),
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            log(`Notices Query Success! Found ${snap.size} docs.`);
        } catch (e: any) {
            log(`Notices Query FAILED: ${e.message}`);
            if (e.message.includes('requires an index')) {
                log("PLEASE CREATE THE INDEX IN FIREBASE CONSOLE.");
            }
        }
    };

    const seedArchives = async () => {
        log("Seeding Archives...");
        try {
            const archivesRef = collection(db, 'articles');
            await addDoc(archivesRef, {
                title: '허리 디스크 예방 운동법',
                type: 'guide',
                tags: ['허리', '운동', '예방'],
                summary: '집에서 간단하게 할 수 있는 허리 디스크 예방 스트레칭을 소개합니다.',
                createdAt: Timestamp.now()
            });
            await addDoc(archivesRef, {
                title: '관절염에 좋은 음식',
                type: 'disease',
                tags: ['관절염', '음식', '건강'],
                summary: '관절 건강에 도움을 주는 다양한 음식재료와 식단을 알아봅니다.',
                createdAt: Timestamp.now()
            });
            log("Archives seeded successfully.");
        } catch (e: any) {
            log(`Error seeding archives: ${e.message}`);
        }
    };

    return (
        <div className="p-8 space-y-4">
            <h1 className="text-2xl font-bold">Public Data Seeding & Debug</h1>
            <div className="flex gap-4">
                <button onClick={seedStaff} className="px-4 py-2 bg-blue-500 text-white rounded">Seed Staff</button>
                <button onClick={seedNotices} className="px-4 py-2 bg-green-500 text-white rounded">Seed Notices</button>
                <button onClick={seedArchives} className="px-4 py-2 bg-purple-500 text-white rounded">Seed Archives</button>
                <button onClick={checkNoticesQuery} className="px-4 py-2 bg-red-500 text-white rounded">Test Notices Query</button>
            </div>
            <div className="bg-slate-100 p-4 rounded h-64 overflow-auto font-mono text-sm">
                {status.map((s, i) => <div key={i}>{s}</div>)}
            </div>
        </div>
    );
}
