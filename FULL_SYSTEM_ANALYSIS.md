# Sentinel / InsiderX: Complete System Analysis

## 1. Executive Summary
Sentinel (internally InsiderX) is an advanced, AI-driven Threat Modeling and Remote Code Forensics Platform. It utilizes a dual-LLM intelligence core (Google Gemini and Groq) paired with a distributed Client-Broker architecture. It allows engineers to securely connect to target machines, map architecture, generate test scripts via AI, execute them safely in a sandbox, and analyze terminal output automatically.

## 2. What Problem Does This Project Solve?
Traditional penetration testing and code auditing are heavily manual. Gathering context, writing scripts, and analyzing terminal output takes hours. Sentinel automates the entire lifecycle. It acts as an autonomous remote hacker, doing everything from context gathering to execution and evaluation in seconds.

## 3. Complete Technology Stack
- **Frontend**: Next.js 16 (App Router) with React 19.
- **Styling**: Vanilla CSS (`globals.css`) with Black/Orange premium dark mode.
- **Backend**: Next.js API Routes (Serverless) + Node.js HTTP/WebSocket Server.
- **Database**: SQLite (`dev.db`).
- **ORM**: Prisma (`@prisma/client` 6.19.3).
- **AI Core 1 (Heavy)**: Google GenAI API (`gemini-3.6-flash`).
- **AI Core 2 (Fast)**: Groq API (`openai/gpt-oss-20b`).
- **Real-Time Comm**: `ws` (WebSockets).

## 4. Complete Architecture
- **Distributed Client-Broker system**.
- **Frontend Architecture**: React components in `src/app/project/[id]` manage UI state and trigger backend API routes.
- **API Architecture**: Next.js API routes (`src/app/api/...`) handle AI orchestration and database persistence.
- **Communication Architecture**: API routes make an internal HTTP POST to `ws-server.js` (The Broker), which forwards commands over a TCP WebSocket to the remote Agent.
- **Agent Architecture**: A Node.js script (`agent/lib/client.js`) enforces strict sandboxing, runs `spawn()`, and streams `stdout`/`stderr` back to the Broker.
- **AI Architecture**: Gemini is used for complex generative tasks. Groq is used for fast analytical tasks.

## 5. Complete Folder Structure
```text
project/
├── agent/                         # The Remote Target CLI
│   ├── bin/sentinel-agent.js      # CLI entrypoint
│   └── lib/client.js              # CORE: WebSocket client & sandbox
├── web/                           # Next.js Command Center
│   ├── prisma/schema.prisma       # DB models (Project, TestExecution, etc.)
│   ├── lib/                       
│   │   ├── groq/client.js         # Custom Groq wrapper
│   │   └── gemini/...             # Prompt engineering templates
│   ├── src/app/api/               # Backend API Routes
│   │   ├── execute-agent-test/    # CORE: AI Test Planning & Eval
│   │   ├── analyze-ai-usage/      # AI Forensics
│   │   └── predict-future-risks/  # Risk forecasting
│   ├── src/app/project/[id]/      # Frontend UI Components
│   │   ├── AgentConnection.js     # Terminal UI
│   │   └── TestExecution.js       # Testing and Reporting UI
│   ├── globals.css                # Global styling
│   └── ws-server.js               # CORE: WebSocket Broker
```

## 6. Application Execution Flow
1. **User Action**: Clicks "Run Test".
2. **API Trigger**: POST to `/api/execute-agent-test`.
3. **AI Planning**: Prompt + DB Context Dump sent to Google Gemini. Gemini generates Bash/Node script.
4. **Broker Relay**: Script HTTP POSTed to `localhost:3001/execute`.
5. **Tunneling**: `ws-server.js` forwards script to Agent over WebSocket.
6. **Sandboxing**: `agent/lib/client.js` writes to `.sentinel_sandbox/script.js` (preventing traversal).
7. **Execution**: Agent spawns child process.
8. **Streaming**: Terminal output streams back over WebSocket to Broker.
9. **Persistence**: Broker saves logs to Prisma `TestExecution` table.
10. **Evaluation**: `/api/execute-agent-test` fetches logs, sends to Groq for evaluation.
11. **UI Update**: Frontend renders Groq HTML report.

