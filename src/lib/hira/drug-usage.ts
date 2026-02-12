/**
 * HIRA 의약품사용정보서비스
 * data.go.kr 서비스 ID: 15047819
 * Base URL: http://apis.data.go.kr/B551182/msupUserInfoService
 *
 * 의약품 처방/공급 통계 조회
 */

import { hiraFetch, type HiraFetchOptions } from './client';
import type {
  HiraParsedResult,
  DrugPrescriptionInfo,
  DrugSupplyInfo,
  DrugUsageSearchParams,
} from '@/types/hira';

const BASE_URL = 'http://apis.data.go.kr/B551182/msupUserInfoService';

/**
 * 의약품 처방정보 조회
 */
export async function getDrugPrescriptionInfo(
  params: DrugUsageSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<DrugPrescriptionInfo>> {
  return hiraFetch<DrugPrescriptionInfo>(BASE_URL, 'getMdcinPrscInfoList', params, options);
}

/**
 * 의약품 공급정보 조회
 */
export async function getDrugSupplyInfo(
  params: DrugUsageSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<DrugSupplyInfo>> {
  return hiraFetch<DrugSupplyInfo>(BASE_URL, 'getMdcinSplyInfoList', params, options);
}
