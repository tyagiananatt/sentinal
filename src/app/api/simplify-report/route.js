import { NextResponse } from 'next/server';
import { generateAIContent } from '@/../lib/ai/client';

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

    const responseText = await generateAIContent(null, prompt, false, 'gemini');

    return NextResponse.json({ success: true, simplified: responseText });
  } catch (error) {
    console.error('Simplify Report API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
