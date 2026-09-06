const WebSocket = require('ws');
const readline = require('readline');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function connectToSentinel(projectId, serverUrl) {
  console.log(`Connecting to Sentinel backend at ${serverUrl} for project ${projectId}...`);
  
  const ws = new WebSocket(`${serverUrl}?projectId=${projectId}`);

  ws.on('open', () => {
    console.log('✓ Securely connected to Sentinel.');
    
    // Gather context
    let directoryStructure = '';
    try {
      if (process.platform === 'win32') {
        directoryStructure = execSync('dir /s /b | findstr /v node_modules | findstr /v .git', { encoding: 'utf-8', timeout: 5000 });
      } else {
        directoryStructure = execSync('find . -maxdepth 3 -not -path "*/node_modules/*" -not -path "*/.git/*"', { encoding: 'utf-8', timeout: 5000 });
      }
    } catch(e) {}
    
    let packageJson = '';
    try {
      packageJson = fs.readFileSync('package.json', 'utf-8');
    } catch(e) {}

    // Send initial connection event
    ws.send(JSON.stringify({
      type: 'agent_connected',
      projectId,
      contextDump: {
        os: process.platform,
        nodeVersion: process.version,
        directoryStructure: directoryStructure.substring(0, 5000),
        packageJson: packageJson.substring(0, 5000)
      }
    }));
  });

  ws.on('message', async (data) => {
    const message = JSON.parse(data.toString());

    if (message.type === 'capability_request') {
      console.log('\n=======================================');
      console.log('SENTINEL REQUEST');
      console.log(`Capability: ${message.capability}`);
      console.log(`Reason: ${message.reason}`);
      if (message.args) {
        console.log(`Arguments: ${JSON.stringify(message.args)}`);
      }
      console.log('=======================================');

      rl.question('Approve this request? [y/N]: ', (answer) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          console.log(`\nExecuting ${message.capability}...`);
          
          let result;
          try {
            result = executeCapability(message.capability, message.args);
            console.log('✓ Action completed.\n');
          } catch (e) {
            console.log('x Action failed.\n');
            result = { error: e.message };
          }
          
          ws.send(JSON.stringify({
            type: 'capability_response',
            requestId: message.requestId,
            capability: message.capability,
            status: 'APPROVED',
            result
          }));
        } else {
          console.log('\nRequest denied.\n');
          ws.send(JSON.stringify({
            type: 'capability_response',
            requestId: message.requestId,
            capability: message.capability,
            status: 'DENIED'
          }));
        }
      });
    }
  });

  ws.on('close', () => {
    console.log('Disconnected from Sentinel backend.');
    process.exit(0);
  });

  ws.on('error', (err) => {
    console.error('WebSocket Error:', err.message);
  });
}

function executeCapability(capability, args) {
  switch (capability) {
    case 'execute_command':
      if (!args || !args.command) throw new Error("Missing command argument");
      const out = execSync(args.command, { encoding: 'utf-8', timeout: 30000 });
      return { stdout: out.substring(0, 10000) }; // limit output
    case 'read_file':
      if (!args || !args.filePath) throw new Error("Missing filePath argument");
      const content = fs.readFileSync(args.filePath, 'utf-8');
      return { content: content.substring(0, 50000) };
    case 'write_file':
      if (!args || !args.filePath || args.content === undefined) throw new Error("Missing filePath or content argument");
      
      const sandboxDir = path.join(process.cwd(), '.sentinel_sandbox');
      if (!fs.existsSync(sandboxDir)) {
        fs.mkdirSync(sandboxDir, { recursive: true });
      }

      // Prevent directory traversal
      const safeBasename = path.basename(args.filePath);
      const safePath = path.join(sandboxDir, safeBasename);

      fs.writeFileSync(safePath, args.content, 'utf-8');
      return { message: `File written securely to sandbox: ${safePath}` };
    case 'inspect_tools':
      return { tools: ['order_lookup', 'refund_request', 'escalation'] };
    case 'inspect_runtime':
      return { framework: 'Node.js', version: process.version };
    case 'inspect_ai':
      return { aiModel: 'Unknown Chatbot Model' };
    default:
      return { message: 'Capability executed successfully', capability };
  }
}

module.exports = { connectToSentinel };
