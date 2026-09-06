import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateTesterProfile } from '@/../lib/gemini/testerGeneration';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Fetch Project Profile and Source info
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        profile: true,
        source: true,
        tester: true // to check if it already exists
      }
    });

    if (!project || !project.profile) {
      return NextResponse.json({ error: 'Project or profile not found' }, { status: 404 });
    }

    if (project.tester) {
      return NextResponse.json({ error: 'Specialized Tester already exists for this project' }, { status: 400 });
    }

    // Generate specialized tester via Gemini
    const generatedData = await generateTesterProfile(project.profile, project.source);

    // Ensure atomic transaction
    await prisma.$transaction(async (tx) => {
      // Create Tester
      await tx.tester.create({
        data: {
          projectId,
          name: generatedData.tester.name,
          purpose: generatedData.tester.purpose,
          targetWorkflows: JSON.stringify(generatedData.tester.targetWorkflows || []),
          personas: JSON.stringify(generatedData.tester.personas || []),
          objectives: JSON.stringify(generatedData.tester.objectives || []),
          riskAreas: JSON.stringify(generatedData.tester.riskAreas || []),
          strategies: JSON.stringify(generatedData.tester.strategies || []),
          adapters: JSON.stringify(generatedData.tester.adapters || [])
        }
      });

      // Create Requirements
      if (generatedData.requirements && generatedData.requirements.length > 0) {
        await tx.requirement.createMany({
          data: generatedData.requirements.map(req => ({
            projectId,
            requirementId: req.requirementId,
            description: req.description,
            expected: req.expected,
            criticality: req.criticality,
            source: req.source
          }))
        });
      }

      // Create Risks
      if (generatedData.risks && generatedData.risks.length > 0) {
        // We have to resolve the requirementId for the relationships
        const dbReqs = await tx.requirement.findMany({ where: { projectId } });
        const reqMap = new Map(dbReqs.map(r => [r.requirementId, r.id]));

        await tx.risk.createMany({
          data: generatedData.risks.map(risk => ({
            projectId,
            requirementId: risk.requirementId ? reqMap.get(risk.requirementId) : null,
            description: risk.description,
            type: risk.type || 'CURRENT',
            reasons: JSON.stringify(risk.reasons || []),
            severity: risk.severity
          }))
        });
      }
    });

    return NextResponse.json({ success: true, message: 'Specialized Tester Generated Successfully' });
  } catch (error) {
    console.error('API /generate-tester Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
