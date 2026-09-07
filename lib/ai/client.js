import { GoogleGenAI } from '@google/genai';

async function _callGemini(apiKey, systemPrompt, userPrompt, jsonMode) {
  const ai = new GoogleGenAI({ apiKey });
  const MODEL_NAME = 'gemini-3.6-flash';
  
  const combinedPrompt = systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt;
  
  const config = {
    temperature: 0.2,
  };
  
  if (jsonMode) {
    config.responseMimeType = "application/json";
  }

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: combinedPrompt,
    config
  });
  
  let text = response.text || '';
  if (jsonMode) {
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  }
  return text;
}

async function _callGroq(apiKey, systemPrompt, userPrompt, jsonMode) {
  const body = {
    model: 'openai/gpt-oss-20b',
    messages: [
      { role: 'system', content: systemPrompt || "You are a helpful assistant." },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq API Error: ${res.status} ${text}`);
  }

  const data = await res.json();
  let text = data.choices[0].message.content;
  if (jsonMode) {
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  }
  return text;
}

export async function generateAIContent(systemPrompt, userPrompt, jsonMode = false, primaryProvider = 'gemini') {
  const geminiProviders = [];
  if (process.env.GEMINI_API_KEY) geminiProviders.push({ name: 'Gemini (Primary)', fn: _callGemini, key: process.env.GEMINI_API_KEY });
  if (process.env.GEMINI_API_KEY_2) geminiProviders.push({ name: 'Gemini (Secondary)', fn: _callGemini, key: process.env.GEMINI_API_KEY_2 });

  const groqProviders = [];
  if (process.env.GROQ_API_KEY) groqProviders.push({ name: 'Groq (Primary)', fn: _callGroq, key: process.env.GROQ_API_KEY });
  if (process.env.GROQ_API_KEY_2) groqProviders.push({ name: 'Groq (Secondary)', fn: _callGroq, key: process.env.GROQ_API_KEY_2 });

  const providers = primaryProvider === 'gemini' 
    ? [...geminiProviders, ...groqProviders]
    : [...groqProviders, ...geminiProviders];

  if (providers.length === 0) {
    throw new Error("No API keys found for any AI provider.");
  }

  let lastError;

  for (const provider of providers) {
    try {
      console.log(`[AI Client] Attempting generation via ${provider.name}...`);
      const resultText = await provider.fn(provider.key, systemPrompt, userPrompt, jsonMode);
      
      if (jsonMode) {
        try {
          const parsed = JSON.parse(resultText);
          console.log(`[AI Client] Successfully generated JSON via ${provider.name}`);
          return parsed;
        } catch (jsonError) {
          console.error(`[AI Client] ${provider.name} generated invalid JSON. Parsing failed.`);
          throw new Error(`${provider.name} generated invalid JSON: ${jsonError.message}`);
        }
      }
      
      console.log(`[AI Client] Successfully generated text via ${provider.name}`);
      return resultText;
    } catch (error) {
      console.warn(`[AI Client] ${provider.name} failed:`, error.message);
      lastError = error;
    }
  }

  throw new Error(`All AI providers failed. Last error: ${lastError.message}`);
}

