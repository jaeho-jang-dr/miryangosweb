import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { diagnosisCodes, items, totalAmount } = body;

    const warnings: string[] = [];

    if (!diagnosisCodes || diagnosisCodes.length === 0) {
      warnings.push('진단 코드가 입력되지 않았습니다.');
    }

    if (!items || items.length === 0) {
      warnings.push('청구 항목이 없습니다.');
    }

    if (!totalAmount || totalAmount <= 0) {
      warnings.push('청구 금액이 0원 이하입니다.');
    }

    return NextResponse.json({
      passed: warnings.length === 0,
      warnings,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}
