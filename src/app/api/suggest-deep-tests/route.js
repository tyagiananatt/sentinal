import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateAIContent } from '@/../lib/ai/client';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { profile: true }
    });

    if (!project || !project.profile) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

const prompt = `
You are the Sentinel Intelligence Core. Based on the following Project Profile, comprehensively identify ALL the major aspects and parameters on which this specific project should be tested.
For each major category, provide 3-5 specific sub-tests that the Sentinel Autonomous Agent can execute in the target's terminal.

PROJECT PROFILE:
${JSON.stringify(project.profile, null, 2)}

Output MUST be ONLY valid JSON matching this schema exactly, with NO markdown formatting. Return 5-8 distinct categories.
WARNING: Ensure your JSON syntax is strictly correct, paying close attention to array brackets ([]) and object braces ({}).

{
  "categories": [
    {
      "name": "Category Name",
      "description": "Short explanation of why this category is critical",
      "subOptions": [
        "Instruction 1",
        "Instruction 2"
      ]
    }
  ]
}
`;

    const data = await generateAIContent(
      "You are the Sentinel Intelligence Core.",
      prompt,
      true, // JSON Mode
      'groq'
    );

    return NextResponse.json({ categories: data.categories });
  } catch (error) {
    console.error('Suggest Deep Tests Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
