const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const { PrismaClient } = require('@prisma/client');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Setup WebSocket Server for Sentinel Agent
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname, query } = parse(request.url, true);
    
    if (pathname === '/agent') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, query.projectId);
      });
    }
  });

  const activeAgents = new Map(); // projectId -> ws
  global.activeAgents = activeAgents;

  wss.on('connection', async (ws, request, projectId) => {
    if (!projectId) {
      ws.close(1008, 'Project ID required');
      return;
    }

    console.log(`[WebSocket] Agent connected for project: ${projectId}`);
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
        console.log(`[WebSocket] Agent initialized for ${message.projectId}`);
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
      } else if (message.type === 'test_log') {
        const execution = await prisma.testExecution.findFirst({
          where: { 
            testSpec: { projectId: projectId },
            status: { in: ['PENDING', 'RUNNING'] }
          },
          orderBy: { startedAt: 'desc' }
        });
        if (execution) {
          const newLogs = execution.logs ? execution.logs + message.data : message.data;
          await prisma.testExecution.update({
            where: { id: execution.id },
            data: { logs: newLogs, status: 'RUNNING' }
          });
        }
      } else if (message.type === 'test_complete') {
        const execution = await prisma.testExecution.findFirst({
          where: { testSpec: { projectId: projectId }, status: 'RUNNING' },
          orderBy: { startedAt: 'desc' }
        });
        if (execution) {
          await prisma.testExecution.update({
            where: { id: execution.id },
            data: { status: 'COMPLETED' }
          });
        }
      } else if (message.type === 'test_error') {
        const execution = await prisma.testExecution.findFirst({
          where: { testSpec: { projectId: projectId }, status: 'RUNNING' },
          orderBy: { startedAt: 'desc' }
        });
        if (execution) {
          const newLogs = execution.logs ? execution.logs + '\nERROR: ' + message.error : 'ERROR: ' + message.error;
          await prisma.testExecution.update({
            where: { id: execution.id },
            data: { logs: newLogs, status: 'FAILED' }
          });
        }
      }
    });

    ws.on('close', async () => {
      console.log(`[WebSocket] Agent disconnected for project: ${projectId}`);
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

  // Poll the database for PENDING permission requests (The Execution Queue)
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
          } catch(e) { }

          ws.send(JSON.stringify({
            type: 'capability_request',
            requestId: req.id,
            capability: req.capability,
            reason: parsedReason,
            args
          }));

          await prisma.permissionRequest.update({
            where: { id: req.id },
            data: { status: 'REQUESTED' }
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, 2000);

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket ready on ws://${hostname}:${port}/agent`);
  });
});
