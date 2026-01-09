
import { NextResponse } from 'next/server';
import kcdData from '@/data/kcd_full.json';

// Define the type for KCD items
interface KCDItem {
    code: string;
    ko: string;
    en: string;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json([]);
    }

    const lowerQuery = query.toLowerCase().trim();

    // Basic filtering
    // Optimization: If query is very short, maybe limit more strictly? 
    // For now, simple filter is fast enough for 50k items.
    const results = (kcdData as KCDItem[]).filter((item) =>
        item.code.toLowerCase().startsWith(lowerQuery) || // Prioritize starts with for code
        item.ko.includes(lowerQuery) ||
        item.en.toLowerCase().includes(lowerQuery) ||
        item.code.toLowerCase().includes(lowerQuery)
    ).sort((a, b) => {
        // Sort logic: Exact match > Starts with > Includes
        const aCodeStarts = a.code.toLowerCase().startsWith(lowerQuery);
        const bCodeStarts = b.code.toLowerCase().startsWith(lowerQuery);
        if (aCodeStarts && !bCodeStarts) return -1;
        if (!aCodeStarts && bCodeStarts) return 1;

        return 0;
    }).slice(0, 50);

    return NextResponse.json(results);
}
