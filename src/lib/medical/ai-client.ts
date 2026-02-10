import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client
// Final model selection
const MODEL_NAME = 'gemini-2.0-flash'; 

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateMedicalAnalysis(prompt: string, jsonFormat: boolean = true): Promise<any> {
  const currentApiKey = process.env.GEMINI_API_KEY || '';
  
  if (!currentApiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  try {
    const genAI = new GoogleGenerativeAI(currentApiKey);
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: jsonFormat ? "application/json" : "text/plain",
      } 
    });

    console.log(`[Gemini] Calling API with key starting with: ${currentApiKey.substring(0, 8)}...`);

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (jsonFormat) {
      try {
        // Strip markdown code blocks if present (though responseMimeType should prevent this)
        const cleanText = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        return JSON.parse(cleanText);
      } catch {
        console.error("Failed to parse JSON response:", text);
        throw new Error("Invalid JSON response from AI");
      }
    }

    return text;
  } catch (error: any) {
    console.error("Error calling Gemini API:");
    if (error.response) {
      console.error("Status:", error.status);
      console.error("Details:", JSON.stringify(error.response, null, 2));
    } else {
      console.error("Message:", error.message);
    }
    throw error;
  }
}
