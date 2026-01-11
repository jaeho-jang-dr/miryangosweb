
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { diseaseName } = body;

    // 1. Basic Validation
    if (!diseaseName) {
      return NextResponse.json({ error: 'Disease name is missing' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("DEBUG: API Key missing in environment");
      return NextResponse.json({ error: 'Server Config Error: API Key missing' }, { status: 500 });
    }

    console.log(`[API] Processing request for: ${diseaseName}`);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 2. Strict Generation Prompt (Text Mode)
    // We ask for a string delimiter to easy parsing.
    const prompt = `
      Create a JSON object for the disease: "${diseaseName}".
      
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

    console.log("[API] Raw AI Response length:", text.length);

    // 4. Robust Parsing
    let jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const start = jsonString.indexOf('{');
    const end = jsonString.lastIndexOf('}');

    if (start === -1 || end === -1) {
      throw new Error("Invalid JSON format received from AI");
    }

    jsonString = jsonString.substring(start, end + 1);

    let parsedData;
    try {
      parsedData = JSON.parse(jsonString);
    } catch (e) {
      console.error("[API] JSON Parse Error. Raw string:", jsonString);
      throw new Error("Failed to parse AI data");
    }

    // 5. Image URL Generation (Pollinations.ai)
    const images = (parsedData.prompts || []).map((p: string) => {
      // Simple encoding
      const safePrompt = encodeURIComponent(p + " cartoon, vector art, cute");
      const seed = Math.floor(Math.random() * 9999);
      return `https://image.pollinations.ai/prompt/${safePrompt}?width=800&height=600&seed=${seed}&nologo=true`;
    });

    // 6. Response Construction
    return NextResponse.json({
      diseaseInfo: {
        knowledge: parsedData.knowledge || "내용 없음",
        treatment: parsedData.treatment || "내용 없음",
        dosAndDonts: parsedData.guidelines || "내용 없음",
      },
      cartoonImageUrls: images,
      markdownContent: parsedData.summary || "요약 없음"
    });

  } catch (error: any) {
    console.error("[API] Critical Error:", error);
    return NextResponse.json({
      error: "Server Error",
      message: error.message
    }, { status: 500 });
  }
}
