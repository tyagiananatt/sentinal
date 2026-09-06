import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { projectId, capability, reason } = await request.json();

    if (!projectId || !capability) {
      return NextResponse.json({ error: 'Project ID and capability are required' }, { status: 400 });
    }

    // Get active session
    const session = await prisma.agentSession.findFirst({
      where: { projectId, status: 'CONNECTED' },
      orderBy: { startedAt: 'desc' }
    });

    if (!session) {
      return NextResponse.json({ error: 'No active session found' }, { status: 400 });
    }

    // Record permission request in DB
    const reqRecord = await prisma.permissionRequest.create({
      data: {
        sessionId: session.id,
        capability,
        reason: reason || 'Required for current investigation',
        status: 'PENDING'
      }
    });

    return NextResponse.json({ success: true, requestId: reqRecord.id });
  } catch (error) {
    console.error('Request Capability API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
