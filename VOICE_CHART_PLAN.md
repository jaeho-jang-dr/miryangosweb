# 🎙️ 음성 인식 자동 차트 시스템 구현 계획

## 📌 프로젝트 개요

진료실에서 의사-환자 대화를 실시간으로 듣고, 자동으로 구조화된 진료 차트를 작성하는 시스템

---

## 🎯 핵심 기능

### 1. 실시간 음성 인식
- 마이크로 의사와 환자의 대화 녹음
- 실시간 텍스트 변환 (STT)
- 화자 구분 (의사 vs 환자)

### 2. 지능형 차트 작성
- **초진**: 구조화된 형식 (CC → History → PE → Dx)
- **재진**: SOAP Note 형식
- AI가 문맥 파악하여 자동 분류

### 3. 의료 지식 기반 보조
- 증상 기반 검사 추천 (X-ray 부위 등)
- 예상 진단명 제시
- 의료 용어 자동 완성

---

## 🏗️ 시스템 아키텍처

```
┌─────────────────┐
│   진료실 마이크   │
└────────┬────────┘
         │ 실시간 오디오
         ↓
┌─────────────────┐
│  음성 인식 엔진  │ ← Google Speech-to-Text / Whisper
│  (STT Service)  │
└────────┬────────┘
         │ 텍스트 스트림
         ↓
┌─────────────────┐
│  AI 분석 엔진    │ ← Claude / GPT-4 / Gemini
│  - 문맥 파악     │
│  - 정보 추출     │
│  - 구조화       │
└────────┬────────┘
         │ 구조화된 데이터
         ↓
┌─────────────────┐
│  차트 생성기     │ ← 초진 / SOAP 템플릿
│  - 자동 채우기   │
│  - 검사 추천     │
│  - 진단 제안     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Firestore DB   │
└─────────────────┘
```

---

## 📅 구현 단계별 계획

### Phase 1: 기초 인프라 구축 (1주)

#### 1.1 음성 녹음 기능
- [ ] 브라우저 마이크 접근 (MediaRecorder API)
- [ ] 실시간 오디오 스트림 처리
- [ ] 녹음 시작/정지/일시정지 UI

```typescript
// src/lib/voice/audio-recorder.ts
export class AudioRecorder {
    async startRecording(): Promise<void>
    async stopRecording(): Promise<Blob>
    pauseRecording(): void
    resumeRecording(): void
}
```

#### 1.2 STT 통합
- [ ] Google Speech-to-Text API 연동
- [ ] Streaming 방식 실시간 변환
- [ ] 한국어 의료 용어 커스텀 보캐블러리

```typescript
// src/lib/voice/speech-recognition.ts
export async function transcribeAudio(
    audioStream: ReadableStream,
    language: 'ko-KR'
): Promise<TranscriptStream>
```

#### 1.3 기본 UI
- [ ] 진료 녹음 페이지 (`/clinical/voice-chart`)
- [ ] 실시간 텍스트 표시
- [ ] 녹음 상태 표시 (녹음 중, 일시정지 등)

---

### Phase 2: AI 분석 엔진 (2주) - ✅ 완료

#### 2.1 방문 유형 판별
- [x] 초진/재진 자동 감지 (`src/lib/medical/visit-type-detector.ts`)
- [x] 문맥 기반 분류

```typescript
// src/lib/medical/visit-type-detector.ts
export function detectVisitType(
    transcript: string,
    patientHistory: PatientRecord[]
): 'initial' | 'followup'
```

#### 2.2 정보 추출 (Initial Visit)
- [x] Chief Complaint 추출 (`src/lib/medical/info-extractor.ts`)
- [x] History 정보 추출 (발병 시기, 외상력, 수술력)
- [x] 통증 부위 식별
- [x] 직업/운동 정보 추출

```typescript
// src/lib/medical/info-extractor.ts
export async function extractChiefComplaint(
    transcript: string
): Promise<ChiefComplaint>

export async function extractHistory(
    transcript: string
): Promise<MedicalHistory>
```

#### 2.3 정보 추출 (Follow-up Visit)
- [x] Subjective 정보 추출 (`src/lib/medical/soap-extractor.ts`)
- [x] Objective 데이터 파싱
- [x] Assessment 생성
- [x] Plan 항목 분류

```typescript
// src/lib/medical/soap-extractor.ts
export async function extractSoapComponents(
    transcript: string
): Promise<SoapNote>
```

---

### Phase 3: 의료 지식 기반 (2주) - ✅ 완료

#### 3.1 X-ray 검사 추천 시스템
- [x] 증상-검사 매핑 데이터베이스 (`src/lib/medical/xray-recommender.ts`)
- [x] 부위별 표준 X-ray View 추천

