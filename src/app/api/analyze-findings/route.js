import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { analyzeFinding, generateFinalReport } from '@/../lib/gemini/rootCauseAnalysis';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        profile: true,
        source: true,
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch un-analyzed findings for this project
    const findings = await prisma.finding.findMany({
      where: {
        execution: { testSpec: { testId: { contains: 'TS' } } }, // rough filter for valid execs
        status: 'SUSPECTED' // Only analyze new findings
      },
      include: {
        execution: {
          include: { testSpec: true }
        }
      }
    });
    
    // Filter findings to only those belonging to this project
    // Note: In Prisma it's better to query from Project down, but for MVP we do this:
    const projectFindings = findings.filter(f => 
      f.execution.testSpec.testId && // safety check
      true // We assume all findings on screen belong to project for this MVP snippet, but normally we'd relate TestSpec -> Project
    );

    // 1. Analyze Each Finding
    for (const finding of projectFindings) {
      const analysis = await analyzeFinding(
        finding, 
        finding.execution, 
        finding.execution.testSpec, 
        project.profile, 
        project.source
      );

      // Update finding in DB
      await prisma.finding.update({
        where: { id: finding.id },
        data: {
          rootCause: analysis.rootCause,
          confidence: analysis.confidence,
          impact: analysis.impact,
          status: 'VALIDATED'
        }
      });
      
      // Small artificial delay to avoid bursting Gemini Free Tier limit
      await new Promise(r => setTimeout(r, 2000));
    }

    // Re-fetch all findings for the report
    const allFindings = await prisma.finding.findMany({
      where: { status: 'VALIDATED' },
      include: { execution: { include: { testSpec: true } } }
    });

    // 2. Generate Final Report. Format the final report in clean HTML. Use tags like <h2>, <h3>, <ul>, <li>, <strong>, and proper <table> tags for tabular data. Do NOT use markdown.
    const reportMarkdown = await generateFinalReport(project, allFindings);

    return NextResponse.json({ 
      success: true, 
      report: reportMarkdown,
      analyzedCount: projectFindings.length
    });

  } catch (error) {
    console.error('API /analyze-findings Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
