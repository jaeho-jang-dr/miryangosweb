import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { ClinicInfo, Notice, Article } from '@/types/public-schemas';

const DEFAULT_CLINIC_INFO: ClinicInfo = {
    name: '밀양정형외과',
    phone: '055-356-5500',
    address: '경상남도 밀양시 중앙로 451',
    lunchTime: '13:00 - 14:00',
    weekdayHours: '08:30 - 17:30',
    saturdayHours: '08:30 - 12:30 (1, 3주 휴무)',
    holidayInfo: '일요일, 공휴일 휴진'
};

export function useLandingData() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [cartoons, setCartoons] = useState<Article[]>([]);
    const [clinicInfo, setClinicInfo] = useState<ClinicInfo>(DEFAULT_CLINIC_INFO);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Settings
                const settingsRef = doc(db, 'settings', 'general');
                const settingsSnap = await getDoc(settingsRef);
                if (settingsSnap.exists()) {
                    setClinicInfo(prev => ({ ...prev, ...settingsSnap.data() } as ClinicInfo));
                }

                // Fetch Notices
                const qNotices = query(
                    collection(db, 'notices'),
                    where('isVisible', '==', true),
                    orderBy('createdAt', 'desc'),
                    limit(3)
                );
                const noticesSnap = await getDocs(qNotices);
                setNotices(noticesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice)));

                // Fetch Disease Cartoons
                const qCartoons = query(
                    collection(db, 'articles'),
                    where('type', '==', 'disease'),
                    where('isVisible', '==', true),
                    orderBy('createdAt', 'desc'),
                    limit(4)
                );
                const cartoonsSnap = await getDocs(qCartoons);
                setCartoons(cartoonsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article)));

            } catch (error) {
                console.error("Error loading data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return { notices, cartoons, clinicInfo, loading };
}