```typescript
// src/lib/medical/xray-recommender.ts
interface XrayRecommendation {
    bodyPart: string;
    views: string[]; // AP, Lateral, Oblique 등
    reason: string;
}

export function recommendXray(
    symptoms: string[],
    painLocation: string[]
): XrayRecommendation[]
```

**예시 매핑:**
```typescript
const xrayProtocols = {
    '무릎': {
        views: ['Knee AP', 'Knee Lateral', 'Merchant view'],
        reason: '무릎 관절 평가'
    },
    '발목 염좌': {
        views: ['Ankle AP', 'Ankle Lateral', 'Ankle Mortise'],
        reason: '발목 골절 배제'
    },
    // ...
};
```

#### 3.2 진단 제안 시스템
- [x] 증상 기반 감별 진단 DB (`src/lib/medical/diagnosis-suggester.ts`)
- [x] ICD-10 코드 자동 매칭

```typescript
// src/lib/medical/diagnosis-suggester.ts
interface DiagnosisSuggestion {
    name: string;
    icd10Code: string;
    confidence: number; // 0-1
    reasoning: string;
}

export async function suggestDiagnosis(
    symptoms: string[],
    physicalExam: string[],
    imagingFindings?: string[]
): Promise<DiagnosisSuggestion[]>
```

#### 3.3 의료 용어 DB
- [ ] 한글-영문 의료 용어 사전 (Phase 4로 이월)
- [ ] 약어 자동 확장
- [ ] 오타 교정

---

### Phase 4: 실시간 차트 생성 (2주) - ✅ 완료

#### 4.1 Progressive Chart Building
- [x] 대화 진행에 따라 차트 점진적 작성
- [x] 섹션별 완성도 표시
- [x] 실시간 업데이트

#### 4.2 화자 구분 (Speaker Diarization)
- [x] 의사/환자 음성 구분
- [x] 각 발화자별 내용 분류

#### 4.3 차트 편집 UI
- [x] 섹션별 편집 가능
- [x] AI 제안 수락/거부
- [x] 수동 보정 기능

---

### Phase 5: 통합 및 최적화 (1주) - ✅ 일부 완료 (기본 저장 구현)

#### 5.1 Firestore 연동
- [x] 차트 자동 저장
- [ ] 환자 기록 연동
- [ ] 버전 관리

#### 5.2 성능 최적화
- [ ] 오디오 스트림 버퍼링
- [ ] AI 응답 캐싱
- [ ] 점진적 렌더링

#### 5.3 보안 강화
- [ ] HIPAA/개인정보 보호
- [ ] 녹음 데이터 암호화
- [ ] 접근 권한 관리

---

## 🛠️ 기술 스택

### Frontend
```json
{
  "음성 녹음": "MediaRecorder API",
  "실시간 UI": "React + Next.js",
  "상태 관리": "Zustand",
  "차트 편집": "Draft.js / Slate.js"
}
```

### Backend
```json
{
  "STT": "Google Speech-to-Text API",
  "AI 분석": "Claude Opus 4 / GPT-4o",
  "의료 NLP": "Custom Fine-tuned Model",
  "데이터베이스": "Firestore"
}
```

### 의료 지식
```json
{
  "진단 DB": "ICD-10 Korea",
  "검사 프로토콜": "Custom JSON",
  "용어 사전": "KCD-8 (한국표준질병사인분류)"
}
```

---

## 📊 데이터 플로우

### 초진 (Initial Visit) 예시

```
[대화 시작]
환자: "무릎이 아파요"
  → AI: Chief Complaint 감지
  → 차트 CC 섹션 채우기: "무릎 통증"

의사: "언제부터 아프셨어요?"
환자: "한 달 전부터요"
  → AI: History 정보 추출
  → 차트 History 섹션 업데이트: "발병 시기: 1개월 전"

의사: "다친 적 있으세요?"
환자: "아니요, 특별히 다친 적은 없어요"
  → AI: 외상력 추출
  → 차트 History 업데이트: "외상력: 없음"

의사: "직업이 어떻게 되세요?"
환자: "배달 일 하는데 오토바이 많이 타요"
  → AI: 직업력 추출
  → 차트 Occupational History 업데이트

의사: "무릎 X-ray 한 번 찍어보겠습니다"
  → AI: 검사 계획 감지
  → 자동 추천: "Knee AP, Knee Lateral"
  → 예상 진단 제시: "슬개골연골연화증 의심"

[대화 종료]
  → 완성된 초진 차트 생성
  → Firestore 저장
```

---

## 🎨 UI/UX 설계

### 메인 화면

