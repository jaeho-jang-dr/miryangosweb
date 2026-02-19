/**
 * HIRA EDI XML 빌더
 * 건강보험심사평가원 EDI 청구서 XML 생성
 *
 * 참고: 실제 EDI 제출은 HIRA 전용 VPN/프로그램 필요
 * 이 모듈은 XML 파일을 생성하여 다운로드하는 방식으로 구현
 */

import type { EdiClaimDocument, EdiClaimItem } from '@/types/edi';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildClaimItemXml(claim: EdiClaimItem): string {
  const visitsXml = claim.visits.map(visit => {
    const diagnosesXml = visit.diagnoses.map(d => `
      <진단>
        <진단코드>${escapeXml(d.kcdCode)}</진단코드>
        <진단명>${escapeXml(d.kcdName)}</진단명>
        <주진단여부>${d.isPrimary ? 'Y' : 'N'}</주진단여부>
      </진단>`).join('');

    const medsXml = visit.medications.map(m => `
      <투약>
        <약품코드>${escapeXml(m.drugCode)}</약품코드>
        <약품명>${escapeXml(m.drugName)}</약품명>
        <투여량>${m.quantity}</투여량>
        <투여일수>${m.days}</투여일수>
        <단가>${m.unitPrice}</단가>
      </투약>`).join('');

    const procXml = visit.procedures.map(p => `
      <행위>
        <행위코드>${escapeXml(p.procedureCode)}</행위코드>
        <행위명>${escapeXml(p.procedureName)}</행위명>
        <횟수>${p.quantity}</횟수>
        <단가>${p.unitPrice}</단가>
      </행위>`).join('');

    return `
    <진료내역>
      <진료일자>${escapeXml(visit.visitDate)}</진료일자>
      <진단내역>${diagnosesXml}
      </진단내역>
      <투약내역>${medsXml}
      </투약내역>
      <행위내역>${procXml}
      </행위내역>
      <환자부담금>${visit.patientCharge}</환자부담금>
      <보험청구금>${visit.insuranceClaim}</보험청구금>
    </진료내역>`;
  }).join('');

  return `
  <청구명세서>
    <청구번호>${escapeXml(claim.claimId)}</청구번호>
    <환자정보>
      <환자번호>${escapeXml(claim.patient.patientId)}</환자번호>
      <환자명>${escapeXml(claim.patient.patientName)}</환자명>
      <생년월일>${escapeXml(claim.patient.birthDate)}</생년월일>
      <성별>${claim.patient.gender}</성별>
      <보험유형>${escapeXml(claim.patient.insuranceType)}</보험유형>
      <보험증번호>${escapeXml(claim.patient.insuranceId)}</보험증번호>
    </환자정보>
    <진료내역목록>${visitsXml}
    </진료내역목록>
    <합계금액>${claim.totalAmount}</합계금액>
    <청구금액>${claim.claimAmount}</청구금액>
    <환자부담총액>${claim.patientAmount}</환자부담총액>
  </청구명세서>`;
}

export function buildEdiXml(doc: EdiClaimDocument): string {
  const claimsXml = doc.claims.map(buildClaimItemXml).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<HIRA_EDI_CLAIM>
  <청구헤더>
    <제출일자>${escapeXml(doc.header.submitDate)}</제출일자>
    <요양기관기호>${escapeXml(doc.header.institutionCode)}</요양기관기호>
    <요양기관명>${escapeXml(doc.header.institutionName)}</요양기관명>
    <청구담당자>${escapeXml(doc.header.prescriberName)}</청구담당자>
    <총청구건수>${doc.header.totalClaimCount}</총청구건수>
    <총청구금액>${doc.header.totalAmount}</총청구금액>
    <진료년월>${escapeXml(doc.header.claimMonth)}</진료년월>
  </청구헤더>
  <청구명세서목록>${claimsXml}
  </청구명세서목록>
</HIRA_EDI_CLAIM>`;
}

export function buildEdiXmlPreview(doc: EdiClaimDocument): string {
  // 미리보기용 - 첫 번째 청구건만 포함
  const previewDoc = {
    ...doc,
    claims: doc.claims.slice(0, 1),
  };
  return buildEdiXml(previewDoc);
}

export function getEdiFileName(claimMonth: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  return `HIRA_EDI_${claimMonth}_${timestamp}.xml`;
}
