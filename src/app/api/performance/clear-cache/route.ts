import { NextRequest, NextResponse } from 'next/server';
import { clearAllCaches, getCacheStats } from '@/lib/performance-utils';
import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 캐시 초기화 API (관리자 전용)
 *
 * POST /api/performance/clear-cache
 *
 * 모든 캐시를 초기화합니다. 인증된 관리자만 사용할 수 있습니다.
 */
export async function POST(req: NextRequest) {
    try {
        // Authentication & admin authorization required
        initAdmin();

        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const token = authHeader.split('Bearer ')[1];
        let uid: string;
        try {
            const decoded = await getAuth().verifyIdToken(token);
            uid = decoded.uid;
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid authorization token' },
                { status: 401 }
            );
        }

        // Verify admin role
        const userDoc = await getFirestore().collection('users').doc(uid).get();
        const role = userDoc.data()?.role;
        if (!role || !['admin'].includes(role)) {
            return NextResponse.json(
                { success: false, error: 'Admin access required' },
                { status: 403 }
            );
        }

        const beforeStats = getCacheStats();

        clearAllCaches();

        const afterStats = getCacheStats();

        return NextResponse.json({
            success: true,
            message: '모든 캐시가 초기화되었습니다',
            before: beforeStats,
            after: afterStats
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({
            success: false,
            error: message
        }, { status: 500 });
    }
}
