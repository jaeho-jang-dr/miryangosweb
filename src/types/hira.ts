/**
 * HIRA (건강보험심사평가원) 공공 API 타입 정의
 * data.go.kr 기반 — 비급여진료비, 병원정보, 의약품, 치료재료
 */

// ─── 공통 (Common) ────────────────────────────────────────

export interface HiraRequestBase {
  serviceKey?: string;   // API 인증키 (클라이언트가 자동 주입)
  pageNo?: number;       // 페이지 번호 (기본 1)
  numOfRows?: number;    // 페이지당 건수 (기본 10, 최대 1000)
}

export interface HiraResponseHeader {
  resultCode: string;    // '00' = 정상
  resultMsg: string;
}

export interface HiraResponseBody<T> {
  items: { item: T[] } | '';
  numOfRows: number;
  pageNo: number;
  totalCount: number;
}

export interface HiraApiResponse<T> {
  header: HiraResponseHeader;
  body: HiraResponseBody<T>;
}

/** 파싱된 결과 (API 라우트 반환용) */
export interface HiraParsedResult<T> {
  items: T[];
  totalCount: number;
  pageNo: number;
  numOfRows: number;
  hasMore: boolean;
}

// ─── 에러 ──────────────────────────────────────────────────

export type HiraErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_API_KEY'
  | 'RATE_LIMIT_EXCEEDED'
  | 'API_ERROR'
  | 'PARSE_ERROR'
  | 'TIMEOUT'
  | 'NETWORK_ERROR';

export class HiraError extends Error {
  constructor(
    public code: HiraErrorCode,
    message: string,
    public statusCode: number = 500,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = 'HiraError';
  }

  static fromCode(code: HiraErrorCode, detail?: string): HiraError {
    const map: Record<HiraErrorCode, { msg: string; status: number }> = {
      MISSING_API_KEY: { msg: 'HIRA API 키가 설정되지 않았습니다', status: 500 },
      INVALID_API_KEY: { msg: 'HIRA API 키가 유효하지 않습니다', status: 401 },
      RATE_LIMIT_EXCEEDED: { msg: 'HIRA API 일일 호출 한도 초과', status: 429 },
      API_ERROR: { msg: 'HIRA API 오류', status: 502 },
      PARSE_ERROR: { msg: 'HIRA API 응답 파싱 실패', status: 502 },
      TIMEOUT: { msg: 'HIRA API 응답 시간 초과', status: 504 },
      NETWORK_ERROR: { msg: 'HIRA API 네트워크 오류', status: 502 },
    };
    const entry = map[code];
    return new HiraError(code, detail ? `${entry.msg}: ${detail}` : entry.msg, entry.status);
  }
}

// ─── 캐시 ──────────────────────────────────────────────────

export interface HiraCacheEntry<T = unknown> {
  data: T;
  expiresAt: number;   // Date.now() + ttl
}

// ─── 비급여진료비 (NonPayment) ─────────────────────────────

/** 비급여 항목 코드 */
export interface NonPaymentItemCode {
  npayKorCd: string;     // 비급여 항목 코드
  npayKorCdNm: string;   // 비급여 항목 코드명
}

/** 비급여 종별 가격 */
export interface NonPaymentCostByClass {
  yadmTpCd: string;      // 종별코드
  yadmTpCdNm: string;    // 종별코드명 (상급종합, 종합, 병원, 의원)
  npayKorCd: string;     // 비급여 코드
  npayKorCdNm: string;   // 비급여 코드명
  curAmt: string;        // 금액 (문자열)
  npayAmt: string;       // 비급여 금액
  npayCnt: string;       // 비급여 건수
  avgAmt?: string;       // 평균 금액
  minAmt?: string;       // 최저 금액
  maxAmt?: string;       // 최고 금액
  mdnAmt?: string;       // 중앙값
}

/** 비급여 지역별 가격 */
export interface NonPaymentCostByRegion {
  sidoCd: string;        // 시도코드
  sidoCdNm: string;      // 시도명
  sgguCd?: string;       // 시군구코드
  sgguCdNm?: string;     // 시군구명
  npayKorCd: string;     // 비급여 코드
  npayKorCdNm: string;   // 비급여 코드명
  curAmt: string;        // 금액
  npayCnt: string;       // 건수
  avgAmt?: string;
  minAmt?: string;
  maxAmt?: string;
}

