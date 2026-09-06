import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { callGroq } from '@/../lib/groq/client';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { projectId, timeframe } = await request.json();

    if (!projectId || !timeframe) {
      return NextResponse.json({ error: 'Project ID and Timeframe are required' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { profile: true }
    });

    if (!project || !project.profile) {
      return NextResponse.json({ error: 'Project profile not found. Please run the Threat Modeling Engine first.' }, { status: 404 });
    }

    const prompt = `
You are the Sentinel Advanced Threat Predictor.
Your task is to forecast the future state of a software project based on its current architectural profile.

PROJECT PROFILE:
${JSON.stringify(project.profile, null, 2)}

PREDICTION TIMEFRAME: ${timeframe.replace('_', ' ')} from now.

Write a professional, highly analytical report forecasting the likely architectural degradation, tech-debt buildup, security rot, and scaling bottlenecks this exact stack will face in the given timeframe.

Format your response in clean HTML. Do not include introductory pleasantries. Focus on hardcore technical predictions.
Use HTML tags like <h2>, <h3>, <ul>, <li>, <strong>, and proper <table> tags for tabular data. Do NOT use markdown.
Use sections like:
- Projected Dependency Rot
- Scalability Bottlenecks
- Security Vulnerabilities
- Maintenance Overhead Forecast
`;

    const report = await callGroq(
      "You are the Sentinel Future Risk Profiler.",
      prompt,
      false
    );

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('Predict Future Risks Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
