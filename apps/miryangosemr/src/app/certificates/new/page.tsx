'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EMRLayout from '@/components/layout/EMRLayout';
import { Badge } from '@/components/ui/badge';
import {
  saveCertificate, issueCertificate, todayString,
  getFirstVisitDate, getVisitDates,
} from '@/lib/certificate-engine';
import {
  CertificateType, CERTIFICATE_TYPE_LABELS, COMMON_CERTIFICATE_TYPES,
} from '@/types/certificates';
import {
  ArrowLeft, FileText, Save, Send, User, Search,
} from 'lucide-react';
import Link from 'next/link';

interface PatientOption {
  id: string;
  name: string;
  rrn?: string;
  birthDate?: string;
  gender?: string;
  phone?: string;
  address?: string;
}

export default function NewCertificatePage() {
  return (
    <EMRLayout>
      <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}>
        <NewCertificateContent />
      </Suspense>
    </EMRLayout>
  );
}

function NewCertificateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const presetType = searchParams.get('type') as CertificateType | null;
  const presetPatientId = searchParams.get('patientId');

  // Type selection
  const [certType, setCertType] = useState<CertificateType>(presetType || 'diagnosis');

  // Patient search
  const [patientQuery, setPatientQuery] = useState('');
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [showPatientList, setShowPatientList] = useState(false);

  // Common fields
  const [diagnosisCodes, setDiagnosisCodes] = useState<string[]>(['']);
  const [diagnosisNames, setDiagnosisNames] = useState<string[]>(['']);
  const [issueDate, setIssueDate] = useState(todayString());
  const [purpose, setPurpose] = useState('');

  // Dynamic content fields (stored as key-value)
  const [content, setContent] = useState<Record<string, string | number | string[]>>({});

  const [saving, setSaving] = useState(false);

  // Load patient if preset
  useEffect(() => {
    if (presetPatientId) {
      loadPatientById(presetPatientId);
    }
  }, [presetPatientId]);

  const loadPatientById = async (id: string) => {
    try {
      const { getDoc, doc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db, 'patients', id));
      if (snap.exists()) {
        const d = snap.data();
        setSelectedPatient({
          id: snap.id,
          name: d.name,
          rrn: d.rrnMasked || d.rrn,
          birthDate: d.birthDate,
          gender: d.gender,
          phone: d.phoneMasked || d.phone,
          address: d.address,
        });
      }
    } catch (e) {
      console.error('환자 로드 실패:', e);
    }
  };

  const searchPatients = async (q: string) => {
    if (q.length < 2) { setPatients([]); return; }
    try {
      const snap = await getDocs(
        query(collection(db, 'patients'), orderBy('name'), limit(20))
      );
      const results = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as PatientOption))
        .filter(p => p.name.includes(q));
      setPatients(results);
      setShowPatientList(true);
    } catch (e) {
      console.error('환자 검색 실패:', e);
    }
  };

  const selectPatient = async (p: PatientOption) => {
    setSelectedPatient(p);
    setPatientQuery('');
    setShowPatientList(false);

    // Auto-fill visit data if type requires it
    if (certType === 'diagnosis' || certType === 'treatment_confirm') {
      try {
        const firstVisit = await getFirstVisitDate(p.id);
        if (firstVisit) {
          setContent(prev => ({ ...prev, firstVisitDate: firstVisit }));
        }
      } catch {}
    }
    if (certType === 'treatment_confirm') {
      try {
        const dates = await getVisitDates(p.id);
        setContent(prev => ({
          ...prev,
          visitDates: dates,
          totalVisits: dates.length,
        }));
      } catch {}
    }
  };

  const updateContent = (key: string, value: string | number | string[]) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  const addDiagnosisRow = () => {
    setDiagnosisCodes(prev => [...prev, '']);
    setDiagnosisNames(prev => [...prev, '']);
  };

  const removeDiagnosisRow = (idx: number) => {
    if (diagnosisCodes.length <= 1) return;
    setDiagnosisCodes(prev => prev.filter((_, i) => i !== idx));
    setDiagnosisNames(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (andIssue: boolean) => {
    if (!selectedPatient) { alert('환자를 선택하세요.'); return; }
    if (!diagnosisCodes[0] || !diagnosisNames[0]) { alert('진단명을 입력하세요.'); return; }

    setSaving(true);
    try {
      const certId = await saveCertificate({
        type: certType,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        patientRrn: selectedPatient.rrn,
        patientBirthDate: selectedPatient.birthDate,
        patientGender: selectedPatient.gender as 'male' | 'female' | undefined,
        patientAddress: selectedPatient.address,
        patientPhone: selectedPatient.phone,
        diagnosisCodes: diagnosisCodes.filter(Boolean),
        diagnosisNames: diagnosisNames.filter(Boolean),
        doctorName: '장재호',
        doctorLicenseNo: '제XXXXX호',
        specialtyNo: '정형외과전문의 제XXXXX호',
        issueDate,
        purpose,
        content: content as never,
        createdBy: 'doctor',
      });

      if (andIssue) {
        await issueCertificate(certId);
      }

      router.push(`/certificates/${certId}`);
    } catch (e) {
      console.error('저장 실패:', e);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/certificates" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" /> 새 제증명 작성
          </h1>
          <p className="text-sm text-slate-500">제증명 양식을 선택하고 내용을 입력합니다.</p>
        </div>
      </div>

      {/* Certificate Type Selector */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-3">제증명 유형</h3>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {Object.entries(CERTIFICATE_TYPE_LABELS).map(([type, label]) => (
            <button
              key={type}
              onClick={() => setCertType(type as CertificateType)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                certType === type
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Patient Selection */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-500" /> 환자 정보
        </h3>
        {selectedPatient ? (
          <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex-1">
              <p className="font-bold text-slate-900">{selectedPatient.name}</p>
              <p className="text-xs text-slate-500">
                {selectedPatient.birthDate || '-'} | {selectedPatient.gender === 'male' ? '남' : selectedPatient.gender === 'female' ? '여' : '-'} | {selectedPatient.phone || '-'}
              </p>
            </div>
            <button
              onClick={() => setSelectedPatient(null)}
              className="text-xs text-blue-600 hover:underline"
            >변경</button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={patientQuery}
              onChange={e => { setPatientQuery(e.target.value); searchPatients(e.target.value); }}
              placeholder="환자명으로 검색..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {showPatientList && patients.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                {patients.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectPatient(p)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b last:border-b-0"
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-slate-400 ml-2">{p.birthDate || ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Diagnosis */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-3">진단명</h3>
        <div className="space-y-2">
          {diagnosisCodes.map((code, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Badge variant={idx === 0 ? 'danger' : 'default'} className="text-[10px] w-8 text-center shrink-0">
                {idx === 0 ? '주' : `부${idx}`}
              </Badge>
              <input
                value={code}
                onChange={e => {
                  const n = [...diagnosisCodes]; n[idx] = e.target.value; setDiagnosisCodes(n);
                }}
                placeholder="KCD 코드 (예: M75.1)"
                className="w-28 px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
              />
              <input
                value={diagnosisNames[idx] || ''}
                onChange={e => {
                  const n = [...diagnosisNames]; n[idx] = e.target.value; setDiagnosisNames(n);
                }}
                placeholder="병명"
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
              {idx > 0 && (
                <button onClick={() => removeDiagnosisRow(idx)} className="text-red-400 hover:text-red-600 text-sm px-2">삭제</button>
              )}
            </div>
          ))}
          <button onClick={addDiagnosisRow} className="text-sm text-blue-600 hover:underline">+ 진단 추가</button>
        </div>
      </div>

      {/* Common Fields */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-3">발급 정보</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">발급일</label>
            <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">용도</label>
            <input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="보험회사 제출용 등"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Dynamic Content Fields */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-3">
          {CERTIFICATE_TYPE_LABELS[certType]} 내용
        </h3>
        <CertTypeForm type={certType} content={content} onChange={updateContent} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Link href="/certificates" className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">취소</Link>
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="px-4 py-2 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> 임시 저장
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Send className="w-4 h-4" /> 저장 및 발급
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// 유형별 폼 필드 컴포넌트
// ────────────────────────────────────────

interface CertTypeFormProps {
  type: CertificateType;
  content: Record<string, string | number | string[]>;
  onChange: (key: string, value: string | number | string[]) => void;
}

function CertTypeForm({ type, content, onChange }: CertTypeFormProps) {
  const text = (key: string, label: string, multiline = false) => (
    <div key={key}>
      <label className="text-xs text-slate-500 block mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={(content[key] as string) || ''}
          onChange={e => onChange(key, e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none"
        />
      ) : (
        <input
          value={(content[key] as string) || ''}
          onChange={e => onChange(key, e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
        />
      )}
    </div>
  );

  const num = (key: string, label: string) => (
    <div key={key}>
      <label className="text-xs text-slate-500 block mb-1">{label}</label>
      <input
        type="number"
        value={(content[key] as number) ?? ''}
        onChange={e => onChange(key, e.target.value ? parseInt(e.target.value) : '')}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
      />
    </div>
  );

  switch (type) {
    case 'diagnosis':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {text('onset', '발병일')}
          {text('firstVisitDate', '첫 내원일')}
          {text('treatmentPeriod', '치료 기간')}
          {text('diseaseHistory', '병력', true)}
          {text('condition', '현재 증상', true)}
          {text('treatmentPlan', '치료 경과 및 향후 의견', true)}
          {text('prognosis', '예후')}
          {text('restrictions', '업무 제한 사항', true)}
        </div>
      );
    case 'medical_opinion':
      return (
        <div className="grid grid-cols-1 gap-4">
          {text('treatmentHistory', '치료 내역', true)}
          {text('currentStatus', '현재 상태', true)}
          {text('opinion', '의사 소견', true)}
          {text('recommendation', '권고 사항', true)}
          {text('additionalTests', '추가 검사 필요 여부')}
        </div>
      );
    case 'injury_diagnosis':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {text('injurySite', '상해 부위')}
          {text('injuryDegree', '상해 정도 (경도/중등도/중증)')}
          {text('injuryCause', '상해 원인')}
          {text('injuryDate', '상해 일시')}
          {num('treatmentWeeks', '치료 필요 기간 (주)')}
          {num('hospitalDays', '입원 필요 일수')}
          {num('outpatientDays', '통원 필요 일수')}
          {text('opinion', '소견', true)}
          {text('aftercare', '향후 치료 계획', true)}
        </div>
      );
    case 'treatment_confirm':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {text('treatmentPeriodStart', '진료 기간 시작')}
          {text('treatmentPeriodEnd', '진료 기간 종료')}
          {num('totalVisits', '총 내원 일수')}
          {text('treatmentSummary', '치료 내용 요약', true)}
          <div className="col-span-2">
            <label className="text-xs text-slate-500 block mb-1">실 통원 일자</label>
            <p className="text-xs text-slate-400 mb-1">환자 선택 시 자동으로 불러옵니다.</p>
            <textarea
              value={Array.isArray(content.visitDates) ? (content.visitDates as string[]).join(', ') : (content.visitDates as string || '')}
              onChange={e => onChange('visitDates', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none font-mono text-xs"
            />
          </div>
        </div>
      );
    case 'doctor_opinion':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {text('diseaseGroup', '질환군 (치매, 뇌혈관 등)')}
          {text('careLevel', '필요 수발 등급')}
          {text('currentStatus', '현재 상태', true)}
          {text('functionalStatus', '일상생활 수행 능력', true)}
          {text('cognitiveStatus', '인지기능 상태')}
          {text('recommendation', '의사 의견', true)}
        </div>
      );
    case 'referral':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {text('referToHospital', '의뢰 병원명')}
          {text('referToDepartment', '의뢰 진료과')}
          {text('referToDoctor', '의뢰 의사 (선택)')}
          {text('referralReason', '의뢰 사유', true)}
          {text('patientHistory', '환자 병력', true)}
          {text('treatmentSummary', '현재까지 치료 내용', true)}
          {text('testResults', '검사 결과')}
          {text('requestedExam', '요청 검사/시술')}
        </div>
      );
    case 'disability':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {text('disabilityType', '장애 유형')}
          {text('disabilityGrade', '장애 등급')}
          {text('causeOfDisability', '장애 원인')}
          {text('onsetDate', '장애 발생일')}
          {text('clinicalFindings', '임상 소견', true)}
          {text('functionalLimitations', '기능 제한', true)}
          {text('permanence', '영구성 여부')}
        </div>
      );
    case 'residual_disability':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {text('accidentDate', '사고일')}
          {text('accidentCause', '사고 원인')}
          {text('treatmentHistory', '치료 경과', true)}
          {text('residualSymptoms', '후유 증상', true)}
          {num('impairmentRating', '장해율 (%)')}
          {text('muscleStrength', '근력 평가')}
          {text('amaGuideEdition', 'AMA 가이드 판수')}
          {text('opinion', '소견', true)}
        </div>
      );
    case 'work_capacity':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {text('diseaseType', '질환 유형')}
          {text('evaluationDate', '평가일')}
          {text('workCapacityLevel', '근로능력 수준')}
          {text('physicalCapacity', '신체 능력', true)}
          {text('mentalCapacity', '정신 능력')}
          {text('restrictions', '근로 제한 사항', true)}
          {text('opinion', '의사 소견', true)}
        </div>
      );
    case 'medical_aid_ext':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {num('currentDaysUsed', '현재 사용 일수')}
          {num('requestedDays', '연장 요청 일수')}
          {text('reason', '연장 사유', true)}
          {text('treatmentPlan', '향후 치료 계획', true)}
          {text('expectedDuration', '예상 치료 기간')}
        </div>
      );
    case 'birth':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {text('birthDateTime', '출생 일시')}
          {text('birthPlace', '출생 장소')}
          {num('birthWeight', '출생 체중 (g)')}
          {num('birthLength', '출생 신장 (cm)')}
          {text('motherName', '모 성명')}
          {text('fatherName', '부 성명')}
          {text('deliveryMethod', '분만 방법')}
          {text('apgarScore', 'Apgar 점수')}
        </div>
      );
    case 'death':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {text('deathDateTime', '사망 일시')}
          {text('deathPlace', '사망 장소')}
          {text('causeOfDeath', '직접 사인', true)}
          {text('antecedentCause', '선행 사인')}
          {text('underlyingCause', '원사인')}
          {text('contributingConditions', '기타 기여 상태')}
          <div>
            <label className="text-xs text-slate-500 block mb-1">사망의 종류</label>
            <select
              value={(content.mannerOfDeath as string) || ''}
              onChange={e => onChange('mannerOfDeath', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="">선택</option>
              <option value="natural">병사</option>
              <option value="accident">사고사</option>
              <option value="suicide">자살</option>
              <option value="homicide">타살</option>
              <option value="undetermined">미상</option>
            </select>
          </div>
          {text('externalCause', '외인에 의한 경우')}
        </div>
      );
    default:
      return <p className="text-slate-400 text-sm">지원하지 않는 유형입니다.</p>;
  }
}
