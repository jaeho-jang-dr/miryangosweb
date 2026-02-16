import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer';
import {
  Certificate, CertificateType, CERTIFICATE_TYPE_LABELS,
  DiagnosisCertificate, MedicalOpinionCertificate, InjuryDiagnosisCertificate,
  TreatmentConfirmCertificate, DoctorOpinionCertificate, ReferralCertificate,
  DisabilityCertificate, ResidualDisabilityCertificate, WorkCapacityCertificate,
  MedicalAidExtCertificate, BirthCertificate, DeathCertificate,
  RomMeasurement,
} from '@/types/certificates';

/** 병원 정보 (설정에서 불러오도록 추후 교체) */
const HOSPITAL_INFO = {
  name: '밀양정형외과의원',
  address: '경남 밀양시 중앙로 XXX',
  phone: '055-XXX-XXXX',
  fax: '055-XXX-XXXX',
  doctorName: '장재호',
  licenseNo: '제XXXXX호',
  specialtyNo: '정형외과전문의 제XXXXX호',
};

/** PDF 공통 스타일 */
const s = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.6,
  },
  // --- 헤더 ---
  header: {
    textAlign: 'center',
    marginBottom: 20,
    borderBottom: '2px solid #111',
    paddingBottom: 12,
  },
  hospitalName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  hospitalInfo: {
    fontSize: 8,
    color: '#555',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 6,
    letterSpacing: 4,
  },
  serialNo: {
    fontSize: 8,
    textAlign: 'right',
    color: '#888',
    marginBottom: 10,
  },
  // --- 섹션 ---
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#f3f4f6',
    padding: '4 8',
    marginBottom: 6,
    borderLeft: '3px solid #10b981',
  },
  // --- 테이블 ---
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'solid',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    minHeight: 24,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    minHeight: 24,
  },
  tableCellLabel: {
    width: '30%',
    padding: '4 8',
    backgroundColor: '#f9fafb',
    fontWeight: 'bold',
    fontSize: 9,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  tableCellValue: {
    width: '70%',
    padding: '4 8',
    fontSize: 9,
  },
  tableCellHalf: {
    width: '50%',
    padding: '4 8',
    fontSize: 9,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  // --- 풋터 ---
  footer: {
    marginTop: 30,
    textAlign: 'center',
    borderTop: '1px solid #d1d5db',
    paddingTop: 16,
  },
  issueDate: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  doctorSign: {
    textAlign: 'right',
    marginTop: 10,
  },
  doctorSignName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  doctorSignLabel: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
  },
  stampArea: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: '#ef4444',
    borderRadius: 30,
    borderStyle: 'solid',
    alignSelf: 'flex-end',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -50,
    marginRight: 20,
  },
  stampText: {
    fontSize: 8,
    color: '#ef4444',
    fontWeight: 'bold',
  },
  // --- 유틸 ---
  row: { flexDirection: 'row' },
  textMuted: { color: '#6b7280', fontSize: 8 },
  textBold: { fontWeight: 'bold' },
  mb4: { marginBottom: 4 },
  mb8: { marginBottom: 8 },
  paragraph: { marginBottom: 6, fontSize: 9, lineHeight: 1.8 },
});

/** 공통 헤더 */
function CertHeader({ type, serialNo }: { type: CertificateType; serialNo: string }) {
  return (
    <View>
      <View style={s.header}>
        <Text style={s.hospitalName}>{HOSPITAL_INFO.name}</Text>
        <Text style={s.hospitalInfo}>
          {HOSPITAL_INFO.address} | TEL: {HOSPITAL_INFO.phone} | FAX: {HOSPITAL_INFO.fax}
        </Text>
      </View>
      <Text style={s.title}>{CERTIFICATE_TYPE_LABELS[type]}</Text>
      <Text style={s.serialNo}>발급번호: {serialNo}</Text>
    </View>
  );
}

