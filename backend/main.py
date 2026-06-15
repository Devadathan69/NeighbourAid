import os
import math
import time
import hashlib
import random
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from twilio.rest import Client
from dotenv import load_dotenv
import httpx

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="NeighborAid 2.0 API", version="2.0.0")

@app.get("/api/health")
async def health_check():
    return {"status": "operational", "timestamp": datetime.now().isoformat()}

# Allow CORS for development if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Twilio configuration
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_NUMBER = os.environ.get("TWILIO_WHATSAPP_FROM")

# Initialize Twilio Client only if credentials exist
twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN else None

# ─── OSRM Public API Base URL ───────────────────────────────────────────────
OSRM_BASE = "https://router.project-osrm.org"

# ─── State for Prototype Features (Simulating DB) ───────────────────────────
active_volunteers = {}  # user_id -> dict with timestamp, coords, etc.
iot_sensor_data = {}    # basin_id -> dict with latest reading
global_model_state = {
    "version": "v2.0.1",
    "total_samples": 15000,
    "last_updated": datetime.utcnow().isoformat(),
    "contributors": 0
}

# ─── Kerala Flood-Prone River Basins (simulation data) ──────────────────────
KERALA_RIVER_BASINS = {
    "periyar": {
        "name": "Periyar River Basin",
        "center": {"lat": 10.0559, "lng": 76.6497},
        "radius_km": 15,
        "base_risk": 0.65,
        "gauge_stations": [
            {"name": "Kothamangalam Gauge", "lat": 10.0634, "lng": 76.6478, "capacity_pct": 92},
            {"name": "Bhoothathankettu Gauge", "lat": 10.0800, "lng": 76.6200, "capacity_pct": 87},
        ],
    },
    "muvattupuzha": {
        "name": "Muvattupuzha River Basin",
        "center": {"lat": 9.9900, "lng": 76.5800},
        "radius_km": 12,
        "base_risk": 0.55,
        "gauge_stations": [
            {"name": "Muvattupuzha Town Gauge", "lat": 9.9850, "lng": 76.5750, "capacity_pct": 78},
        ],
    },
    "pamba": {
        "name": "Pamba River Basin",
        "center": {"lat": 9.4000, "lng": 76.5700},
        "radius_km": 20,
        "base_risk": 0.60,
        "gauge_stations": [
            {"name": "Ranni Gauge", "lat": 9.3850, "lng": 76.7800, "capacity_pct": 85},
        ],
    },
}


# ─── Pydantic Models ────────────────────────────────────────────────────────

class WhatsAppMessage(BaseModel):
    phone: str
    message: str

class RouteRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float

class FloodDataRequest(BaseModel):
    lat: float
    lng: float
    radius_km: float = 5.0

class CrisisDetectionRequest(BaseModel):
    lat: float
    lng: float
    signals: list[str] = Field(default_factory=list)
    behavioral_anomaly_count: int = 0
    voice_keywords: list[str] = Field(default_factory=list)

class TranslateRequest(BaseModel):
    text: str
    target_language: str  # "ml" for Malayalam, "ta" for Tamil, "hi" for Hindi

class VolunteerHeartbeat(BaseModel):
    user_id: str
    name: str
    lat: float
    lng: float
    is_active: bool

class IoTSensorData(BaseModel):
    sensor_id: str
    basin_id: str
    lat: float
    lng: float
    water_level_cm: float
    rainfall_mm: float
    battery_pct: int

class FederatedWeightSync(BaseModel):
    user_id: str
    model_version: str
    weights_hash: str
    training_samples: int
    loss_improvement: float

# ─── Utility Functions ──────────────────────────────────────────────────────

