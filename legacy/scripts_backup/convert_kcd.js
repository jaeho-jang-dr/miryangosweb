const fs = require('fs');
const path = require('path');

const inputFile = path.join('D:\\Projects\\miryangosweb\\local_data', '건강보험심사평가원-상병마스터-20250930.csv');
const outputFile = path.join('D:\\Projects\\miryangosweb\\src\\data', 'kcd_full.json');

try {
    console.log('Reading file...');
    const buffer = fs.readFileSync(inputFile);

    console.log('Decoding EUC-KR...');
    const decoder = new TextDecoder('euc-kr');
    const content = decoder.decode(buffer);

    console.log('Parsing CSV...');
    const lines = content.split('\n');
    const data = [];

    // Skip header (line 0)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV parser: handle quotes if necessary, but KCD usually simple.
        // If comma is synonymous, it might be in English name.
        // Let's assume standard CSV with quotes if needed.
        // But for simplicity, let's try regex for quoted CSV or split.
        // A000,콜레라,Cholera,...

        // Match standard CSV pattern
        const values = [];
        let current = '';
        let inQuote = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current);

        if (values.length >= 3) {
            data.push({
                code: values[0].trim(),
                ko: values[1].trim(),
                en: values[2].trim()
            });
        }
    }

    console.log(`Parsed ${data.length} records.`);

    console.log('Writing JSON...');
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2)); // formatted for inspection, or minified?
    // 5MB CSV -> JSON might be 10MB+. Minified is better.
    // fs.writeFileSync(outputFile, JSON.stringify(data));

    console.log('Done!');

} catch (error) {
    console.error('Error:', error);
}
