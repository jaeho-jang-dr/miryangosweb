/**
 * MFDS(식약처) DUR 성분 레벨 정보서비스
 * data.go.kr 서비스 ID: 15056780
 * Base URL: http://apis.data.go.kr/1471000/DURPrdlstInfoService03
 *
 * 7종 DUR 성분 체크: 병용금기, 특정연령대금기, 임부금기,
 * 용량주의, 투여기간주의, 효능군중복주의, 서방정분할주의
 */

import { hiraFetch, type HiraFetchOptions } from './client';
import type {
  HiraParsedResult,
  DurIngredientItem,
  DurIngredientSearchParams,
  DurIngredientCheckType,
} from '@/types/hira';

const BASE_URL = 'http://apis.data.go.kr/1471000/DURPrdlstInfoService03';

/** 병용금기 성분 조회 */
export async function getDurContraindications(
  params: DurIngredientSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<DurIngredientItem>> {
  return hiraFetch<DurIngredientItem>(BASE_URL, 'getUsjntTabooList', params, options);
}

/** 특정연령대금기 성분 조회 */
export async function getDurAgeTaboos(
  params: DurIngredientSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<DurIngredientItem>> {
  return hiraFetch<DurIngredientItem>(BASE_URL, 'getSpcifyAgrdeTabooList', params, options);
}

/** 임부금기 성분 조회 */
export async function getDurPregnancyTaboos(
  params: DurIngredientSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<DurIngredientItem>> {
  return hiraFetch<DurIngredientItem>(BASE_URL, 'getPwnmTabooList', params, options);
}

/** 용량주의 성분 조회 */
export async function getDurDosageCautions(
  params: DurIngredientSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<DurIngredientItem>> {
  return hiraFetch<DurIngredientItem>(BASE_URL, 'getOdsnAtentInfoList', params, options);
}

/** 투여기간주의 성분 조회 */
export async function getDurDurationCautions(
  params: DurIngredientSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<DurIngredientItem>> {
  return hiraFetch<DurIngredientItem>(BASE_URL, 'getMdctnPdAtentInfoList', params, options);
}

/** 효능군중복주의 성분 조회 */
export async function getDurDuplicateEfficacy(
  params: DurIngredientSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<DurIngredientItem>> {
  return hiraFetch<DurIngredientItem>(BASE_URL, 'getEfcyDplctInfoList', params, options);
}

/** 서방정분할주의 성분 조회 */
export async function getDurSplitCautions(
  params: DurIngredientSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<DurIngredientItem>> {
  return hiraFetch<DurIngredientItem>(BASE_URL, 'getSeobangjeongPartitnAtentInfoList', params, options);
}

/** type 파라미터 기반 디스패치 */
export const durIngredientDispatch: Record<
  DurIngredientCheckType,
  (params: DurIngredientSearchParams, options?: HiraFetchOptions) => Promise<HiraParsedResult<DurIngredientItem>>
> = {
  'contraindication': getDurContraindications,
  'age-taboo': getDurAgeTaboos,
  'pregnancy-taboo': getDurPregnancyTaboos,
  'dosage-caution': getDurDosageCautions,
  'duration-caution': getDurDurationCautions,
  'duplicate-efficacy': getDurDuplicateEfficacy,
  'split-caution': getDurSplitCautions,
};
