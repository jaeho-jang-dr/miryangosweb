
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    // 인증 확인 (AI API는 비용이 발생하므로 인증 필요)
    initAdmin();
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    try {
      await getAuth().verifyIdToken(authHeader.split('Bearer ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { diseaseName } = body as Record<string, unknown>;

    // 1. Basic Validation
    if (!diseaseName || typeof diseaseName !== 'string') {
      return NextResponse.json({ error: 'diseaseName is required and must be a string' }, { status: 400 });
    }

    // 입력 길이 제한 (prompt injection 방지)
    if (diseaseName.trim().length === 0) {
      return NextResponse.json({ error: 'diseaseName cannot be empty' }, { status: 400 });
    }
    if (diseaseName.length > 100) {
      return NextResponse.json({ error: 'diseaseName is too long (max 100 characters)' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("API Key missing in environment");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 입력 sanitize
    const sanitizedDiseaseName = diseaseName.trim().replace(/[<>'"]/g, '');
    console.log(`[API] Processing request for disease info`);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 2. Strict Generation Prompt (Text Mode)
    // sanitizedDiseaseName 사용으로 prompt injection 방지
    const prompt = `
      Create a JSON object for the medical condition: "${sanitizedDiseaseName}".

      The JSON must have this exact schema:
      {
        "knowledge": "Detailed medical explanation (Korean, HTML)",
        "treatment": "Treatment methods (Korean, HTML)",
        "guidelines": "Do's and Don'ts (Korean, HTML)",
        "summary": "Summary for markdown (Korean)",
        "prompts": ["Image Prompt 1 (English)", "Image Prompt 2", "Image Prompt 3", "Image Prompt 4"]
      }

      Valid JSON only. No markdown. No preambles.
    `;

    // 3. Generate
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // 4. Robust Parsing
    let jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const start = jsonString.indexOf('{');
    const end = jsonString.lastIndexOf('}');

    if (start === -1 || end === -1) {
      throw new Error("Invalid JSON format received from AI");
    }

    jsonString = jsonString.substring(start, end + 1);

    let parsedData: Record<string, unknown>;
    try {
      parsedData = JSON.parse(jsonString) as Record<string, unknown>;
    } catch {
      throw new Error("Failed to parse AI data");
    }

    // 5. Image URL Generation (Pollinations.ai)
    const prompts = Array.isArray(parsedData.prompts) ? parsedData.prompts : [];
    const images = prompts
      .filter((p): p is string => typeof p === 'string')
      .slice(0, 4) // 최대 4개로 제한
      .map((p: string) => {
        const safePrompt = encodeURIComponent(p.substring(0, 200) + " cartoon, vector art, cute");
        const seed = Math.floor(Math.random() * 9999);
        return `https://image.pollinations.ai/prompt/${safePrompt}?width=800&height=600&seed=${seed}&nologo=true`;
      });

    // 6. Response Construction
    return NextResponse.json({
      diseaseInfo: {
        knowledge: typeof parsedData.knowledge === 'string' ? parsedData.knowledge : "내용 없음",
        treatment: typeof parsedData.treatment === 'string' ? parsedData.treatment : "내용 없음",
        dosAndDonts: typeof parsedData.guidelines === 'string' ? parsedData.guidelines : "내용 없음",
      },
      cartoonImageUrls: images,
      markdownContent: typeof parsedData.summary === 'string' ? parsedData.summary : "요약 없음"
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("[API] Critical Error:", message);

    if (message.includes('429')) {
      return NextResponse.json({ error: "AI 요청량이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
    }

    return NextResponse.json({
      error: "Server Error"
    }, { status: 500 });
  }
}
