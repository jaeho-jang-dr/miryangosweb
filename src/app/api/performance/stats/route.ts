import { NextRequest, NextResponse } from 'next/server';
import { getCacheStats, getMemoryUsage } from '@/lib/performance-utils';
import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 성능 통계 API (인증 필요)
 *
 * GET /api/performance/stats
 *
 * 캐시 상태와 메모리 사용량을 조회합니다. 인증된 사용자만 접근 가능합니다.
 */
export async function GET(req: NextRequest) {
    try {
        // Authentication required
        initAdmin();

        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const token = authHeader.split('Bearer ')[1];
        try {
            await getAuth().verifyIdToken(token);
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid authorization token' },
                { status: 401 }
            );
        }

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
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({
            success: false,
            error: message
        }, { status: 500 });
    }
}
