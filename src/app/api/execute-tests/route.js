import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateTestSpecifications, executeTestSpec } from '@/../lib/gemini/testExecution';

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
        tester: true,
        requirements: true,
        risks: true
      }
    });

    if (!project || !project.tester) {
      return NextResponse.json({ error: 'Specialized Tester not found. Please generate it first in Module 3.' }, { status: 404 });
    }

    // 1. Generate Dynamic Test Specifications via Gemini
    const rawSpecs = await generateTestSpecifications(project.tester, project.requirements);
    
    // Validate we got an array
    if (!Array.isArray(rawSpecs)) {
      throw new Error("Gemini returned invalid test specifications format");
    }

    const executionsResult = [];

    // 2. Loop through specifications, execute them, and store results
    for (const spec of rawSpecs) {
      // Find matching requirement if any
      const req = project.requirements.find(r => r.requirementId === spec.requirementId);

      // Save TestSpec to DB
      const dbSpec = await prisma.testSpecification.create({
        data: {
          testId: `TS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          requirementId: req ? req.id : null,
          objective: spec.objective || 'Unknown Objective',
          category: spec.category || 'GENERAL',
          parameters: JSON.stringify(spec.parameters || {}),
          inputScenario: spec.inputScenario || '',
          expected: spec.expected || '',
          successCriteria: spec.successCriteria || '',
          adapter: spec.adapter || 'HTTP'
        }
      });

      // Execute Test
      const execResult = await executeTestSpec(project.url, spec);

      // Save Execution to DB
      const dbExec = await prisma.testExecution.create({
        data: {
          testSpecId: dbSpec.id,
          status: execResult.status,
          inputUsed: spec.inputScenario,
          actualOutput: execResult.actualOutput,
          logs: execResult.logs,
          completedAt: new Date()
        }
      });

      // If FAILED, automatically create a Finding (Module 5 prelude)
      if (execResult.status === 'FAILED') {
        await prisma.finding.create({
          data: {
            executionId: dbExec.id,
            status: 'SUSPECTED',
            description: `Test failed: ${spec.objective}`,
            impact: 'Requires investigation',
            confidence: 'MEDIUM'
          }
        });
      }

      executionsResult.push({
        spec: dbSpec,
        execution: dbExec
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Executed ${executionsResult.length} tests`,
      results: executionsResult
    });

  } catch (error) {
    console.error('API /execute-tests Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
