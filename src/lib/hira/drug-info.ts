/**
 * HIRA 의약품성분약효정보조회서비스
 * data.go.kr 서비스 ID: 15021027
 * Base URL: http://apis.data.go.kr/B551182/msupCmpnMeftInfoService
 *
 * 약품 성분/약효 분류 조회
 */

import { hiraFetch, type HiraFetchOptions } from './client';
import type {
  HiraParsedResult,
  DrugIngredientInfo,
  DrugEffectInfo,
  DrugSearchParams,
} from '@/types/hira';

const BASE_URL = 'http://apis.data.go.kr/B551182/msupCmpnMeftInfoService';

/**
 * 의약품 성분 정보 조회
 */
export async function getDrugIngredients(
  params: DrugSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<DrugIngredientInfo>> {
  return hiraFetch<DrugIngredientInfo>(BASE_URL, 'getCmpnList', params, options);
}

/**
 * 의약품 약효 분류 정보 조회
 */
export async function getDrugEffects(
  params: DrugSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<DrugEffectInfo>> {
  return hiraFetch<DrugEffectInfo>(BASE_URL, 'getMeftList', params, options);
}
