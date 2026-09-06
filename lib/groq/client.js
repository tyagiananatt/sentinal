export async function callGroq(systemPrompt, userPrompt, jsonMode = false) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not defined");

  const body = {
    model: 'openai/gpt-oss-20b',
    messages: [
      { role: 'system', content: systemPrompt },
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
  return data.choices[0].message.content;
}
