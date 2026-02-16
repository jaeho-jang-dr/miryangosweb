import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc,
  query, where, orderBy, Timestamp, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Admission, Room, AdmissionStatus } from '@/types/inpatient';

/** 입원 등록 */
export async function admitPatient(data: Omit<Admission, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'admissions'), {
    ...data,
    status: 'admitted' as AdmissionStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Update room occupancy
  if (data.roomId) {
    const roomRef = doc(db, 'rooms', data.roomId);
    const roomSnap = await getDoc(roomRef);
    if (roomSnap.exists()) {
      const room = roomSnap.data() as Room;
      await updateDoc(roomRef, { currentOccupancy: room.currentOccupancy + 1 });
    }
  }

  return docRef.id;
}

/** 퇴원 처리 */
export async function dischargePatient(
  admissionId: string,
  dischargeDate: Date,
  dischargeReason?: string
): Promise<void> {
  const admRef = doc(db, 'admissions', admissionId);
  const admSnap = await getDoc(admRef);
  if (!admSnap.exists()) throw new Error('입원 기록을 찾을 수 없습니다.');

  const admission = admSnap.data() as Admission;

  await updateDoc(admRef, {
    status: 'discharged',
    dischargeDate: Timestamp.fromDate(dischargeDate),
    dischargeReason: dischargeReason || '',
    updatedAt: serverTimestamp(),
  });

  // Update room occupancy
  if (admission.roomId) {
    const roomRef = doc(db, 'rooms', admission.roomId);
    const roomSnap = await getDoc(roomRef);
    if (roomSnap.exists()) {
      const room = roomSnap.data() as Room;
      await updateDoc(roomRef, {
        currentOccupancy: Math.max(0, room.currentOccupancy - 1),
      });
    }
  }
}

/** 재원 환자 목록 조회 */
export async function getCurrentInpatients(): Promise<Admission[]> {
  const snap = await getDocs(
    query(
      collection(db, 'admissions'),
      where('status', '==', 'admitted'),
      orderBy('admissionDate', 'desc')
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Admission);
}

/** 전체 입원 기록 조회 (기간별) */
export async function getAdmissions(startDate: Date, endDate: Date): Promise<Admission[]> {
  const snap = await getDocs(
    query(
      collection(db, 'admissions'),
      where('admissionDate', '>=', Timestamp.fromDate(startDate)),
      where('admissionDate', '<=', Timestamp.fromDate(endDate)),
      orderBy('admissionDate', 'desc')
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Admission);
}

/** 병실 목록 조회 */
export async function getRooms(): Promise<Room[]> {
  const snap = await getDocs(
    query(collection(db, 'rooms'), orderBy('roomNumber', 'asc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Room);
}

/** 병실 추가 */
export async function addRoom(data: Omit<Room, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'rooms'), data);
  return docRef.id;
}

/** 병실 수정 */
export async function updateRoom(roomId: string, data: Partial<Room>): Promise<void> {
  await updateDoc(doc(db, 'rooms', roomId), data);
}

/** 재원일수 계산 */
export function calculateLOS(admissionDate: Timestamp, dischargeDate?: Timestamp): number {
  const start = admissionDate.toDate();
  const end = dischargeDate ? dischargeDate.toDate() : new Date();
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}
