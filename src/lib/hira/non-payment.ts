/**
 * HIRA 비급여진료비정보조회서비스
 * data.go.kr 서비스 ID: 15001700
 * Base URL: http://apis.data.go.kr/B551182/nonPaymentDamtInfoService
 *
 * 정형외과 핵심 비급여: 도수치료, 체외충격파(ESWT), 프롤로테라피, PRP, MRI
 */

import { hiraFetch, type HiraFetchOptions } from './client';
import type {
  HiraRequestBase,
  HiraParsedResult,
  NonPaymentItemCode,
  NonPaymentCostByClass,
  NonPaymentCostByRegion,
  NonPaymentCostByHospital,
  NonPaymentByClassParams,
  NonPaymentByRegionParams,
  NonPaymentByHospitalParams,
} from '@/types/hira';

const BASE_URL = 'http://apis.data.go.kr/B551182/nonPaymentDamtInfoService';

/**
 * 비급여 항목 코드 목록 조회
 * 자동완성/검색용 — 전체 비급여 코드와 코드명
 */
export async function getNonPaymentItemCodes(
  params: HiraRequestBase = {},
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<NonPaymentItemCode>> {
  return hiraFetch<NonPaymentItemCode>(BASE_URL, 'getNonPaymentItemCodeList', params, options);
}

/**
 * 비급여 종별 가격 조회
 * 종별(상급종합/종합/병원/의원) 평균/최저/최고가
 */
export async function getNonPaymentCostsByClass(
  params: NonPaymentByClassParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<NonPaymentCostByClass>> {
  return hiraFetch<NonPaymentCostByClass>(BASE_URL, 'getNonPaymentDamtClList', params, options);
}

/**
 * 비급여 지역별 가격 조회
 * 시도/시군구 단위 가격 비교
 */
export async function getNonPaymentCostsByRegion(
  params: NonPaymentByRegionParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<NonPaymentCostByRegion>> {
  return hiraFetch<NonPaymentCostByRegion>(BASE_URL, 'getNonPaymentDamtAreaList', params, options);
}

/**
 * 비급여 병원별 가격 조회
 * 특정 병원의 비급여 항목별 가격
 */
export async function getNonPaymentCostsByHospital(
  params: NonPaymentByHospitalParams,
  options?: HiraFetchOptions,
): Promise<HiraParsedResult<NonPaymentCostByHospital>> {
  return hiraFetch<NonPaymentCostByHospital>(
    BASE_URL,
    'getNonPaymentItemHospDtlList',
    params,
    options,
  );
}
