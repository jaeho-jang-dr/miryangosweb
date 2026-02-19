import { NextResponse } from 'next/server';
import { searchDiagnosisV2 } from '@/lib/kcd-search-v2';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length > 100) {
        return NextResponse.json([]);
    }

    try {
        const results = searchDiagnosisV2(query);
        return NextResponse.json(results);
    } catch (e) {
        console.error("Search Error:", e);
        return NextResponse.json({ error: "Failed to search" }, { status: 500 });
    }
}
