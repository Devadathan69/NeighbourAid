/**
 * Groq AI Service
 * Provides ultra-low latency inference using Groq's LPU architecture.
 * Used as a high-performance fallback or primary engine for NeighborAid.
 */

const apiKey = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Tiered Groq models (2026 production stack)
const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];

function isGroqConfigured() {
  return Boolean(apiKey && apiKey !== 'your_groq_api_key');
}

export async function callGroq(prompt, systemPrompt = 'You are a helpful emergency assistant.', preferredModel = MODELS[0]) {
  if (!isGroqConfigured()) throw new Error('Groq API Key not configured');

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: preferredModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Groq API Error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    text: data.choices[0].message.content,
    model: data.model
  };
}

export async function translateWithGroq(text, targetLanguage) {
  if (!isGroqConfigured()) return null;

  const prompt = `Translate the following mission brief into ${targetLanguage}. 
Keep emojis and formatting. Return ONLY the translated text in a JSON object: {"translated": "..."}`;

  try {
    const result = await callGroq(text, prompt, 'llama-3.1-8b-instant');
    const data = JSON.parse(result.text);
    return data.translated;
  } catch (error) {
    console.error('Groq Translation failed:', error);
    return null;
  }
}