## 7. Feature-by-Feature Analysis
- **Deep Connection**: Target runs bootstrap → Agent connects → Scans files → Sends Context Dump to DB.
- **Automated Threat Modeling**: `/api/analyze` reads Dump → Gemini generates Architecture Profile.
- **AI Test Execution**: End-to-end sandbox execution described in Section 6.
- **AI Code Forensics**: `/api/analyze-ai-usage` reads file tree → Gemini calculates AI-probability.
- **Future Risk Profiler**: `/api/predict-future-risks` sends Profile to Groq → returns HTML risk table.

## 8. Frontend Deep Dive
- Uses React 19 hooks (`useState`, `useEffect`).
- Component-based architecture. Heavy use of `dangerouslySetInnerHTML` to render the raw HTML tables returned by the Groq/Gemini APIs.
- State is mostly local to the component (no Redux).

## 9. Backend Deep Dive
- Dual server setup: Next.js handles HTTP routing, while a raw Node.js script (`ws-server.js`) handles long-lived WebSocket connections. 

## 10. Database Deep Dive
- **DB**: SQLite.
- **Tables**:
  - `Project`: Core entity.
  - `ProjectProfile`: JSON structure of the architecture.
  - `AgentSession`: JSON structure of the directory tree.
  - `TestExecution`: Stores `status`, `logs`, and `report`.

## 11. API Deep Dive
- `/api/execute-agent-test`: POST. Body `{ projectId, instruction }`. Returns `{ success, report }`.
- `/api/analyze-ai-usage`: POST. Body `{ projectId }`. Returns `{ percentage, evidence }`.
- `/api/predict-future-risks`: POST. Body `{ projectId, timeframe }`. Returns HTML table string.

## 12. Authentication & Authorization
- **NOT FOUND IN CODEBASE**. Currently, the system lacks user authentication (no NextAuth/JWT). Anyone with access to the dashboard can trigger code execution.

## 13. AI/ML Deep Dive
- **Gemini (gemini-3.6-flash)**: Used for heavy logical reasoning (generating safe bash scripts, identifying AI boilerplate patterns).
- **Groq (openai/gpt-oss-20b)**: Used strictly for fast text processing (evaluating if logs indicate a pass/fail).

## 14. External Services
- **Google GenAI API**: Heavily relied upon. If it fails, tests cannot be planned.
- **Groq API**: Heavily relied upon. If it fails, tests cannot be evaluated.

## 15. File-by-File Analysis
- `ws-server.js`: Maintains `activeAgents = new Map()`. Routes payloads.
- `agent/lib/client.js`: Security boundary. Enforces `.sentinel_sandbox`.
- `execute-agent-test/route.js`: The central orchestrator linking DB -> Gemini -> Broker -> DB -> Groq.

## 16. Function-by-Function Analysis
- `runTest()` (Frontend): Calls fetch, manages loading state, renders error or result.
- `callGroq()` (Backend): Custom fetch wrapper to `api.groq.com`, strips markdown backticks.

## 17. File Dependency Graph
`TestExecution.js` → `/api/execute-agent-test` → `TestExecution DB` → `Gemini API` → `ws-server.js` → `agent/lib/client.js` → `ws-server.js` → `TestExecution DB` → `Groq API` → `TestExecution.js`.

## 18. Data Flow
Raw directory paths (Context Dump) → Database → Gemini → Bash Script → WebSocket → Sandbox → Terminal Logs → WebSocket → Database → Groq → HTML Report → UI.

## 19. Error Handling
- The frontend wraps API calls in `try/catch` and displays red badges on failure.
- The agent catches `child_process` errors and streams them back as stderr to prevent silent failures.

