import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { claimId } = body;

    if (!claimId) {
      return NextResponse.json({ error: 'Missing claimId' }, { status: 400 });
    }

    // In production, this would submit to HIRA API
    // For now, return a simulated response
    return NextResponse.json({
      success: true,
      claimId,
      status: 'submitted',
      message: 'HIRA 청구가 제출되었습니다. (시뮬레이션)',
      submittedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Claim submission failed' }, { status: 500 });
  }
}
