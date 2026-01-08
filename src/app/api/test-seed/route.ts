
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-clinical';
import { collection, doc, setDoc, serverTimestamp, query, where, orderBy, getDocs } from 'firebase/firestore';
import { startOfDay } from 'date-fns';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // 'seed' or 'verify'

    try {
        if (mode === 'verify') {
            const today = startOfDay(new Date());
            const q = query(
                collection(db, 'visits'),
                where('date', '>=', today),
                orderBy('date', 'asc')
            );
            const snapshot = await getDocs(q);
            const visits = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            return NextResponse.json({
                success: true,
                count: visits.length,
                visits: visits.map((v: any) => `${v.patientName} (${v.status})`)
            });
        }

        if (mode === 'update') {
            const today = startOfDay(new Date());
            const q = query(
                collection(db, 'visits'),
                where('date', '>=', today),
                orderBy('date', 'asc')
            );
            const snapshot = await getDocs(q);
            const visit = snapshot.docs.find(d => d.data().status === 'reception');
            if (visit) {
                await setDoc(doc(db, 'visits', visit.id), { status: 'consulting' }, { merge: true });
                return NextResponse.json({ success: true, moved: visit.data().patientName });
            }
            return NextResponse.json({ success: false, message: 'No waiting patients' });
        }

        // Default: Seed
        const patients = [
            { name: '테스트환자A', birth: '19800101', gender: 'male', phone: '01011111111', rrn: '800101-1' },
            { name: '테스트환자B', birth: '19900505', gender: 'female', phone: '01022222222', rrn: '900505-2' },
            { name: '테스트환자C', birth: '20001225', gender: 'male', phone: '01033333333', rrn: '001225-3' }
        ];

        const log = [];

        for (const p of patients) {
            // 1. Create Patient
            // Generate Random ID like UI does: YYYYMMDD-XXXX
            const date = new Date();
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const random = Math.floor(1000 + Math.random() * 9000);
            const chartNumber = `${yyyy}${mm}${dd}-${random}`;

            // Patient Doc
            await setDoc(doc(db, 'patients', chartNumber), {
                id: chartNumber,
                name: p.name,
                birthDate: p.birth,
                gender: p.gender,
                phone: p.phone,
                rrn: p.rrn,
                address: '서울시 테스트구',
                memo: '자동 생성된 테스트',
                createdAt: serverTimestamp(),
                lastVisit: serverTimestamp()
            });
            log.push(`Created Patient: ${p.name} (${chartNumber})`);

            // 2. Create Visit (Reception)
            const visitRef = doc(collection(db, 'visits'));
            await setDoc(visitRef, {
                id: visitRef.id,
                patientId: chartNumber,
                patientName: p.name,
                date: serverTimestamp(),
                status: 'reception',
                type: 'new',
                insuranceType: 'nhis',
                chiefComplaint: '정기 검진',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            log.push(`Created Visit for ${p.name}`);
        }

        return NextResponse.json({ success: true, log });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
