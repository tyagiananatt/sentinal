import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-3.6-flash';

export async function generateTestSpecifications(tester, requirements) {
  const prompt = `
You are the Sentinel Execution Core. Based on the provided Specialized Tester strategy and the Project Requirements, generate a suite of 3 to 5 concrete Test Specifications.

These specifications must be actionable HTTP-based tests that can be executed against a live application URL to check for weaknesses, edge cases, and standard functionality.

TESTER STRATEGY:
${JSON.stringify(tester, null, 2)}

REQUIREMENTS:
${JSON.stringify(requirements, null, 2)}

Output MUST be ONLY valid JSON matching this schema exactly, with NO markdown formatting:

[
  {
    "requirementId": "REQ-001",
    "objective": "A specific, measurable testing objective",
    "category": "e.g., BOUNDARY, SECURITY, LOGIC, PERFORMANCE",
    "parameters": {
      "path": "The relative URL path to test, e.g., /api/login or /search",
      "method": "GET or POST",
      "body": "Optional stringified JSON payload for POST requests"
    },
    "inputScenario": "Describe the specific input being sent (e.g., 'SQL Injection payload in username')",
    "expected": "What the system SHOULD do",
    "successCriteria": "How to know if the test passed",
    "adapter": "HTTP"
  }
]
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.4,
        responseMimeType: "application/json",
      }
    });

    const rawText = response.text || '';
    const text = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (error) {
    console.error('Test Generation Error:', error);
    throw new Error('Failed to generate test specifications via Gemini');
  }
}

// Simple HTTP Execution Engine Adapter
export async function executeTestSpec(baseUrl, spec) {
  const url = baseUrl.replace(/\/$/, '') + (spec.parameters.path.startsWith('/') ? spec.parameters.path : '/' + spec.parameters.path);
  
  const startTime = Date.now();
  let status = 'ERROR';
  let actualOutput = '';
  
  try {
    const options = {
      method: spec.parameters.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Sentinel-Test-Agent/1.0'
      },
      // Timeout after 5 seconds
      signal: AbortSignal.timeout(5000)
    };
    
    if (options.method === 'POST' && spec.parameters.body) {
      options.body = typeof spec.parameters.body === 'string' ? spec.parameters.body : JSON.stringify(spec.parameters.body);
    }

    const res = await fetch(url, options);
    actualOutput = `Status: ${res.status} ${res.statusText}\n`;
    const text = await res.text();
    actualOutput += `Body: ${text.substring(0, 500)}`; // limit output length
    
    // Naive evaluation: If 400 or above, mark as FAILED for MVP purposes
    // so we can test the root cause analysis in Module 5.
    if (res.status >= 400) {
      status = 'FAILED';
    } else {
      status = 'PASSED';
    }
  } catch (err) {
    actualOutput = `Execution Error: ${err.message}`;
    status = 'FAILED';
  }

  const duration = Date.now() - startTime;
  
  return {
    status,
    actualOutput,
    logs: `Test completed in ${duration}ms via HTTP Adapter.`
  };
}
