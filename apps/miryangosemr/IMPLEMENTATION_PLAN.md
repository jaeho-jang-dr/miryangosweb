# MiryangosEMR Implementation Plan
## Ichart 시스템 분석 기반 웹 EMR 구현 로드맵

> **분석 일자**: 2026-02-15
> **원본 시스템**: iChart (TENSOFT/KT Communications) - Windows Desktop EMR
> **대상 시스템**: MiryangosEMR - Next.js 16 + Firebase Firestore 웹 EMR
> **의원**: 밀양정형외과의원 (요양기관기호: 38315599)

---

## 1. 현황 분석 요약

### 1.1 Ichart 시스템 모듈 구성 (스크린샷 60장 분석)

| # | 모듈 | 화면 수 | 핵심 기능 |
|---|------|---------|-----------|
| 1 | 접수실 | 3 | 환자등록, 보험구분, 대기현황, 수납대기 |
| 2 | 진료실 | 2 | 차트입력, 처방, PACS, 검사결과, 바이탈 |
| 3 | 청구자료등록 | 4 | 원외/원내 처방, 진단코드, DV/Ex 구분 |
| 4 | 처방자료관리 | 4 | 처방코드, 연합코드, 수가/약가, 비급여보고 |
| 5 | 병명/묶음처방 | 4 | KCD 병명, 조합처방, 묶음코드 |
| 6 | 수납/수납내역 | 3 | 결제, 현금영수증, 수납조회 |
| 7 | 진료비 관련 | 5 | 청구서, 계산서, 납입확인서, 명세서, 청구현황 |
| 8 | 보험심사 | 1 | 화면심사, 특정내역, 진찰횟수 |
| 9 | 제증명 | 12 | 진단서, 소견서, 상해진단서, 진료확인서 등 |
| 10 | 통계 | 4 | 기간별현황, 병명별현황, 일보, 월보/연보 |
| 11 | 입통원관리 | 2 | 입원, 퇴원, 병실관리, 재원현황 |
| 12 | 환경설정 | 2 | 병원정보, 의사코드, EDI, 보안 |
| 13 | 약품관리 | 3 | 마약통합, 삭제의약품, 비급여추출 |
| 14 | 예방접종 | 1 | 접종등록, NIMS 전송 |
| 15 | 기타 | 4 | 백업, 국세청, 환자조사표, 원격지원 |

### 1.2 마스터 데이터 (Excel 31개 파일, 3,623건)

| 카테고리 | 건수 | 주요 내용 |
|----------|------|-----------|
| 05 내복약 | 1,232 | NSAIDs, 근이완제, 스테로이드, 골다공증약 |
| 18 수술료 | 700 | 봉합사, 정형외과 수술 (골절, 종양) |
| 23 방사선진단 | 380 | 사지/척추 X-ray (G코드) |
| 22 기타검사 | 223 | 요검사, 혈액검사, 검사패널 |
| 06 외용약 | 159 | 도포약, 안약, 패치 |
| 21 기능검사 | 126 | 관절천자, ECG, HLA-B27 |
| 14 마취료 | 101 | 리도카인, 부피바카인 |
| 08 근육주 | 98 | 진통주사, 항생제, 비타민 |
| 20 캐스트 | 91 | 부목, 붕대, 캐스트 재료 |
| 17 처치료 | 90 | 상처치료, 생검 |
| 기타 20개 | 423 | 재진, 응급, IV, 수액, PT 등 |

**통합 스키마**: 38컬럼 (처방코드, 연합코드, 명칭, 상한가/단가/진료가, 플래그 C/W1/W2/H/P/M, 코드구분자, 위탁, 향정/마약, 성분코드, 용법, 본인부담률 등)

### 1.3 기존 코드베이스 현황 (~27,000줄)

