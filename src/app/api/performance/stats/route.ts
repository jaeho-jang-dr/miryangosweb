import { NextResponse } from 'next/server';
import { getCacheStats, getMemoryUsage } from '@/lib/performance-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 성능 통계 API
 *
 * GET /api/performance/stats
 *
 * 캐시 상태와 메모리 사용량을 조회합니다.
 */
export async function GET() {
    try {
        const memoryUsage = getMemoryUsage();
        const cacheStats = getCacheStats();

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            memory: {
                heapUsed: `${memoryUsage.heapUsedMB}MB`,
                heapTotal: `${memoryUsage.heapTotalMB}MB`,
                external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)}MB`,
                rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`,
            },
            cache: cacheStats,
            uptime: `${(process.uptime() / 60).toFixed(2)} minutes`
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
