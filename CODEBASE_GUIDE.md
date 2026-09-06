# Sentinel / InsiderX: Exhaustive Codebase Documentation

This document provides a line-by-line, exhaustive technical breakdown of every single file and folder in the Sentinel platform. It is designed for senior engineers who need to understand the absolute lowest-level logic of the remote execution broker and the AI integration pipelines.

---

## 1. The `agent/` Workspace
This workspace represents the client-side CLI tool. It is designed to be lightweight, fast, and sandboxed. It runs on the *target* machine.

### `agent/package.json`
- **Purpose**: Defines the Node.js package.
- **Details**: Contains minimal dependencies. The only major dependency is `ws` (WebSocket client) which allows it to connect back to the web server. It uses `bin` to expose the `sentinel-agent` CLI command if installed globally.

### `agent/bin/sentinel-agent.js`
- **Purpose**: The executable entry point for the CLI.
- **Details**: It typically just imports the core logic from `lib/client.js` and executes it, parsing any command-line arguments (like the Project ID or the WebSocket Server URL) passed by the user.

### `agent/lib/client.js`
- **Purpose**: The core engine of the remote agent. This is the most security-sensitive file in the project.
- **Detailed Logic**:
    1. **Initialization**: It initializes a WebSocket client (`new WebSocket(wsUrl)`).
    2. **Context Gathering**: Upon connection (`ws.on('open')`), it uses `fs` and `child_process` to map out the target's directory tree (ignoring `node_modules` and `.git`). It also reads the local `package.json` to understand the tech stack.
    3. **Registration**: It sends a JSON payload `{ type: 'register', projectId: '...', contextDump: '...' }` to the server.
    4. **Command Listener**: It listens for messages. If it receives `{ type: 'execute_test', script: '...', scriptName: '...' }`, it triggers the Sandbox Engine.
    5. **Sandbox Engine**: 
       - It explicitly forces a directory named `.sentinel_sandbox`.
       - It uses `path.basename(scriptName)` to completely strip out any malicious directory traversal attacks (e.g. `../../etc/passwd`).
       - It writes the AI-generated script into this sandbox folder using `fs.writeFileSync`.
    6. **Execution Engine**: It uses `child_process.spawn()` to run the script. It attaches listeners to `stdout` and `stderr`. Every time a chunk of data is emitted from the terminal, it is immediately stringified and sent over the WebSocket back to the server using `{ type: 'test_log', data: chunk }`.

---

## 2. The `web/` Workspace (Next.js Command Center)

### A. Root Configuration Files
- **`web/package.json`**: The Next.js package file. Contains dependencies: `@google/genai` (for Gemini API), `@prisma/client` (for database), `ws` (for the broker), and standard React/Next libraries.
- **`web/.env`**: Stores `DATABASE_URL` (SQLite), `GEMINI_API_KEY`, and `GROQ_API_KEY`.
- **`web/ws-server.js`**: **[CRITICAL]** The standalone WebSocket Broker.
  - **Logic**: It binds to port `3001`. It maintains a global `Map` of active connections (`activeAgents = new Map()`), keyed by `projectId`.
  - When an agent connects, it stores the `ws` object in the map.
  - It exposes an internal HTTP POST endpoint. When the Next.js API wants to run a test, it sends an HTTP request to this broker. The broker looks up the target's `ws` connection in the map, and forwards the payload. It also receives the raw terminal logs from the agent and uses Prisma to save them directly into the `TestExecution` database table.

### B. Database ORM (`web/prisma/`)
- **`web/prisma/schema.prisma`**: The SQLite database schema.
  - `Project`: Stores `id`, `githubUrl`, `status`.
  - `ProjectProfile`: Stores the AI-generated architecture JSON.
  - `AgentSession`: Stores the massive `contextDump` from the agent.
  - `TestSpecification`: Stores tests planned by Gemini.
  - `TestExecution`: Stores the raw terminal logs, AI evaluation results, and timestamps.
  - `Finding`: Stores vulnerabilities discovered during tests.

