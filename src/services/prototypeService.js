const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function updateVolunteerHeartbeat(userId, name, lat, lng, isActive) {
  const response = await fetch(`${API_BASE_URL}/api/volunteer/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      name: name,
      lat: lat,
      lng: lng,
      is_active: isActive
    }),
  });
  if (!response.ok) throw new Error('Failed to update heartbeat');
  return response.json();
}

export async function getActiveVolunteers() {
  const response = await fetch(`${API_BASE_URL}/api/volunteers/active`);
  if (!response.ok) throw new Error('Failed to fetch active volunteers');
  return response.json();
}

export async function ingestIoTData(sensorId, basinId, lat, lng, waterLevel, rainfall, battery) {
  const response = await fetch(`${API_BASE_URL}/api/iot/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sensor_id: sensorId,
      basin_id: basinId,
      lat: lat,
      lng: lng,
      water_level_cm: waterLevel,
      rainfall_mm: rainfall,
      battery_pct: battery
    }),
  });
  if (!response.ok) throw new Error('Failed to ingest IoT data');
  return response.json();
}

export async function getActiveDrones() {
  const response = await fetch(`${API_BASE_URL}/api/drones/active`);
  if (!response.ok) throw new Error('Failed to fetch drones');
  return response.json();
}

export async function syncFLWeights(userId, modelVersion, trainingSamples) {
  const response = await fetch(`${API_BASE_URL}/api/fl/sync-weights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      model_version: modelVersion,
      weights_hash: Math.random().toString(36).substring(7), // simulated hash
      training_samples: trainingSamples,
      loss_improvement: 0.05
    }),
  });
  if (!response.ok) throw new Error('Failed to sync weights');
  return response.json();
}

export async function getFLGlobalModel() {
  const response = await fetch(`${API_BASE_URL}/api/fl/global-model`);
  if (!response.ok) throw new Error('Failed to fetch global model');
  return response.json();
}
