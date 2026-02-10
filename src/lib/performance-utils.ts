/**
 * 성능 최적화 유틸리티
 *
 * Buffer 캐싱, 메모리 관리, 응답 압축 등을 제공
 */

import crypto from 'crypto';

/**
 * Base64 변환 캐시
 * 동일한 Buffer를 여러 번 변환하지 않도록 캐싱
 */
class Base64Cache {
    private cache = new Map<string, string>();
    private maxSize = 50; // 최대 50개 캐시
    private maxAge = 5 * 60 * 1000; // 5분

    private getHash(buffer: Buffer): string {
        return crypto.createHash('md5').update(buffer).digest('hex');
    }

    get(buffer: Buffer): string | null {
        const hash = this.getHash(buffer);
        return this.cache.get(hash) || null;
    }

    set(buffer: Buffer, base64: string): void {
        const hash = this.getHash(buffer);

        // 캐시 크기 제한
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(hash, base64);

        // 자동 정리
        setTimeout(() => {
            this.cache.delete(hash);
        }, this.maxAge);
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }
}

/**
 * Buffer를 Base64로 변환 (캐싱 지원)
 *
 * @param buffer - 변환할 Buffer
 * @param useCache - 캐시 사용 여부 (기본: true)
 * @returns Base64 문자열
 */
export function bufferToBase64(buffer: Buffer, useCache = true): string {
    if (!useCache) {
        return buffer.toString('base64');
    }

    const cached = base64Cache.get(buffer);
    if (cached) {
        return cached;
    }

    const base64 = buffer.toString('base64');
    base64Cache.set(buffer, base64);
    return base64;
}

// 전역 Base64 캐시 인스턴스
const base64Cache = new Base64Cache();

/**
 * 간단한 응답 캐시
 * 동일한 파일에 대한 반복 요청을 캐싱
 */
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

class ResponseCache<T = any> {
    private cache = new Map<string, CacheEntry<T>>();
    private maxSize = 100; // 최대 100개 캐시
    private maxAge = 10 * 60 * 1000; // 10분

    private generateKey(file: File, model: string): string {
        return `${file.name}-${file.size}-${file.type}-${model}`;
    }

    get(file: File, model: string): T | null {
        const key = this.generateKey(file, model);
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // 만료 확인
        if (Date.now() - entry.timestamp > this.maxAge) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    set(file: File, model: string, data: T): void {
        const key = this.generateKey(file, model);

        // 캐시 크기 제한
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }
}

// 전역 응답 캐시 인스턴스
export const responseCache = new ResponseCache();

/**
 * 메모리 사용량 체크
 *
 * @returns 메모리 사용량 정보
 */
export function getMemoryUsage(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    heapUsedMB: string;
    heapTotalMB: string;
} {
    const usage = process.memoryUsage();
    return {
        ...usage,
        heapUsedMB: (usage.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMB: (usage.heapTotal / 1024 / 1024).toFixed(2)
    };
}

/**
 * 큰 Buffer를 청크로 분할
 *
 * @param buffer - 분할할 Buffer
 * @param chunkSize - 청크 크기 (바이트, 기본: 1MB)
 * @returns Buffer 청크 배열
 */
export function splitBuffer(buffer: Buffer, chunkSize = 1024 * 1024): Buffer[] {
    const chunks: Buffer[] = [];
    let offset = 0;

    while (offset < buffer.length) {
        const end = Math.min(offset + chunkSize, buffer.length);
        chunks.push(buffer.subarray(offset, end));
        offset = end;
    }

    return chunks;
}

/**
 * 성능 측정 데코레이터
 *
 * @param label - 측정 레이블
 * @returns 데코레이터 함수
 */
export function measurePerformance(label: string) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const start = performance.now();
            const memBefore = getMemoryUsage();

            try {
                const result = await originalMethod.apply(this, args);
                const end = performance.now();
                const memAfter = getMemoryUsage();

                console.log(`[Performance] ${label}:`, {
                    duration: `${(end - start).toFixed(2)}ms`,
                    memoryDelta: `${(parseFloat(memAfter.heapUsedMB) - parseFloat(memBefore.heapUsedMB)).toFixed(2)}MB`
                });

                return result;
            } catch (error) {
                const end = performance.now();
                console.error(`[Performance] ${label} failed after ${(end - start).toFixed(2)}ms`);
                throw error;
            }
        };

        return descriptor;
    };
}

/**
 * 캐시 통계 조회
 */
export function getCacheStats() {
    return {
        base64Cache: {
            size: base64Cache.size()
        },
        responseCache: {
            size: responseCache.size()
        }
    };
}

/**
 * 모든 캐시 초기화
 */
export function clearAllCaches() {
    base64Cache.clear();
    responseCache.clear();
}