/** 비급여 병원별 가격 */
export interface NonPaymentCostByHospital {
  ykiho: string;         // 요양기관 기호
  yadmNm: string;        // 요양기관명
  clCd: string;          // 종별코드
  clCdNm: string;        // 종별코드명
  sidoCdNm: string;      // 시도명
  sgguCdNm: string;      // 시군구명
  npayKorCd: string;     // 비급여 코드
  npayKorCdNm: string;   // 비급여 코드명
  npayAmt: string;       // 비급여 금액
  npayDt?: string;       // 기준일자
}

/** 비급여 요청 파라미터 */
export interface NonPaymentByClassParams extends HiraRequestBase {
  npayKorCd: string;     // 비급여 항목 코드 (필수)
}

export interface NonPaymentByRegionParams extends HiraRequestBase {
  npayKorCd: string;     // 비급여 항목 코드 (필수)
  sidoCd?: string;       // 시도코드
  sgguCd?: string;       // 시군구코드
}

export interface NonPaymentByHospitalParams extends HiraRequestBase {
  npayKorCd: string;     // 비급여 항목 코드 (필수)
  ykiho?: string;        // 요양기관 기호
  sidoCd?: string;       // 시도코드
  sgguCd?: string;       // 시군구코드
}

// ─── 병원정보 (Hospital Info) ──────────────────────────────

export interface HospitalInfo {
  ykiho: string;         // 요양기관 기호
  yadmNm: string;        // 요양기관명
  clCd: string;          // 종별코드
  clCdNm: string;        // 종별코드명
  sidoCd: string;        // 시도코드
  sidoCdNm: string;      // 시도명
  sgguCd: string;        // 시군구코드
  sgguCdNm: string;      // 시군구명
  emdongNm?: string;     // 읍면동명
  addr: string;          // 주소
  telno?: string;        // 전화번호
  hospUrl?: string;      // 홈페이지
  estbDd?: string;       // 개설일
  drTotCnt?: string;     // 의사 총수
  dgsbjtCd?: string;     // 진료과목 코드
  dgsbjtCdNm?: string;   // 진료과목명
  cmdcGdrCnt?: string;   // 한의사 수
  cmdcIntnCnt?: string;  // 한의사 인턴 수
  cmdcResdntCnt?: string;// 한의사 레지던트 수
  cmdcSdrCnt?: string;   // 한의사 전문의 수
  detyGdrCnt?: string;   // 치과의사 수
  detyIntnCnt?: string;  // 치과의사 인턴 수
  detyResdntCnt?: string;// 치과의사 레지던트 수
  detySdrCnt?: string;   // 치과의사 전문의 수
  mdeptGdrCnt?: string;  // 의과의사 수
  mdeptIntnCnt?: string; // 의과인턴 수
  mdeptResdntCnt?: string;// 의과레지던트 수
  mdeptSdrCnt?: string;  // 의과전문의 수
  pnursCnt?: string;     // 약사 수
  XPos?: string;         // 경도
  YPos?: string;         // 위도
}

export interface HospitalSearchParams extends HiraRequestBase {
  yadmNm?: string;       // 기관명 (like 검색)
  clCd?: string;         // 종별코드 (01:상급종합, 11:종합, 21:병원, 31:의원)
  sidoCd?: string;       // 시도코드
  sgguCd?: string;       // 시군구코드
  dgsbjtCd?: string;     // 진료과목코드 (05:정형외과, 01:내과 등)
  ykiho?: string;        // 요양기관 기호
}

// ─── 의약품 성분약효 (Drug Info) ────────────────────────────

export interface DrugIngredientInfo {
  cpntCd: string;        // 성분코드
  cpntNm: string;        // 성분명(한글)
  cpntNmEng?: string;    // 성분명(영문)
  fomlCd?: string;       // 제형코드
  fomlNm?: string;       // 제형명
  dosFormCd?: string;    // 투여경로
  dosFormNm?: string;    // 투여경로명
}

export interface DrugEffectInfo {
  meftDivNo: string;     // 약효분류번호
  meftDivNm: string;     // 약효분류명
  injcPthDivNm?: string; // 투여경로구분명
}

export interface DrugSearchParams extends HiraRequestBase {
  cpntCd?: string;       // 성분코드
  cpntNm?: string;       // 성분명
  meftDivNo?: string;    // 약효분류번호
}

// ─── 치료재료 (Treatment Material) ─────────────────────────

export interface TreatmentMaterialInfo {
  mcatCd: string;        // 재료코드
  mcatNm: string;        // 재료명
  mcatClsCd?: string;    // 재료분류코드
  mcatClsNm?: string;    // 재료분류명
  uplmtAmt?: string;     // 상한단가
  efcBgnDt?: string;     // 유효시작일
  efcEndDt?: string;     // 유효종료일
  mnfctrNm?: string;     // 제조업자
  aplctnDivNm?: string;  // 적용구분명
}