## 20. Security Audit
- **Strengths**: Strict `.sentinel_sandbox` enforcement. `path.basename()` prevents directory traversal attacks by the AI.
- **Weaknesses (High Severity)**: Lack of Authentication. Anyone who accesses the web port can execute arbitrary code on connected agents.

## 21. Performance Analysis
- Extremely high performance due to offloading heavy evaluation tasks to Groq's 20b model rather than relying entirely on Gemini.

## 22. Testing Analysis
- **NOT FOUND IN CODEBASE**. The project lacks internal Unit/Integration tests (Jest/Cypress).

## 23. DevOps & Deployment
- The Next.js app can deploy to Vercel, but `ws-server.js` MUST be deployed to a stateful server (like Render, AWS EC2, or Heroku) because Vercel Serverless functions cannot keep WebSocket connections open.

## 24. Dependencies
- `ws`: Essential for real-time remote execution.
- `@prisma/client`: Essential for database querying.
- `@google/genai`: Essential for the core AI logic.

## 25. Environment Variables
- `DATABASE_URL`: Local SQLite path.
- `GEMINI_API_KEY`: [SECRET REDACTED].
- `GROQ_API_KEY`: [SECRET REDACTED].

## 26. Unused/Dead Code
- **INFERRED FROM CODE**: `RootCauseAnalysis.js` seems partially implemented and relies on old TestSpec IDs rather than dynamic project links.

## 27. Code Quality
- Excellent separation of concerns between AI prompts (`lib/gemini`), API routes, and Frontend UI.
- Strong UI component modularity.

## 28. Strengths
- Groundbreaking architecture combining GenAI with remote WebSockets.
- Beautiful, premium UI design.

## 29. Weaknesses
- Lack of Auth.
- SQLite is not suitable for scale.

## 30. Technical Debt
- Using raw HTML strings and `dangerouslySetInnerHTML`.

## 31. Scalability Analysis
- **100 users**: Fine on current SQLite architecture.
- **10,000+ users**: Will fail. SQLite locks on concurrent writes. The `ws-server.js` `Map()` will run out of memory. Requires migration to PostgreSQL and Redis (for WebSocket pub/sub).

## 32. Recommended Improvements
- Add NextAuth for login.
- Migrate SQLite to Postgres.
- Add Redis to handle multi-server WebSocket clustering.

## 33. Interview Explanation
- **30-second**: "I built Sentinel, an AI-powered code forensics platform. It uses Next.js and a custom WebSocket broker to remotely connect to target machines, auto-generate penetration tests via Google Gemini, execute them in a secure sandbox, and evaluate the terminal output using Groq."

## 34. Interview Questions & Answers
- *Q: How did you prevent the AI from deleting the user's computer?*
  - A: I built a strict sandbox in the Node.js agent. I use `path.basename()` to strip out directory traversal attempts (`../`) and force all AI-generated scripts to be written solely inside a `.sentinel_sandbox` folder.

## 35. Complete Simple Hinglish Explanation
Project basically ek remote AI hacker hai. 
- **Frontend** ek premium dashboard hai jahan user commands type karta hai.
- **Backend (Next.js)** commands ko receive karke Gemini AI ko bhejta hai. Gemini us instruction ke basis pe ek bash script (code) likhta hai.
- **Broker (WebSocket)** us code ko target user ke computer pe bhejta hai jahan ek Agent run ho raha hai.
- **Agent** us code ko ek safe folder (`.sentinel_sandbox`) me save karke run karta hai taaki computer hack na ho. Run hone ke baad jo output aata hai, agent wapis bhej deta hai.
- Backend us output ko Groq AI ko bhejta hai check karne ke liye ki test fail hua ya pass, aur result Frontend pe dikha deta hai.

## 36. Final Project Mental Model
Think of it as a remote-controlled drone. The Dashboard is the controller. The WebSocket is the radio signal. The Node.js Agent is the drone on the ground. Gemini writes the flight plan, and Groq analyzes the camera footage.
