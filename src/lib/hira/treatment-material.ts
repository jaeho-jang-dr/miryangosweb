/**
 * HIRA 치료재료정보조회서비스
 * data.go.kr 서비스 ID: 3074384
 * Base URL: https://apis.data.go.kr/B551182/mcatInfoService1.2
 *
 * 치료재료 상한단가 조회
 */

import { hiraFetch, type HiraFetchOptions } from './client';
import type {
  HiraParsedResult,
  TreatmentMaterialInfo,
  TreatmentMaterialSearchParams,
} from '@/types/hira';

const BASE_URL = 'https://apis.data.go.kr/B551182/mcatInfoService1.2';

/**
 * 치료재료 정보 조회
 * 재료코드, 재료명, 분류코드로 검색
 */
export async function getTreatmentMaterials(
  params: TreatmentMaterialSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<TreatmentMaterialInfo>> {
  return hiraFetch<TreatmentMaterialInfo>(BASE_URL, 'getMcatList', params, options);
}
