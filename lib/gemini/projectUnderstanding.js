import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeProjectData(liveData, repoFiles, repoHistory) {
  const prompt = `
You are Sentinel, an advanced AI project analyzer.
I am providing you with information about a project from its Live URL, GitHub repository files, and Git history.

Live URL Data:
${JSON.stringify(liveData, null, 2)}

Repository Files (Sample):
${repoFiles.slice(0, 50).join('\n')}

Repository History (Last 50 commits):
${repoHistory}

Based on this information, generate a structured Project Profile.
Respond ONLY with a valid JSON object matching this schema, without markdown formatting:
{
  "title": "Project Name",
  "type": "e.g., Voice customer-support AI, Chatbot, Fintech API",
  "purpose": "A short summary of what the project does",
  "mainFeatures": ["feature 1", "feature 2"],
  "aiComponents": ["component 1"],
  "tools": ["tool 1"],
  "externalServices": ["service 1"]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
      }
    });

    const text = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini Project Understanding Error:', error);
    throw new Error('Failed to analyze project data via Gemini');
  }
}
