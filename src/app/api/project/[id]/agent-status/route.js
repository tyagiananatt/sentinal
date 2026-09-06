import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Get the latest session and its permission requests
    const session = await prisma.agentSession.findFirst({
      where: { projectId: id },
      orderBy: { startedAt: 'desc' },
      include: {
        permissions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        telemetry: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    const isConnected = session?.status === 'CONNECTED';

    return NextResponse.json({
      isConnected,
      session: session || null
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
