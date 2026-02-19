import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import { extractPptxText, isPptxFile } from '@/lib/pptx-parser';
import { bufferToBase64, getMemoryUsage } from '@/lib/performance-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================
// TypeScript Type Definitions
// ============================================================

/** Claude API - Content Part 타입 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ClaudeContentPart =
    | { type: 'text'; text: string }
    | {
        type: 'image';
        source: {
            type: 'base64';
            media_type: string;
            data: string;
        };
    };

/** ChatGPT API - Message Content 타입 */
type ChatGPTMessageContent =
    | string
    | Array<
        | { type: 'text'; text: string }
        | {
            type: 'image_url';
            image_url: {
                url: string;
                detail: 'low' | 'high' | 'auto';
            };
        }
    >;

/** ChatGPT API - Message 타입 */
interface ChatGPTMessage {
    role: 'user' | 'assistant' | 'system';
    content: ChatGPTMessageContent;
}

/** Gemini API - Content Part 타입 */
interface GeminiContentPart {
    inlineData: {
        data: string;
        mimeType: string;
    };
}

/** 분석 결과 JSON 구조 */
interface AnalysisResult {
    title: string;
    category: 'disease' | 'treatment' | 'diagnosis' | 'prevention' | 'anatomy' | 'etc' | 'webtoon' | 'guide' | 'news' | 'gallery' | 'app';
    tags: string[];
    summary: string;
    content: string;
    fileName?: string;
    fileType?: string;
    analyzedBy?: string;
    images?: string[];
}

// ============================================================

// pdf-parse v2.4.5 API
async function parsePdf(buffer: Buffer) {
    try {
        const { PDFParse, VerbosityLevel } = require('pdf-parse');
        const parser = new PDFParse({
            data: new Uint8Array(buffer),
            verbosity: VerbosityLevel.ERRORS,
        });
        const result = await parser.getText();
        return { text: result.text || '', numpages: result.pages?.length || 0 };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`PDF parsing failed: ${msg}`);
    }
}

// Lazy load mammoth for DOCX support
let mammoth: typeof import('mammoth') | null = null;
async function getMammoth() {
    if (!mammoth) {
        mammoth = await import('mammoth');
    }
    return mammoth;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Initialize OpenAI for ChatGPT
const openai = new OpenAI({
    apiKey: process.env.GPTOSS_API_KEY || '',
    baseURL: process.env.GPTOSS_BASE_URL || 'https://api.openai.com/v1',
});

// Initialize Anthropic for Claude
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});

function bufferToPart(buffer: Buffer, mimeType: string) {
    return {
        inlineData: {
            data: bufferToBase64(buffer), // 캐싱된 변환 사용
            mimeType,
        },
    };
}

