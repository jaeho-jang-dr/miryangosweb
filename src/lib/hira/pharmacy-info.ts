/**
 * HIRA 약국정보서비스
 * data.go.kr 서비스 ID: 15001673
 * Base URL: https://apis.data.go.kr/B551182/pharmacyInfoService
 *
 * 약국 기본검색 + 상세(영업시간) 조회
 */

import { hiraFetch, type HiraFetchOptions } from './client';
import type {
  HiraParsedResult,
  PharmacyBasisInfo,
  PharmacyDetailInfo,
  PharmacySearchParams,
} from '@/types/hira';

const BASE_URL = 'https://apis.data.go.kr/B551182/pharmacyInfoService';

/**
 * 약국 기본 검색
 */
export async function searchPharmacies(
  params: PharmacySearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<PharmacyBasisInfo>> {
  return hiraFetch<PharmacyBasisInfo>(BASE_URL, 'getParmacyBasisList', params, options);
}

/**
 * 약국 상세정보 조회 (영업시간 포함)
 */
export async function getPharmacyDetail(
  params: PharmacySearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<PharmacyDetailInfo>> {
  return hiraFetch<PharmacyDetailInfo>(BASE_URL, 'getParmacyListInfo', params, options);
}
