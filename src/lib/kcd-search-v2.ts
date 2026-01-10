
import top50Data from '@/data/im_fm_top50.json';
import orthoData from '@/data/ortho_all_data.json';

// Type definitions
export interface KCDCode {
    code: string;
    ko: string;
    en: string;
    keywords?: string[]; // From Top 50
    category?: string;
}

// Prepare index
let indexedCodes: KCDCode[] = [];
let isIndexed = false;

function buildIndex() {
    if (isIndexed) return;

    // 1. Index Top 50
    // The Top 50 JSON structure: { groups: [ { group_name: "...", diseases: [ { code, name, symptoms[] } ] } ] }
    const top50 = top50Data as any;
    top50.groups.forEach((group: any) => {
        group.diseases.forEach((d: any) => {
            // Check if already exists (priority to top 50 for keywords)
            const existing = indexedCodes.find(c => c.code === d.code);
            if (existing) {
                if (existing.keywords) existing.keywords.push(...d.symptoms);
                else existing.keywords = d.symptoms;
            } else {
                indexedCodes.push({
                    code: d.code,
                    ko: d.name,
                    en: '', // Top 50 json doesn't have EN name in this specific structure provided, usually.
                    keywords: d.symptoms,
                    category: group.group_name
                });
            }
        });
    });

    // 2. Index Ortho Data
    // Ortho JSON structure: { diseases: [ { code, category_name, sub_diseases: [ { full_code, korean_name, english_name } ] } ] }
    const ortho = orthoData as any;
    ortho.diseases.forEach((cat: any) => {
        cat.sub_diseases.forEach((d: any) => {
            // Don't overwrite existing if it was in Top 50 (unlikely overlap for M codes, but possible)
            // But usually Ortho codes are M/S. Top 50 are J, K, etc.
            // If duplicate, Ortho DB "english_name" is valuable.
            const existing = indexedCodes.find(c => c.code === d.full_code);
            if (existing) {
                existing.en = d.english_name;
                // existing.ko might be colloquial in Top 50, so keep it or append? Keep Top 50 as it's user friendly.
            } else {
                indexedCodes.push({
                    code: d.full_code,
                    ko: d.korean_name,
                    en: d.english_name,
                    category: 'Orthopedics'
                });
            }
        });
    });

    isIndexed = true;
}

// Search Function
export function searchDiagnosisV2(query: string): KCDCode[] {
    buildIndex();
    if (!query) return [];

    const lowerQ = query.toLowerCase().trim();

    // Exact Code Match
    const exactCode = indexedCodes.find(c => c.code.toLowerCase() === lowerQ);
    if (exactCode) return [exactCode];

    return indexedCodes.filter(item => {
        // 1. Code Match
        if (item.code.toLowerCase().includes(lowerQ)) return true;
        // 2. Name Match (KO)
        if (item.ko.includes(lowerQ)) return true; // Simple substring
        // 3. Name Match (EN)
        if (item.en && item.en.toLowerCase().includes(lowerQ)) return true;
        // 4. Keyword Match (Symptom mapping from Top 50)
        if (item.keywords && item.keywords.some(k => k.includes(lowerQ))) return true;

        return false;
    }).slice(0, 20); // Limit results
}
