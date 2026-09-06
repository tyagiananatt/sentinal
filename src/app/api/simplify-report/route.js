import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-3.6-flash';

export async function POST(request) {
  try {
    const { report } = await request.json();

    if (!report) {
      return NextResponse.json({ error: 'Report content is required' }, { status: 400 });
    }

    const prompt = `
You are a helpful AI assistant that explains complex technical security and execution reports to non-technical business owners.
I will provide you with a technical execution report.
Your job is to rewrite this report into very simple, easy-to-understand terms.

Please explain:
1. What was tested (in simple English).
2. If it passed, what does that mean for the business? If it failed, what is the risk?
3. Keep it brief and avoid hard technical jargon (like "Sandbox", "API", "429", "endpoints", "latency").

TECHNICAL REPORT:
${report}

Write the simplified version in clean HTML format. Use tags like <h2>, <ul>, <li>, and <p>. Do NOT use markdown.
`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { temperature: 0.5 }
    });

    return NextResponse.json({ success: true, simplified: response.text });
  } catch (error) {
    console.error('Simplify Report API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
