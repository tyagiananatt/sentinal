
const { PrismaClient } = require('@prisma/client');
const { GoogleGenAI } = require('@google/genai');

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  const findings = await prisma.finding.findMany({ 
    where: { status: 'SUSPECTED' }, 
    include: { execution: { include: { testSpec: true } } } 
  });
  const project = await prisma.project.findFirst({ 
    include: { profile: true, source: true } 
  });
  
  const spec = findings[0].execution.testSpec;
  const execution = findings[0].execution;
  const profile = project.profile;
  
  const prompt = `TEST:
${JSON.stringify(spec)}
EXEC:
${execution.actualOutput}
PROF:
${JSON.stringify(profile)}
`;
  
  console.log('Sending request to Gemini...');
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    });
    console.log('Success:', response.text);
  } catch (e) {
    console.error('GenAI Error:', e);
  }
}

test().catch(console.error);