// 🎯 초정밀 의료 이미지 OCR 프롬프트 - 한글 특화
const MEDICAL_ANALYSIS_PROMPT = `
당신은 **한국 의료 정보 OCR 전문가**입니다. 의료 이미지에서 한글과 영문 텍스트를 정확히 읽고 구조화된 데이터로 변환하세요.

---

## 📋 STEP 1: OCR - 텍스트 완벽 추출
- **모든 텍스트를 빠짐없이 읽으세요** (한글, 영문, 숫자, 기호 포함)
- **제목 위치**: 이미지 맨 위 또는 가장 큰 글씨체
- **의학 용어**: 정확한 철자 유지 (예: 족저근막염, 당뇨병, 고혈압)
- **숫자**: 통계, 수치 정확히 추출

---

## 🏷️ STEP 2: 제목 추출 (정확성 최우선)
**규칙**:
1. 이미지 **맨 위 첫 줄** 텍스트를 제목으로 사용
2. 제목이 없으면 **가장 큰 글씨**를 제목으로 사용
3. 제목이 없으면 **핵심 키워드**를 조합하여 생성
4. 20자 이내로 간결하게

**예시**:
- ✅ "족저근막염의 증상과 치료"
- ✅ "당뇨병 예방 가이드"
- ✅ "척추측만증 자가진단법"

---

## 🏷️ STEP 3: 태그 생성 (3-5개, 기존 태그 우선)

**기존 태그 목록** (우선적으로 사용):
\`\`\`
척추, 관절, 예방, 상식, 운동, 건강, 독감, 예방접종,
장비소개, MRI, 고혈압, 당뇨, 건강관리
\`\`\`

**태그 선택 전략**:
1. **우선순위 1**: 기존 태그 목록에서 관련 태그 선택
2. **우선순위 2**: 질병명, 신체 부위 추가 (예: 족저근막염, 발)
3. **우선순위 3**: 치료법, 증상 추가 (예: 물리치료, 통증)

**예시**:
- ✅ ["척추", "관절", "운동", "예방", "물리치료"]
- ✅ ["당뇨", "건강관리", "식이요법", "혈당"]
- ✅ ["독감", "예방접종", "예방", "상식"]

---

## 📝 STEP 4: 내용 구조화 (마크다운 형식)

**구조**:
\`\`\`markdown
## 개요
[이미지에서 읽은 핵심 내용을 2-3문장으로 요약]

## 주요 내용
- 첫 번째 핵심 포인트
- 두 번째 핵심 포인트
- 세 번째 핵심 포인트

## 증상 (해당시)
- 증상 1
- 증상 2

## 원인 (해당시)
- 원인 1
- 원인 2

## 치료/예방 (해당시)
- 치료법/예방법 1
- 치료법/예방법 2
\`\`\`

---

## 🗂️ STEP 5: 카테고리 자동 분류

**카테고리 규칙**:
- \`disease\`: 질환/질병 정보 (진단, 증상, 치료 포함)
- \`guide\`: 건강 가이드/생활습관/예방법
- \`news\`: 최신 건강 뉴스/연구 결과
- \`gallery\`: 일반 사진/이미지
- \`webtoon\`: 만화/웹툰 형식
- \`app\`: AI/앱 소개

---

## 📤 출력 형식 (순수 JSON만 출력)

\`\`\`json
{
  "title": "이미지 맨 위 텍스트 (20자 이내)",
  "summary": "핵심 내용 2-3문장 요약",
  "content": "## 개요\\n\\n[내용]\\n\\n## 주요 내용\\n\\n- 항목1\\n- 항목2",
  "tags": ["기존태그1", "기존태그2", "새태그1"],
  "category": "disease"
}
\`\`\`

**중요**:
- 반드시 **순수 JSON만** 출력하세요
- 설명, 주석, 마크다운 코드블록(\\\`\\\`\\\`) 금지
- 한글 인코딩 그대로 유지
`;

// 웹툰 전용 프롬프트
const WEBTOON_PROMPT = `
웹툰/만화 이미지를 분석합니다.

**출력 형식 (순수 JSON만)**:
\`\`\`json
{
  "title": "웹툰 제목 또는 파일명",
  "summary": "웹툰 줄거리 요약 (2-3문장)",
  "content": "# 웹툰 정보\\n\\n줄거리, 등장인물, 특징 등",
  "tags": ["웹툰", "만화"],
  "category": "webtoon"
}
\`\`\`

반드시 순수 JSON만 출력하세요.
`;

