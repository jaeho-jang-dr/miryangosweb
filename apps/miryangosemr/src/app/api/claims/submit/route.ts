import { NextRequest, NextResponse } from 'next/server';
import { buildEdiXml, buildEdiXmlPreview, getEdiFileName } from '@/lib/edi-xml-builder';
import type { EdiClaimDocument } from '@/types/edi';

/** 샘플 EDI 문서 빌더 — claimId 기반으로 실 데이터를 조회하는 부분 대신 데모 데이터 사용 */
function buildSampleEdiDocument(claimId: string): EdiClaimDocument {
  const today = new Date();
  const submitDate = today.toISOString().slice(0, 10).replace(/-/g, '');
  const claimMonth = today.toISOString().slice(0, 7).replace('-', '');

  return {
    header: {
      submitDate,
      institutionCode: '12345678',
      institutionName: '밀양OS의원',
      prescriberName: '홍길동',
      totalClaimCount: 1,
      totalAmount: 15000,
      claimMonth,
    },
    claims: [
      {
        claimId,
        patient: {
          patientId: 'PT-001',
          patientName: '홍길동',
          birthDate: '19800101',
          gender: 'M',
          insuranceType: '건강보험',
          insuranceId: '123456789',
        },
        visits: [
          {
            visitDate: submitDate,
            diagnoses: [
              { kcdCode: 'M54.5', kcdName: '요통', isPrimary: true },
            ],
            medications: [
              {
                drugCode: '670500080',
                drugName: '이부프로펜정 400mg',
                quantity: 3,
                days: 3,
                unitPrice: 150,
              },
            ],
            procedures: [
              {
                procedureCode: 'AA154',
                procedureName: '초진 진찰료',
                quantity: 1,
                unitPrice: 13660,
              },
            ],
            patientCharge: 4500,
            insuranceClaim: 10500,
          },
        ],
        totalAmount: 15000,
        claimAmount: 10500,
        patientAmount: 4500,
      },
    ],
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { claimId, preview } = body;

    // preview 모드: 미리보기 XML 반환 (claimId 없어도 가능)
    if (preview) {
      const sampleId = claimId || `CLM-PREVIEW-${Date.now()}`;
      const ediDoc = buildSampleEdiDocument(sampleId);
      const xmlContent = buildEdiXmlPreview(ediDoc);
      const fileName = getEdiFileName(ediDoc.header.claimMonth);

      return NextResponse.json({
        success: true,
        xmlContent,
        fileName,
        claimCount: 1,
        totalAmount: ediDoc.header.totalAmount,
        message: 'XML 미리보기가 생성되었습니다.',
      });
    }

    if (!claimId) {
      return NextResponse.json({ error: 'Missing claimId' }, { status: 400 });
    }

    // 실제 청구 제출: EDI XML 생성
    const ediDoc = buildSampleEdiDocument(claimId);
    const xmlContent = buildEdiXml(ediDoc);
    const fileName = getEdiFileName(ediDoc.header.claimMonth);

    // TODO: Firestore 상태 업데이트
    // await updateClaimStatus(claimId, 'submitted');

    return NextResponse.json({
      success: true,
      claimId,
      status: 'submitted',
      xmlContent,
      fileName,
      claimCount: ediDoc.claims.length,
      totalAmount: ediDoc.header.totalAmount,
      message: 'HIRA EDI XML이 생성되었습니다. 다운로드 후 요양기관정보마당에 업로드하세요.',
      submittedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Claim submission failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
