const { WebSocketServer } = require('ws');
const { PrismaClient } = require('@prisma/client');
const { parse } = require('url');

const prisma = new PrismaClient();
const port = 3001;
const wss = new WebSocketServer({ port });

console.log(`WebSocket server running on ws://localhost:${port}`);

const activeAgents = new Map(); // projectId -> ws

wss.on('connection', async (ws, request) => {
  const { query } = parse(request.url, true);
  const projectId = query.projectId;

  if (!projectId) {
    ws.close(1008, 'Project ID required');
    return;
  }

  console.log(`Agent connected for project: ${projectId}`);
  activeAgents.set(projectId, ws);

  // Create session in DB
  const session = await prisma.agentSession.create({
    data: {
      projectId,
      status: 'CONNECTED',
    }
  });

  ws.on('message', async (data) => {
    const message = JSON.parse(data.toString());
    
    if (message.type === 'agent_connected') {
      console.log(`Agent initialized for ${message.projectId}`);
      if (message.contextDump) {
        await prisma.agentSession.update({
          where: { id: session.id },
          data: { contextDump: JSON.stringify(message.contextDump) }
        });
      }
    } else if (message.type === 'capability_response') {
      console.log(`Capability response received:`, message);
      await prisma.permissionRequest.update({
        where: { id: message.requestId },
        data: {
          status: message.status,
          result: message.result ? JSON.stringify(message.result) : null,
        }
      });
    } else if (message.type === 'telemetry') {
      await prisma.telemetryEvent.create({
        data: {
          sessionId: session.id,
          type: message.event_type,
          content: JSON.stringify(message.data)
        }
      });
    }
  });

  ws.on('close', async () => {
    console.log(`Agent disconnected for project: ${projectId}`);
    activeAgents.delete(projectId);
    await prisma.agentSession.update({
      where: { id: session.id },
      data: {
        status: 'DISCONNECTED',
        endedAt: new Date()
      }
    });
  });
});

// Poll the database for PENDING permission requests for active agents
setInterval(async () => {
  for (const [projectId, ws] of activeAgents.entries()) {
    try {
      const session = await prisma.agentSession.findFirst({
        where: { projectId, status: 'CONNECTED' },
        orderBy: { startedAt: 'desc' }
      });
      if (!session) continue;

      const pendingRequests = await prisma.permissionRequest.findMany({
        where: { sessionId: session.id, status: 'PENDING' }
      });

      for (const req of pendingRequests) {
        let parsedReason = req.reason;
        let args = null;
        try {
          const obj = JSON.parse(req.reason);
          if (obj && obj.reason) {
            parsedReason = obj.reason;
            args = obj.args;
          }
        } catch(e) {
          // not json, normal string
        }

        // Send to agent and mark as SENT (we'll use 'REQUESTED' state so we don't send twice)
        ws.send(JSON.stringify({
          type: 'capability_request',
          requestId: req.id,
          capability: req.capability,
          reason: parsedReason,
          args
        }));

        await prisma.permissionRequest.update({
          where: { id: req.id },
          data: { status: 'REQUESTED' } // Custom state to avoid resending
        });
      }
    } catch (e) {
      console.error(e);
    }
  }
}, 2000);