export interface TreatmentMaterialSearchParams extends HiraRequestBase {
  mcatCd?: string;       // 재료코드
  mcatNm?: string;       // 재료명 (like 검색)
  mcatClsCd?: string;    // 재료분류코드
}

// ─── 의료기관상세 (Hospital Detail) ──────────────────────
// data.go.kr 서비스 ID: 15001699
// Base URL: https://apis.data.go.kr/B551182/MadmDtlInfoService2.7

export interface HospitalDepartmentInfo {
  ykiho: string;         // 요양기관 기호
  yadmNm: string;        // 요양기관명
  clCd: string;          // 종별코드
  clCdNm: string;        // 종별코드명
  dgsbjtCd: string;      // 진료과목코드
  dgsbjtCdNm: string;    // 진료과목명
  dgsbjtPrSdrCnt?: string; // 진료과목 전문의 수
  sidoCd?: string;       // 시도코드
  sidoCdNm?: string;     // 시도명
  sgguCd?: string;       // 시군구코드
  sgguCdNm?: string;     // 시군구명
}

export interface HospitalListStatus {
  ykiho: string;         // 요양기관 기호
  yadmNm: string;        // 요양기관명
  clCd: string;          // 종별코드
  clCdNm: string;        // 종별코드명
  sidoCd: string;        // 시도코드
  sidoCdNm: string;      // 시도명
  sgguCd: string;        // 시군구코드
  sgguCdNm: string;      // 시군구명
  addr?: string;         // 주소
  telno?: string;        // 전화번호
  estbDd?: string;       // 개설일자
  clsDd?: string;        // 폐업일자
  drTotCnt?: string;     // 의사 총수
  mdeptGdrCnt?: string;  // 의과일반의 수
  mdeptIntnCnt?: string; // 의과인턴 수
  mdeptResdntCnt?: string; // 의과레지던트 수
  mdeptSdrCnt?: string;  // 의과전문의 수
  pnursCnt?: string;     // 간호사 수
  XPos?: string;         // 경도
  YPos?: string;         // 위도
}

export interface HospitalEmergencyInfo {
  ykiho: string;         // 요양기관 기호
  yadmNm: string;        // 요양기관명
  clCd: string;          // 종별코드
  clCdNm: string;        // 종별코드명
  sidoCdNm: string;      // 시도명
  sgguCdNm: string;      // 시군구명
  emrrmSbdnYn?: string;  // 응급실 설치 여부
  emrrmPimaCnt?: string; // 응급실 전문의 수
  emrrmGnlCnt?: string;  // 응급실 일반의 수
  emrrmBdCnt?: string;   // 응급실 병상 수
}

export interface HospitalDetailSearchParams extends HiraRequestBase {
  ykiho?: string;        // 요양기관 기호
  sidoCd?: string;       // 시도코드
  sgguCd?: string;       // 시군구코드
  clCd?: string;         // 종별코드
  dgsbjtCd?: string;     // 진료과목코드
  yadmNm?: string;       // 요양기관명
}

// ─── 약국정보 (Pharmacy Info) ────────────────────────────
// data.go.kr 서비스 ID: 15001673
// Base URL: https://apis.data.go.kr/B551182/pharmacyInfoService

export interface PharmacyBasisInfo {
  ykiho: string;         // 요양기관 기호
  yadmNm: string;        // 약국명
  clCd: string;          // 종별코드
  clCdNm: string;        // 종별코드명
  sidoCd: string;        // 시도코드
  sidoCdNm: string;      // 시도명
  sgguCd: string;        // 시군구코드
  sgguCdNm: string;      // 시군구명
  emdongNm?: string;     // 읍면동명
  addr: string;          // 주소
  telno?: string;        // 전화번호
  estbDd?: string;       // 개설일
  XPos?: string;         // 경도
  YPos?: string;         // 위도
}

export interface PharmacyDetailInfo extends PharmacyBasisInfo {
  dutyTime1s?: string;   // 월요일 시작
  dutyTime1c?: string;   // 월요일 종료
  dutyTime2s?: string;   // 화요일 시작
  dutyTime2c?: string;   // 화요일 종료
  dutyTime3s?: string;   // 수요일 시작
  dutyTime3c?: string;   // 수요일 종료
  dutyTime4s?: string;   // 목요일 시작
  dutyTime4c?: string;   // 목요일 종료
  dutyTime5s?: string;   // 금요일 시작
  dutyTime5c?: string;   // 금요일 종료
  dutyTime6s?: string;   // 토요일 시작
  dutyTime6c?: string;   // 토요일 종료
  dutyTime7s?: string;   // 일요일 시작
  dutyTime7c?: string;   // 일요일 종료
  dutyTime8s?: string;   // 공휴일 시작
  dutyTime8c?: string;   // 공휴일 종료
}

