import httpx
from typing import Dict, Any, List

class NeighborAidClient:
    """
    Python SDK for interacting with the NeighborAid 2.0 API.
    """
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.Client(base_url=self.base_url)

    def health_check(self) -> Dict[str, Any]:
        """Check if the API is operational."""
        response = self.client.get("/api/health")
        response.raise_for_status()
        return response.json()

    def get_route(self, origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> Dict[str, Any]:
        """Calculate real road distance and travel time."""
        response = self.client.post("/api/route", json={
            "origin_lat": origin_lat,
            "origin_lng": origin_lng,
            "dest_lat": dest_lat,
            "dest_lng": dest_lng
        })
        response.raise_for_status()
        return response.json()

    def detect_crisis(self, lat: float, lng: float, signals: List[str] = None, behavioral_count: int = 0, voice_keywords: List[str] = None) -> Dict[str, Any]:
        """Passive crisis detection via signals and voice keywords."""
        response = self.client.post("/api/detect-crisis", json={
            "lat": lat,
            "lng": lng,
            "signals": signals or [],
            "behavioral_anomaly_count": behavioral_count,
            "voice_keywords": voice_keywords or []
        })
        response.raise_for_status()
        return response.json()

    def ingest_iot_data(self, sensor_id: str, basin_id: str, lat: float, lng: float, water_level: float, rainfall: float, battery: int) -> Dict[str, Any]:
        """Push hardware sensor data to the NeighborAid network."""
        response = self.client.post("/api/iot/ingest", json={
            "sensor_id": sensor_id,
            "basin_id": basin_id,
            "lat": lat,
            "lng": lng,
            "water_level_cm": water_level,
            "rainfall_mm": rainfall,
            "battery_pct": battery
        })
        response.raise_for_status()
        return response.json()
