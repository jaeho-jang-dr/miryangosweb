import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const claimId = searchParams.get('claimId');

  if (!claimId) {
    return NextResponse.json({ error: 'Missing claimId' }, { status: 400 });
  }

  // In production, this would query HIRA API for status
  return NextResponse.json({
    claimId,
    status: 'submitted',
    message: '청구 상태 조회 (시뮬레이션)',
    lastCheckedAt: new Date().toISOString(),
  });
}