// 🔄 재시도 로직 헬퍼
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error: unknown) {
            lastError = error instanceof Error ? error : new Error('Unknown error');
            console.warn(`[Retry ${i + 1}/${maxRetries}] ${lastError.message}`);

            if (i < maxRetries - 1) {
                const delay = initialDelay * Math.pow(2, i);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError || new Error('All retries failed');
}

// 🎨 모델별 최적화된 실행 함수
async function executeAIModel(
    selectedModel: string,
    prompt: string,
    contentParts: GeminiContentPart[],
    buffer: Buffer,
    fileType: string
): Promise<string> {
    if (selectedModel === 'claude') {
        // API 키 체크
        if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === '') {
            throw new Error('Claude API 키가 설정되지 않았습니다. .env.local에 ANTHROPIC_API_KEY를 추가해주세요.');
        }
        // Claude Opus 4 - 정확한 OCR 강점
        return await retryWithBackoff(async () => {
            const imageBase64 = contentParts.length > 0 ? bufferToBase64(buffer) : null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const content: any[] = [{ type: "text", text: prompt }];

            if (imageBase64) {
                content.push({
                    type: "image",
                    source: {
                        type: "base64",
                        media_type: fileType,
                        data: imageBase64,
                    },
                });
            }

            // Anthropic SDK — timeout goes in request options (2nd arg)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const message: any = await anthropic.messages.create({
                    model: "claude-opus-4-20250514",
                    max_tokens: 4096,
                    temperature: 0.1, // 정확도 우선
                    messages: [{ role: "user", content }],
                }, { timeout: 45000 });

            return message.content[0].text;
        });
    }
    else if (selectedModel === 'gptoss') {
        // API 키 체크
        if (!process.env.GPTOSS_API_KEY || process.env.GPTOSS_API_KEY === '') {
            throw new Error('ChatGPT API 키가 설정되지 않았습니다. .env.local에 GPTOSS_API_KEY를 추가해주세요.');
        }

        // ChatGPT - 자연스러운 한글 생성 (이미지 처리 안정화)
        return await retryWithBackoff(async () => {
            // 이미지 파일 여부 체크
            const isImage = fileType.startsWith('image/') && buffer.length > 0;
            const imageBase64 = isImage ? bufferToBase64(buffer) : null;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const messages: any[] = [{
                role: "user" as const,
                content: imageBase64
                    ? [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${fileType};base64,${imageBase64}`,
                                detail: "high" // 고해상도 분석
                            }
                        }
                    ]
                    : prompt
            }];

            console.log(`[ChatGPT] 이미지 포함: ${isImage ? 'Yes' : 'No'}, 크기: ${buffer.length} bytes`);

            // OpenAI SDK — timeout goes in request options (2nd arg)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const completion: any = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: messages,
                    max_tokens: 4096,
                    temperature: 0.2,
                }, { timeout: 60000 });

            if (!completion.choices || !completion.choices[0] || !completion.choices[0].message) {
                throw new Error("ChatGPT 응답이 비어있습니다");
            }

            return completion.choices[0].message.content;
        });
    }
    else if (selectedModel === 'gemini2') {
        // API 키 체크
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === '') {
            throw new Error('Gemini API 키가 설정되지 않았습니다. .env.local에 GEMINI_API_KEY를 추가해주세요.');
        }

        // Gemini 2.0 Flash - 빠른 속도 (실험적)
        return await retryWithBackoff(async () => {
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
            // TODO: @google/generative-ai SDK does not support a native `timeout` option.
            // Promise.race is used as a workaround. The actual API call may continue running
            // in the background after timeout, consuming resources and API quota.
            // Consider using AbortController with requestOptions when the SDK adds support.
            const result = await Promise.race([
                model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }, ...contentParts] }],
                    generationConfig: {
                        temperature: 0.1,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 4096,
                    },
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Gemini 2.0 Timeout (45s)")), 45000)
                )
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ]) as any;

            return result.response.text();
        });
    }
    else {
        // API 키 체크
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === '') {
            throw new Error('Gemini API 키가 설정되지 않았습니다. .env.local에 GEMINI_API_KEY를 추가해주세요.');
        }

        // Gemini 1.5 Pro - 최신 최고 성능 모델
        return await retryWithBackoff(async () => {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
            // TODO: @google/generative-ai SDK does not support a native `timeout` option.
            // Promise.race is used as a workaround. The actual API call may continue running
            // in the background after timeout, consuming resources and API quota.
            // Consider using AbortController with requestOptions when the SDK adds support.
            const result = await Promise.race([
                model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }, ...contentParts] }],
                    generationConfig: {
                        temperature: 0.1,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 8192,
                    },
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Gemini 1.5 Pro Timeout (60s)")), 60000)
                )
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ]) as any;

            return result.response.text();
        });
    }
}

// 🔍 JSON 추출 및 검증
function extractAndValidateJSON(responseText: string, fileName: string): AnalysisResult {
    // 입력 검증
    if (!responseText || responseText.trim().length === 0) {
        throw new Error("AI 응답이 비어있습니다");
    }

    // JSON 추출
    const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = cleanedJson.indexOf('{');
    const jsonEnd = cleanedJson.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("AI가 JSON을 반환하지 않았습니다. 응답 형식을 확인하세요.");
    }

    // JSON 파싱 (에러 처리 포함)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any;
    try {
        const jsonString = cleanedJson.substring(jsonStart, jsonEnd + 1);
        data = JSON.parse(jsonString);
    } catch (parseError: unknown) {
        const msg = parseError instanceof Error ? parseError.message : 'Unknown error';
        throw new Error(`JSON 파싱 실패: ${msg}`);
    }

    // 데이터 타입 검증
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error("AI 응답이 올바른 객체 형식이 아닙니다");
    }

    // 필수 필드 검증 및 기본값 설정
    if (!data.title || data.title.trim() === '') {
        data.title = fileName.replace(/\.[^/.]+$/, "");
    }

    if (!data.summary || data.summary.trim() === '') {
        data.summary = "AI 분석 결과";
    }

    if (!data.content || data.content.trim() === '') {
        data.content = "## 내용\n\n내용을 입력하세요.";
    }

    if (!data.tags || !Array.isArray(data.tags) || data.tags.length === 0) {
        data.tags = ["자동생성"];
    }

    // 카테고리 검증 (허용된 값만)
    const validCategories: AnalysisResult['category'][] = [
        'disease', 'treatment', 'diagnosis', 'prevention', 'anatomy',
        'webtoon', 'guide', 'news', 'gallery', 'app', 'etc'
    ];
    if (!data.category || !validCategories.includes(data.category)) {
        data.category = "disease";
    }

    // 제목 길이 제한 (안전한 문자열 처리)
    if (typeof data.title === 'string' && data.title.length > 50) {
        data.title = data.title.substring(0, 50) + "...";
    }

    // 태그 정제 (타입 안전성 확보)
    if (Array.isArray(data.tags)) {
        data.tags = data.tags
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((tag: any) => typeof tag === 'string') // 문자열만 유지
            .map((tag: string) => tag.trim())
            .filter((tag: string) => tag.length > 0 && tag.length <= 20) // 빈 태그 및 너무 긴 태그 제거
            .slice(0, 7); // 최대 7개
    } else {
        data.tags = ["자동생성"];
    }

    // summary와 content가 문자열인지 확인
    if (typeof data.summary !== 'string') {
        data.summary = "AI 분석 결과";
    }
    if (typeof data.content !== 'string') {
        data.content = "## 내용\n\n내용을 입력하세요.";
    }

    return data as AnalysisResult;
}

export async function POST(request: Request) {
    let fileNameForLog = "unknown";

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const selectedModel = (formData.get('model') as string) || 'claude';

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // 파일 검증
        if (!file.name || file.name.trim() === '') {
            return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
        }

        if (file.size === 0) {
            return NextResponse.json({ error: 'File is empty' }, { status: 400 });
        }

        // 파일 크기 제한 (100MB)
        const MAX_FILE_SIZE = 100 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({
                error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
            }, { status: 400 });
        }

        fileNameForLog = file.name;
        const memStart = getMemoryUsage();
        console.log(`[SmartUpload] 📄 Processing: ${file.name} (${file.type}, ${file.size} bytes)`);
        console.log(`[SmartUpload] 🤖 Model: ${selectedModel}`);
        console.log(`[SmartUpload] 💾 Memory: ${memStart.heapUsedMB}MB / ${memStart.heapTotalMB}MB`);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 버퍼 검증
        if (buffer.length === 0) {
            throw new Error("파일을 읽을 수 없습니다");
        }

        let prompt = "";
        let contentParts: GeminiContentPart[] = [];
        const extractedImages: string[] = [];

        const isZip = file.type.includes('zip') || file.name.endsWith('.zip');

        // --- STRATEGY 0: ZIP / Webtoon ---
        if (isZip) {
            console.log("📦 ZIP 파일 감지. 이미지 추출 중...");
            const zip = new JSZip();
            const contents = await zip.loadAsync(buffer);

            const imageFiles = Object.keys(contents.files)
                .filter(name => !contents.files[name].dir)
                .filter(name => /\.(jpg|jpeg|png|webp|gif)$/i.test(name))
                .sort();

            console.log(`✅ ZIP에서 ${imageFiles.length}개 이미지 추출`);

            for (const filename of imageFiles) {
                const imgData = await contents.files[filename].async('nodebuffer');
                const mime = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
                const base64 = `data:${mime};base64,${imgData.toString('base64')}`;
                extractedImages.push(base64);
            }

            prompt = WEBTOON_PROMPT;

            // 첫 3개 이미지만 분석에 사용
            const samplesToAnalyze = Math.min(3, extractedImages.length);
            for (let i = 0; i < samplesToAnalyze; i++) {
                const imgBase64 = extractedImages[i].split(',')[1];
                const imgBuffer = Buffer.from(imgBase64, 'base64');
                contentParts.push(bufferToPart(imgBuffer, 'image/jpeg'));
            }
        }
        // --- STRATEGY 1: IMAGE (MEDICAL) ---
        else if (file.type.startsWith('image/')) {
            prompt = MEDICAL_ANALYSIS_PROMPT;
            contentParts = [bufferToPart(buffer, file.type)];
        }
        // --- STRATEGY 2: PDF ---
        else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            console.log("📄 PDF 파일 감지. 텍스트 추출 중...");
            let pdfText = '';
            try {
                const data = await parsePdf(buffer);
                pdfText = data.text.trim();
                console.log(`✅ PDF 파싱 완료: ${pdfText.length}자`);
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Unknown error';
                console.error("PDF 파싱 실패:", msg);
            }

            if (pdfText.length >= 100) {
                // 텍스트 기반 PDF - 추출된 텍스트로 분석
                prompt = `PDF 문서 분석:\n\n${pdfText.substring(0, 15000)}\n\n` + MEDICAL_ANALYSIS_PROMPT;
                contentParts = [];
            } else {
                // 이미지 기반 PDF - PDF를 Gemini에 직접 전달
                console.log(`📸 이미지 기반 PDF (텍스트 ${pdfText.length}자). PDF를 직접 AI에 전달합니다.`);
                prompt = MEDICAL_ANALYSIS_PROMPT;
                contentParts = [bufferToPart(buffer, 'application/pdf')];
            }
        }
        // --- STRATEGY 3: DOCX (Word) ---
        else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
            console.log("📝 DOCX 파일 감지. 텍스트 추출 중...");
            try {
                const mammothModule = await getMammoth();
                const result = await mammothModule.extractRawText({ buffer });
                const text = result.value.substring(0, 15000);
                prompt = `Word 문서 분석:\n\n${text}\n\n` + MEDICAL_ANALYSIS_PROMPT;
                contentParts = [];
                console.log(`✅ DOCX 파싱 완료: ${text.length}자`);
            } catch (e) {
                console.error("DOCX 파싱 실패:", e);
                prompt = `Word 파일 (파일명: ${file.name})\n\n` + MEDICAL_ANALYSIS_PROMPT;
                contentParts = [];
            }
        }
        // --- STRATEGY 4: XLSX (Excel) ---
        else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx')) {
            console.log("📊 XLSX 파일 감지. 데이터 추출 중...");
            try {
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
                let allText = '';

                // 모든 시트 읽기
                workbook.worksheets.forEach(sheet => {
                    const rows: string[][] = [];
                    sheet.eachRow((row) => {
                        const values: string[] = [];
                        row.eachCell({ includeEmpty: true }, (cell) => {
                            values.push(cell.text ?? '');
                        });
                        rows.push(values);
                    });
                    const sheetData = rows.map(r => r.join(',')).join('\n');
                    allText += `[${sheet.name}]\n${sheetData}\n\n`;
                });

                const text = allText.substring(0, 15000);
                prompt = `Excel 문서 분석:\n\n${text}\n\n` + MEDICAL_ANALYSIS_PROMPT;
                contentParts = [];
                console.log(`✅ XLSX 파싱 완료: ${text.length}자`);
            } catch (e) {
                console.error("XLSX 파싱 실패:", e);
                prompt = `Excel 파일 (파일명: ${file.name})\n\n` + MEDICAL_ANALYSIS_PROMPT;
                contentParts = [];
            }
        }
        // --- STRATEGY 5: PPTX (PowerPoint) ---
        else if (isPptxFile(file.name, file.type)) {
            console.log("📊 PPTX 파일 감지. 텍스트 추출 중...");
            const result = await extractPptxText(buffer, {
                maxTextLength: 15000,
                slideFormat: 'bracket'
            });

            if (result.success && result.totalText.length > 0) {
                prompt = `PowerPoint 프레젠테이션 분석:\n\n${result.totalText}\n\n` + MEDICAL_ANALYSIS_PROMPT;
                contentParts = [];
                console.log(`✅ PPTX 파싱 완료: ${result.totalText.length}자, ${result.totalSlides}슬라이드`);
            } else {
                console.error("PPTX 파싱 실패:", result.error);
                prompt = `PowerPoint 파일 (파일명: ${file.name})\n\n` + MEDICAL_ANALYSIS_PROMPT;
                contentParts = [];
            }
        }
        // --- STRATEGY 6: TEXT ---
        else {
            const textStart = buffer.toString('utf-8').substring(0, 5000);
            prompt = `텍스트 파일 분석\n\n파일명: ${file.name}\n내용:\n${textStart}\n\n` + MEDICAL_ANALYSIS_PROMPT;
            contentParts = [];
        }

        // --- AI 실행 ---
        console.log(`[SmartUpload] 🚀 AI 모델 실행 중...`);
        const responseText = await executeAIModel(selectedModel, prompt, contentParts, buffer, file.type);

        console.log(`[SmartUpload] ✅ AI 응답 수신 완료`);
        console.log(`[SmartUpload] 📊 응답 길이: ${responseText.length}자`);

        // JSON 파싱 및 검증
        const data = extractAndValidateJSON(responseText, fileNameForLog);

        // ZIP 이미지 추가
        if (extractedImages.length > 0) {
            data.images = extractedImages;
            if (!data.category) data.category = 'webtoon';
        }

        // 모델 정보 추가
        const modelNames: Record<string, string> = {
            'claude': 'Claude Opus 4.5',
            'gemini': 'Gemini 1.5 Pro',
            'gemini2': 'Gemini 2.0 Flash',
            'gptoss': 'ChatGPT 4o'
        };
        data.analyzedBy = modelNames[selectedModel] || 'AI';

        console.log(`[SmartUpload] ✨ 분석 완료:`, {
            model: data.analyzedBy,
            title: data.title,
            category: data.category,
            tags: data.tags
        });

        return NextResponse.json(data);

    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        console.error(`[SmartUpload] ❌ Error for ${fileNameForLog}:`, err);

        // 에러 타입별 분류
        let errorType = 'unknown';
        let userMessage = err.message;

        if (err.message.includes('Timeout')) {
            errorType = 'timeout';
            userMessage = 'AI 분석 시간이 초과되었습니다. 파일 크기를 줄이거나 다른 모델을 시도해주세요.';
        } else if (err.message.includes('JSON')) {
            errorType = 'parse_error';
            userMessage = 'AI 응답을 해석하는데 실패했습니다. 다시 시도해주세요.';
        } else if (err.message.includes('API')) {
            errorType = 'api_error';
            userMessage = 'AI 서비스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.';
        }

        return NextResponse.json({
            error: true,
            errorType,
            errorMessage: userMessage,
            errorDetails: err.message,
            title: fileNameForLog.replace(/\.[^/.]+$/, ""),
            tags: ["자동생성", "검토필요"],
            summary: `분석 실패: ${userMessage}`,
            category: "disease",
            content: "## 내용\n\n분석에 실패했습니다. 다시 시도하거나 직접 입력해주세요.",
            images: []
        }, { status: 422 });
    }
}
