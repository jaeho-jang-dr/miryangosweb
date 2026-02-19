import {
  collection, addDoc, updateDoc, doc, getDocs, getDoc,
  query, where, orderBy, limit, serverTimestamp, Timestamp, increment,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  CertificateBase, CertificateType, Certificate,
  CERTIFICATE_TYPE_LABELS,
} from '@/types/certificates';

/**
 * 제증명 엔진 — 발급번호 생성, CRUD, 발급대장 관리
 */

/** 발급번호 생성 (YYYY-NNNN) */
export async function generateSerialNo(type: CertificateType): Promise<string> {
  const year = new Date().getFullYear();
  const counterRef = doc(db, 'certificate_counters', `${year}`);

  try {
    const snap = await getDoc(counterRef);
    let nextNo = 1;

    if (snap.exists()) {
      nextNo = (snap.data().lastNo || 0) + 1;
      await updateDoc(counterRef, {
        lastNo: nextNo,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(counterRef, {
        year,
        lastNo: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    return `${year}-${String(nextNo).padStart(4, '0')}`;
  } catch (e) {
    // Fallback: timestamp-based
    const ts = Date.now().toString().slice(-6);
    return `${year}-${ts}`;
  }
}

/** 제증명 저장 (draft) */
export async function saveCertificate(
  cert: Omit<Certificate, 'id' | 'createdAt' | 'updatedAt' | 'serialNo' | 'status'>
): Promise<string> {
  const serialNo = await generateSerialNo(cert.type);

  const docRef = await addDoc(collection(db, 'certificates'), {
    ...cert,
    serialNo,
    status: 'draft',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/** 제증명 발급 (draft → issued) */
export async function issueCertificate(certId: string): Promise<void> {
  await updateDoc(doc(db, 'certificates', certId), {
    status: 'issued',
    issuedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** 제증명 무효 처리 */
export async function voidCertificate(certId: string, reason: string): Promise<void> {
  await updateDoc(doc(db, 'certificates', certId), {
    status: 'voided',
    voidedAt: serverTimestamp(),
    voidReason: reason,
    updatedAt: serverTimestamp(),
  });
}

/** 제증명 목록 조회 */
export async function getCertificates(filters?: {
  patientId?: string;
  type?: CertificateType;
  status?: 'draft' | 'issued' | 'voided';
}): Promise<Certificate[]> {
  let q;

  if (filters?.patientId && filters?.type) {
    q = query(
      collection(db, 'certificates'),
      where('patientId', '==', filters.patientId),
      where('type', '==', filters.type),
      orderBy('createdAt', 'desc')
    );
  } else if (filters?.patientId) {
    q = query(
      collection(db, 'certificates'),
      where('patientId', '==', filters.patientId),
      orderBy('createdAt', 'desc')
    );
  } else if (filters?.type) {
    q = query(
      collection(db, 'certificates'),
      where('type', '==', filters.type),
      orderBy('createdAt', 'desc')
    );
  } else if (filters?.status) {
    q = query(
      collection(db, 'certificates'),
      where('status', '==', filters.status),
      orderBy('createdAt', 'desc')
    );
  } else {
    q = query(collection(db, 'certificates'), orderBy('createdAt', 'desc'), limit(100));
  }

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Certificate);
}

/** 단건 조회 */
export async function getCertificateById(certId: string): Promise<Certificate | null> {
  const snap = await getDoc(doc(db, 'certificates', certId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Certificate;
}

/** 환자의 첫 내원일 조회 */
export async function getFirstVisitDate(patientId: string): Promise<string | null> {
  const q = query(
    collection(db, 'visits'),
    where('patientId', '==', patientId),
    orderBy('date', 'asc'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return data.date?.toDate?.()?.toISOString().slice(0, 10) || null;
}

/** 환자의 통원일자 목록 조회 */
export async function getVisitDates(
  patientId: string,
  startDate?: string,
  endDate?: string
): Promise<string[]> {
  const q = query(
    collection(db, 'visits'),
    where('patientId', '==', patientId),
    orderBy('date', 'asc')
  );
  const snap = await getDocs(q);
  const dates: string[] = [];

  snap.docs.forEach(d => {
    const data = d.data();
    const dateStr = data.date?.toDate?.()?.toISOString().slice(0, 10);
    if (!dateStr) return;
    if (startDate && dateStr < startDate) return;
    if (endDate && dateStr > endDate) return;
    dates.push(dateStr);
  });

  return dates;
}

/** 금일 날짜 (YYYY-MM-DD) */
export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 제증명 유형 라벨 */
export function getCertificateLabel(type: CertificateType): string {
  return CERTIFICATE_TYPE_LABELS[type];
}