| 영역 | 완성도 | 상태 |
|------|--------|------|
| 타입 시스템 | 95% | Patient, Visit, MedicalOrder, Billing, Claims, FHIR 완비 |
| 라우팅/페이지 | 80% | 45개 페이지 (접수, 진료, 치료, 청구, 통계 등) |
| 워크플로우 엔진 | 75% | 6단계 상태머신 (reception→paid) |
| 수가/청구 엔진 | 75% | 보험 본인부담 계산, 일일정산 |
| HIRA 연동 | 50% | DUR 확인 가능, EDI 전송 미구현 |
| FHIR 준수 | 70% | Patient/Encounter 변환, KR Core Profile 미완 |
| 컴포넌트 | 65% | 레이아웃, 배지, 타이머 등 |
| 보안 | 60% | AES-256-GCM, 전자서명, 감사로그 |
| API | 60% | 청구/진단/DUR/FHIR 엔드포인트 |
| 테스트 | 20% | E2E 4개, Unit 4개 |

---

## 2. GAP 분석: Ichart vs 현재 구현

### 2.1 미구현 핵심 기능 (Critical)

| # | 기능 | Ichart 참조 화면 | 현재 상태 | 우선순위 |
|---|------|-----------------|-----------|----------|
| G1 | **마스터 데이터 임포트** | 처방자료관리 | 미구현 | P0 |
| G2 | **처방자료관리 CRUD** | 처방자료관리 4화면 | 미구현 | P0 |
| G3 | **묶음처방 관리** | 병명/묶음처방 3화면 | 미구현 | P0 |
| G4 | **청구자료등록 상세** | 청구자료등록 4화면 | 부분 구현 | P0 |
| G5 | **HIRA EDI 전송** | 진료비청구현황 | 스텁만 존재 | P1 |
| G6 | **보험/보호 화면심사** | 화면심사 1화면 | 미구현 | P1 |
| G7 | **제증명 12종** | 제증명 12화면 | 타입만 정의 | P1 |
| G8 | **진료비 계산서/명세서** | 진료비 5화면 | 부분 구현 | P1 |
| G9 | **입통원환자관리** | 입통원 2화면 | 미구현 | P2 |
| G10 | **마약통합관리** | 마약관리 3화면 | 미구현 | P2 |

### 2.2 개선 필요 기능 (Enhancement)

| # | 기능 | 현재 상태 | 필요 작업 |
|---|------|-----------|-----------|
| E1 | 접수실 UI | 기본 구현 | Ichart 레이아웃에 맞춰 3패널 구조로 개선 |
| E2 | 진료실 차트 | 기본 구현 | 바이탈 탭, PACS 링크, 처방조회 탭 추가 |
| E3 | 수납 프로세스 | 기본 구현 | 현금영수증, 카드승인, 할인 기능 |
| E4 | 통계 화면 | 기본 구현 | 기간별/병명별/일보/월보 Ichart 동일 포맷 |
| E5 | 환경설정 | 기본 구현 | 병원정보, 의사코드, EDI설정, PACS 등 |
| E6 | Auth/보안 | TODO 상태 | Firebase Auth 복원, 역할 기반 접근 제어 |

---

## 3. 구현 계획 (Phase별)

### Phase 1: 마스터 데이터 기반 구축 (2주)

**목표**: Ichart의 처방/수가 데이터를 Firestore에 임포트하고, 관리 UI 구축

#### 1-1. Firestore 컬렉션 스키마 설계

