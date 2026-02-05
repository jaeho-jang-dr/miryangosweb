import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Google Vision API
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY || '';
const VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate";

/**
 * 이미지를 Google Vision API로 OCR
 */
async function ocrImageWithVision(imageBase64: string): Promise<string> {
    if (!GOOGLE_VISION_API_KEY) {
        throw new Error('GOOGLE_VISION_API_KEY가 설정되지 않았습니다.');
    }

    console.log(`[Vision API] OCR 요청 중... (이미지 크기: ${imageBase64.length} bytes)`);

    const payload = {
        requests: [{
            image: { content: imageBase64 },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }]
        }]
    };

    const response = await fetch(`${VISION_API_URL}?key=${GOOGLE_VISION_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.error) {
        console.error('[Vision API] 오류:', result.error);
        throw new Error(`Vision API: ${result.error.message}`);
    }

    const text = result.responses?.[0]?.fullTextAnnotation?.text || '';
    console.log(`[Vision API] OCR 결과: ${text.length}자`);
    return text;
}

/**
 * PDF에서 텍스트 추출 (require 방식)
 */
async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
    try {
        // pdf-parse v2.4.5 사용 - PDFParse는 클래스
        const { PDFParse } = require('pdf-parse');
        const parser = new PDFParse();
        const data = await parser.parse(buffer);
        console.log(`[PDF-Parse] ${data.numpages}페이지에서 ${data.text.length}자 추출`);
        return { text: data.text, pageCount: data.numpages };
    } catch (e: any) {
        console.log('[PDF-Parse] 실패:', e.message);
        return { text: '', pageCount: 0 };
    }
}

/**
 * PDF 페이지를 이미지로 변환 후 Vision OCR (gm 직접 사용)
 */
async function ocrPdfPagesWithVision(buffer: Buffer): Promise<string> {
    try {
        const gm = require('gm');
        const fs = require('fs');
        const path = require('path');

        // GraphicsMagick + Ghostscript PATH 추가
        const gmBinPath = 'D:\\antigravity\\GraphicsMagick-1.3.46-Q16';
        const gsBinPath = 'D:\\antigravity\\gs10.06.0\\bin';
        const gsLibPath = 'D:\\antigravity\\gs10.06.0\\lib';

        if (!process.env.PATH?.includes(gmBinPath)) {
            process.env.PATH = `${gmBinPath};${gsBinPath};${gsLibPath};${process.env.PATH}`;
            console.log('[GM] GraphicsMagick + Ghostscript PATH 추가');
        }

        // 임시 디렉토리 확인/생성
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // GraphicsMagick 사용 설정
        const gmSubclass = gm.subClass({ imageMagick: false });

        console.log('[GM] PDF를 이미지로 변환 시작...');

        // 임시 PDF 파일 저장
        const timestamp = Date.now();
        const pdfPath = path.join(tempDir, `temp_${timestamp}.pdf`);
        fs.writeFileSync(pdfPath, buffer);
        console.log('[GM] 임시 PDF 저장:', pdfPath);

        let fullText = '';

        // 처음 3페이지만 처리
        for (let pageNum = 0; pageNum < 3; pageNum++) {
            try {
                console.log(`[GM] 페이지 ${pageNum + 1} 변환 중...`);

                const outputPath = path.join(tempDir, `page_${timestamp}_${pageNum}.png`);

                // gm을 사용하여 PDF 페이지를 이미지로 변환
                await new Promise((resolve, reject) => {
                    gmSubclass(`${pdfPath}[${pageNum}]`)
                        .density(150, 150)
                        .quality(90)
                        .write(outputPath, (err) => {
                            if (err) reject(err);
                            else resolve(outputPath);
                        });
                });

                console.log(`[GM] 페이지 ${pageNum + 1} 변환 완료:`, outputPath);

                // 파일에서 읽어서 base64로 변환
                const imageBuffer = fs.readFileSync(outputPath);
                const base64 = imageBuffer.toString('base64');
                console.log(`[GM] Base64 변환 완료 (${base64.length} bytes), Vision OCR 호출...`);

                const pageText = await ocrImageWithVision(base64);
                if (pageText) {
                    fullText += `\n--- 페이지 ${pageNum + 1} ---\n${pageText}`;
                }

                // 임시 파일 삭제
                try {
                    fs.unlinkSync(outputPath);
                } catch (unlinkErr: any) {
                    console.log(`[GM] 임시 파일 삭제 실패: ${unlinkErr.message}`);
                }
            } catch (pageError: any) {
                console.log(`[GM] 페이지 ${pageNum + 1} 처리 실패:`, pageError.message);
                // 페이지가 없으면 중단
                break;
            }
        }

        // 임시 PDF 파일 삭제
        try {
            fs.unlinkSync(pdfPath);
        } catch (e: any) {
            console.log('[GM] 임시 PDF 삭제 실패:', e.message);
        }

        return fullText.trim();
    } catch (e: any) {
        console.error('[GM] 오류:', e.message);

        // GraphicsMagick/ImageMagick 없는 경우 안내
        if (e.message.includes('gm') || e.message.includes('GraphicsMagick') || e.message.includes('convert')) {
            console.log('[GM] GraphicsMagick이 설치되지 않았거나 PATH에 없습니다.');
        }

        return '';
    }
}

/**
 * 추출된 텍스트에서 기본 정보 파싱
 */
function parseExtractedText(text: string, fileName: string): {
    title: string;
    summary: string;
    content: string;
    tags: string[];
} {
    const cleanText = text.replace(/---\s*페이지\s*\d+\s*---/g, '\n');
    const lines = cleanText.split('\n').filter(line => line.trim());

    // 제목 추출
    let title = '';
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length >= 3 && trimmed.length <= 50 && !trimmed.match(/^[\d\s\.\-]+$/)) {
            title = trimmed;
            break;
        }
    }
    if (!title) {
        title = fileName.replace(/\.[^/.]+$/, '');
    }

    // 요약
    const summaryLines = lines.slice(0, 10).join(' ');
    const summary = summaryLines.substring(0, 300).trim() || '내용을 확인해주세요';

    // 본문
    const content = `## OCR 추출 내용\n\n${text.substring(0, 15000)}`;

    // 태그
    const medicalKeywords = [
        '척추', '관절', '예방', '운동', '건강', '치료', '증상', '원인',
        '진단', '수술', '재활', '통증', '염증', '근육', '뼈', '신경',
        '당뇨', '고혈압', '심장', '폐', '간', '위', '장', '피부',
        '족저근막', '발바닥', '발뒤꿈치', '아킬레스', '스트레칭'
    ];

    const lowerText = text.toLowerCase();
    const foundTags = medicalKeywords.filter(k => lowerText.includes(k)).slice(0, 5);

    return {
        title,
        summary,
        content,
        tags: foundTags.length > 0 ? foundTags : ['자동추출']
    };
}

