/**
 * HIRA 의료기관상세정보서비스
 * data.go.kr 서비스 ID: 15001699
 * Base URL: https://apis.data.go.kr/B551182/MadmDtlInfoService2.7
 *
 * 진료과목/인력/응급 상세정보 조회
 */

import { hiraFetch, type HiraFetchOptions } from './client';
import type {
  HiraParsedResult,
  HospitalDepartmentInfo,
  HospitalListStatus,
  HospitalEmergencyInfo,
  HospitalDetailSearchParams,
} from '@/types/hira';

const BASE_URL = 'https://apis.data.go.kr/B551182/MadmDtlInfoService2.7';

/**
 * 진료과목 정보 조회
 * 의료기관의 진료과목별 전문의 수 등
 */
export async function getHospitalDepartments(
  params: HospitalDetailSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<HospitalDepartmentInfo>> {
  return hiraFetch<HospitalDepartmentInfo>(BASE_URL, 'getDgsbjtInfo2.7', params, options);
}

/**
 * 의료기관 개설/폐업/인력 현황 조회
 */
export async function getHospitalListStatus(
  params: HospitalDetailSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<HospitalListStatus>> {
  return hiraFetch<HospitalListStatus>(BASE_URL, 'getHospListInfo2.7', params, options);
}

/**
 * 응급의료 정보 조회
 */
export async function getHospitalEmergencyInfo(
  params: HospitalDetailSearchParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<HospitalEmergencyInfo>> {
  return hiraFetch<HospitalEmergencyInfo>(BASE_URL, 'getEmrrmInfo2.7', params, options);
}
