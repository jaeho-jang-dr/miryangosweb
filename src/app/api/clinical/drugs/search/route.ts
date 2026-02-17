import { NextResponse } from 'next/server';
import drugs from '@/data/drugs/basic-formulary.json';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    if (!query || query.length < 2 || query.length > 50) {
        return NextResponse.json([]);
    }
    const q = query.toLowerCase();

    const results = drugs.filter(d => 
        d.name.toLowerCase().includes(q) || 
        d.ingredient.toLowerCase().includes(q)
    );

    return NextResponse.json(results.slice(0, 10));
}
