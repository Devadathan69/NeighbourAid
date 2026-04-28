/**
 * Routing Service — Uses OSRM (Open Source Routing Machine) via backend
 * for real road distance and travel time calculations.
 * Replaces straight-line Haversine with actual road network data.
 */

import { API_BASE_URL } from '../config/api';

const BACKEND_BASE = API_BASE_URL;

/**
 * Get real road route between two points.
 * Returns distance (meters), duration (seconds), and route geometry.
 */
export async function getRoute(originLat, originLng, destLat, destLng) {
  try {
    const response = await fetch(`${BACKEND_BASE}/api/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin_lat: originLat,
        origin_lng: originLng,
        dest_lat: destLat,
        dest_lng: destLng,
      }),
    });

    if (!response.ok) {
      throw new Error('Routing service unavailable');
    }

    return await response.json();
  } catch (error) {
    console.error('Routing service error:', error);
    return getHaversineFallback(originLat, originLng, destLat, destLng);
  }
}

/**
 * Batch route calculation for multiple volunteers to a single crisis point.
 * Returns an array of route results with volunteer IDs.
 */
export async function getRoutesForVolunteers(volunteers, crisisLat, crisisLng) {
  const results = await Promise.allSettled(
    volunteers.map(async (volunteer) => {
      const route = await getRoute(volunteer.lat, volunteer.lng, crisisLat, crisisLng);
      return {
        volunteerId: volunteer.id,
        ...route,
      };
    }),
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    // Fallback for failed requests
    const vol = volunteers[index];
    const fallback = getHaversineFallback(vol.lat, vol.lng, crisisLat, crisisLng);
    return { volunteerId: vol.id, ...fallback };
  });
}

/**
 * Enrich volunteers array with real road distances and ETAs.
 * Merges OSRM route data into each volunteer object.
 */
export async function enrichVolunteersWithRoutes(volunteers, crisisLat, crisisLng) {
  const routes = await getRoutesForVolunteers(volunteers, crisisLat, crisisLng);

  const routeMap = {};
  for (const route of routes) {
    routeMap[route.volunteerId] = route;
  }

  return volunteers
    .map((volunteer) => {
      const route = routeMap[volunteer.id];
      if (!route) return volunteer;

      return {
        ...volunteer,
        roadDistance: route.distance_meters,
        roadDuration: route.duration_seconds,
        roadDurationText: route.duration_text,
        routeSource: route.source,
        routeGeometry: route.geometry,
      };
    })
    .sort((a, b) => (a.roadDuration || Infinity) - (b.roadDuration || Infinity));
}

// ─── Haversine Fallback ─────────────────────────────────────────────────────

function getHaversineFallback(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Assume average 25 km/h in Kerala roads during emergencies
  const durationSeconds = (distance / 1000 / 25) * 3600;

  return {
    distance_meters: Math.round(distance),
    duration_seconds: Math.round(durationSeconds),
    duration_text: formatDuration(durationSeconds),
    source: 'haversine_fallback',
    geometry: null,
  };
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m`;
}
