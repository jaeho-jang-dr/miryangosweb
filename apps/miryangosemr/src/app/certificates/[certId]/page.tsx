'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import EMRLayout from '@/components/layout/EMRLayout';
import { Badge } from '@/components/ui/badge';
import {
  getCertificateById, issueCertificate, voidCertificate, getCertificateLabel,
} from '@/lib/certificate-engine';
import { Certificate, CERTIFICATE_TYPE_LABELS } from '@/types/certificates';
import {
  ArrowLeft, FileText, Send, Ban, Printer, Calendar,
  User, Stethoscope, ClipboardList,
} from 'lucide-react';
import Link from 'next/link';

export default function CertificateDetailPage() {
  return <EMRLayout><CertificateDetailContent /></EMRLayout>;
}

function CertificateDetailContent() {
  const params = useParams();
  const router = useRouter();
  const certId = params.certId as string;
  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCert();
  }, [certId]);

  const loadCert = async () => {
    setLoading(true);
    try {
      const data = await getCertificateById(certId);
      setCert(data);
    } catch (e) {
      console.error('로드 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async () => {
    if (!cert) return;
    try {
      await issueCertificate(certId);
      await loadCert();
    } catch (e) {
      console.error('발급 실패:', e);
    }
  };

  const handleVoid = async () => {
    if (!cert) return;
    const reason = prompt('무효 사유를 입력하세요:');
    if (!reason) return;
    try {
      await voidCertificate(certId, reason);
      await loadCert();
    } catch (e) {
      console.error('무효 처리 실패:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!cert) {
    return <div className="text-center py-20 text-slate-500">제증명을 찾을 수 없습니다.</div>;
  }

  const statusLabel = cert.status === 'draft' ? '작성중' : cert.status === 'issued' ? '발급완료' : '무효';
  const statusVariant = cert.status === 'draft' ? 'warning' as const : cert.status === 'issued' ? 'success' as const : 'danger' as const;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/certificates" className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              {CERTIFICATE_TYPE_LABELS[cert.type]}
            </h1>
            <p className="text-sm text-slate-500">
              발급번호: {cert.serialNo} | 발급일: {cert.issueDate}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant} className="text-sm px-3 py-1">{statusLabel}</Badge>
          {cert.status === 'draft' && (
            <button onClick={handleIssue} className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1">
              <Send className="w-3.5 h-3.5" /> 발급
            </button>
          )}
          {cert.status === 'issued' && (
            <Link href={`/certificates/${certId}/print`}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
              <Printer className="w-3.5 h-3.5" /> 인쇄
            </Link>
          )}
          {cert.status !== 'voided' && (
            <button onClick={handleVoid} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1">
              <Ban className="w-3.5 h-3.5" /> 무효
            </button>
          )}
        </div>
      </div>

      {/* Patient Info */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-blue-500" /> 환자 정보
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-slate-400 text-xs block">성명</span>
            <span className="font-medium">{cert.patientName}</span>
          </div>
          <div>
            <span className="text-slate-400 text-xs block">주민등록번호</span>
            <span className="font-medium">{cert.patientRrn || '-'}</span>
          </div>
          <div>
            <span className="text-slate-400 text-xs block">연락처</span>
            <span className="font-medium">{cert.patientPhone || '-'}</span>
          </div>
          <div>
            <span className="text-slate-400 text-xs block">주소</span>
            <span className="font-medium">{cert.patientAddress || '-'}</span>
          </div>
        </div>
      </div>

      {/* Diagnosis */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
          <Stethoscope className="w-4 h-4 text-emerald-500" /> 진단명
        </h3>
        <div className="space-y-1.5">
          {cert.diagnosisCodes.map((code, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Badge variant={i === 0 ? 'danger' : 'default'} className="text-[10px]">
                {i === 0 ? '주' : `부${i}`}
              </Badge>
              <Badge variant="purple" className="text-[10px] font-mono">{code}</Badge>
              <span className="text-slate-700">{cert.diagnosisNames[i] || '-'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
          <ClipboardList className="w-4 h-4 text-indigo-500" /> {CERTIFICATE_TYPE_LABELS[cert.type]} 내용
        </h3>
        <ContentDisplay cert={cert} />
      </div>

      {/* Void Info */}
      {cert.status === 'voided' && cert.voidReason && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-5">
          <h3 className="font-bold text-red-800 mb-2">무효 처리 사유</h3>
          <p className="text-sm text-red-700">{cert.voidReason}</p>
        </div>
      )}

      {/* Meta */}
      <div className="text-xs text-slate-400 flex items-center gap-4">
        <span>작성자: {cert.createdBy}</span>
        {cert.purpose && <span>용도: {cert.purpose}</span>}
      </div>
    </div>
  );
}

/** Content display — render key/value pairs from cert.content */
function ContentDisplay({ cert }: { cert: Certificate }) {
  const content = cert.content as Record<string, unknown>;
  if (!content || Object.keys(content).length === 0) {
    return <p className="text-slate-400 text-sm">내용 없음</p>;
  }

  const labelMap: Record<string, string> = {
    diseaseHistory: '병력', condition: '현재 증상', treatmentPlan: '치료 경과 및 향후 의견',
    onset: '발병일', firstVisitDate: '첫 내원일', treatmentPeriod: '치료 기간',
    prognosis: '예후', restrictions: '업무 제한 사항',
    opinion: '의사 소견', treatmentHistory: '치료 내역', currentStatus: '현재 상태',
    recommendation: '권고 사항', additionalTests: '추가 검사',
    injurySite: '상해 부위', injuryDegree: '상해 정도', injuryCause: '상해 원인',
    injuryDate: '상해 일시', treatmentWeeks: '치료 필요 기간 (주)',
    hospitalDays: '입원 필요 일수', outpatientDays: '통원 필요 일수', aftercare: '향후 치료 계획',
    treatmentPeriodStart: '진료 기간 시작', treatmentPeriodEnd: '진료 기간 종료',
    visitDates: '실 통원 일자', totalVisits: '총 내원 일수', treatmentSummary: '치료 내용',
    diseaseGroup: '질환군', careLevel: '필요 수발 등급',
    functionalStatus: '일상생활 수행 능력', cognitiveStatus: '인지기능 상태',
    referToHospital: '의뢰 병원', referToDepartment: '의뢰 진료과',
    referToDoctor: '의뢰 의사', referralReason: '의뢰 사유',
    testResults: '검사 결과', requestedExam: '요청 검사/시술', patientHistory: '환자 병력',
    disabilityType: '장애 유형', disabilityGrade: '장애 등급',
    causeOfDisability: '장애 원인', onsetDate: '장애 발생일',
    clinicalFindings: '임상 소견', functionalLimitations: '기능 제한', permanence: '영구성 여부',
    accidentDate: '사고일', accidentCause: '사고 원인', residualSymptoms: '후유 증상',
    impairmentRating: '장해율 (%)', muscleStrength: '근력 평가', amaGuideEdition: 'AMA 가이드',
    diseaseType: '질환 유형', workCapacityLevel: '근로능력 수준',
    physicalCapacity: '신체 능력', mentalCapacity: '정신 능력', evaluationDate: '평가일',
    currentDaysUsed: '현재 사용 일수', requestedDays: '연장 요청 일수',
    reason: '연장 사유', expectedDuration: '예상 치료 기간',
    birthDateTime: '출생 일시', birthPlace: '출생 장소', birthWeight: '출생 체중 (g)',
    birthLength: '출생 신장 (cm)', motherName: '모 성명', fatherName: '부 성명',
    deliveryMethod: '분만 방법', apgarScore: 'Apgar 점수',
    deathDateTime: '사망 일시', deathPlace: '사망 장소', causeOfDeath: '직접 사인',
    antecedentCause: '선행 사인', underlyingCause: '원사인',
    contributingConditions: '기타 기여 상태', mannerOfDeath: '사망의 종류',
    externalCause: '외인 사유', autopsyPerformed: '부검 여부',
  };

  const mannerMap: Record<string, string> = {
    natural: '병사', accident: '사고사', suicide: '자살',
    homicide: '타살', undetermined: '미상',
  };

  return (
    <div className="divide-y divide-slate-100">
      {Object.entries(content).map(([key, value]) => {
        if (key === 'romMeasurements') return null;
        let displayValue = '';
        if (Array.isArray(value)) {
          displayValue = value.join(', ');
        } else if (key === 'mannerOfDeath') {
          displayValue = mannerMap[value as string] || String(value);
        } else if (key === 'autopsyPerformed') {
          displayValue = value ? '예' : '아니오';
        } else {
          displayValue = String(value ?? '-');
        }
        return (
          <div key={key} className="flex py-2 text-sm">
            <span className="w-40 text-slate-400 shrink-0">{labelMap[key] || key}</span>
            <span className="text-slate-700 whitespace-pre-wrap">{displayValue}</span>
          </div>
        );
      })}
    </div>
  );
}