export interface PharmacySearchParams extends HiraRequestBase {
  yadmNm?: string;       // 약국명 (like 검색)
  sidoCd?: string;       // 시도코드
  sgguCd?: string;       // 시군구코드
  ykiho?: string;        // 요양기관 기호
}

// ─── DUR 성분 (DUR Ingredient Level) ────────────────────
// 식약처(MFDS) data.go.kr 서비스 ID: 15056780
// Base URL: http://apis.data.go.kr/1471000/DURPrdlstInfoService03

export type DurIngredientCheckType =
  | 'contraindication'     // 병용금기
  | 'age-taboo'            // 특정연령대금기
  | 'pregnancy-taboo'      // 임부금기
  | 'dosage-caution'       // 용량주의
  | 'duration-caution'     // 투여기간주의
  | 'duplicate-efficacy'   // 효능군중복주의
  | 'split-caution';       // 서방정분할주의

export interface DurIngredientItem {
  MIXTURE_INGR_CODE?: string;      // 성분코드
  MIXTURE_INGR_KOR_NAME?: string;  // 성분명(한)
  MIXTURE_INGR_ENG_NAME?: string;  // 성분명(영)
  INGR_CODE?: string;              // 성분코드
  INGR_KOR_NAME?: string;          // 성분명(한)
  INGR_ENG_NAME?: string;          // 성분명(영)
  TYPE_NAME?: string;              // 유형명
  MIX_TYPE?: string;               // 배합유형
  PROHBT_CONTENT?: string;         // 금기내용
  REMARK?: string;                 // 비고
  ITEM_SEQ?: string;               // 품목일련번호
  ITEM_NAME?: string;              // 품목명
  ENTP_NAME?: string;              // 업체명
  CHART?: string;                  // 성상
  CLASS_NO?: string;               // 분류번호
  CLASS_NAME?: string;             // 분류명
  ETC_OTC_CODE?: string;           // 전문/일반
  FORM_CODE_NAME?: string;         // 제형코드명
  DUR_SEQ?: string;                // DUR 일련번호
  NOTIFICATION_DATE?: string;      // 고시일자
  AGE?: string;                    // 연령
  MAX_DOSAGE?: string;             // 최대용량
  MAX_DURATION?: string;           // 최대기간
}

export interface DurIngredientSearchParams extends HiraRequestBase {
  typeName?: string;       // 유형명
  ingrCode?: string;       // 성분코드
  ingrName?: string;       // 성분명 (like 검색)
  itemSeq?: string;        // 품목일련번호
  itemName?: string;       // 품목명
}

// ─── DUR 품목 (DUR Product Level) ────────────────────────
// 식약처(MFDS) data.go.kr 서비스 ID: 15059486
// Base URL: http://apis.data.go.kr/1471000/DURIrdntInfoService03

export type DurProductCheckType =
  | 'contraindication'     // 병용금기
  | 'age-taboo'            // 특정연령대금기
  | 'pregnancy-taboo'      // 임부금기
  | 'dosage-caution'       // 용량주의
  | 'duration-caution'     // 투여기간주의
  | 'duplicate-efficacy';  // 효능군중복

export interface DurProductItem {
  ITEM_SEQ?: string;               // 품목일련번호
  ITEM_NAME?: string;              // 품목명
  ENTP_NAME?: string;              // 업체명
  CHART?: string;                  // 성상
  CLASS_NO?: string;               // 분류번호
  CLASS_NAME?: string;             // 분류명
  ETC_OTC_CODE?: string;           // 전문/일반
  FORM_CODE_NAME?: string;         // 제형코드명
  INGR_CODE?: string;              // 성분코드
  INGR_KOR_NAME?: string;          // 성분명(한)
  INGR_ENG_NAME?: string;          // 성분명(영)
  MIX_INGR_CODE?: string;          // 배합성분코드
  MIX_INGR_KOR_NAME?: string;      // 배합성분명(한)
  MIX_INGR_ENG_NAME?: string;      // 배합성분명(영)
  TYPE_NAME?: string;              // 유형명
  MIX_TYPE?: string;               // 배합유형
  PROHBT_CONTENT?: string;         // 금기내용
  REMARK?: string;                 // 비고
  DUR_SEQ?: string;                // DUR 일련번호
  NOTIFICATION_DATE?: string;      // 고시일자
  AGE?: string;                    // 연령
  MAX_DOSAGE?: string;             // 최대용량
  MAX_DURATION?: string;           // 최대기간
}

