
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { topic } = body;

        console.log(`[API] Received request for topic: ${topic}`);

        if (!topic) {
            return NextResponse.json({ error: 'Topic required' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("[API] ❌ GEMINI_API_KEY is missing from process.env");
            return NextResponse.json({ error: 'Server Config Error: API Key missing' }, { status: 500 });
        }
        console.log(`[API] API Key present. Length: ${apiKey.length}`);

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Prompt designed for Markdown output (Stability: High)
        const prompt = `
      You are a specialized medical researcher AI (like NotebookLM).
      
      Topic: "${topic}"

      Write a comprehensive, structured medical report about this topic.
      
      Format: Markdown
      Structure:
      # ${topic}
      
      ## 1. 개요 (Overview)
      (Explain what it is simply)
      
      ## 2. 주요 증상 (Symptoms)
      (Bulleted list)
      
      ## 3. 원인 및 위험 요인 (Causes)
      (Detailed explanation)
      
      ## 4. 진단 및 치료 (Diagnosis & Treatment)
      (Professional medical guidelines)
      
      ## 5. 생활 가이드 (Dos & Don'ts)
      (Practical advice for patients)

      ## 6. 요약 (Summary)
      (A 3-line summary of the key takeaways)

      Tone: Professional, empathetic, educational. 
      Language: Korean (Korean).
      Important: Do not output JSON. Just pure Markdown text.
    `;

        console.log("[API] Sending prompt to Gemini...");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log("[API] ✅ Generation successful. Length:", text.length);

        return NextResponse.json({ markdown: text });

    } catch (error: any) {
        console.error("[API] ❌ Text Gen Error Details:", error);
        console.error("[API] Error Message:", error.message);

        // Check for common quota error
        if (error.message?.includes('429')) {
            return NextResponse.json({ error: "AI 요청량이 너무 많습니다. 잠시 후 다시 시도해주세요. (Quota Exceeded)" }, { status: 429 });
        }

        return NextResponse.json({ error: `Server Error: ${error.message}` }, { status: 500 });
    }
}
