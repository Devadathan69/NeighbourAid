import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, Polyline, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MOCK_VOLUNTEERS } from '../../config/mockData';
import L from 'leaflet';

const droneIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2833/2833800.png', // Temporary drone icon URL
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function CrisisMap({ crises = [], volunteers = [], selectedCrisis = null, floodData = null, drones = [], onDroneClick = null }) {
  const visibleVolunteers = volunteers.length > 0 ? volunteers : MOCK_VOLUNTEERS;
  const activeCrisisCount = crises.filter((c) => c.status === 'active').length;

  const mapSummary = useMemo(() => {
    const parts = [`${activeCrisisCount} active alerts`, `${visibleVolunteers.length} nearby responders`];
    if (floodData?.risks?.length > 0) {
      parts.push(`${floodData.risks.length} flood basin${floodData.risks.length > 1 ? 's' : ''} monitored`);
    }
    if (drones.length > 0) {
      parts.push(`${drones.length} active drone${drones.length > 1 ? 's' : ''}`);
    }
    return parts.join(' · ');
  }, [activeCrisisCount, visibleVolunteers.length, floodData]);

  const defaultCenter = [10.0559, 76.6497];

  // Volunteers that have OSRM route geometry
  const routedVolunteers = useMemo(
    () => visibleVolunteers.filter((v) => v.routeGeometry?.coordinates),
    [visibleVolunteers],
  );

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-3xl border border-navy/10 bg-white shadow-card z-0">
      <MapContainer center={defaultCenter} zoom={14} style={{ height: '100%', width: '100%', minHeight: '420px', zIndex: 0 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Flood basin zones */}
        {floodData?.risks?.map((risk) =>
          risk.gauge_stations?.map((gauge) => (
            <Circle
              key={`flood-${gauge.name}`}
              center={[gauge.lat, gauge.lng]}
              radius={800}
              pathOptions={{
                color: risk.risk_level === 'EXTREME' ? '#dc2626' : risk.risk_level === 'HIGH' ? '#2563eb' : '#16a34a',
                fillColor: risk.risk_level === 'EXTREME' ? '#dc2626' : risk.risk_level === 'HIGH' ? '#2563eb' : '#16a34a',
                fillOpacity: 0.08,
                weight: 1.5,
                dashArray: '4, 8',
              }}
            >
              <Popup>
                <strong>🌊 {gauge.name}</strong><br />
                Capacity: {gauge.capacity_pct}%<br />
                Risk: {risk.risk_level}
              </Popup>
            </Circle>
          )),
        )}

        {/* Draw 2km response radius around selected crisis */}
        {selectedCrisis && (
          <Circle
            center={[selectedCrisis.lat, selectedCrisis.lng]}
            radius={2000}
            pathOptions={{ color: '#0d7a6b', fillColor: '#0d7a6b', fillOpacity: 0.1, weight: 2, dashArray: '8, 10' }}
          />
        )}

        {/* OSRM Route lines from volunteers to crisis */}
        {routedVolunteers.map((volunteer) => {
          if (!volunteer.routeGeometry?.coordinates) return null;
          const positions = volunteer.routeGeometry.coordinates.map(([lng, lat]) => [lat, lng]);
          return (
            <Polyline
              key={`route-${volunteer.id}`}
              positions={positions}
              pathOptions={{ color: '#0d7a6b', weight: 2.5, opacity: 0.6, dashArray: '6, 8' }}
            />
          );
        })}

        {/* Draw Volunteers */}
        {visibleVolunteers.map((volunteer) => (
          <CircleMarker
            key={volunteer.id}
            center={[volunteer.lat, volunteer.lng]}
            radius={6}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#22c55e', fillOpacity: 0.9 }}
          >
            <Popup>
              <strong>{volunteer.name}</strong><br />
              Skills: {volunteer.skills.join(', ')}<br />
              Assets: {volunteer.assets.join(', ')}
              {volunteer.roadDurationText && <><br />🛣️ ETA: {volunteer.roadDurationText}</>}
            </Popup>
          </CircleMarker>
        ))}

        {/* Draw Crises */}
        {crises.map((crisis) => {
          const isCritical = crisis.severity === 'critical';
          const isHigh = crisis.severity === 'high';
          const color = isCritical ? '#dc2626' : isHigh ? '#d97706' : '#ca8a04';
          const isSelected = selectedCrisis?.id === crisis.id;

          return (
            <CircleMarker
              key={crisis.id}
              center={[crisis.lat, crisis.lng]}
              radius={isSelected ? 14 : 10}
              pathOptions={{
                color: isSelected ? '#ffffff' : color,
                weight: isSelected ? 3 : 2,
                fillColor: color,
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <strong>{crisis.type}</strong><br />
                {crisis.location}<br />
                Severity: {crisis.severity.toUpperCase()}
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Draw Drones */}
        {drones.map((drone) => (
          <CircleMarker
            key={drone.drone_id}
            center={[drone.lat, drone.lng]}
            radius={8}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#06b6d4', fillOpacity: 1 }}
            eventHandlers={{
              click: () => {
                if (onDroneClick) onDroneClick(drone);
              },
            }}
          >
            <Popup>
              <strong>🚁 {drone.drone_id}</strong><br />
              Status: {drone.status}<br />
              Battery: {drone.battery}%<br />
              <button 
                onClick={(e) => { e.stopPropagation(); if (onDroneClick) onDroneClick(drone); }}
                className="mt-2 text-xs font-bold text-cyan-600 hover:text-cyan-800"
              >
                View Live Feed
              </button>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <div className="absolute left-6 top-6 rounded-2xl bg-white/95 px-4 py-3 shadow-card z-[1000]">
        <p className="font-heading text-sm font-semibold text-navy">Live Ops Map</p>
        <p className="text-xs text-slate-500">{mapSummary}</p>
      </div>

      {/* OSRM badge */}
      {routedVolunteers.length > 0 && (
        <div className="absolute right-6 top-6 rounded-xl bg-primary-600/90 px-3 py-1.5 shadow-card z-[1000]">
          <p className="text-[10px] font-bold text-white">🛣️ OSRM Routes Active</p>
        </div>
      )}
    </div>
  );
}
