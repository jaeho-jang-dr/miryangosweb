
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-clinical';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function GET(request: Request) {
    // 보안: 프로덕션 환경에서는 테스트 데이터 시딩 완전 차단
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { error: 'Test seed is disabled in production' },
            { status: 403 }
        );
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    try {
        if (mode === 'clear') {
            return NextResponse.json({ message: "Clear not implemented for safety" });
        }

        const log = [];
        const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '전', '홍'];
        const NAMES = ['민준', '서준', '도윤', '예준', '시우', '하준', '지호', '지후', '준우', '준서', '서연', '서윤', '지우', '서현', '하은', '하윤', '민서', '지유', '윤서', '채원'];

        const getRandomName = () => {
            const last = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
            const first = NAMES[Math.floor(Math.random() * NAMES.length)];
            return `${last}${first}`;
        };

        const createPatientAndVisit = async (status: string, index: number) => {
            const name = getRandomName();
            const date = new Date();
            const chartNumber = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${1000 + index}`;

            // 1. Create Patient
            await setDoc(doc(db, 'patients', chartNumber), {
                id: chartNumber,
                name: name,
                birthDate: '19' + Math.floor(50 + Math.random() * 40) + '.' + String(Math.floor(1 + Math.random() * 12)).padStart(2, '0') + '.' + String(Math.floor(1 + Math.random() * 28)).padStart(2, '0'),
                gender: Math.random() > 0.5 ? 'male' : 'female',
                phone: `010-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
                address: '밀양시 삼문동',
                memo: '자동 생성된 테스트 환자',
                createdAt: serverTimestamp(),
                lastVisit: serverTimestamp()
            });

            // 2. Create Visit
            const visitRef = doc(collection(db, 'visits'));
            await setDoc(visitRef, {
                id: visitRef.id,
                patientId: chartNumber,
                patientName: name,
                date: serverTimestamp(),
                status: status,
                type: 'return',
                insuranceType: 'nhis',
                chiefComplaint: status === 'reception' ? '접수 대기' : status === 'consulting' ? '진료 상담 중' : '물리치료 중',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            log.push(`Created ${status}: ${name}`);
        };

        // 1. Reception: 10
        for (let i = 0; i < 10; i++) await createPatientAndVisit('reception', i);
        // 2. Consulting: 4
        for (let i = 0; i < 4; i++) await createPatientAndVisit('consulting', 100 + i);
        // 3. Treatment: 3
        for (let i = 0; i < 3; i++) await createPatientAndVisit('treatment', 200 + i);

        // 4. Appointments (Jan 2026)
        const appointmentCount = 8;
        for (let i = 0; i < appointmentCount; i++) {
            const name = getRandomName();
            // Random date between Jan 25 and Jan 31 2026
            const day = 25 + Math.floor(Math.random() * 7);
            const hour = 9 + Math.floor(Math.random() * 8); // 09:00 ~ 16:00
            const apptDate = new Date(2026, 0, day, hour, 0, 0); // Month is 0-indexed (0 = Jan)

            await setDoc(doc(collection(db, 'appointments')), {
                patientName: name,
                patientPhone: `010-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
                appointmentDate: apptDate, // Firestore will remove serverTimestamp if passed directly in client, utilizing Date obj here for node
                appointmentTime: `${hour.toString().padStart(2, '0')}:00`,
                department: '일반진료',
                doctor: '원장님',
                status: Math.random() > 0.3 ? 'confirmed' : 'scheduled',
                createdAt: serverTimestamp()
            });
            log.push(`Created Appointment: ${name} on 2026-01-${day}`);
        }

        return NextResponse.json({ success: true, log });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
