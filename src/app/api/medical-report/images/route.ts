
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
    let topic = '';
    try {
        const body = await request.json();
        topic = body.topic;
        const context = body.context;

        if (!topic) return NextResponse.json({ error: 'Topic required' }, { status: 400 });

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Prompt designed for Image Prompt Extraction
        const prompt = `
      Based on this medical topic: "${topic}"
      
      Create 4 distinct, detailed textual descriptions for an illustrator to draw.
      The style is "Friendly, flat vector art, educational cartoon, pastel colors".
      
      Output JUST the 4 prompts in English, separated by valid JSON array format.
      Example: ["A doctor examining a patient..", "Healthy lungs vs unhealthy..", ...]
      
      Strictly JSON array only.
    `;

        const result = await model.generateContent(prompt);
        let text = result.response.text();

        // Simple cleaning
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');

        let prompts = [];
        if (start !== -1 && end !== -1) {
            try {
                prompts = JSON.parse(text.substring(start, end + 1));
            } catch (e) {
                // Fallback prompts if parsing fails
                prompts = [
                    `${topic} illustration medical cartoon`,
                    `Doctor treating ${topic}`,
                    `Healthy lifestyle for ${topic}`,
                    `Symptoms of ${topic} icon`
                ];
            }
        } else {
            prompts = [`${topic} medical illustration`];
        }

        // Generate Pollinations URLs
        const imageUrls = prompts.map((p: string) => {
            const encoded = encodeURIComponent(p + " flat vector art, cute, medical education");
            const seed = Math.floor(Math.random() * 9999);
            return `https://image.pollinations.ai/prompt/${encoded}?width=800&height=600&seed=${seed}&nologo=true&model=flux`;
        });

        return NextResponse.json({ images: imageUrls, prompts: prompts });

    } catch (error: any) {
        console.error("Image Gen Error:", error);
        // Even if AI fails, return generic fallbacks so app doesn't crash
        const fallbackTopic = "medical illustration";
        const encodedFallback = encodeURIComponent(fallbackTopic + " flat vector art");
        const seed = Math.floor(Math.random() * 9999);
        return NextResponse.json({
            images: [`https://image.pollinations.ai/prompt/${encodedFallback}?width=800&height=600&seed=${seed}`],
            error: "AI prompt generation failed, using generic fallback."
        });
    }
}
