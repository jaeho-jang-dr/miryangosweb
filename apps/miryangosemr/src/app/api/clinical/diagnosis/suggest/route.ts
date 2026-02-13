import { NextResponse } from 'next/server';
import { suggestDiagnosisByContext } from '@shared/lib/diagnosis-context-suggest';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { cc = '', pe = '', testOrder = '', testResult = '' } = body;

        if (!cc.trim() && !pe.trim() && !testOrder.trim() && !testResult.trim()) {
            return NextResponse.json({ symptomBased: [], peBased: [], testBased: [] });
        }

        const suggestions = suggestDiagnosisByContext({ cc, pe, testOrder, testResult });
        return NextResponse.json(suggestions);
    } catch (e) {
        console.error('Diagnosis Suggest Error:', e);
        return NextResponse.json({ error: 'Failed to suggest' }, { status: 500 });
    }
}
