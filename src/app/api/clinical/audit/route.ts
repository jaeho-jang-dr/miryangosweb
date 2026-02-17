import { NextRequest, NextResponse } from 'next/server';
import { writeAuditLog, queryAuditLogs } from '@/lib/audit-logger';
import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { AuditLogInput } from '@/types/security';

/**
 * POST /api/clinical/audit — Record an audit log entry
 * Body: { action, collection, documentId, before?, after?, description?, metadata? }
 *
 * Requires authentication via Bearer token. Returns 401 if no token is provided.
 */
export async function POST(req: NextRequest) {
  try {
    initAdmin();

    // Authentication required — reject unauthenticated requests
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required. Provide a Bearer token in the Authorization header.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action, collection, documentId, before, after, description, metadata } = body;

    if (!action || !collection || !documentId) {
      return NextResponse.json(
        { error: 'action, collection, and documentId are required' },
        { status: 400 }
      );
    }

    // Extract user info from auth token
    let userId: string | undefined;
    let userEmail: string | undefined;
    let userName: string | undefined;
    let userRole: string | undefined;

    try {
      const token = authHeader.split('Bearer ')[1];
      const decoded = await getAuth().verifyIdToken(token);
      userId = decoded.uid;
      userEmail = decoded.email || undefined;
      userName = decoded.name || undefined;

      // Fetch role from users collection
      const userDoc = await getFirestore().collection('users').doc(decoded.uid).get();
      userRole = userDoc.data()?.role;
    } catch {
      // Token provided but invalid — return 401
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    }

    const logInput: AuditLogInput = {
      action,
      collection,
      documentId,
      userId,
      userEmail,
      userName,
      userRole: userRole as AuditLogInput['userRole'],
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      before,
      after,
      description,
      metadata,
    };

    const logId = await writeAuditLog(logInput);
    return NextResponse.json({ id: logId }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Audit API] POST error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/clinical/audit — Query audit logs (admin only)
 * Query params: collection, documentId, userId, action, limit
 */
export async function GET(req: NextRequest) {
  try {
    initAdmin();

    // Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = await getAuth().verifyIdToken(token);

    // Check admin role
    const userDoc = await getFirestore().collection('users').doc(decoded.uid).get();
    const role = userDoc.data()?.role;
    if (!role || !['admin', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Admin or manager access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const logs = await queryAuditLogs({
      collection: searchParams.get('collection') || undefined,
      documentId: searchParams.get('documentId') || undefined,
      userId: searchParams.get('userId') || undefined,
      action: searchParams.get('action') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
    });

    return NextResponse.json({ logs, count: logs.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Audit API] GET error:', message);

    if (message.includes('Firebase ID token') || message.includes('Decoding')) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
