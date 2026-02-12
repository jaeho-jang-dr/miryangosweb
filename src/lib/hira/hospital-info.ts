/**
 * HIRA 병원정보서비스
 * data.go.kr 서비스 ID: 15001698
 * Base URL: https://apis.data.go.kr/B551182/hospInfoServicev2
 *
 * 의료기관 검색 및 ykiho(요양기관기호) 획득
 */

import { hiraFetch, type HiraFetchOptions } from './client';
import type { HiraParsedResult, HospitalInfo, HospitalSearchParams } from '@/types/hira';

const BASE_URL = 'https://apis.data.go.kr/B551182/hospInfoServicev2';

/**
 * 의료기관 검색
 * 기관명, 종별, 시도, 진료과목 등으로 검색
 *
 * @example
 * // 밀양 지역 정형외과 검색
 * searchHospitals({ yadmNm: '밀양', dgsbjtCd: '05' })
 */
export async function searchHospitals(
  params: HospitalSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<HospitalInfo>> {
  return hiraFetch<HospitalInfo>(BASE_URL, 'getHospBasisList', params, options);
}
