import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// We use 3.6-flash as discovered during Module 1
const MODEL_NAME = 'gemini-3.6-flash';

export async function generateTesterProfile(projectProfile, sourceInfo) {
  const prompt = `
You are the Sentinel Intelligence Core. Your task is to analyze the provided Project Profile and Source Information, and autonomously generate a Specialized AI Tester for this exact project. 

The Specialized Tester is an AI agent that will later execute requirement-driven, parameterized, real-world, and edge-case tests against the live application. 

PROJECT PROFILE:
${JSON.stringify(projectProfile, null, 2)}

SOURCE INTELLIGENCE:
${JSON.stringify(sourceInfo, null, 2)}

Based on this information, define the Specialized Tester. 
Output MUST be ONLY valid JSON matching this schema exactly, with NO markdown formatting, NO backticks, and NO explanatory text:

{
  "tester": {
    "name": "A specialized name for this tester (e.g., 'E-Commerce Checkout Assailant')",
    "purpose": "A brief description of this tester's primary directive",
    "targetWorkflows": ["List of core workflows it must test, e.g. 'User Login', 'Payment Processing'"],
    "personas": ["List of realistic user personas it should simulate"],
    "objectives": ["List of main testing objectives"],
    "riskAreas": ["List of identified risk areas based on the profile"],
    "strategies": ["List of testing strategies (e.g., 'Fuzzing input fields', 'Simulating high concurrency')"],
    "adapters": ["List of adapters it will need (e.g., 'Playwright', 'HTTP', 'WebSocket')"]
  },
  "requirements": [
    {
      "requirementId": "REQ-001",
      "description": "The system must...",
      "expected": "Expected behavior",
      "criticality": "HIGH, MEDIUM, or LOW",
      "source": "Inferred from profile/source"
    }
  ],
  "risks": [
    {
      "requirementId": "REQ-001 (optional, can be null)",
      "description": "Potential failure point...",
      "type": "CURRENT or FUTURE",
      "reasons": ["Why this is a risk"],
      "severity": "CRITICAL, HIGH, MEDIUM, or LOW"
    }
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
      }
    });

    // The SDK v2 returns plain JSON text when responseMimeType is set
    // But we strip markdown blocks just in case
    const rawText = response.text || '';
    const text = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (error) {
    console.error('Tester Generation Error:', error);
    throw new Error('Failed to generate specialized tester via Gemini');
  }
}
