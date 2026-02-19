
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
    try {
        // 인증 필요 (AI API 비용 방지)
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

        const { topic } = body as Record<string, unknown>;

        if (!topic || typeof topic !== 'string') {
            return NextResponse.json({ error: 'topic is required and must be a string' }, { status: 400 });
        }

        if (topic.trim().length === 0) {
            return NextResponse.json({ error: 'topic cannot be empty' }, { status: 400 });
        }

        if (topic.length > 200) {
            return NextResponse.json({ error: 'topic is too long (max 200 characters)' }, { status: 400 });
        }

        // 입력 sanitize
        const sanitizedTopic = topic.trim().replace(/[<>'"]/g, '');

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("[API] GEMINI_API_KEY is missing from process.env");
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // sanitizedTopic 사용으로 prompt injection 방지
        const prompt = `
      You are a specialized medical researcher AI (like NotebookLM).

      Topic: "${sanitizedTopic}"

      Write a comprehensive, structured medical report about this topic.

      Format: Markdown
      Structure:
      # ${sanitizedTopic}

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

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ markdown: text });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error("[API] Text Gen Error:", message);

        if (message.includes('429')) {
            return NextResponse.json({ error: "AI 요청량이 너무 많습니다. 잠시 후 다시 시도해주세요. (Quota Exceeded)" }, { status: 429 });
        }

        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