/** 환자 정보 테이블 */
function PatientInfoTable({ cert }: { cert: Certificate }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>환자 정보</Text>
      <View style={s.table}>
        <View style={s.tableRow}>
          <Text style={s.tableCellLabel}>성 명</Text>
          <Text style={s.tableCellValue}>{cert.patientName}</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={s.tableCellLabel}>주민등록번호</Text>
          <Text style={s.tableCellValue}>{cert.patientRrn || '-'}</Text>
        </View>
        {cert.patientAddress && (
          <View style={s.tableRow}>
            <Text style={s.tableCellLabel}>주 소</Text>
            <Text style={s.tableCellValue}>{cert.patientAddress}</Text>
          </View>
        )}
        {cert.patientPhone && (
          <View style={s.tableRow}>
            <Text style={s.tableCellLabel}>연락처</Text>
            <Text style={s.tableCellValue}>{cert.patientPhone}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/** 진단 정보 테이블 */
function DiagnosisInfoTable({ cert }: { cert: Certificate }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>진단명</Text>
      <View style={s.table}>
        {cert.diagnosisCodes.map((code, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={s.tableCellLabel}>{i === 0 ? '주상병' : `부상병 ${i}`} ({code})</Text>
            <Text style={s.tableCellValue}>{cert.diagnosisNames[i] || '-'}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** 공통 풋터 (발급일 + 의사 서명) */
function CertFooter({ cert }: { cert: Certificate }) {
  return (
    <View style={s.footer}>
      <Text style={s.issueDate}>{cert.issueDate}</Text>
      <Text style={{ textAlign: 'center', fontSize: 10, marginBottom: 4 }}>
        위와 같이 {CERTIFICATE_TYPE_LABELS[cert.type]}을(를) 발급합니다.
      </Text>
      <View style={{ marginTop: 20 }}>
        <View style={s.doctorSign}>
          <Text style={s.doctorSignName}>{cert.doctorName} (인)</Text>
          <Text style={s.doctorSignLabel}>의사 면허번호: {cert.doctorLicenseNo}</Text>
          {cert.specialtyNo && (
            <Text style={s.doctorSignLabel}>전문의 번호: {cert.specialtyNo}</Text>
          )}
        </View>
        <View style={s.stampArea}>
          <Text style={s.stampText}>의사</Text>
          <Text style={s.stampText}>직인</Text>
        </View>
      </View>
      {cert.purpose && (
        <Text style={[s.textMuted, { marginTop: 10, textAlign: 'left' }]}>
          용도: {cert.purpose}
        </Text>
      )}
    </View>
  );
}

/** 키-값 행 */
function KVRow({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <View style={s.tableRow}>
      <Text style={s.tableCellLabel}>{label}</Text>
      <Text style={s.tableCellValue}>{value ?? '-'}</Text>
    </View>
  );
}

/** ROM 측정 테이블 */
function RomTable({ measurements }: { measurements: RomMeasurement[] }) {
  if (!measurements || measurements.length === 0) return null;
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>ROM 측정값</Text>
      <View style={s.table}>
        <View style={s.tableHeaderRow}>
          <Text style={[s.tableCellHalf, { width: '20%', fontWeight: 'bold', fontSize: 8 }]}>관절</Text>
          <Text style={[s.tableCellHalf, { width: '10%', fontWeight: 'bold', fontSize: 8 }]}>측</Text>
          <Text style={[s.tableCellHalf, { width: '20%', fontWeight: 'bold', fontSize: 8 }]}>운동</Text>
          <Text style={[s.tableCellHalf, { width: '12%', fontWeight: 'bold', fontSize: 8 }]}>능동</Text>
          <Text style={[s.tableCellHalf, { width: '12%', fontWeight: 'bold', fontSize: 8 }]}>수동</Text>
          <Text style={[s.tableCellHalf, { width: '12%', fontWeight: 'bold', fontSize: 8 }]}>정상</Text>
          <Text style={[s.tableCellHalf, { width: '14%', fontWeight: 'bold', fontSize: 8, borderRightWidth: 0 }]}>장해율</Text>
        </View>
        {measurements.map((m, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={[s.tableCellHalf, { width: '20%', fontSize: 8 }]}>{m.joint}</Text>
            <Text style={[s.tableCellHalf, { width: '10%', fontSize: 8 }]}>
              {m.side === 'left' ? '좌' : m.side === 'right' ? '우' : '양측'}
            </Text>
            <Text style={[s.tableCellHalf, { width: '20%', fontSize: 8 }]}>{m.movement}</Text>
            <Text style={[s.tableCellHalf, { width: '12%', fontSize: 8 }]}>{m.activeRom}°</Text>
            <Text style={[s.tableCellHalf, { width: '12%', fontSize: 8 }]}>{m.passiveRom ? `${m.passiveRom}°` : '-'}</Text>
            <Text style={[s.tableCellHalf, { width: '12%', fontSize: 8 }]}>{m.normalRom}°</Text>
            <Text style={[s.tableCellHalf, { width: '14%', fontSize: 8, borderRightWidth: 0 }]}>
              {m.impairmentPercent != null ? `${m.impairmentPercent}%` : '-'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────
// 개별 제증명 내용 렌더러
// ──────────────────────────────────────────────────────

function DiagnosisContent({ cert }: { cert: DiagnosisCertificate }) {
  const c = cert.content;
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>진단 내용</Text>
      <View style={s.table}>
        <KVRow label="발병일" value={c.onset} />
        {c.firstVisitDate && <KVRow label="첫 내원일" value={c.firstVisitDate} />}
        <KVRow label="병력" value={c.diseaseHistory} />
        <KVRow label="현재 증상" value={c.condition} />
        <KVRow label="치료 경과 및 향후 의견" value={c.treatmentPlan} />
        {c.treatmentPeriod && <KVRow label="치료 기간" value={c.treatmentPeriod} />}
        {c.prognosis && <KVRow label="예후" value={c.prognosis} />}
        {c.restrictions && <KVRow label="업무 제한 사항" value={c.restrictions} />}
      </View>
    </View>
  );
}

function MedicalOpinionContent({ cert }: { cert: MedicalOpinionCertificate }) {
  const c = cert.content;
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>소견 내용</Text>
      <View style={s.table}>
        <KVRow label="치료 내역" value={c.treatmentHistory} />
        <KVRow label="현재 상태" value={c.currentStatus} />
        <KVRow label="의사 소견" value={c.opinion} />
        <KVRow label="권고 사항" value={c.recommendation} />
        {c.additionalTests && <KVRow label="추가 검사" value={c.additionalTests} />}
      </View>
    </View>
  );
}

function InjuryDiagnosisContent({ cert }: { cert: InjuryDiagnosisCertificate }) {
  const c = cert.content;
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>상해 진단 내용</Text>
      <View style={s.table}>
        <KVRow label="상해 부위" value={c.injurySite} />
        <KVRow label="상해 정도" value={c.injuryDegree} />
        <KVRow label="상해 원인" value={c.injuryCause} />
        <KVRow label="상해 일시" value={c.injuryDate} />
        <KVRow label="치료 필요 기간" value={`${c.treatmentWeeks}주`} />
        {c.hospitalDays && <KVRow label="입원 필요 일수" value={`${c.hospitalDays}일`} />}
        {c.outpatientDays && <KVRow label="통원 필요 일수" value={`${c.outpatientDays}일`} />}
        <KVRow label="소견" value={c.opinion} />
        {c.aftercare && <KVRow label="향후 치료 계획" value={c.aftercare} />}
      </View>
    </View>
  );
}

function TreatmentConfirmContent({ cert }: { cert: TreatmentConfirmCertificate }) {
  const c = cert.content;
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>진료 확인 내용</Text>
      <View style={s.table}>
        <KVRow label="진료 기간" value={`${c.treatmentPeriodStart} ~ ${c.treatmentPeriodEnd}`} />
        <KVRow label="총 내원 일수" value={`${c.totalVisits}일`} />
        <KVRow label="치료 내용" value={c.treatmentSummary} />
      </View>
      {c.visitDates.length > 0 && (
        <View style={{ marginTop: 6 }}>
          <Text style={[s.textMuted, s.mb4]}>실 통원 일자:</Text>
          <Text style={{ fontSize: 8, lineHeight: 1.6 }}>{c.visitDates.join(', ')}</Text>
        </View>
      )}
    </View>
  );
}

function DoctorOpinionContent({ cert }: { cert: DoctorOpinionCertificate }) {
  const c = cert.content;
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>의사 소견 (노인장기요양)</Text>
      <View style={s.table}>
        <KVRow label="질환군" value={c.diseaseGroup} />
        <KVRow label="현재 상태" value={c.currentStatus} />
        <KVRow label="일상생활 수행 능력" value={c.functionalStatus} />
        {c.cognitiveStatus && <KVRow label="인지기능 상태" value={c.cognitiveStatus} />}
        <KVRow label="필요 수발 등급" value={c.careLevel} />
        <KVRow label="의사 의견" value={c.recommendation} />
      </View>
    </View>
  );
}

function ReferralContent({ cert }: { cert: ReferralCertificate }) {
  const c = cert.content;
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>진료 의뢰 내용</Text>
      <View style={s.table}>
        <KVRow label="의뢰 병원" value={c.referToHospital} />
        <KVRow label="의뢰 진료과" value={c.referToDepartment} />
        {c.referToDoctor && <KVRow label="의뢰 의사" value={c.referToDoctor} />}
        <KVRow label="의뢰 사유" value={c.referralReason} />
        <KVRow label="환자 병력" value={c.patientHistory} />
        <KVRow label="현재까지 치료 내용" value={c.treatmentSummary} />
        {c.testResults && <KVRow label="검사 결과" value={c.testResults} />}
        {c.requestedExam && <KVRow label="요청 검사/시술" value={c.requestedExam} />}
      </View>
    </View>
  );
}

function DisabilityContent({ cert }: { cert: DisabilityCertificate }) {
  const c = cert.content;
  return (
    <>
      <View style={s.section}>
        <Text style={s.sectionTitle}>장애 진단 내용</Text>
        <View style={s.table}>
          <KVRow label="장애 유형" value={c.disabilityType} />
          <KVRow label="장애 등급" value={c.disabilityGrade} />
          <KVRow label="장애 원인" value={c.causeOfDisability} />
          <KVRow label="장애 발생일" value={c.onsetDate} />
          <KVRow label="임상 소견" value={c.clinicalFindings} />
          <KVRow label="기능 제한" value={c.functionalLimitations} />
          <KVRow label="영구성 여부" value={c.permanence} />
        </View>
      </View>
      {c.romMeasurements && <RomTable measurements={c.romMeasurements} />}
    </>
  );
}

function ResidualDisabilityContent({ cert }: { cert: ResidualDisabilityCertificate }) {
  const c = cert.content;
  return (
    <>
      <View style={s.section}>
        <Text style={s.sectionTitle}>후유장애 진단 내용</Text>
        <View style={s.table}>
          <KVRow label="사고일" value={c.accidentDate} />
          <KVRow label="사고 원인" value={c.accidentCause} />
          <KVRow label="치료 경과" value={c.treatmentHistory} />
          <KVRow label="후유 증상" value={c.residualSymptoms} />
          <KVRow label="장해율" value={`${c.impairmentRating}%`} />
          {c.muscleStrength && <KVRow label="근력 평가" value={c.muscleStrength} />}
          {c.amaGuideEdition && <KVRow label="AMA 가이드" value={c.amaGuideEdition} />}
          <KVRow label="소견" value={c.opinion} />
        </View>
      </View>
      <RomTable measurements={c.romMeasurements} />
    </>
  );
}

function WorkCapacityContent({ cert }: { cert: WorkCapacityCertificate }) {
  const c = cert.content;
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>근로능력 평가 내용</Text>
      <View style={s.table}>
        <KVRow label="질환 유형" value={c.diseaseType} />
        <KVRow label="평가일" value={c.evaluationDate} />
        <KVRow label="근로능력 수준" value={c.workCapacityLevel} />
        <KVRow label="신체 능력" value={c.physicalCapacity} />
        {c.mentalCapacity && <KVRow label="정신 능력" value={c.mentalCapacity} />}
        <KVRow label="근로 제한 사항" value={c.restrictions} />
        <KVRow label="의사 소견" value={c.opinion} />
      </View>
    </View>
  );
}

function MedicalAidExtContent({ cert }: { cert: MedicalAidExtCertificate }) {
  const c = cert.content;
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>의료급여 연장 신청 내용</Text>
      <View style={s.table}>
        <KVRow label="현재 사용 일수" value={`${c.currentDaysUsed}일`} />
        <KVRow label="연장 요청 일수" value={`${c.requestedDays}일`} />
        <KVRow label="연장 사유" value={c.reason} />
        <KVRow label="향후 치료 계획" value={c.treatmentPlan} />
        <KVRow label="예상 치료 기간" value={c.expectedDuration} />
      </View>
    </View>
  );
}

function BirthContent({ cert }: { cert: BirthCertificate }) {
  const c = cert.content;
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>출생 정보</Text>
      <View style={s.table}>
        <KVRow label="출생 일시" value={c.birthDateTime} />
        <KVRow label="출생 장소" value={c.birthPlace} />
        <KVRow label="출생 체중" value={`${c.birthWeight}g`} />
        {c.birthLength && <KVRow label="출생 신장" value={`${c.birthLength}cm`} />}
        <KVRow label="모 성명" value={c.motherName} />
        {c.fatherName && <KVRow label="부 성명" value={c.fatherName} />}
        <KVRow label="분만 방법" value={c.deliveryMethod} />
        {c.apgarScore && <KVRow label="Apgar 점수" value={c.apgarScore} />}
      </View>
    </View>
  );
}

function DeathContent({ cert }: { cert: DeathCertificate }) {
  const c = cert.content;
  const mannerMap: Record<string, string> = {
    natural: '병사', accident: '사고사', suicide: '자살',
    homicide: '타살', undetermined: '미상',
  };
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>사망 정보</Text>
      <View style={s.table}>
        <KVRow label="사망 일시" value={c.deathDateTime} />
        <KVRow label="사망 장소" value={c.deathPlace} />
        <KVRow label="직접 사인" value={c.causeOfDeath} />
        {c.antecedentCause && <KVRow label="선행 사인" value={c.antecedentCause} />}
        {c.underlyingCause && <KVRow label="원사인" value={c.underlyingCause} />}
        {c.contributingConditions && <KVRow label="기타 기여 상태" value={c.contributingConditions} />}
        <KVRow label="사망의 종류" value={mannerMap[c.mannerOfDeath] || c.mannerOfDeath} />
        {c.externalCause && <KVRow label="외인 사유" value={c.externalCause} />}
        <KVRow label="부검 여부" value={c.autopsyPerformed ? '예' : '아니오'} />
      </View>
    </View>
  );
}

/** 제증명 내용 라우터 */
function CertContent({ cert }: { cert: Certificate }) {
  switch (cert.type) {
    case 'diagnosis': return <DiagnosisContent cert={cert} />;
    case 'medical_opinion': return <MedicalOpinionContent cert={cert} />;
    case 'injury_diagnosis': return <InjuryDiagnosisContent cert={cert} />;
    case 'treatment_confirm': return <TreatmentConfirmContent cert={cert} />;
    case 'doctor_opinion': return <DoctorOpinionContent cert={cert} />;
    case 'referral': return <ReferralContent cert={cert} />;
    case 'disability': return <DisabilityContent cert={cert} />;
    case 'residual_disability': return <ResidualDisabilityContent cert={cert} />;
    case 'work_capacity': return <WorkCapacityContent cert={cert} />;
    case 'medical_aid_ext': return <MedicalAidExtContent cert={cert} />;
    case 'birth': return <BirthContent cert={cert} />;
    case 'death': return <DeathContent cert={cert} />;
    default: return null;
  }
}

// ──────────────────────────────────────────────────────
// 메인 PDF 문서 컴포넌트
// ──────────────────────────────────────────────────────

/** 제증명 PDF Document 컴포넌트 */
export function CertificatePDF({ cert }: { cert: Certificate }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <CertHeader type={cert.type} serialNo={cert.serialNo} />
        <PatientInfoTable cert={cert} />
        <DiagnosisInfoTable cert={cert} />
        <CertContent cert={cert} />
        <CertFooter cert={cert} />
      </Page>
    </Document>
  );
}

export { HOSPITAL_INFO };