### C. Shared AI Utilities (`web/lib/`)
- **`web/lib/groq/client.js`**: A custom `fetch` wrapper around the `https://api.groq.com/openai/v1/chat/completions` endpoint. It hardcodes the `openai/gpt-oss-20b` model to ensure we use the fastest available hardware. It strips out markdown blocks to return clean JSON when requested.
- **`web/lib/gemini/rootCauseAnalysis.js`**: Contains massive string templates for Gemini. It defines exactly how Gemini should format its final security reports.
- **`web/lib/gemini/testExecution.js`, `testerGeneration.js`, `projectUnderstanding.js`**: These files contain the highly engineered prompts that tell Gemini how to act as a hacker, how to parse context dumps, and how to write shell scripts.

### D. Next.js API Routes (`web/src/app/api/`)
These are the serverless backend functions.

- **`api/execute-agent-test/route.js`**: The dual-LLM execution controller.
  1. Pulls the latest `AgentSession` context dump from Prisma.
  2. Calls Gemini to generate a bash/node script based on the user's instruction.
  3. Sends an HTTP POST to the local WebSocket broker (`http://localhost:3001/execute`) containing the script.
  4. Polls the database waiting for the terminal logs to finish streaming.
  5. Once execution finishes, it feeds the terminal logs to the **Groq API** to evaluate success/failure, instructing Groq to output the result in pure HTML formatting.
- **`api/analyze-ai-usage/route.js`**: Reads the directory structure and uses Gemini to calculate a percentage probability of AI code generation based on file patterns and boilerplate structures.
- **`api/predict-future-risks/route.js`**: Feeds the System Architecture Profile into the Groq API, forcing it to output a pure HTML table predicting tech debt and rot over 6m/12m/5y.
- **`api/simplify-report/route.js`**: Takes dense technical HTML reports and uses Gemini to rewrite them into `<ul>` and `<p>` plain English for non-technical stakeholders.
- **`api/suggest-deep-tests/route.js`**: Uses Groq to read the architecture profile and return 3 high-value test categories (e.g. "Database Latency", "Auth Bypass").
- **`api/analyze-findings/route.js`**: Aggregates all `TestExecution` failures and uses Gemini to generate a final root cause HTML report.
- **`api/project/[id]/agent-status/route.js`**: A standard polling endpoint the frontend uses to check if the remote agent has connected yet.

### E. Frontend UI Components (`web/src/app/project/[id]/`)
The React components making up the dashboard.

- **`page.js`**: The root layout. It fetches the project from Prisma and renders all the child modules below in a CSS Grid layout.
- **`AgentConnection.js`**: Displays the "Awaiting Agent Connection" terminal UI. It gives the user the exact bootstrap shell command to run on their machine. It polls `agent-status` every 2 seconds.
- **`AiUsageDetector.js`**: UI module with a "Scan for AI" button. It calls `/api/analyze-ai-usage` and displays the percentage in a large font, with a toggleable "Evidence" dropdown.
- **`FutureRiskProfiler.js`**: Contains a standard `<select>` dropdown (6m, 12m, 5y). Calls `/api/predict-future-risks`. Uses `dangerouslySetInnerHTML` to securely render the Groq HTML table into the dashboard.
- **`TestExecution.js`**: The most complex UI component. 
  - Contains a text input for custom instructions.
  - Contains a "Refresh Ideas" button that calls the `/suggest-deep-tests` endpoint.
  - Has a toggle button "Explain in Simple Terms" that dynamically swaps between the raw technical HTML report and the Gemini-simplified HTML report.
- **`RootCauseAnalysis.js`**: A simple container that features a "Generate Report" button and safely renders the final HTML string.

### F. Styling (`web/src/app/globals.css`)
- Defines the `var(--primary)` orange color and dark mode `#0a0a0a` backgrounds.
- Contains the critical `.html-report-body` CSS classes. Since Groq and Gemini return raw HTML tables, this file explicitly defines `border-collapse`, `padding`, and `border: 1px solid` rules for `<table>`, `<th>`, and `<td>` elements to ensure they look beautiful on the dashboard.

---
*End of exhaustive technical documentation.*
