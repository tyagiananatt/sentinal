require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-1.5-flash';

async function test() {
  const project = await prisma.project.findFirst({ include: { profile: true, source: true } });
  if (project) {
    try {
      const prompt = `
You are the Sentinel Intelligence Core. Your task is to analyze the provided Project Profile and Source Information, and autonomously generate a Specialized AI Tester for this exact project. 

PROJECT PROFILE:
${JSON.stringify(project.profile, null, 2)}

SOURCE INTELLIGENCE:
${JSON.stringify(project.source, null, 2)}

Output JSON:
{
  "tester": {
    "name": "...",
    "purpose": "...",
    "targetWorkflows": ["..."],
    "personas": ["..."],
    "objectives": ["..."],
    "riskAreas": ["..."],
    "strategies": ["..."],
    "adapters": ["..."]
  },
  "requirements": [
    {
      "requirementId": "REQ-001",
      "description": "...",
      "expected": "...",
      "criticality": "HIGH",
      "source": "..."
    }
  ],
  "risks": [
    {
      "requirementId": "REQ-001",
      "description": "...",
      "type": "CURRENT",
      "reasons": ["..."],
      "severity": "HIGH"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          temperature: 0.3,
          responseMimeType: "application/json",
        }
      });
      const rawText = response.text || '';
      const text = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const obj = JSON.parse(text);
      console.log('SUCCESS, tester name:', obj.tester.name);
    } catch(e) {
      console.error('FAILED:', e);
    }
  }
}
test().finally(() => prisma.$disconnect());