```typescript
// collections/fee_schedule_items (마스터 처방 데이터)
interface FeeScheduleItem {
  id: string;                    // 처방코드
  hiraCode: string;              // 연합코드 (HIRA 통합코드)
  name: string;                  // 한글명칭
  nameEn?: string;               // 영문명칭
  category: string;              // 구분코드 (01초진~36기타)
  categoryName: string;          // 구분명칭
  effectiveDate: string;         // 적용일자 (YYYY.MM.DD)

  // 가격 (3-Tier)
  ceilingPrice?: number;         // 상한가 (KRW, 약품용)
  unitPrice?: number;            // 단가 (KRW)
  clinicalFee?: number;          // 진료가 (점수, 시술용)
  surcharge?: number;            // 가산

  // 플래그
  cFlag: number;                 // C (1:표준, 7:특수, 8:재료)
  w1Flag?: number;               // W1 (위탁 배수1)
  w2Flag?: number;               // W2 (위탁 배수2)
  hFlag?: boolean;               // H (병원급)
  pFlag?: boolean;               // P (약국조제)
  mFlag?: boolean;               // M (추가수식)

  // 분류
  codeClassifier?: string;       // 코드구분자: 수가/치료재료/협약재료
  consignmentMethod?: string;    // 위탁방식: 검체위탁/위탁진료
  consignmentCategory?: string;  // 위탁구분: 의원/병원/종합/기타

  // 약품 특수
  isPsychotropic: boolean;       // 향정
  isNarcotic: boolean;           // 마약
  isRequired: boolean;           // 필수
  ingredientCode?: string;       // 성분코드 (6자리+3알파)

  // 처방 기본값
  dosageCode?: string;           // 용법코드
  defaultQty?: number;           // 처방수량
  defaultFreq?: number;          // 처방횟수
  dosageText?: string;           // 용법 텍스트

  // 연관
  diagnosisCode?: string;        // 병명코드 (KCD)
  billingMemo?: string;          // 청구메모
  substituteCode?: string;       // 대체코드
  copayRatio?: number;           // 본인부담률 (0.5/0.8/0.9)
  labManagement?: number;        // 검사관리코드
}

// collections/diagnosis_codes (KCD 병명 마스터)
interface DiagnosisCode {
  code: string;                  // KCD 분류기호 (e.g., M23.87)
  nameKr: string;                // 한글 병명
  nameEn?: string;               // 영문 병명
  department?: string;           // 진료과목
  searchIndex: string;           // 검색색인
  isPrimary?: boolean;           // 주상병 여부
  flagA?: string;                // A 플래그
  flagB?: string;                // B 플래그
  flagC?: string;                // C 플래그
}

// collections/bundle_prescriptions (묶음처방)
interface BundlePrescription {
  id: string;                    // 묶음코드
  name: string;                  // 묶음명칭
  searchIndex: string;           // 검색색인
  userId?: string;               // 사용자 (의사별)
  items: {
    order: number;               // 순번
    prescriptionCode: string;    // 처방코드
    name: string;                // 처방명칭
    quantity: number;            // 수량
    frequency: number;           // 횟수
    dosage?: string;             // 용법
  }[];
}
```

#### 1-2. Excel 데이터 임포트 스크립트

```
apps/miryangosemr/scripts/
├── import-fee-schedule.ts     # 31개 Excel → fee_schedule_items 컬렉션
├── import-diagnosis-codes.ts  # KCD 병명 데이터 임포트
└── validate-master-data.ts    # 데이터 무결성 검증
```

