# InsiderX / Sentinel: System Architecture & Logic Documentation

This document outlines the complete system architecture, technology stack, and core execution logic for the advanced AI-Driven Threat Modeling and Remote Code Forensics Platform.

---

## 1. The Technology Stack

The platform is designed as a full-stack, distributed architecture split between a command center (web dashboard) and remote target nodes (agents).

*   **Frontend**: Built with **Next.js 16 (React 19)**. It uses a custom, premium "Black and Orange" styling system (`globals.css`) to provide a high-end enterprise security aesthetic.
*   **Backend & Database**: Uses **Next.js API Routes** for server-side logic and **Prisma ORM** connected to a local SQLite database (`dev.db`). This persistently stores all Projects, Threat Models, findings, and execution logs.
*   **AI Core Engines**: The platform relies on a dual-LLM architecture for optimal speed and reasoning:
    *   **Google Gemini API (`gemini-3.6-flash`)**: Used for heavy reasoning tasks such as generating Threat Models, Planning test execution shell scripts, and detecting AI code patterns.
    *   **Groq API (`openai/gpt-oss-20b`)**: Used for blazing-fast, lightweight tasks such as predicting future architectural risks and evaluating raw terminal outputs into formatted HTML reports.

---

## 2. The Core Architecture (Client-Broker System)

The defining feature of the platform is its ability to securely execute tests on remote machines. This is achieved via a Client-Broker architecture:

1.  **The WebSocket Broker (`web/ws-server.js`)**: Alongside the Next.js HTTP server, a standalone WebSocket server runs on port 3001. This acts as a persistent middleman broker.
2.  **The Remote Agent (`agent/lib/client.js`)**: Target users execute a bootstrap script (`node -e "fetch(...)"`) in their local terminal. This downloads a lightweight Node.js agent and immediately opens a secure WebSocket connection back to the broker.
3.  **The "Context Dump"**: Immediately upon connection, the agent silently scans the target's local machine. It maps the directory structure (ignoring bloated folders like `node_modules` and `.git`), reads the `package.json`, and records the operating system and Node version. This Context Dump is sent over the WebSocket and saved in the Prisma database, giving the AI total visibility into the target's architecture.

---

## 3. Core Workflow & Execution Logic

When a user triggers an automated test or types a custom instruction (e.g., "Check database latency"), the following workflow executes:

### Phase 1: AI Test Planning (`/api/execute-agent-test`)
The Next.js backend feeds the user's instruction and the project's saved Context Dump into the Gemini API. Gemini acts as an autonomous hacker, designing a specific bash or Node.js test script tailored exactly to the target's environment (e.g., using Windows CMD commands if the target OS is Windows).

### Phase 2: Secure Delivery & Sandboxing (`agent/lib/client.js`)
The backend routes the generated script through the WebSocket broker to the target machine. To ensure strict security and prevent destructive actions, the agent enforces a **Secure Sandbox**. All test scripts are forcibly saved and executed inside an isolated folder named `.sentinel_sandbox`. Directory traversal attempts (e.g., `../../`) are blocked using strict `path.basename` constraints.

### Phase 3: Remote Execution & Streaming
The agent executes the sandboxed script on the target computer. It captures all standard output (stdout) and standard error (stderr) in real-time, streaming these logs back over the WebSocket to the web server, which saves them to the database.

### Phase 4: Evaluation & Reporting
The web backend retrieves the raw terminal logs and feeds them to the **Groq API**. Groq evaluates the success or failure of the execution and generates a highly analytical, HTML-formatted report that is immediately displayed on the user's dashboard.

---

## 4. Standalone Intelligence Modules

The platform also includes non-execution-based intelligence features that analyze the project's metadata:

*   **AI Code Forensics (`/api/analyze-ai-usage`)**: Scans the project's directory structure and configuration files via Gemini to detect non-human boilerplate patterns, returning a probabilistic percentage of LLM-generated code alongside specific evidence.
*   **Future Risk Profiler (`/api/predict-future-risks`)**: Acts as an architectural time-machine. It feeds the project profile to Groq to forecast tech-debt buildup, scalability bottlenecks, and security rot over user-selected timeframes (6 Months, 12 Months, 5 Years).
*   **Executive Simplifier (`/api/simplify-report`)**: Translates highly technical execution reports into plain English for non-technical stakeholders using Gemini.

---

*This document serves as the primary architectural reference for the InsiderX / Sentinel codebase.*
