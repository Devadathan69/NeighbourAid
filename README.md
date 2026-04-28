# NeighborAid 2.0: Community-Led Crisis Response
**Winner-Class Prototype for Google Solutions Challenge 2026**

NeighborAid 2.0 is a high-fidelity, production-ready crisis response system designed to eliminate **Detection Lag**, **Resource Invisibility**, and **Communication Barriers** during disasters. Focused on the Kerala monsoon context, it transforms communities into resilient first-response networks using advanced AI and real-time logistics.

---

## 🚀 "9.8-Rated" Innovation Stack

| Feature | Technology | Impact |
|:---|:---|:---|
| **Hybrid Multi-Cloud AI** | Google Gemini + Groq LPU | **Zero-Downtime Intelligence**: Automatic failover between Gemini 2.5 and Groq LPU (Llama 3.3) ensures matching logic works even during quota limits. |
| **Passive Crisis Sensing** | Speech API + Behavioral Data | **Early Warning**: Detects crises via voice distress signatures (Malayalam/English) and behavioral anomalies before official alerts. |
| **OSRM Smart Routing** | OpenStreetMap (OSRM) | **True Logistics**: Replaces straight-line distance with actual road-network ETA and polyline mapping for boat/medical dispatch. |
| **Accessibility SOS** | Accelerometer Hooks | **Inclusive Triggers**: Elderly and disabled users can trigger emergency alerts through simple phone shakes or rapid-tap patterns. |
| **Resilience Score** | Predictive AI | **Proactive Prep**: Analyzes community skill/asset density to predict readiness and recommend pre-positioning of resources. |

---

## 🛠️ Core Features

*   **Admin Command Center**: Real-time crisis dashboard with live maps, "Break-Glass" privacy controls, and AI-assisted dispatch.
*   **Privacy-Preserving Dispatch**: Volunteer data is encrypted via AES-256; only the minimum necessary data is revealed during a declared emergency.
*   **Multilingual WhatsApp Briefs**: Mission instructions are auto-translated into Malayalam, Tamil, or Hindi via the Hybrid AI engine.
*   **Role-Based Access (RBAC)**: Secure Firebase Auth with separate interfaces for Incident Commanders (Admins) and Responders (Volunteers).

---

## 🌐 Live Deployment Guide

NeighborAid 2.0 is designed for modern cloud infrastructure:

*   **Backend (FastAPI)**: Hosted on **Render** (Python 3.12).
*   **Frontend (React/Vite)**: Hosted on **Vercel**.
*   **Keep-Alive**: Configured with `/api/health` to prevent Render's free-tier spin-down.

### Quick Hosting Steps:
1. **Render**: Create Web Service -> `pip install -r requirements.txt` -> `uvicorn main:app --host 0.0.0.0 --port $PORT`.
2. **Vercel**: Connect Repo -> Framework: Vite -> Set `VITE_API_BASE_URL` to your Render URL.
3. **Pinger**: Set up [Cron-job.org](https://cron-job.org) to ping `/api/health` every 14 minutes.

---

## 🚀 Setup & Installation

### 1. Frontend (React + Vite)
```bash
git clone https://github.com/Devadathan69/NeighbourAid.git
npm install
npm run dev
```
**Environment Variables (.env):**
- `VITE_FIREBASE_*`: Your Firebase config.
- `VITE_GEMINI_API_KEY`: Google AI Studio key.
- `VITE_GROQ_API_KEY`: Groq Cloud key (for Hybrid Failover).
- `VITE_API_BASE_URL`: Your backend URL (localhost:8000 for local dev).

### 2. Backend (FastAPI + Twilio)
```bash
cd backend
python -m venv venv
source venv/bin/activate # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload
```
**Environment Variables (backend/.env):**
- `TWILIO_ACCOUNT_SID`: For WhatsApp dispatch.
- `TWILIO_AUTH_TOKEN`: For WhatsApp dispatch.

---

## 🌍 UN SDG Alignment
NeighborAid 2.0 directly supports:
*   **SDG 11: Sustainable Cities & Communities** (Strengthening disaster resilience).
*   **SDG 3: Good Health and Well-being** (Rapid emergency medical coordination).
*   **SDG 9: Industry, Innovation, and Infrastructure** (Resilient local tech).

---

## 🛡️ Security & Privacy
*   **Break-Glass Protocol**: Responders' personal data is locked behind an administrative trigger.
*   **Decryption Guards**: Malformed data is handled gracefully to prevent UI crashes.
*   **Hardened .gitignore**: Sensitive credentials and environment files are strictly excluded from version control.

---


