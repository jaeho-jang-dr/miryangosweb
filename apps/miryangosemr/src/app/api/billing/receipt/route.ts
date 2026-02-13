import { NextRequest, NextResponse } from 'next/server';
import { generateReceiptNumber } from '@/lib/receipt-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { billingId, patientName, items, totalAmount, copayAmount, paidAmount, paymentMethod } = body;

    const receipt = {
      receiptNumber: generateReceiptNumber(),
      clinicName: '밀양 정형외과',
      patientName,
      items,
      totalAmount,
      copayAmount,
      paidAmount,
      paymentMethod,
      issuedAt: new Date().toISOString(),
    };

    return NextResponse.json(receipt);
  } catch (error) {
    return NextResponse.json({ error: 'Receipt generation failed' }, { status: 500 });
  }
}
