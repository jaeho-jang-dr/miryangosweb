/**
 * HIRA 공공 API Base HTTP 클라이언트
 * - 싱글톤 패턴 (initAdmin() 스타일)
 * - XML → JSON 파싱 (fast-xml-parser)
 * - 인메모리 TTL 캐시 (기본 24시간)
 * - 일일 레이트 리밋 (10,000건/일, KST 자정 리셋)
 * - 자동 재시도 (1회, 5xx/타임아웃만)
 */

import axios, { AxiosInstance } from 'axios';
import { XMLParser } from 'fast-xml-parser';
import type { HiraApiResponse, HiraCacheEntry, HiraParsedResult, HiraRequestBase } from '@/types/hira';
import { HiraError } from '@/types/hira';

// ─── XML Parser ────────────────────────────────────────────

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  isArray: (name) => name === 'item',
  parseTagValue: true,
  trimValues: true,
});

// ─── 캐시 ──────────────────────────────────────────────────

const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간
const cache = new Map<string, HiraCacheEntry>();

function getCacheKey(service: string, endpoint: string, params: Record<string, unknown>): string {
  const { serviceKey: _sk, ...rest } = params as Record<string, unknown>;
  return `${service}:${endpoint}:${JSON.stringify(rest)}`;
}

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttl: number = DEFAULT_CACHE_TTL): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

// ─── 레이트 리밋 ──────────────────────────────────────────

const DAILY_LIMIT = 10_000;

let rateLimitState = {
  count: 0,
  resetDate: getTodayKST(),
};

function getTodayKST(): string {
  const now = new Date();
  // KST = UTC+9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function checkRateLimit(): void {
  const today = getTodayKST();
  if (rateLimitState.resetDate !== today) {
    rateLimitState = { count: 0, resetDate: today };
  }
  if (rateLimitState.count >= DAILY_LIMIT) {
    throw HiraError.fromCode('RATE_LIMIT_EXCEEDED', `${rateLimitState.count}/${DAILY_LIMIT}`);
  }
}

function incrementRateLimit(): void {
  rateLimitState.count++;
}

// ─── 클라이언트 싱글톤 ────────────────────────────────────

let clientInstance: AxiosInstance | null = null;
let apiKey: string | null = null;

function getApiKey(): string {
  if (!apiKey) {
    const key = process.env.HIRA_API_KEY;
    if (!key) throw HiraError.fromCode('MISSING_API_KEY');
    apiKey = key;
  }
  return apiKey;
}

function getAxiosInstance(): AxiosInstance {
  if (!clientInstance) {
    clientInstance = axios.create({
      timeout: 15_000,
      headers: { Accept: 'application/xml' },
    });
  }
  return clientInstance;
}

// ─── 핵심 요청 함수 ───────────────────────────────────────

export interface HiraFetchOptions {
  /** 캐시 TTL (ms). 0이면 캐시 비활성화 */
  cacheTtl?: number;
  /** 재시도 횟수 (기본 1) */
  maxRetries?: number;
}

/**
 * HIRA API 호출 (XML → JSON 파싱 → 타입화된 결과 반환)
 */
