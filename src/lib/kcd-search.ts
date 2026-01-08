import { KCD_DATA, KCDCode } from '@/data/kcd';

export function searchKCD(query: string): KCDCode[] {
    if (!query) return [];

    const lowerQuery = query.toLowerCase().trim();

    return KCD_DATA.filter(item =>
        item.code.toLowerCase().includes(lowerQuery) ||
        item.ko.includes(lowerQuery) || // Korean doesn't need toLowerCase
        item.en.toLowerCase().includes(lowerQuery)
    );
}

// Helper to format for display
export function formatKCD(item: KCDCode): string {
    return `[${item.code}] ${item.ko}`;
}
