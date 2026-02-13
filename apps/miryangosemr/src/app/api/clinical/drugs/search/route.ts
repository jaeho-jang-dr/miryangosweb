import { NextResponse } from 'next/server';
import drugs from '@shared/data/drugs/basic-formulary.json';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.toLowerCase();

    if (!q) {
        return NextResponse.json([]);
    }

    const results = drugs.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.ingredient.toLowerCase().includes(q)
    );

    return NextResponse.json(results.slice(0, 10));
}