**작업 내용**:
- `openpyxl` 또는 `xlsx` 라이브러리로 38컬럼 Excel 파싱
- 30개 카테고리별 3,623건 Firestore 일괄 업로드 (batch write 500건 단위)
- 처방코드 패턴 검증 (AA###, MM###, N####, G####, K#######, B####### 등)
- 성분코드 형식 검증 (6자리숫자 + 3알파: ATB, BIJ, CLT 등)
- 가격 데이터 정합성 (상한가 vs 단가 vs 진료가 상호배타)

#### 1-3. 처방자료관리 UI

```
apps/miryangosemr/src/app/master/
├── fee-schedule/
│   ├── page.tsx              # 처방자료관리 메인 (Ichart 4화면 통합)
│   ├── components/
│   │   ├── FeeScheduleSearch.tsx     # 좌측: 처방코드/연합코드/명칭 검색
│   │   ├── FeeScheduleForm.tsx       # 좌측: 상세 입력 폼 (38필드)
│   │   ├── FeeScheduleTable.tsx      # 우측: 참고자료 테이블
│   │   ├── ReferenceDataSelector.tsx # 우측: 약가/수가/치료재료 라디오
│   │   └── PriceHistoryTable.tsx     # 하단: 적용일자별 가격 이력
│   └── actions.ts            # Server actions (CRUD)
├── diagnosis/
│   ├── page.tsx              # 병명자료 관리
│   └── components/
│       ├── DiagnosisSearch.tsx
│       └── DiagnosisForm.tsx
└── bundles/
    ├── page.tsx              # 묶음처방 관리
    └── components/
        ├── BundleEditor.tsx         # 묶음 편집 (드래그 순서 변경)
        ├── PrescriptionPicker.tsx   # 처방 선택기
        └── BundleList.tsx           # 사용자별 묶음 목록
```

---

### Phase 2: 접수/진료 핵심 워크플로우 강화 (3주)

**목표**: Ichart의 접수실/진료실 워크플로우를 정확히 재현

#### 2-1. 접수실 UI 개선 (Ichart 레이아웃 매칭)

**Ichart 접수실 3-패널 구조**:
```
┌──────────────┬─────────────────────┬──────────────┐
│  환자 검색    │   진료대기현황        │  수납대기현황  │
│  + 신규등록   │   (대기/보류/진료중)  │  (미수납 목록) │
│              │                     │              │
│  환자정보     │   접수 상세          │  회수/환불    │
│  - 차트번호   │   - 보험구분         │              │
│  - 주민번호   │   - 초진/재진        │              │
│  - 보험종류   │   - 진료과/담당의     │              │
│  - 연락처     │                     │              │
└──────────────┴─────────────────────┴──────────────┘
```

**신규/변경 컴포넌트**:
```
components/clinical/reception/
├── PatientSearchPanel.tsx      # 좌측: 환자 검색 + 신규등록
├── WaitingQueuePanel.tsx       # 중앙: 대기/보류/진료중 현황
├── PaymentQueuePanel.tsx       # 우측: 수납대기 + 회수/환불
├── InsuranceSelector.tsx       # 보험구분 (건강보험/의료급여/산재/자보/일반/공상)
├── VisitTypeSelector.tsx       # 초진/재진/응급 선택
└── QuickRegistration.tsx       # 간편접수 (기존환자 클릭 → 자동접수)
```

#### 2-2. 진료실 차트 강화

**Ichart 진료실 구조**:
```
┌──────────────────────────────┬──────────────┐
│  환자 차트 영역               │  대기환자목록  │
│  ┌────────────────────────┐  │  (호명/보류)  │
│  │ 탭: 내원일자 | 키/몸무게 | │              │
│  │    혈압 | 체온 | 혈당    │ │              │
│  ├────────────────────────┤  │              │
│  │ 차트내용 (SOAP)         │ │              │
│  ├────────────────────────┤  │              │
│  │ 탭: 차트|검사결과|처방조회│ │              │
│  │     |판독소견            │ │              │
│  ├────────────────────────┤  │              │
│  │ 처방 입력 영역           │ │              │
│  │ (진단코드 + 처방코드)    │ │              │
│  └────────────────────────┘  │              │
│  [PACS] [DUR] [전자서명]     │              │
└──────────────────────────────┴──────────────┘
```

**신규/변경 컴포넌트**:
```
components/clinical/consulting/
├── VitalSignsPanel.tsx         # 바이탈: 키, 몸무게, 혈압, 체온, 혈당
├── ChartEditor.tsx             # SOAP 차트 에디터 (음성입력 포함)
├── ChartTabs.tsx               # 차트|검사결과|처방조회|판독소견 탭
├── PrescriptionEntry.tsx       # 처방 입력 (코드/묶음/검색)
├── DiagnosisEntry.tsx          # 진단코드 입력 (KCD 검색 + AI 추천)
├── OrderSplitView.tsx          # 원외/원내 처방 분리 뷰
├── PACSLink.tsx                # PACS 연동 링크
└── WaitingPatientList.tsx      # 우측 대기환자 목록
```

#### 2-3. 청구자료등록 상세 구현

**Ichart 청구자료등록 구조**:
```
┌─────────────────────────────────────────────────┐
│ 달력뷰 (월별)  │  환자정보 + 진단코드             │
├────────────────┼────────────────────────────────┤
│                │  원외처방 (External)             │
│ 내원일 선택     │  코드|명칭|수량|횟수|일수|DV|Ex  │
│                ├────────────────────────────────┤
│                │  원내처방 (Internal)             │
│                │  코드|명칭|수량|횟수|일수|DV|Ex  │
└────────────────┴────────────────────────────────┘
```

**DV/Ex 필드 의미**:
- **DV** (Division): 진료행위 구분 (자체/위탁)
- **Ex** (Exclusion): 제외/포함 구분

```
components/clinical/claims/
├── ClaimCalendarView.tsx       # 좌측: 월별 달력 + 내원일 표시
├── ClaimPatientHeader.tsx      # 상단: 환자정보 + 진단코드
├── ExternalPrescriptionTable.tsx # 원외처방 테이블
├── InternalPrescriptionTable.tsx # 원내처방 테이블
├── DVExSelector.tsx             # DV/Ex 구분 선택기
└── ClaimValidation.tsx          # 청구 유효성 검증
```

---

### Phase 3: 수가/청구 엔진 고도화 (3주)

**목표**: HIRA 기준 수가 계산, 보험심사, 청구 전송 구현

#### 3-1. 수가 계산 엔진 강화

```typescript
// lib/fee-engine.ts
interface FeeCalculationInput {
  prescriptionCode: string;
  category: string;          // 01~36 카테고리
  insuranceType: InsuranceType;
  quantity: number;
  frequency: number;
  days: number;
  isConsignment: boolean;
  consignmentType?: string;
}

interface FeeCalculationResult {
  totalFee: number;          // 총진료비
  insuranceClaim: number;    // 공단부담금 (청구액)
  patientCopay: number;      // 본인부담금
  nonCovered: number;        // 비급여
  supportFund: number;       // 지원금
  disabilityFund: number;    // 장애인기금
}
```

**구현 항목**:
- 보험유형별 본인부담률 적용 (건보: 30%, 의료급여: 0~10%, 자보: 0%, 산재: 0%)
- 야간/공휴일 가산 계산
- 6세미만/65세이상 감면
- 위탁검사 수가 분리
- 100/100 (전액본인부담) 항목 처리

#### 3-2. 보험심사 화면

Ichart의 `보험/보호 화면심사`를 웹으로 구현:

```
app/claims/review/
├── page.tsx                    # 화면심사 메인
└── components/
    ├── FeeDetailMatrix.tsx     # 좌측: 구분별 재료(I)/진료행위(II) 매트릭스
    ├── PrescriptionDetail.tsx  # 우측: 처방 상세 (연합코드, 명칭, 단가 등)
    ├── ClaimSummary.tsx        # 하단: 총진료비, 본인부담, 청구액 요약
    ├── VisitDayGrid.tsx        # 1-31일 요양급여일수 그리드
    └── SpecialNotesHelper.tsx  # 특정내역 도움말
```

#### 3-3. HIRA EDI 전송 구현

```
lib/hira/
├── edi-builder.ts              # 청구 데이터 → EDI 파일 포맷 변환
├── edi-transmitter.ts          # 심평원 EDI 전송 (SFTP/API)
├── edi-validator.ts            # 전송 전 유효성 검증
├── edi-status-poller.ts        # 심사 결과 조회
└── edi-types.ts                # EDI 메시지 타입 정의
```

#### 3-4. 진료비청구현황

Ichart의 월별 청구 대시보드 구현:

```
app/claims/status/
├── page.tsx                    # 청구현황 대시보드
└── components/
    ├── DailySummaryTable.tsx    # 일별 총진료비/본인부담/청구액/환자수
    ├── PTStatsPanel.tsx         # PT환자현황 (일평균 등)
    ├── MonthlyCharts.tsx        # 월별 추이 차트
    ├── InsuranceSummary.tsx     # 건보/의료급여 청구현황 요약
    └── ValidationChecklist.tsx  # 처방누락, 상병확인 등 점검
```

---

### Phase 4: 제증명 시스템 (2주)

**목표**: Ichart의 12종 제증명 양식을 웹 PDF 출력으로 구현

#### 4-1. 제증명 공통 프레임워크

```typescript
// types/certificates.ts
type CertificateType =
  | 'diagnosis'           // 진단서
  | 'medical_opinion'     // 진료소견서
  | 'injury_diagnosis'    // 상해진단서
  | 'treatment_confirm'   // 진료확인서
  | 'doctor_opinion'      // 의사소견서 (노인장기요양)
  | 'referral'            // 진료의뢰서
  | 'birth'               // 출생증명서
  | 'death'               // 사망진단서
  | 'disability'          // 장애진단서
  | 'residual_disability' // 후유장애진단서 (AMA)
  | 'work_capacity'       // 근로능력평가용진단서
  | 'medical_aid_ext';    // 의료급여일수 연장승인 신청서

interface CertificateBase {
  id: string;
  type: CertificateType;
  patientId: string;
  chartNo: string;
  issueDate: string;
  serialNo: string;
  doctorName: string;
  licenseNo: string;
  specialtyNo?: string;
  diagnosisCodes: string[];
  content: Record<string, any>;
}
```

#### 4-2. 제증명 페이지 구조

```
app/certificates/
├── page.tsx                    # 제증명 메인 (발급 목록 + 양식 선택)
├── [type]/
│   └── page.tsx                # 각 양식별 입력 폼
├── components/
│   ├── CertificateForm.tsx     # 공통 폼 프레임
│   ├── DiagnosisCert.tsx       # 진단서 양식
│   ├── MedicalOpinion.tsx      # 진료소견서 양식
│   ├── InjuryDiagnosis.tsx     # 상해진단서 양식 (상해부위/정도/원인)
│   ├── TreatmentConfirm.tsx    # 진료확인서 양식 (실통원일자)
│   ├── DoctorOpinion.tsx       # 의사소견서 양식 (장기요양 질환군)
│   ├── ReferralLetter.tsx      # 진료의뢰서 양식 (정보교류 필수정보)
│   ├── DisabilityCert.tsx      # 장애진단서 양식
│   ├── AMADisability.tsx       # 후유장애진단서 (ROM 측정, 시력)
│   ├── WorkCapacity.tsx        # 근로능력평가 (16 질환유형)
│   ├── MedicalAidExt.tsx       # 의료급여 연장신청
│   ├── BirthCert.tsx           # 출생증명서
│   ├── DeathCert.tsx           # 사망진단서
│   ├── IssuanceLog.tsx         # 발급대장 (이력 관리)
│   └── CertificatePDF.tsx      # PDF 생성 (react-pdf 또는 서버사이드)
└── lib/
    ├── certificate-engine.ts   # 양식 데이터 처리
    └── pdf-generator.ts        # PDF 출력 엔진
```

**핵심 구현 사항**:
- 병명찾기 (KCD 검색) → 진단서에 자동 반영
- 첫내원일찾기 → 과거 방문 이력에서 자동 조회
- AMA 방식 ROM (관절운동범위) 측정 입력
- 발급대장 관리 (발행연도, 연번호 자동 부여)
- PDF 출력 (의원 직인 이미지 포함)

---

### Phase 5: 진료비/수납 시스템 (2주)

**목표**: 진료비 계산서, 납입확인서, 명세서, 수납 프로세스 완성

#### 5-1. 외래 진료비 계산서

Ichart의 상세 항목별 계산서 구현:

```
app/billing/calculator/
├── page.tsx
└── components/
    ├── FeeBreakdownTable.tsx    # 항목별 급여/전액본인/비급여 분리
    │                            # (진찰료, 투약, 주사, 마취, 처치, 검사,
    │                            #  방사선, 물리치료, 치료재료, CT/MRI 등)
    ├── PaymentCalculation.tsx   # 총액 → 납부할금액 계산
    ├── PaymentMethod.tsx        # 카드/현금/통장/현금영수증/기타
    ├── ReceiptIssueHistory.tsx  # 영수증 발급내역
    └── DetailExport.tsx         # 일자별/처방별 세부출력, Excel저장
```

#### 5-2. 진료비 납입확인서

```
app/billing/confirmation/
├── page.tsx
└── components/
    ├── PaymentHistory.tsx      # 진료기간별 납입 내역
    ├── TaxDeduction.tsx        # 소득공제 대상액 계산
    └── ConfirmationPDF.tsx     # 납입확인서 PDF (사업자정보 포함)
```

#### 5-3. 수납 프로세스 완성

```
components/clinical/payment/
├── PaymentModal.tsx            # 수납 모달 (카드/현금/통장/기타)
├── CashReceiptHandler.tsx      # 현금영수증 발급
├── CardApprovalHandler.tsx     # 카드 승인 처리
├── DiscountHandler.tsx         # 할인/감면 처리
├── RefundHandler.tsx           # 환불 처리
└── OutstandingManager.tsx      # 미수금 관리
```

---

### Phase 6: 통계/보고서 시스템 (2주)

**목표**: Ichart의 4가지 통계 화면 + 규제 보고서 구현

#### 6-1. 통계 화면

```
app/statistics/
├── period/page.tsx             # 기간별환자현황
│                               # (외래: 신규/초진/재진/합계/원외/원내처방)
│                               # (입원: 환자수/실인원, 퇴원, 재원환자)
├── diagnosis/page.tsx          # 병명별 내원(다빈도)현황
│                               # (분류기호, 병명, 환자수, 내원일수, 평균내원일,
│                               #  총진료비, 평균진료비, 일당진료비)
├── daily/page.tsx              # 일보자료
│                               # (차트번호, 진료일자, 구분, 본인부담, 감가금,
│                               #  미수금, 현금/카드/통장/기타)
├── monthly/page.tsx            # 진료연(월)보
│                               # (총진료비, 청구액, 본인부담, 감가, 미수,
│                               #  수납: 현금/현영/신용/통장)
└── components/
    ├── PeriodFilter.tsx        # 기간/보험구분/과별 필터
    ├── StatisticsTable.tsx     # 정렬 가능한 통계 테이블
    ├── ChartVisualization.tsx  # 차트 (Bar/Line)
    └── ExportButtons.tsx       # Excel/CSV/PDF 내보내기
```

#### 6-2. 규제 보고서

```
app/reports/
├── tax-submission/page.tsx     # 의료비 수납내역 국세청 제출
├── non-covered/page.tsx        # 비급여 자료 추출 및 보고
├── patient-survey/page.tsx     # 환자조사표
├── material-report/page.tsx    # 치료재료 신고서
└── narcotics/page.tsx          # 마약통합관리 (NIMS 연동)
```

---

### Phase 7: 입통원 관리 + 환경설정 (2주)

#### 7-1. 입통원환자관리

```
app/inpatient/
├── page.tsx                    # 입통원환자관리 메인
└── components/
    ├── AdmissionForm.tsx       # 입원 등록 (경로, 시간, 실, DRG)
    ├── DischargeForm.tsx       # 퇴원 처리
    ├── RoomManager.tsx         # 병실 관리
    ├── InpatientList.tsx       # 재원환자 현황
    ├── BillingPeriodTable.tsx  # 청구기간 설정
    └── PaymentHistory.tsx      # 수납내역
```

#### 7-2. 환경설정 완성

```
app/setup/
├── hospital/page.tsx           # 병원정보 (명칭, 기호, 주소, 계좌)
├── doctors/page.tsx            # 의사코드 관리 (면허번호, 전문의)
├── departments/page.tsx        # 과코드 관리
├── insurance/page.tsx          # 보험 설정 (본인부담, 절사, 가산)
├── edi/page.tsx                # EDI 설정 (HIRA 심평원)
├── security/page.tsx           # 보안 설정 (사용자인증, 접근제어)
├── pacs/page.tsx               # PACS 연동 설정
└── backup/page.tsx             # 백업 설정
```

---

### Phase 8: 품질/보안/테스트 (2주)

#### 8-1. 인증/보안 복원

- Firebase Auth 활성화 (현재 TODO 상태)
- Firestore 보안 규칙 적용 (`isClinicalStaff()` 게이트)
- 역할 기반 접근 제어 (의사/간호사/접수/수납/관리자)
- 세션 타임아웃 및 동시 접속 관리

#### 8-2. 테스트 커버리지 확대

```
__tests__/
├── unit/
│   ├── fee-engine.test.ts         # 수가 계산 정확성
│   ├── claim-validator.test.ts    # 청구 유효성 검증
│   ├── certificate-engine.test.ts # 제증명 데이터 처리
│   └── master-data.test.ts        # 마스터 데이터 무결성
├── integration/
│   ├── billing-flow.test.ts       # 접수→진료→수납 통합
│   ├── claim-submission.test.ts   # 청구 전송 통합
│   └── fhir-export.test.ts        # FHIR 변환 정확성
└── e2e/
    ├── reception-workflow.spec.ts  # 접수 전체 플로우
    ├── consulting-workflow.spec.ts # 진료 전체 플로우
    ├── billing-workflow.spec.ts    # 수납 전체 플로우
    └── certificate-workflow.spec.ts # 제증명 발급 플로우
```

---

## 4. 기술 결정 사항

### 4.1 PDF 생성 방식
- **서버사이드**: `@react-pdf/renderer` 또는 `puppeteer` (Headless Chrome)
- **클라이언트사이드**: `jsPDF` + `html2canvas`
- **추천**: `@react-pdf/renderer` (React 컴포넌트로 양식 정의, SSR 호환)

### 4.2 Excel 내보내기
- `xlsx` (SheetJS) 라이브러리
- 일보/월보/연보 등 통계 데이터 Excel 다운로드

### 4.3 인쇄 지원
- `@media print` CSS + `window.print()`
- 제증명은 PDF 생성 후 인쇄

### 4.4 PACS 연동
- 외부 PACS 뷰어 URL 링크 방식 (DICOM Web Viewer)
- 현재 Ichart도 외부 연동 방식 사용

### 4.5 현금영수증/카드
- 국세청 현금영수증 API 연동
- VAN사 카드 승인 연동 (추후)

---

## 5. 일정 요약

| Phase | 기간 | 핵심 산출물 |
|-------|------|------------|
| **Phase 1** | 2주 | 마스터 데이터 임포트, 처방/묶음 관리 UI |
| **Phase 2** | 3주 | 접수실/진료실 UI 강화, 청구자료등록 |
| **Phase 3** | 3주 | 수가 엔진, 보험심사, HIRA EDI 전송 |
| **Phase 4** | 2주 | 제증명 12종 (양식 입력 + PDF 출력) |
| **Phase 5** | 2주 | 진료비 계산서/명세서, 수납 완성 |
| **Phase 6** | 2주 | 통계 4종, 규제 보고서 |
| **Phase 7** | 2주 | 입통원 관리, 환경설정 완성 |
| **Phase 8** | 2주 | 보안 복원, 테스트 커버리지 60%+ |
| **합계** | **18주** | |

---

## 6. 우선순위 판단 기준

### P0 (즉시 필요 - Phase 1-2)
- 마스터 데이터 없이는 처방/청구 불가
- 접수→진료→수납 기본 플로우는 EMR 핵심

### P1 (조기 필요 - Phase 3-5)
- HIRA 청구 전송은 수익과 직결
- 제증명은 환자 요청 시 즉시 발급 필요
- 진료비 계산서는 법적 의무

### P2 (중기 필요 - Phase 6-7)
- 통계/보고서는 경영 분석용
- 입원 관리는 정형외과 입원 환자 대응
- 환경설정은 초기 1회 설정 후 변경 드묾

### P3 (장기 필요 - Phase 8)
- 보안 강화는 운영 전 필수
- 테스트는 안정성 확보

---

## 7. 데이터 마이그레이션 계획

### 7-1. Ichart → MiryangosEMR 이관 항목

| 데이터 | 소스 | 방법 | 우선순위 |
|--------|------|------|----------|
| 처방 마스터 | Excel 31개 | 스크립트 임포트 | P0 |
| KCD 병명 | Ichart DB 또는 HIRA 제공 | API/파일 임포트 | P0 |
| 묶음처방 | Ichart 내보내기 | 수동/스크립트 | P0 |
| 환자 정보 | Ichart DB | 별도 마이그레이션 도구 | P1 |
| 진료 이력 | Ichart DB | 단계적 이관 | P2 |
| 청구 이력 | Ichart DB | 참조용 보관 | P3 |

### 7-2. 병행 운영 전략

1. **Phase 1-3**: MiryangosEMR 개발, Ichart 계속 사용
2. **Phase 4-5**: 신규 환자는 MiryangosEMR로 접수 시작 (병행 운영)
3. **Phase 6-7**: 기존 환자 데이터 이관, Ichart 참조용으로 유지
4. **Phase 8**: Ichart 완전 종료, MiryangosEMR 단독 운영
