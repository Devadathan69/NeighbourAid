import { DEMO_MODE } from './firebaseService';
import { translateMissionBrief } from './geminiService';

export function generateMissionBrief(volunteer, crisis, task, coordinatorName) {
  const reportBy = new Date(Date.now() + 30 * 60 * 1000).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const mapsLink = `https://www.google.com/maps?q=${crisis.lat},${crisis.lng}`;
  const checkinLink = `${window.location.origin}/missions?crisisId=${crisis.id}&volunteerId=${volunteer.id}`;

  return `🚨 *EMERGENCY ALERT — NeighborAid*

You have been identified as a community responder for a *${crisis.type}* emergency near your location.

*Your assigned task:* ${task}

📍 *Location:* ${mapsLink}
⏱ *Report by:* ${reportBy}
🛣️ *Estimated travel:* ${volunteer.roadDurationText || 'calculating...'}

✅ *Check in when you arrive:* ${checkinLink}

This request expires in 2 hours. Your identity is protected — only your skill was shared.

_NeighborAid Community Response Network_`;
}

/**
 * Generate a multilingual mission brief.
 * First generates the English version, then translates to the volunteer's
 * preferred language using Gemini.
 */
export async function generateMultilingualBrief(volunteer, crisis, task, coordinatorName) {
  const englishBrief = generateMissionBrief(volunteer, crisis, task, coordinatorName);

  // Determine the volunteer's preferred non-English language
  const preferredLang = (volunteer.languages || []).find(
    (lang) => lang !== 'English' && ['Malayalam', 'Tamil', 'Hindi'].includes(lang),
  );

  if (!preferredLang) {
    return {
      english: englishBrief,
      translated: null,
      language: 'English',
      finalBrief: englishBrief,
    };
  }

  try {
    const translation = await translateMissionBrief(englishBrief, preferredLang);

    // Combine: translated version first, then English below
    const combinedBrief = translation.method !== 'unavailable' && translation.method !== 'failed'
      ? `${translation.translated}\n\n━━━━━━━━━━━━━━━━━━━━\n🇬🇧 *English version:*\n${englishBrief}`
      : englishBrief;

    return {
      english: englishBrief,
      translated: translation.translated,
      language: translation.language,
      method: translation.method,
      finalBrief: combinedBrief,
    };
  } catch (error) {
    console.error('Multilingual brief generation error:', error);
    return {
      english: englishBrief,
      translated: null,
      language: 'English',
      finalBrief: englishBrief,
    };
  }
}

export async function sendWhatsApp(phone, message) {
  try {
    if (!phone || !message) {
      throw new Error('Phone number and message are required.');
    }

    if (DEMO_MODE) {
      const cleanPhone = phone.replace(/[^\d]/g, '');
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      return { mode: 'demo', url };
    }

    const response = await fetch('/api/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, message }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || 'WhatsApp dispatch failed.');
    }

    return response.json();
  } catch (error) {
    console.error('WhatsApp dispatch error:', error);
    throw new Error(error.message || 'Unable to send WhatsApp notification right now.');
  }
}
