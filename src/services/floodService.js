/**
 * Flood Service — Interfaces with the backend's Flood Data API
 * (simulates Google Flood Forecasting Initiative API behavior)
 */

import { API_BASE_URL } from '../config/api';

const BACKEND_BASE = API_BASE_URL;

/**
 * Fetch flood risk data for a specific location.
 * Returns basin-level risk assessments, river gauge levels,
 * rainfall data, and advisories.
 */
export async function getFloodRiskData(lat, lng, radiusKm = 15) {
  try {
    const response = await fetch(`${BACKEND_BASE}/api/flood-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, radius_km: radiusKm }),
    });

    if (!response.ok) {
      throw new Error('Flood data service unavailable');
    }

    return await response.json();
  } catch (error) {
    console.error('Flood service error:', error);
    // Return simulated fallback data
    return getFallbackFloodData(lat, lng);
  }
}

/**
 * Trigger the passive crisis detection engine.
 * Cross-references behavioral signals, voice keywords, and flood data.
 */
export async function detectCrisis(lat, lng, options = {}) {
  try {
    const response = await fetch(`${BACKEND_BASE}/api/detect-crisis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat,
        lng,
        signals: options.signals || [],
        behavioral_anomaly_count: options.behavioralAnomalyCount || 0,
        voice_keywords: options.voiceKeywords || [],
      }),
    });

    if (!response.ok) {
      throw new Error('Crisis detection service unavailable');
    }

    return await response.json();
  } catch (error) {
    console.error('Crisis detection error:', error);
    return getFallbackCrisisDetection(lat, lng, options);
  }
}

/**
 * Get Community Resilience Score for a location.
 */
export async function getResilienceScore(lat, lng) {
  try {
    const response = await fetch(`${BACKEND_BASE}/api/resilience-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, radius_km: 2 }),
    });

    if (!response.ok) {
      throw new Error('Resilience score service unavailable');
    }

    return await response.json();
  } catch (error) {
    console.error('Resilience score error:', error);
    return {
      score: 72,
      grade: 'B',
      components: {
        volunteer_density: 68,
        skill_coverage: 75,
        asset_coverage: 62,
        response_time: 80,
        flood_preparedness: 70,
      },
      gaps: [
        { area: 'Asset Availability', severity: 'medium', recommendation: 'Community needs more boats and generators' },
      ],
    };
  }
}

// ─── Fallbacks ──────────────────────────────────────────────────────────────

function getFallbackFloodData(lat, lng) {
  return {
    status: 'WARNING',
    queried_location: { lat, lng },
    radius_km: 15,
    basins_in_range: 1,
    risks: [
      {
        basin_id: 'periyar',
        basin_name: 'Periyar River Basin',
        distance_km: 2.1,
        risk_score: 0.72,
        risk_level: 'HIGH',
        rainfall_6h_mm: 165.3,
        avg_gauge_capacity_pct: 89.5,
        gauge_stations: [
          { name: 'Kothamangalam Gauge', lat: 10.0634, lng: 76.6478, capacity_pct: 92 },
          { name: 'Bhoothathankettu Gauge', lat: 10.08, lng: 76.62, capacity_pct: 87 },
        ],
        forecast: { next_6h: 'HIGH', next_12h: 'HIGH', next_24h: 'MODERATE' },
        advisory: 'HIGH FLOOD RISK in Periyar River Basin. 165mm rainfall recorded. Prepare for possible evacuation.',
      },
    ],
    data_source: 'NeighborAid Flood Simulation (offline fallback)',
    last_updated: new Date().toISOString(),
  };
}

function getFallbackCrisisDetection(lat, lng, options) {
  const hasKeywords = (options.voiceKeywords || []).length > 0;
  const hasBehavioral = (options.behavioralAnomalyCount || 0) > 5;

  return {
    crisis_detected: hasKeywords || hasBehavioral,
    crisis_type: hasKeywords ? 'Flash Flood' : 'General Emergency',
    severity: hasBehavioral ? 'high' : 'medium',
    confidence: hasKeywords ? 72 : hasBehavioral ? 65 : 35,
    confidence_components: {
      flood_risk: 60,
      behavioral_anomaly: hasBehavioral ? 75 : 20,
      voice_keywords: hasKeywords ? 80 : 0,
      external_signals: Math.min(100, (options.signals?.length || 0) * 20),
    },
    signals: [
      'Flood Forecasting API: HIGH alert for Periyar River Basin',
      ...(options.signals || []),
    ],
    recommendation: 'MONITOR: Running in offline mode. Connect backend for full detection.',
    location: { lat, lng },
    timestamp: new Date().toISOString(),
  };
}
