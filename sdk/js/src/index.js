// JS SDK for NeighborAid
class NeighborAidClient {
  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async _fetch(endpoint, options = {}) {
    // In browser, fetch is global. In Node, a polyfill like node-fetch is needed if < v18
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  }

  async healthCheck() {
    return this._fetch('/api/health');
  }

  async getRoute(originLat, originLng, destLat, destLng) {
    return this._fetch('/api/route', {
      method: 'POST',
      body: JSON.stringify({
        origin_lat: originLat,
        origin_lng: originLng,
        dest_lat: destLat,
        dest_lng: destLng
      })
    });
  }

  async detectCrisis(lat, lng, options = {}) {
    return this._fetch('/api/detect-crisis', {
      method: 'POST',
      body: JSON.stringify({
        lat,
        lng,
        signals: options.signals || [],
        behavioral_anomaly_count: options.behavioralCount || 0,
        voice_keywords: options.voiceKeywords || []
      })
    });
  }

  async ingestIoTData(sensorId, basinId, lat, lng, waterLevel, rainfall, battery) {
    return this._fetch('/api/iot/ingest', {
      method: 'POST',
      body: JSON.stringify({
        sensor_id: sensorId,
        basin_id: basinId,
        lat,
        lng,
        water_level_cm: waterLevel,
        rainfall_mm: rainfall,
        battery_pct: battery
      })
    });
  }
}

module.exports = NeighborAidClient;
