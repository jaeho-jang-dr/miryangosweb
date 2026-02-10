import OpenAI from 'openai';

const MODEL_NAME = 'gpt-4o-mini';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateMedicalAnalysis(prompt: string, jsonFormat: boolean = true): Promise<any> {
  const apiKey = process.env.GPTOSS_API_KEY || '';

  if (!apiKey) {
    throw new Error('GPTOSS_API_KEY (OpenAI) is not set');
  }

  try {
    const openai = new OpenAI({ apiKey });

    console.log(`[OpenAI] Calling ${MODEL_NAME}...`);

    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      temperature: 0.2,
      ...(jsonFormat ? { response_format: { type: 'json_object' as const } } : {}),
      messages: [
        {
          role: 'system',
          content: jsonFormat
            ? '당신은 정형외과 전문 의료 AI입니다. 반드시 유효한 JSON으로만 응답하세요.'
            : '당신은 정형외과 전문 의료 AI입니다.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const text = response.choices[0]?.message?.content || '';
    console.log(`[OpenAI] 응답 완료 (tokens: ${response.usage?.total_tokens || '?'})`);

    if (jsonFormat) {
      try {
        return JSON.parse(text);
      } catch {
        console.error('[OpenAI] JSON 파싱 실패:', text);
        throw new Error('Invalid JSON response from AI');
      }
    }

    return text;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[OpenAI] API 에러:');
    if (error.status) {
      console.error('Status:', error.status);
      console.error('Message:', error.message);
    } else {
      console.error('Message:', error.message);
    }
    throw error;
  }
}
