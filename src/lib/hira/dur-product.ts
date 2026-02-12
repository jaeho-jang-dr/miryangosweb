/**
 * MFDS(식약처) DUR 품목 레벨 정보서비스
 * data.go.kr 서비스 ID: 15059486
 * Base URL: http://apis.data.go.kr/1471000/DURIrdntInfoService03
 *
 * 6종 DUR 품목 체크: 병용금기, 특정연령대금기, 임부금기,
 * 용량주의, 투여기간주의, 효능군중복
 */

import { hiraFetch, type HiraFetchOptions } from './client';
import type {
  HiraParsedResult,
  DurProductItem,
  DurProductSearchParams,
  DurProductCheckType,
} from '@/types/hira';

const BASE_URL = 'http://apis.data.go.kr/1471000/DURIrdntInfoService03';

/** 병용금기 품목 조회 */
export async function getDurContraindicationProducts(
  params: DurProductSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<DurProductItem>> {
  return hiraFetch<DurProductItem>(BASE_URL, 'getUsjntTabooInfoList', params, options);
}

/** 특정연령대금기 품목 조회 */
export async function getDurAgeTabooProducts(
  params: DurProductSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<DurProductItem>> {
  return hiraFetch<DurProductItem>(BASE_URL, 'getSpcifyAgrdeTabooInfoList', params, options);
}

/** 임부금기 품목 조회 */
export async function getDurPregnancyTabooProducts(
  params: DurProductSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<DurProductItem>> {
  return hiraFetch<DurProductItem>(BASE_URL, 'getPwnmTabooInfoList', params, options);
}

/** 용량주의 품목 조회 */
export async function getDurDosageCautionProducts(
  params: DurProductSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<DurProductItem>> {
  return hiraFetch<DurProductItem>(BASE_URL, 'getOdsnAtentInfoList2', params, options);
}

/** 투여기간주의 품목 조회 */
export async function getDurDurationCautionProducts(
  params: DurProductSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<DurProductItem>> {
  return hiraFetch<DurProductItem>(BASE_URL, 'getMdctnPdAtentInfoList2', params, options);
}

/** 효능군중복 품목 조회 */
export async function getDurDuplicateEfficacyProducts(
  params: DurProductSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<DurProductItem>> {
  return hiraFetch<DurProductItem>(BASE_URL, 'getEfcyDplctInfoList2', params, options);
}

/** type 파라미터 기반 디스패치 */
export const durProductDispatch: Record<
  DurProductCheckType,
  (params: DurProductSearchParams, options?: HiraFetchOptions) => Promise<HiraParsedResult<DurProductItem>>
> = {
  'contraindication': getDurContraindicationProducts,
  'age-taboo': getDurAgeTabooProducts,
  'pregnancy-taboo': getDurPregnancyTabooProducts,
  'dosage-caution': getDurDosageCautionProducts,
  'duration-caution': getDurDurationCautionProducts,
  'duplicate-efficacy': getDurDuplicateEfficacyProducts,
};