export async function POST(request: Request) {
    let fileNameForLog = 'unknown';

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        fileNameForLog = file.name;
        console.log(`\n[PDF-Vision] ========================================`);
        console.log(`[PDF-Vision] 파일: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

        if (!file.name.toLowerCase().endsWith('.pdf')) {
            return NextResponse.json({
                error: true,
                errorMessage: 'PDF 파일만 지원합니다.',
            }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let extractedText = '';
        let pageCount = 0;
        let method = '';

        // 1단계: pdf-parse로 텍스트 추출
        console.log('[PDF-Vision] 1단계: pdf-parse 시도...');
        const pdfResult = await extractTextFromPdf(buffer);

        if (pdfResult.text.trim().length >= 100) {
            extractedText = pdfResult.text;
            pageCount = pdfResult.pageCount;
            method = 'PDF-Parse (텍스트 PDF)';
            console.log(`[PDF-Vision] 1단계 성공: ${extractedText.length}자`);
        } else {
            // 2단계: 이미지 기반 PDF - Vision OCR
            console.log('[PDF-Vision] 2단계: 이미지 PDF, Vision OCR 시도...');
            const visionText = await ocrPdfPagesWithVision(buffer);

            if (visionText.length > 0) {
                extractedText = visionText;
                method = 'Vision OCR (이미지 PDF)';
                console.log(`[PDF-Vision] 2단계 성공: ${extractedText.length}자`);
            }
        }

        console.log(`[PDF-Vision] ========================================\n`);

        // 결과 확인
        if (!extractedText.trim()) {
            return NextResponse.json({
                error: true,
                errorMessage: 'PDF에서 텍스트를 추출할 수 없습니다. GraphicsMagick 설치가 필요할 수 있습니다.',
                title: file.name.replace(/\.[^/.]+$/, ''),
                category: 'disease',
                tags: ['검토필요'],
                summary: '텍스트 추출 실패',
                content: '## 내용\n\nPDF에서 텍스트를 추출할 수 없습니다.\n\n이미지 기반 PDF의 경우 GraphicsMagick 설치가 필요합니다.',
            });
        }

        const parsed = parseExtractedText(extractedText, file.name);

        return NextResponse.json({
            success: true,
            title: parsed.title,
            category: 'disease',
            tags: parsed.tags,
            summary: parsed.summary,
            content: parsed.content,
            extractedTextLength: extractedText.length,
            pageCount: pageCount,
            analyzedBy: method,
        });

    } catch (error: any) {
        console.error(`[PDF-Vision] 오류:`, error.message);

        return NextResponse.json({
            error: true,
            errorMessage: error.message,
            title: fileNameForLog.replace(/\.[^/.]+$/, ''),
            category: 'disease',
            tags: ['검토필요'],
            summary: '분석 실패',
            content: '## 내용\n\n분석에 실패했습니다.\n\n오류: ' + error.message,
        }, { status: 200 });
    }
}
