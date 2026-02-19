import { NextRequest, NextResponse } from 'next/server';
import { InsuranceType, COPAY_RATES } from '@/types/billing';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, insuranceType } = body as {
      items: { code: string; name: string; basePrice: number; quantity: number; insuranceCovered: boolean }[];
      insuranceType: InsuranceType;
    };

    if (!items || !insuranceType) {
      return NextResponse.json({ error: 'Missing items or insuranceType' }, { status: 400 });
    }

    const billingItems = items.map(item => {
      const totalPrice = item.basePrice * item.quantity;
      const copayRate = item.insuranceCovered ? (COPAY_RATES[insuranceType] ?? 1) : 1;
      const copayAmount = Math.round(totalPrice * copayRate);
      const insuranceAmount = totalPrice - copayAmount;

      return {
        feeCode: item.code,
        feeName: item.name,
        quantity: item.quantity,
        unitPrice: item.basePrice,
        totalPrice,
        insuranceCovered: item.insuranceCovered,
        copayAmount,
        insuranceAmount,
      };
    });

    const totalAmount = billingItems.reduce((s, i) => s + i.totalPrice, 0);
    const totalCopay = billingItems.reduce((s, i) => s + i.copayAmount, 0);
    const totalInsurance = billingItems.reduce((s, i) => s + i.insuranceAmount, 0);

    return NextResponse.json({
      items: billingItems,
      totalAmount,
      copayAmount: totalCopay,
      insuranceAmount: totalInsurance,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Calculation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
