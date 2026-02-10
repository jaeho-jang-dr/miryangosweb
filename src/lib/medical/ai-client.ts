import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client
// Ensure GEMINI_API_KEY is set in your .env.local file
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Use a fast and capable model
const MODEL_NAME = 'gemini-2.0-flash'; // Updated to stable version

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateMedicalAnalysis(prompt: string, jsonFormat: boolean = true): Promise<any> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.2, // Low temperature for more deterministic/factual output
        responseMimeType: jsonFormat ? "application/json" : "text/plain",
      } 
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (jsonFormat) {
      try {
        // Strip markdown code blocks if present (though responseMimeType should prevent this)
        const cleanText = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        return JSON.parse(cleanText);
      } catch (_e) {
        console.error("Failed to parse JSON response:", text);
        throw new Error("Invalid JSON response from AI");
      }
    }

    return text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}