export interface DurProductSearchParams extends HiraRequestBase {
  typeName?: string;       // 유형명
  itemSeq?: string;        // 품목일련번호
  itemName?: string;       // 품목명
  ingrName?: string;       // 성분명
}

// ─── 의약품 사용통계 (Drug Usage) ─────────────────────────
// data.go.kr 서비스 ID: 15047819
// Base URL: http://apis.data.go.kr/B551182/msupUserInfoService

export interface DrugPrescriptionInfo {
  mdcinCpntNm?: string;   // 의약품 성분명
  mdcinPrductNm?: string; // 의약품 제품명
  prcpCnt?: string;       // 처방건수
  totPrcpQty?: string;    // 총처방량
  gnlNmCd?: string;       // 일반명코드
  mdcinGrpNm?: string;    // 의약품 그룹명
  baseDt?: string;        // 기준일자
}

export interface DrugSupplyInfo {
  mdcinCpntNm?: string;   // 의약품 성분명
  mdcinPrductNm?: string; // 의약품 제품명
  splyCnt?: string;       // 공급건수
  totSplyQty?: string;    // 총공급량
  gnlNmCd?: string;       // 일반명코드
  mdcinGrpNm?: string;    // 의약품 그룹명
  baseDt?: string;        // 기준일자
}

export interface DrugUsageSearchParams extends HiraRequestBase {
  mdcinCpntNm?: string;   // 성분명 (like 검색)
  mdcinPrductNm?: string; // 제품명 (like 검색)
  gnlNmCd?: string;       // 일반명코드
}

// ─── EMR 연동 (EMR Integration) ──────────────────────────
// 처방전 DUR 일괄체크, 의약품 통합조회, 약국 연계 등
// 기존 HIRA/MFDS API 조합 — 고수준 EMR 워크플로우용

/** DUR 일괄 체크 요청 (처방전 단위) */
export interface EmrDurCheckRequest {
  /** 처방 약물 목록 */
  ingredients: EmrIngredientEntry[];
  /** 환자 나이 (특정연령대금기 체크용) */
  patientAge?: number;
  /** 임신 여부 (임부금기 체크용) */
  isPregnant?: boolean;
}

export interface EmrIngredientEntry {
  name: string;            // 성분명 (한글)
  code?: string;           // 성분코드 (있으면 정확 매칭)
}

/** DUR 알림 1건 */
export interface EmrDurAlert {
  /** DUR 체크 유형 */
  type: DurIngredientCheckType;
  /** 심각도 */
  severity: 'critical' | 'warning' | 'info';
  /** 해당 성분명 */
  ingredient: string;
  /** 상대 성분명 (병용금기 시) */
  relatedIngredient?: string;
  /** 요약 메시지 */
  message: string;
  /** 상세 금기 내용 */
  detail?: string;
}

/** DUR 일괄 체크 결과 */
export interface EmrDurCheckResult {
  /** 즉시 처방변경 필요 (병용금기, 임부금기 등) */
  critical: EmrDurAlert[];
  /** 주의 필요 (용량, 기간, 연령 등) */
  warnings: EmrDurAlert[];
  /** 참고 정보 (효능중복, 서방정 등) */
  info: EmrDurAlert[];
  /** 총 알림 수 */
  totalAlerts: number;
  /** 처방 안전 여부 (critical 0건이면 true) */
  isSafe: boolean;
  /** 체크한 약물 수 */
  drugCount: number;
  /** 체크 완료 시각 (ISO) */
  checkedAt: string;
}

/** 의약품 통합 조회 결과 (EMR용) */
export interface EmrDrugLookupResult {
  /** 성분 정보 */
  ingredient: DrugIngredientInfo | null;
  /** 약효 분류 */
  effects: DrugEffectInfo[];
  /** 처방 통계 */
  prescription: DrugPrescriptionInfo | null;
  /** 적용 가능한 DUR 유형 목록 */
  durFlags: string[];
}

/** 주변 약국 조회 결과 (EMR용) */
export interface EmrNearbyPharmacyResult {
  /** 약국 목록 (영업시간 포함) */
  pharmacies: PharmacyDetailInfo[];
  totalCount: number;
  /** 현재 영업중인 약국 수 (서버 시간 기준 추정) */
  openNowEstimate: number;
}
