import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-3.6-flash';

async function invokeWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message.includes('429') || error.message.includes('Quota exceeded') || error.message.includes('RESOURCE_EXHAUSTED')) {
        console.log(`[Rate Limit Hit] Retrying in ${Math.pow(2, i) * 5} seconds...`);
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 5000));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Failed after maximum retries due to rate limiting.");
}

export async function analyzeFinding(finding, execution, spec, profile, sourceInfo) {
  const prompt = `
You are the Sentinel Root Cause Analyzer. 

A test has FAILED during execution. Your job is to look at the test specification, the actual execution output, and the project context, and determine WHY it failed.

TEST SPECIFICATION:
${JSON.stringify(spec, null, 2)}

ACTUAL EXECUTION OUTPUT:
${execution.actualOutput}

PROJECT PROFILE:
${JSON.stringify(profile, null, 2)}

Determine the EXACT root cause of the failure based on the execution output.
WARNING: DO NOT mirror the schema of the Test Specification. You must ONLY output a JSON object exactly matching the schema below:

{
  "rootCause": "A concise explanation of the root cause (e.g., 'The endpoint /api/dossier does not exist on the server (404 Not Found)')",
  "confidence": "HIGH, MEDIUM, or LOW",
  "impact": "A concise description of the impact"
}
`;

  try {
    const response = await invokeWithRetry(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
      }
    }));

    const rawText = response.text || '';
    const text = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (error) {
    console.error('Root Cause Analysis Error:', error);
    throw new Error('Failed to analyze root cause via Gemini: ' + error.message);
  }
}

export async function generateFinalReport(project, findings) {
  const prompt = `
You are the Sentinel Reporting Engine.
Write a comprehensive Final Security & Architecture Report based on the validated findings above.
Format it in clean HTML. Use tags like <h2>, <h3>, <ul>, <li>, <strong>, and proper <table> tags for tabular data. Do NOT use markdown.

PROJECT PROFILE:
${JSON.stringify(project.profile, null, 2)}

FINDINGS (Root Cause Analyses):
${JSON.stringify(findings, null, 2)}

Write a clean Markdown report with:
1. Executive Summary
2. Tested Scope
3. Key Findings & Root Causes (Be specific about what failed and why)
4. Recommendations
`;

  try {
    const response = await invokeWithRetry(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.4
      }
    }));

    return response.text || '';
  } catch (error) {
    console.error('Report Generation Error:', error);
    throw new Error('Failed to generate report via Gemini: ' + error.message);
  }
}