export async function hiraFetch<T>(
  baseUrl: string,
  endpoint: string,
  params: HiraRequestBase & Record<string, unknown> = {},
  options: HiraFetchOptions = {},
): Promise<HiraParsedResult<T>> {
  const { cacheTtl = DEFAULT_CACHE_TTL, maxRetries = 1 } = options;

  // 캐시 확인
  const cacheKey = getCacheKey(baseUrl, endpoint, params);
  if (cacheTtl > 0) {
    const cached = getFromCache<HiraParsedResult<T>>(cacheKey);
    if (cached) {
      console.log(`[HIRA] Cache hit: ${endpoint}`);
      return cached;
    }
  }

  // 레이트 리밋 체크
  checkRateLimit();

  // 요청 파라미터 구성
  const key = getApiKey();
  const requestParams: Record<string, unknown> = {
    serviceKey: key,
    pageNo: params.pageNo ?? 1,
    numOfRows: params.numOfRows ?? 10,
    ...params,
  };
  // serviceKey는 위에서 설정했으므로 중복 제거
  delete requestParams.serviceKey;
  requestParams.serviceKey = key;

  const url = `${baseUrl}/${endpoint}`;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // 지수 백오프
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
        console.log(`[HIRA] Retry ${attempt}/${maxRetries}: ${endpoint}`);
      }

      const client = getAxiosInstance();
      const response = await client.get(url, { params: requestParams });
      incrementRateLimit();

      // XML → JSON
      const parsed = parseHiraXml<T>(response.data, endpoint);

      // 캐시 저장
      if (cacheTtl > 0) {
        setCache(cacheKey, parsed, cacheTtl);
      }

      return parsed;
    } catch (error) {
      lastError = error;

      // HiraError는 재시도하지 않음 (RATE_LIMIT, MISSING_KEY 등)
      if (error instanceof HiraError) throw error;

      // 타임아웃/5xx만 재시도
      const isRetryable =
        axios.isAxiosError(error) &&
        (error.code === 'ECONNABORTED' ||
          error.code === 'ETIMEDOUT' ||
          (error.response && error.response.status >= 500));

      if (!isRetryable || attempt >= maxRetries) {
        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            throw HiraError.fromCode('TIMEOUT', endpoint);
          }
          throw HiraError.fromCode('NETWORK_ERROR', `${error.message}`);
        }
        throw HiraError.fromCode('API_ERROR', String(error));
      }
    }
  }

  throw HiraError.fromCode('API_ERROR', String(lastError));
}

// ─── XML 파싱 ─────────────────────────────────────────────

function parseHiraXml<T>(xmlData: string, endpoint: string): HiraParsedResult<T> {
  try {
    const json = xmlParser.parse(xmlData);

    // HIRA API 응답 구조: response > header + body
    const response: HiraApiResponse<T> =
      json.response ?? json.OpenAPI_ServiceResponse ?? json;

    // 에러 체크
    const header = response.header;
    if (header && header.resultCode !== '00') {
      // data.go.kr 에러 코드 매핑
      if (header.resultCode === '30') {
        throw HiraError.fromCode('RATE_LIMIT_EXCEEDED', header.resultMsg);
      }
      if (header.resultCode === '20' || header.resultCode === '22') {
        throw HiraError.fromCode('INVALID_API_KEY', header.resultMsg);
      }
      throw HiraError.fromCode('API_ERROR', `[${header.resultCode}] ${header.resultMsg}`);
    }

    const body = response.body;
    if (!body) {
      return { items: [], totalCount: 0, pageNo: 1, numOfRows: 10, hasMore: false };
    }

    // items 추출
    let items: T[] = [];
    if (body.items && body.items !== '') {
      const rawItems = body.items.item;
      items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
    }

    const totalCount = body.totalCount ?? 0;
    const pageNo = body.pageNo ?? 1;
    const numOfRows = body.numOfRows ?? 10;
    const hasMore = pageNo * numOfRows < totalCount;

    return { items, totalCount, pageNo, numOfRows, hasMore };
  } catch (error) {
    if (error instanceof HiraError) throw error;
    throw HiraError.fromCode('PARSE_ERROR', `${endpoint}: ${error}`);
  }
}

// ─── 유틸리티 ─────────────────────────────────────────────

/** 레이트 리밋 상태 조회 (디버깅/모니터링용) */
export function getRateLimitStatus() {
  const today = getTodayKST();
  if (rateLimitState.resetDate !== today) {
    return { count: 0, limit: DAILY_LIMIT, remaining: DAILY_LIMIT, resetDate: today };
  }
  return {
    count: rateLimitState.count,
    limit: DAILY_LIMIT,
    remaining: DAILY_LIMIT - rateLimitState.count,
    resetDate: rateLimitState.resetDate,
  };
}

/** 캐시 초기화 */
export function clearHiraCache(): void {
  cache.clear();
}
