import { NextRequest, NextResponse } from 'next/server';
import { getCacheStats, getMemoryUsage } from '@/lib/performance-utils';
import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 성능 통계 API
 *
 * GET /api/performance/stats
 *
 * 캐시 상태와 메모리 사용량을 조회합니다. (관리자 전용)
 */
export async function GET(request: NextRequest) {
    try {
        // 관리자 인증 필요 (시스템 정보는 외부에 노출되면 안 됨)
        initAdmin();
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        let decoded;
        try {
            decoded = await getAuth().verifyIdToken(authHeader.split('Bearer ')[1]);
        } catch {
            return NextResponse.json({ success: false, error: 'Invalid authorization token' }, { status: 401 });
        }

        const db = getFirestore();
        const userDoc = await db.collection('users').doc(decoded.uid).get();
        const role = userDoc.data()?.role;
        if (!role || !['admin', 'manager'].includes(role)) {
            return NextResponse.json({ success: false, error: 'Admin or manager access required' }, { status: 403 });
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
