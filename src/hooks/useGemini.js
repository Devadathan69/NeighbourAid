import { useState } from 'react';
import { getCrisisAnalysis, getVolunteerMatches, translateMissionBrief, processVoiceCommand } from '../services/geminiService';

export default function useGemini() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyzeCrisis = async (crisisData) => {
    setLoading(true);
    setError('');
    try {
      return await getCrisisAnalysis(crisisData);
    } catch (analysisError) {
      const message = analysisError.message || 'Gemini could not analyze the crisis right now.';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const matchVolunteers = async (crisisType, location, volunteers) => {
    setLoading(true);
    setError('');
    try {
      return await getVolunteerMatches(crisisType, location, volunteers);
    } catch (matchError) {
      const message = matchError.message || 'Gemini could not match responders right now.';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const translate = async (text, targetLanguage) => {
    setLoading(true);
    setError('');
    try {
      return await translateMissionBrief(text, targetLanguage);
    } catch (translateError) {
      const message = translateError.message || 'Translation failed.';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const parseVoiceCommand = async (spokenText) => {
    setLoading(true);
    setError('');
    try {
      return await processVoiceCommand(spokenText);
    } catch (voiceError) {
      const message = voiceError.message || 'Voice command processing failed.';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    analyzeCrisis,
    matchVolunteers,
    translate,
    parseVoiceCommand,
    loading,
    error,
  };
}
