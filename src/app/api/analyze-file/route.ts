
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
const pdf = require('pdf-parse');
import JSZip from 'jszip';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function bufferToPart(buffer: Buffer, mimeType: string) {
    return {
        inlineData: {
            data: buffer.toString("base64"),
            mimeType,
        },
    };
}

export async function POST(request: Request) {
    let fileNameForLog = "unknown";

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        fileNameForLog = file.name;
        console.log(`[SmartUpload] Processing: ${file.name} (${file.type}, ${file.size} bytes)`);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length === 0) throw new Error("File is empty");

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        let prompt = "";
        let contentParts: any[] = [];
        let extractedImages: string[] = []; // Array of Base64 strings for ZIPs

        const isZip = file.type.includes('zip') || file.name.endsWith('.zip');

        // --- STRATEGY 0: ZIP / Webtoon ---
        if (isZip) {
            console.log("Detected ZIP file. Attempting extraction...");
            const zip = new JSZip();
            const contents = await zip.loadAsync(buffer);

            // Filter and sort images
            const imageFiles = Object.keys(contents.files)
                .filter(name => !contents.files[name].dir)
                .filter(name => /\.(jpg|jpeg|png|webp|gif)$/i.test(name))
                .sort(); // Sequential sort by name

            console.log(`Extracted ${imageFiles.length} images from ZIP.`);

            for (const filename of imageFiles) {
                const imgData = await contents.files[filename].async('nodebuffer');
                // Convert to Base64 Data URI
                const mime = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
                const base64 = `data:${mime};base64,${imgData.toString('base64')}`;
                extractedImages.push(base64);
            }

            // Create prompt for AI (using first image as representative or just metadata)
            // If many images, we don't send all to AI to save tokens, just send the first one.
            prompt = `
                Analyze this Webtoon/Image Collection. 
                Filename: ${file.name}
                Image Count: ${extractedImages.length}
                Return STRICT JSON.
                Required fields: title, tags (array), summary, category, content.
                Category MUST be 'webtoon' if the filename or content suggests it.
                Title should be derived from filename.
                JSON: {"title": "...", "tags": ["Webtoon"], "summary": "...", "category": "webtoon", "content": "..."}
            `;

            // Attach first image if available for context
            if (extractedImages.length > 0) {
                // Convert back to buffer for bufferToPart (hacky but consistent)
                const firstImgBase64 = extractedImages[0].split(',')[1];
                const firstImgBuffer = Buffer.from(firstImgBase64, 'base64');
                contentParts = [bufferToPart(firstImgBuffer, 'image/jpeg')]; // Assume jpeg for part
            }

        }
        // --- STRATEGY 1: IMAGE ---
        else if (file.type.startsWith('image/')) {
            prompt = `
            Analyze this medical image (Webtoon/Diagram).
            Return STRICT JSON.
            Required fields: title, tags (array), summary, category, content.
            Categories: "disease" (Medical Info), "guide" (Medical Guide), "news" (Health News), "gallery" (Gallery), "webtoon" (Webtoon), "app" (AI/Apps).
            Choose the best category based on visual content.
            JSON: {"title": "...", "tags": [], "summary": "...", "category": "gallery", "content": "..."}
        `;
            contentParts = [bufferToPart(buffer, file.type)];
        }
        // --- STRATEGY 2: PDF ---
        else if (file.type === 'application/pdf') {
            try {
                const data = await pdf(buffer);
                const text = data.text.substring(0, 15000);
                prompt = `Analyze PDF. JSON. Detect category from: disease, guide, news, gallery, webtoon, app. Text: ${text}`;
                contentParts = [];
            } catch (e) {
                console.error("PDF Parsing failed");
                prompt = `Analyze basic file info. Name: ${file.name}`;
                contentParts = [];
            }
        }
        // --- STRATEGY 3: Plain Text / Markdown ---
        else {
            const textStart = buffer.toString('utf-8').substring(0, 5000);
            prompt = `Analyze this file content. Name: ${file.name}.
        Snippet: ${textStart}
        Return JSON. Detect category from: disease, guide, news, gallery, webtoon, app. Default to 'gallery' if unsure.`;
            contentParts = [];
        }

        // --- EXECUTE AI ---
        const result = await Promise.race([
            model.generateContent([prompt, ...contentParts]),
            new Promise((_, reject) => setTimeout(() => reject(new Error("AI Timeout (20s)")), 20000))
        ]) as any;

        const responseText = result.response.text();
        console.log("[SmartUpload] AI Data Recieved");

        let cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonStart = cleanedJson.indexOf('{');
        const jsonEnd = cleanedJson.lastIndexOf('}');

        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error("AI did not return valid JSON");
        }

        const data = JSON.parse(cleanedJson.substring(jsonStart, jsonEnd + 1));

        // Inject extracted images if ZIP
        if (extractedImages.length > 0) {
            data.images = extractedImages;
            // Force category if not set by AI correctly for ZIPs
            if (!data.category) data.category = 'webtoon';
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error(`[SmartUpload] Error for ${fileNameForLog}:`, error);
        return NextResponse.json({
            title: fileNameForLog.replace(/\.[^/.]+$/, ""),
            tags: ["자동생성", "검토필요"],
            summary: `자동 분석에 실패했거나 타임아웃 되었습니다. (${error.message})`,
            category: "webtoon", // Default to webtoon if failed and was likely a zip
            content: "내용을 직접 입력해주세요.",
            images: [] // Return empty images array on failure
        });
    }
}
