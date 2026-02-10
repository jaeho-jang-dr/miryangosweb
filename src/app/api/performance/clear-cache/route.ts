import { NextResponse } from 'next/server';
import { clearAllCaches, getCacheStats } from '@/lib/performance-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 캐시 초기화 API
 *
 * POST /api/performance/clear-cache
 *
 * 모든 캐시를 초기화합니다.
 */
export async function POST() {
    try {
        const beforeStats = getCacheStats();

        clearAllCaches();

        const afterStats = getCacheStats();

        return NextResponse.json({
            success: true,
            message: '모든 캐시가 초기화되었습니다',
            before: beforeStats,
            after: afterStats
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