def haversine_km(lat1, lng1, lat2, lng2):
    """Calculate distance between two points in km using the Haversine formula."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def compute_flood_risk(lat, lng):
    """
    Simulate Google Flood Forecasting API behavior.
    Computes flood risk based on proximity to known river basins,
    simulated rainfall, and river gauge levels.
    """
    results = []

    for basin_id, basin in KERALA_RIVER_BASINS.items():
        distance = haversine_km(lat, lng, basin["center"]["lat"], basin["center"]["lng"])

        if distance > basin["radius_km"]:
            continue

        # Proximity factor: closer = higher risk
        proximity_factor = max(0, 1 - (distance / basin["radius_km"]))

        # Simulated or Real IoT dynamic factors
        if basin_id in iot_sensor_data:
            # Use real IoT data
            latest_reading = iot_sensor_data[basin_id]
            rainfall_mm = latest_reading["rainfall_mm"]
            rainfall_factor = min(1.0, rainfall_mm / 200)
            
            # Use water level to estimate gauge capacity (assuming 500cm is 100%)
            avg_capacity = min(100.0, (latest_reading["water_level_cm"] / 500) * 100)
            gauge_factor = avg_capacity / 100
        else:
            # Simulated dynamic factors (would come from real APIs)
            # Use time-based seed for consistent but changing values
            hour_seed = int(time.time() // 3600)
            random.seed(hash(f"{basin_id}_{hour_seed}"))

            rainfall_mm = random.uniform(80, 220)  # mm in last 6 hours
            rainfall_factor = min(1.0, rainfall_mm / 200)

            # Average gauge capacity
            avg_capacity = sum(g["capacity_pct"] for g in basin["gauge_stations"]) / len(basin["gauge_stations"])
            gauge_factor = min(1.0, avg_capacity / 100)

        # Combined risk score
        risk_score = (
            basin["base_risk"] * 0.3
            + proximity_factor * 0.25
            + rainfall_factor * 0.25
            + gauge_factor * 0.20
        )
        risk_score = round(min(1.0, risk_score), 3)

        risk_level = "EXTREME" if risk_score > 0.8 else "HIGH" if risk_score > 0.6 else "MODERATE" if risk_score > 0.4 else "LOW"

        results.append({
            "basin_id": basin_id,
            "basin_name": basin["name"],
            "distance_km": round(distance, 2),
            "risk_score": risk_score,
            "risk_level": risk_level,
            "rainfall_6h_mm": round(rainfall_mm, 1),
            "avg_gauge_capacity_pct": round(avg_capacity, 1),
            "gauge_stations": basin["gauge_stations"],
            "forecast": {
                "next_6h": risk_level,
                "next_12h": "HIGH" if risk_score > 0.5 else "MODERATE",
                "next_24h": "MODERATE" if risk_score > 0.3 else "LOW",
            },
            "advisory": generate_advisory(risk_level, basin["name"], rainfall_mm),
        })

    # Sort by risk score descending
    results.sort(key=lambda x: x["risk_score"], reverse=True)
    return results


def generate_advisory(risk_level, basin_name, rainfall_mm):
    """Generate human-readable flood advisory."""
    if risk_level == "EXTREME":
        return f"EXTREME FLOOD RISK in {basin_name}. {rainfall_mm:.0f}mm rainfall recorded. Immediate evacuation recommended for low-lying areas. All community responders should be on standby."
    elif risk_level == "HIGH":
        return f"HIGH FLOOD RISK in {basin_name}. {rainfall_mm:.0f}mm rainfall recorded. Prepare for possible evacuation. Monitor water levels closely."
    elif risk_level == "MODERATE":
        return f"MODERATE flood risk in {basin_name}. {rainfall_mm:.0f}mm rainfall. Stay alert and avoid waterlogged areas."
    return f"Low flood risk in {basin_name}. Normal conditions. Continue monitoring."


# ─── API Endpoints ───────────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "operational",
        "version": "2.0.0",
        "services": {
            "whatsapp": "configured" if twilio_client else "not_configured",
            "routing": "osrm_public",
            "flood_detection": "active",
            "crisis_sensing": "active",
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/api/whatsapp")
async def send_whatsapp(payload: WhatsAppMessage):
    """Send a WhatsApp message via Twilio."""
    if not twilio_client:
        raise HTTPException(status_code=500, detail="Twilio credentials are not configured in the backend.")

    # Clean the phone number and ensure it starts with whatsapp:+
    clean_phone = payload.phone.replace(" ", "").replace("-", "")
    if not clean_phone.startswith("+"):
        clean_phone = "+" + clean_phone

    formatted_phone = f"whatsapp:{clean_phone}"

    try:
        message = twilio_client.messages.create(
            from_=TWILIO_WHATSAPP_NUMBER,
            body=payload.message,
            to=formatted_phone
        )
        return {"success": True, "messageSid": message.sid, "status": message.status}
    except Exception as e:
        print(f"Twilio API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/route")
async def get_route(payload: RouteRequest):
    """
    Calculate real road distance and travel time between two points
    using the OSRM (Open Source Routing Machine) public API.
    Returns distance in meters and duration in seconds.
    """
    url = (
        f"{OSRM_BASE}/route/v1/driving/"
        f"{payload.origin_lng},{payload.origin_lat};"
        f"{payload.dest_lng},{payload.dest_lat}"
        f"?overview=full&geometries=geojson&steps=false"
    )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()

        if data.get("code") != "Ok" or not data.get("routes"):
            # Fallback to Haversine if OSRM can't find a route
            straight_distance = haversine_km(
                payload.origin_lat, payload.origin_lng,
                payload.dest_lat, payload.dest_lng
            ) * 1000
            estimated_duration = straight_distance / 8.33  # ~30 km/h average
            return {
                "distance_meters": round(straight_distance),
                "duration_seconds": round(estimated_duration),
                "duration_text": format_duration(estimated_duration),
                "source": "haversine_fallback",
                "geometry": None,
            }

        route = data["routes"][0]
        return {
            "distance_meters": round(route["distance"]),
            "duration_seconds": round(route["duration"]),
            "duration_text": format_duration(route["duration"]),
            "source": "osrm",
            "geometry": route.get("geometry"),
        }
    except httpx.HTTPError as e:
        print(f"OSRM API Error: {e}")
        # Fallback to Haversine
        straight_distance = haversine_km(
            payload.origin_lat, payload.origin_lng,
            payload.dest_lat, payload.dest_lng
        ) * 1000
        estimated_duration = straight_distance / 8.33
        return {
            "distance_meters": round(straight_distance),
            "duration_seconds": round(estimated_duration),
            "duration_text": format_duration(estimated_duration),
            "source": "haversine_fallback",
            "geometry": None,
        }


def format_duration(seconds):
    """Format seconds into human-readable duration."""
    minutes = int(seconds // 60)
    if minutes < 1:
        return "< 1 min"
    if minutes < 60:
        return f"{minutes} min"
    hours = minutes // 60
    remaining = minutes % 60
    return f"{hours}h {remaining}m"


@app.post("/api/flood-data")
async def get_flood_data(payload: FloodDataRequest):
    """
    Simulate Google Flood Forecasting API.
    Returns flood risk assessment for the given coordinates
    based on proximity to Kerala river basins, simulated rainfall,
    and river gauge levels.
    """
    risks = compute_flood_risk(payload.lat, payload.lng)

    # Overall status
    max_risk = risks[0]["risk_score"] if risks else 0
    overall_status = (
        "EMERGENCY" if max_risk > 0.8
        else "WARNING" if max_risk > 0.6
        else "WATCH" if max_risk > 0.4
        else "NORMAL"
    )

    return {
        "status": overall_status,
        "queried_location": {"lat": payload.lat, "lng": payload.lng},
        "radius_km": payload.radius_km,
        "basins_in_range": len(risks),
        "risks": risks,
        "data_source": "NeighborAid Flood Simulation (mimics Google Flood Forecasting API structure)",
        "last_updated": datetime.utcnow().isoformat(),
        "disclaimer": "Simulation based on historical Kerala flood patterns. In production, this would connect to Google Flood Forecasting Initiative API.",
    }


@app.post("/api/detect-crisis")
async def detect_crisis(payload: CrisisDetectionRequest):
    """
    Passive Crisis Detection Engine.
    Cross-references behavioral signals, voice keywords, and flood data
    to compute a crisis confidence score without requiring manual reports.
    """
    signals_detected = []
    confidence_components = {}

    # 1. Flood Risk Component
    flood_risks = compute_flood_risk(payload.lat, payload.lng)
    flood_score = 0
    if flood_risks:
        top_risk = flood_risks[0]
        flood_score = top_risk["risk_score"]
        if flood_score > 0.5:
            signals_detected.append(
                f"Flood Forecasting API: {top_risk['risk_level']} alert for {top_risk['basin_name']}"
            )
            signals_detected.append(
                f"Rainfall: {top_risk['rainfall_6h_mm']}mm in last 6 hours"
            )
            signals_detected.append(
                f"River gauge: {top_risk['basin_name']} at {top_risk['avg_gauge_capacity_pct']}% capacity"
            )
    confidence_components["flood_risk"] = round(flood_score * 100)

    # 2. Behavioral Anomaly Component
    behavioral_score = 0
    if payload.behavioral_anomaly_count > 0:
        behavioral_score = min(1.0, payload.behavioral_anomaly_count / 15)
        if payload.behavioral_anomaly_count >= 5:
            signals_detected.append(
                f"{payload.behavioral_anomaly_count} users in 0.3km radius opened app simultaneously"
            )
        if payload.behavioral_anomaly_count >= 10:
            signals_detected.append("Abnormal movement patterns detected in cluster")
    confidence_components["behavioral_anomaly"] = round(behavioral_score * 100)

    # 3. Voice Keyword Component
    voice_score = 0
    crisis_keywords = {
        "flood": 0.3, "vellam": 0.35, "fire": 0.3, "theepidi": 0.35,
        "help": 0.25, "sahayam": 0.3, "accident": 0.25, "apakadham": 0.3,
        "emergency": 0.3, "rescue": 0.3, "trapped": 0.35, "drowning": 0.4,
    }
    matched_keywords = []
    for keyword in payload.voice_keywords:
        kw_lower = keyword.lower()
        if kw_lower in crisis_keywords:
            voice_score += crisis_keywords[kw_lower]
            matched_keywords.append(kw_lower)
    voice_score = min(1.0, voice_score)
    if matched_keywords:
        signals_detected.append(
            f'Voice keyword spike: "{", ".join(matched_keywords)}" detected in area'
        )
    confidence_components["voice_keywords"] = round(voice_score * 100)

    # 4. External signals (from frontend)
    external_score = min(1.0, len(payload.signals) / 5)
    for sig in payload.signals:
        if sig not in signals_detected:
            signals_detected.append(sig)
    confidence_components["external_signals"] = round(external_score * 100)

    # Combined confidence
    overall_confidence = round(
        flood_score * 35
        + behavioral_score * 25
        + voice_score * 20
        + external_score * 20
    )
    overall_confidence = min(100, overall_confidence)

    # Crisis type inference
    crisis_type = "Unknown"
    if any(k in matched_keywords for k in ["flood", "vellam", "drowning", "trapped"]) or flood_score > 0.6:
        crisis_type = "Flash Flood"
    elif any(k in matched_keywords for k in ["fire", "theepidi"]):
        crisis_type = "Structure Fire"
    elif any(k in matched_keywords for k in ["accident", "apakadham"]):
        crisis_type = "Medical Emergency"
    elif flood_score > 0.4:
        crisis_type = "Flash Flood"
    elif overall_confidence > 50:
        crisis_type = "General Emergency"

    severity = (
        "critical" if overall_confidence > 80
        else "high" if overall_confidence > 60
        else "medium" if overall_confidence > 40
        else "low"
    )

    should_activate = overall_confidence >= 60

    return {
        "crisis_detected": should_activate,
        "crisis_type": crisis_type,
        "severity": severity,
        "confidence": overall_confidence,
        "confidence_components": confidence_components,
        "signals": signals_detected,
        "recommendation": (
            "SELF-ACTIVATE: Crisis signature detected from multiple convergent sources. Recommend immediate coordinator notification."
            if should_activate
            else "MONITOR: Some signals detected but below activation threshold. Continue passive monitoring."
        ),
        "location": {"lat": payload.lat, "lng": payload.lng},
        "timestamp": datetime.utcnow().isoformat(),
        "hash": hashlib.sha256(
            f"{payload.lat}:{payload.lng}:{overall_confidence}:{datetime.utcnow().isoformat()}".encode()
        ).hexdigest()[:16],
    }


@app.post("/api/translate")
async def translate_text(payload: TranslateRequest):
    """
    Translation endpoint.
    In production, this would use Google Translate API.
    For the prototype, Gemini handles translation on the frontend.
    This endpoint provides a fallback with common emergency phrases.
    """
    emergency_translations = {
        "ml": {  # Malayalam
            "flood": "വെള്ളപ്പൊക്കം",
            "fire": "തീപിടുത്തം",
            "help": "സഹായം",
            "emergency": "അടിയന്തരാവസ്ഥ",
            "evacuate": "ഒഴിപ്പിക്കുക",
            "rescue": "രക്ഷാപ്രവർത്തനം",
            "medical": "വൈദ്യ സഹായം",
            "safe": "സുരക്ഷിതം",
            "danger": "അപകടം",
            "boat": "ബോട്ട്",
            "shelter": "അഭയകേന്ദ്രം",
            "food": "ഭക്ഷണം",
            "water": "വെള്ളം",
        },
        "ta": {  # Tamil
            "flood": "வெள்ளம்",
            "fire": "தீ",
            "help": "உதவி",
            "emergency": "அவசரநிலை",
            "evacuate": "வெளியேற்றுங்கள்",
            "rescue": "மீட்பு",
            "medical": "மருத்துவ உதவி",
            "safe": "பாதுகாப்பு",
            "danger": "ஆபத்து",
            "boat": "படகு",
            "shelter": "தங்குமிடம்",
            "food": "உணவு",
            "water": "தண்ணீர்",
        },
        "hi": {  # Hindi
            "flood": "बाढ़",
            "fire": "आग",
            "help": "मदद",
            "emergency": "आपातकाल",
            "evacuate": "खाली करें",
            "rescue": "बचाव",
            "medical": "चिकित्सा सहायता",
            "safe": "सुरक्षित",
            "danger": "खतरा",
            "boat": "नाव",
            "shelter": "आश्रय",
            "food": "भोजन",
            "water": "पानी",
        },
    }

    lang = payload.target_language.lower()
    if lang not in emergency_translations:
        return {
            "translated_text": payload.text,
            "source_language": "en",
            "target_language": lang,
            "method": "passthrough",
            "note": "Language not supported for offline translation. Use Gemini for real-time translation.",
        }

    return {
        "translated_text": payload.text,
        "source_language": "en",
        "target_language": lang,
        "method": "dictionary_fallback",
        "emergency_vocabulary": emergency_translations[lang],
        "note": "Dictionary-based fallback. Full translation handled by Gemini on frontend.",
    }


@app.post("/api/resilience-score")
async def compute_resilience_score(payload: FloodDataRequest):
    """
    Innovative Feature: Community Resilience Score.
    Computes a score (0-100) indicating how well-prepared
    a community is for a crisis based on volunteer density,
    skill coverage, asset availability, and flood risk.
    """
    # This would normally query the volunteer database
    # For the prototype, we simulate based on location
    random.seed(hash(f"{payload.lat:.4f}_{payload.lng:.4f}"))

    volunteer_density = random.uniform(0.4, 0.95)
    skill_coverage = random.uniform(0.5, 0.90)
    asset_coverage = random.uniform(0.3, 0.85)
    response_time_score = random.uniform(0.5, 0.95)

    flood_risks = compute_flood_risk(payload.lat, payload.lng)
    flood_preparedness = 1.0 - (flood_risks[0]["risk_score"] * 0.3 if flood_risks else 0)

    overall = round(
        volunteer_density * 25
        + skill_coverage * 25
        + asset_coverage * 20
        + response_time_score * 15
        + flood_preparedness * 15
    )

    gaps = []
    if volunteer_density < 0.6:
        gaps.append({"area": "Volunteer Density", "severity": "high", "recommendation": "Recruit more community responders in this ward"})
    if skill_coverage < 0.6:
        gaps.append({"area": "Skill Coverage", "severity": "high", "recommendation": "Need more medical and technical responders"})
    if asset_coverage < 0.5:
        gaps.append({"area": "Asset Availability", "severity": "medium", "recommendation": "Community needs more boats and generators"})
    if response_time_score < 0.6:
        gaps.append({"area": "Response Time", "severity": "medium", "recommendation": "Establish pre-positioned response points"})

    grade = "A+" if overall >= 90 else "A" if overall >= 80 else "B" if overall >= 70 else "C" if overall >= 60 else "D" if overall >= 50 else "F"

    return {
        "score": overall,
        "grade": grade,
        "components": {
            "volunteer_density": round(volunteer_density * 100),
            "skill_coverage": round(skill_coverage * 100),
            "asset_coverage": round(asset_coverage * 100),
            "response_time": round(response_time_score * 100),
            "flood_preparedness": round(flood_preparedness * 100),
        },
        "gaps": gaps,
        "location": {"lat": payload.lat, "lng": payload.lng},
        "timestamp": datetime.utcnow().isoformat(),
    }


# ─── NEW PROTOTYPE FEATURES ENDPOINTS ───────────────────────────────────────

@app.post("/api/volunteer/heartbeat")
async def update_volunteer_heartbeat(payload: VolunteerHeartbeat):
    """
    Real-Time Availability Check:
    Receives real-time GPS coords from volunteers who have toggled "Active".
    """
    if payload.is_active:
        active_volunteers[payload.user_id] = {
            "user_id": payload.user_id,
            "name": payload.name,
            "lat": payload.lat,
            "lng": payload.lng,
            "last_seen": datetime.utcnow().isoformat(),
            "timestamp": time.time()
        }
    else:
        active_volunteers.pop(payload.user_id, None)
        
    return {"status": "success", "active_count": len(active_volunteers)}

@app.get("/api/volunteers/active")
async def get_active_volunteers():
    """
    Returns volunteers who have pinged within the last 15 minutes.
    """
    now = time.time()
    # Filter out stale heartbeats (older than 15 mins)
    stale_threshold = 15 * 60 
    
    active = []
    keys_to_remove = []
    
    for uid, data in active_volunteers.items():
        if now - data["timestamp"] > stale_threshold:
            keys_to_remove.append(uid)
        else:
            active.append(data)
            
    for uid in keys_to_remove:
        del active_volunteers[uid]
        
    return {"active_volunteers": active, "count": len(active)}

@app.post("/api/iot/ingest")
async def ingest_iot_data(payload: IoTSensorData):
    """
    IoT Integration:
    Simulated ingestion endpoint for hardware sensors (water level, rainfall).
    """
    iot_sensor_data[payload.basin_id] = {
        "sensor_id": payload.sensor_id,
        "lat": payload.lat,
        "lng": payload.lng,
        "water_level_cm": payload.water_level_cm,
        "rainfall_mm": payload.rainfall_mm,
        "battery_pct": payload.battery_pct,
        "timestamp": datetime.utcnow().isoformat()
    }
    return {"status": "success", "basin_id": payload.basin_id}

@app.get("/api/drones/active")
async def get_active_drones():
    """
    Drone-Based Visual Feeds:
    Returns a list of currently active drone mappings for the admin map.
    """
    # Simulated drones
    drones = [
        {
            "drone_id": "DRN-881",
            "lat": 10.0559,
            "lng": 76.6497,
            "status": "mapping",
            "battery": 82,
            "stream_url": "https://www.w3schools.com/html/mov_bbb.mp4" # Dummy video
        },
        {
            "drone_id": "DRN-402",
            "lat": 9.9900,
            "lng": 76.5800,
            "status": "patrolling",
            "battery": 45,
            "stream_url": "https://www.w3schools.com/html/mov_bbb.mp4"
        }
    ]
    return {"drones": drones}

@app.post("/api/fl/sync-weights")
async def sync_fl_weights(payload: FederatedWeightSync):
    """
    Federated Learning:
    Receives local model updates from edge devices and updates the global state.
    """
    global global_model_state
    global_model_state["contributors"] += 1
    global_model_state["total_samples"] += payload.training_samples
    global_model_state["last_updated"] = datetime.utcnow().isoformat()
    
    # Simulate a minor version bump every 10 contributors
    if global_model_state["contributors"] % 10 == 0:
        parts = global_model_state["version"].split(".")
        minor = int(parts[-1]) + 1
        global_model_state["version"] = f"v2.0.{minor}"
        
    return {"status": "success", "global_state": global_model_state}

@app.get("/api/fl/global-model")
async def get_fl_global_model():
    """
    Federated Learning:
    Returns the latest global model metadata for edge devices to download.
    """
    return {"global_model": global_model_state}
