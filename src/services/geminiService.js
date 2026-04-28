import { GoogleGenerativeAI } from '@google/generative-ai';
import { callGroq } from './groqService';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || 'demo-key');

// Tiered model list for Gemini
const GEMINI_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro'];

function isGeminiConfigured() {
  return Boolean(apiKey && apiKey !== 'your_gemini_api_key' && apiKey !== '');
}

/**
 * Unified AI Caller with Hybrid Fallback (Gemini -> Groq -> Mock)
 */
async function callAI(prompt, systemPrompt = 'You are an emergency coordinator AI for NeighborAid.') {
  // 1. Try Gemini first (if configured)
  if (isGeminiConfigured()) {
    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(`${systemPrompt}\n\n${prompt}`);
        return { text: result.response.text(), provider: 'gemini', model: modelName };
      } catch (error) {
        const errorMsg = error.message?.toLowerCase() || '';
        if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('limit')) {
          console.warn(`Gemini Quota hit for ${modelName}. Falling back...`);
          continue;
        }
        console.error(`Gemini Error (${modelName}):`, error.message);
      }
    }
  }

  // 2. Try Groq as secondary high-performance fallback
  try {
    console.info('Attempting Groq fallback...');
    const result = await callGroq(prompt, systemPrompt);
    return { ...result, provider: 'groq' };
  } catch (error) {
    console.warn('Groq Fallback failed:', error.message);
  }

  throw new Error('All AI providers exhausted');
}

export async function getVolunteerMatches(crisisType, location, volunteers) {
  const systemPrompt = `You are an emergency response coordinator AI for NeighborAid in Kerala, India. 
Respond ONLY with valid JSON.`;
  
  const prompt = `EMERGENCY: ${crisisType} at ${location}
AVAILABLE VOLUNTEERS:
${volunteers.map((v, i) => `${i + 1}. ID:${v.id} | Skills:${v.skills.join(', ')} | Assets:${v.assets.join(', ')} | Distance:${Math.round(v.distance)}m`).join('\n')}

Select optimal 3-6 volunteers and assign specific tasks.
JSON Schema:
{
  "selected": [{"id": "...", "anonymizedName": "...", "primarySkill": "...", "assignedTask": "...", "priority": 1}],
  "coordinatorBrief": "...",
  "totalResponseCapacity": "..."
}`;

  try {
    const { text } = await callAI(prompt, systemPrompt);
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    return getMockMatches(crisisType, volunteers);
  }
}

function getMockMatches(crisisType, volunteers) {
  const sorted = [...volunteers].sort((a, b) => (a.roadDuration || a.distance) - (b.roadDuration || b.distance));
  const top3 = sorted.slice(0, Math.min(4, sorted.length));
  return {
    selected: top3.map((volunteer, index) => ({
      id: volunteer.id,
      anonymizedName: `Volunteer_${index + 1}`,
      primarySkill: volunteer.skills[0],
      distanceMeters: Math.round(volunteer.distance),
      skillMatchPercent: 90 - index * 5,
      assignedTask: 'Provide emergency support in designated zone',
      priority: index + 1
    })),
    coordinatorBrief: `Local responders identified for ${crisisType}.`,
    totalResponseCapacity: 'Community-led first response and utility stabilization'
  };
}

export async function getCrisisAnalysis(crisisData) {
  const systemPrompt = 'You are an emergency operations analyst for NeighborAid. Respond ONLY with valid JSON.';
  const prompt = `Analyze this crisis:
Type: ${crisisData.type} | Location: ${crisisData.location} | Severity: ${crisisData.severity}
JSON Schema: {"summary": "...", "riskLevel": "Critical|High|Moderate", "recommendedActions": [], "estimatedDuration": "..."}`;

  try {
    const { text } = await callAI(prompt, systemPrompt);
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    return {
      summary: `${crisisData.type} in ${crisisData.location} requires immediate localized coordination.`,
      riskLevel: crisisData.severity === 'critical' ? 'Critical' : 'High',
      recommendedActions: ['Activate Break-Glass', 'Dispatch priority responders'],
      estimatedDuration: '2 hours of monitoring'
    };
  }
}

export async function translateMissionBrief(text, targetLanguage) {
  const languageNames = { ml: 'Malayalam', ta: 'Tamil', hi: 'Hindi' };
  const langName = languageNames[targetLanguage] || targetLanguage;
  if (langName === 'English') return { translated: text, language: 'English', method: 'passthrough' };

  const systemPrompt = `Translate the mission brief into ${langName}. Keep emojis. Return ONLY the translated text.`;
  
  try {
    const { text: translated, provider } = await callAI(text, systemPrompt);
    return { translated: translated.trim(), language: langName, method: provider };
  } catch (error) {
    return { translated: text, language: langName, method: 'failed' };
  }
}

export async function processVoiceCommand(spokenText) {
  const systemPrompt = 'NeighborAid voice command processor. Respond ONLY with valid JSON.';
  const prompt = `Command: "${spokenText}"
JSON Schema: {"understood": true, "crisis_type": "...", "location": "...", "severity": "...", "keywords": [], "action": "...", "summary": "..."}`;

  try {
    const { text } = await callAI(prompt, systemPrompt);
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    return { understood: false, summary: 'Offline voice fallback active.' };
  }
}
