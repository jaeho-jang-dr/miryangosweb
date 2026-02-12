/**
 * HIRA 공공 API 모듈 배럴 익스포트
 */

// Client utilities
export { hiraFetch, getRateLimitStatus, clearHiraCache } from './client';
export type { HiraFetchOptions } from './client';

// 비급여진료비
export {
  getNonPaymentItemCodes,
  getNonPaymentCostsByClass,
  getNonPaymentCostsByRegion,
  getNonPaymentCostsByHospital,
} from './non-payment';

// 병원정보
export { searchHospitals } from './hospital-info';

// 의약품 성분/약효
export { getDrugIngredients, getDrugEffects } from './drug-info';

// 치료재료
export { getTreatmentMaterials } from './treatment-material';

// ─── Phase 4 ────────────────────────────────────────────

// 의료기관 상세정보
export {
  getHospitalDepartments,
  getHospitalListStatus,
  getHospitalEmergencyInfo,
} from './hospital-detail';

// 약국정보
export { searchPharmacies, getPharmacyDetail } from './pharmacy-info';

// DUR 성분 레벨 (MFDS)
export {
  getDurContraindications,
  getDurAgeTaboos,
  getDurPregnancyTaboos,
  getDurDosageCautions,
  getDurDurationCautions,
  getDurDuplicateEfficacy,
  getDurSplitCautions,
  durIngredientDispatch,
} from './dur-ingredient';

// DUR 품목 레벨 (MFDS)
export {
  getDurContraindicationProducts,
  getDurAgeTabooProducts,
  getDurPregnancyTabooProducts,
  getDurDosageCautionProducts,
  getDurDurationCautionProducts,
  getDurDuplicateEfficacyProducts,
  durProductDispatch,
} from './dur-product';

// 의약품 사용통계
export { getDrugPrescriptionInfo, getDrugSupplyInfo } from './drug-usage';

// ─── EMR 연동 ───────────────────────────────────────────

export {
  performBatchDurCheck,
  lookupDrugForEmr,
  findNearbyPharmacies,
} from './emr-integration';
