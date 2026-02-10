
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

async function testGemini() {
  const apiKey = 'AIzaSyDVdHMGoQijV6rBKMh4SnIQmA4jbxZFDVI';
  console.log('Testing API Key:', apiKey.substring(0, 8) + '...');
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent('Hi');
    console.log('Response:', result.response.text());
  } catch (error: any) {
    if (error.response) {
      console.error('Error Status:', error.status);
      console.error('Error Data:', JSON.stringify(error.response, null, 2));
    } else {
      console.error('Error Message:', error.message);
    }
  }
}

testGemini();