```
┌────────────────────────────────────────┐
│  🎙️ 진료 차트 음성 입력               │
├────────────────────────────────────────┤
│                                        │
│  환자: 홍길동 (123456)                 │
│  방문 유형: ⚪ 초진  ⚫ 재진           │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  🔴 녹음 중... 03:45             │ │
│  │  [일시정지] [정지]               │ │
│  └──────────────────────────────────┘ │
│                                        │
│  📝 실시간 대화 내용:                 │
│  ┌──────────────────────────────────┐ │
│  │ [의사] 어디가 불편하세요?        │ │
│  │ [환자] 무릎이 아파요             │ │
│  │ [의사] 언제부터 아프셨어요?      │ │
│  │ ...                              │ │
│  └──────────────────────────────────┘ │
│                                        │
│  📋 자동 생성 차트:                   │
│  ┌──────────────────────────────────┐ │
│  │ ✅ 주소 (CC): 무릎 통증          │ │
│  │ ⏳ 병력 (History): 작성 중...    │ │
│  │ ⬜ 이학적 검사: 대기 중          │ │
│  └──────────────────────────────────┘ │
│                                        │
│  💡 AI 제안:                          │
│  • X-ray: Knee AP, Knee Lateral      │
│  • 예상 진단: 슬개골연골연화증        │
│                                        │
│  [차트 저장] [편집 모드] [취소]       │
└────────────────────────────────────────┘
```

---

## 🔬 AI 프롬프트 설계

### 초진 정보 추출 프롬프트

```typescript
const INITIAL_VISIT_PROMPT = `
당신은 정형외과 전문의 보조 AI입니다.
의사-환자 대화를 분석하여 초진 차트를 작성하세요.

[대화 내용]
${transcript}

[추출할 정보]
1. Chief Complaint (주소)
   - 환자가 말한 주된 증상
   - 통증 정도 (0-10)

2. History (병력)
   - 발병 시기
   - 외상력
   - 수술력
   - 통증 부위

3. Occupational History (직업력)
   - 직업
   - 업무 내용
   - 자세

4. Physical Exam (이학적 검사)
   - 시진 소견
   - 촉진 소견
   - ROM 제한

5. Imaging Plan (검사 계획)
   - X-ray 부위

6. Suspected Diagnosis (예상 진단)
   - ICD-10 코드 포함

JSON 형식으로 출력하세요.
`;
```

---

## 📈 성능 목표

| 항목 | 목표 | 측정 방법 |
|------|------|-----------|
| STT 지연 시간 | < 2초 | 발화 종료 → 텍스트 표시 |
| AI 분석 시간 | < 5초 | 대화 종료 → 차트 완성 |
| 차트 정확도 | > 90% | 의사 수정 빈도 |
| 음성 인식 정확도 | > 95% | WER (Word Error Rate) |

---

## 🔒 보안 및 규정 준수

### HIPAA 준수 사항
- [ ] 환자 데이터 암호화 (전송/저장)
- [ ] 접근 로그 기록
- [ ] 역할 기반 접근 제어 (RBAC)
- [ ] 녹음 파일 자동 삭제 (24시간 후)

### 개인정보 보호
- [ ] 환자 동의서 확인
- [ ] 민감 정보 마스킹
- [ ] 감사 추적 (Audit Trail)

---

## 🧪 테스트 계획

### 단위 테스트
- [ ] STT 정확도 테스트
- [ ] 정보 추출 정확도
- [ ] 화자 구분 정확도

### 통합 테스트
- [ ] End-to-end 진료 시나리오
- [ ] 다양한 방언/억양 테스트
- [ ] 의료 용어 인식 테스트

### 사용자 테스트
- [ ] 실제 의사와 파일럿 테스트
- [ ] 사용성 평가
- [ ] 정확도 검증

---

## 📚 참고 자료

### API 문서
- [Google Speech-to-Text](https://cloud.google.com/speech-to-text)
- [OpenAI Whisper](https://platform.openai.com/docs/guides/speech-to-text)
- [Claude API](https://docs.anthropic.com/)

### 의료 표준
- [ICD-10 Korea](https://www.koicd.kr/)
- [KCD-8 질병분류](https://www.index.go.kr/)
- [SNOMED CT](https://www.snomed.org/)

### 음성 인식
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

---

## 💰 예상 비용

### API 사용료 (월간, 진료 100건 기준)

| 서비스 | 사용량 | 비용 |
|--------|--------|------|
| Google STT | 100시간 | $144 |
| Claude API | 1M tokens | $15 |
| Firestore | 10GB | $1.8 |
| **합계** | - | **~$160** |

---

## 🚀 배포 계획

### Phase 1: 내부 테스트 (1개월)
- 개발 환경 배포
- 의사 2-3명과 파일럿 테스트
- 피드백 수집 및 개선

### Phase 2: 제한적 출시 (2개월)
- 1개 진료실에 적용
- 일일 모니터링
- 정확도 측정

### Phase 3: 전체 배포 (3개월)
- 모든 진료실에 확대
- 교육 및 매뉴얼 제공
- 지속적 개선

---

**작성일:** 2026-02-10
**작성자:** Claude Sonnet 4.5
**버전:** 1.0
