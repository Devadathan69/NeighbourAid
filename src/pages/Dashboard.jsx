import { AlertTriangle, BrainCircuit, Clock3, Mic, MicOff, ShieldAlert, Siren, Sparkles, Users, Waves, Activity } from 'lucide-react';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Layout/Sidebar';
import CrisisMap from '../components/Map/CrisisMap';
import Button from '../components/UI/Button';
import Badge from '../components/UI/Badge';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { MOCK_CRISIS_EVENTS, MOCK_VOLUNTEERS } from '../config/mockData';
import useGemini from '../hooks/useGemini';
import { useToast } from '../hooks/useToast';
import { activateBreakGlass } from '../services/firebaseService';
import { getFloodRiskData, detectCrisis } from '../services/floodService';
import { getActiveDrones, getActiveVolunteers } from '../services/prototypeService';
import DroneFeedModal from '../components/UI/DroneFeedModal';

function timeAgo(dateString) {
  const diffMinutes = Math.max(1, Math.round((Date.now() - new Date(dateString).getTime()) / 60000));
  if (diffMinutes < 60) return `${diffMinutes} mins ago`;
  const hours = Math.round(diffMinutes / 60);
  return `${hours} hr${hours > 1 ? 's' : ''} ago`;
}

function severityStyles(severity) {
  if (severity === 'critical') return { border: 'border-red-500', badge: 'red' };
  if (severity === 'high') return { border: 'border-amber-500', badge: 'amber' };
  return { border: 'border-yellow-500', badge: 'yellow' };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { analyzeCrisis, parseVoiceCommand, loading: aiLoading } = useGemini();
  const { showToast } = useToast();
  const [selectedCrisisId, setSelectedCrisisId] = useState(MOCK_CRISIS_EVENTS[0]?.id || '');
  const [analysisCache, setAnalysisCache] = useState({});
  const [now, setNow] = useState(new Date());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activating, setActivating] = useState(false);

  // Flood API state
  const [floodData, setFloodData] = useState(null);
  const [floodLoading, setFloodLoading] = useState(true);

  // Passive sensing state
  const [sensingActive, setSensingActive] = useState(true);
  const [sensingPulse, setSensingPulse] = useState(0);

  // Voice command state
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResult, setVoiceResult] = useState(null);

  // Prototype Features State
  const [drones, setDrones] = useState([]);
  const [activeVolunteers, setActiveVolunteers] = useState([]);
  const [selectedDrone, setSelectedDrone] = useState(null);

  const selectedCrisis = useMemo(
    () => MOCK_CRISIS_EVENTS.find((c) => c.id === selectedCrisisId) || MOCK_CRISIS_EVENTS[0],
    [selectedCrisisId],
  );

  // Clock tick
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Passive sensing pulse
  useEffect(() => {
    if (!sensingActive) return;
    const interval = setInterval(() => setSensingPulse((p) => p + 1), 3000);
    return () => clearInterval(interval);
  }, [sensingActive]);

  // Fetch flood data
  useEffect(() => {
    async function loadFlood() {
      setFloodLoading(true);
      try {
        const data = await getFloodRiskData(10.0559, 76.6497);
        setFloodData(data);
      } catch (e) { console.error(e); }
      finally { setFloodLoading(false); }
    }
    async function loadPrototypeData() {
      try {
        const droneData = await getActiveDrones();
        setDrones(droneData.drones || []);
        
        const volunteerData = await getActiveVolunteers();
        setActiveVolunteers(volunteerData.active_volunteers || []);
      } catch (e) { console.error(e); }
    }
    
    loadFlood();
    loadPrototypeData();
    const interval = setInterval(() => {
      loadFlood();
      loadPrototypeData();
    }, 15000); // 15 seconds for prototype to look real-time
    return () => clearInterval(interval);
  }, []);

  // AI analysis for selected crisis
  useEffect(() => {
    let active = true;
    async function loadAnalysis() {
      if (!selectedCrisis || analysisCache[selectedCrisis.id]) return;
      try {
        const analysis = await analyzeCrisis(selectedCrisis);
        if (active) setAnalysisCache((c) => ({ ...c, [selectedCrisis.id]: analysis }));
      } catch (error) {
        showToast(error.message || 'Unable to analyze crisis.', 'warning');
      }
    }
    loadAnalysis();
    return () => { active = false; };
  }, [selectedCrisis, analysisCache, analyzeCrisis, showToast]);

  // Voice command handler
  const handleVoiceToggle = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast('Speech recognition is not supported in this browser.', 'error');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceTranscript('');
      setVoiceResult(null);
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setVoiceTranscript(transcript);
      setIsListening(false);
      try {
        const result = await parseVoiceCommand(transcript);
        setVoiceResult(result);
        if (result.understood) {
          showToast(`Voice: Detected ${result.crisis_type} — ${result.summary}`, 'success');
        } else {
          showToast('Could not parse voice command. Try again.', 'warning');
        }
      } catch (e) {
        showToast('Voice processing failed.', 'error');
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      showToast('Voice recognition error. Please try again.', 'error');
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
  }, [isListening, parseVoiceCommand, showToast]);

  const handleBreakGlass = async () => {
    if (!selectedCrisis) { showToast('Select a crisis first.', 'warning'); return; }
    setActivating(true);
    try {
      await activateBreakGlass(selectedCrisis.id, 'coordinator_demo');
      showToast('Break-Glass activated. Redirecting to response matching.', 'success');
      setTimeout(() => navigate(`/matching?crisisId=${selectedCrisis.id}`), 2000);
    } catch (error) {
      showToast(error.message || 'Break-Glass activation failed.', 'error');
    } finally { setActivating(false); setConfirmOpen(false); }
  };

  const topFloodRisk = floodData?.risks?.[0];

  return (
    <main className="min-h-[calc(100vh-80px)] bg-slate-100">
      <div className="grid min-h-[calc(100vh-80px)] lg:grid-cols-[320px_1fr]">
        <Sidebar className="p-6">
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 pb-5">
              <p className="text-sm uppercase tracking-[0.2em] text-primary-100">Crisis Command Center</p>
              <h1 className="mt-3 text-2xl font-bold">Kothamangalam Ops</h1>
              <p className="mt-2 flex items-center gap-2 text-sm text-white/75">
                <Clock3 className="h-4 w-4" />
                {now.toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>

            {/* Voice Command */}
            <div className="mt-4 rounded-2xl bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isListening ? <Mic className="h-4 w-4 text-red-400 animate-pulse" /> : <MicOff className="h-4 w-4 text-white/50" />}
                  <p className="text-sm font-semibold">Voice Command</p>
                </div>
                <button type="button" onClick={handleVoiceToggle}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                  {isListening ? 'Listening...' : 'Speak'}
                </button>
              </div>
              {voiceTranscript && <p className="mt-2 text-xs text-white/70 italic">"{voiceTranscript}"</p>}
              {voiceResult?.understood && (
                <p className="mt-1 text-xs text-primary-200">→ {voiceResult.crisis_type}: {voiceResult.summary}</p>
              )}
            </div>

            {/* Passive Sensing */}
            <div className="mt-3 rounded-2xl bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className={`h-4 w-4 ${sensingActive ? 'text-green-400 animate-pulse' : 'text-white/40'}`} />
                  <p className="text-sm font-semibold">Passive Sensing</p>
                </div>
                <Badge color={sensingActive ? 'green' : 'navy'}>{sensingActive ? 'ACTIVE' : 'OFF'}</Badge>
              </div>
              <p className="mt-2 text-xs text-white/60">
                {sensingActive ? `Monitoring ${847 + sensingPulse} signals · ${MOCK_VOLUNTEERS.length} device clusters` : 'Sensing paused'}
              </p>
            </div>

            {/* Active Alerts */}
            <div className="mt-6 min-h-0 flex-1 overflow-hidden">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-heading text-lg font-semibold">Active Alerts</h2>
                <Badge color="red" className="animate-pulse">LIVE</Badge>
              </div>
              <div className="max-h-[280px] space-y-4 overflow-y-auto pr-1">
                {MOCK_CRISIS_EVENTS.map((crisis) => {
                  const style = severityStyles(crisis.severity);
                  const expanded = crisis.id === selectedCrisisId;
                  return (
                    <button type="button" key={crisis.id} onClick={() => setSelectedCrisisId(crisis.id)}
                      className={`w-full rounded-2xl border-l-4 bg-white/10 p-4 text-left backdrop-blur ${style.border} ${expanded ? 'ring-2 ring-white/20' : 'hover:bg-white/15'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{crisis.type}</p>
                          <p className="mt-1 text-sm text-white/70">{crisis.location}</p>
                        </div>
                        <Badge color={style.badge}>{crisis.confidence}%</Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-white/70">
                        <span>{timeAgo(crisis.reportedAt)}</span>
                        <span>{crisis.affectedEstimate}</span>
                      </div>
                      {expanded && (
                        <div className="mt-4 border-t border-white/10 pt-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-100">Signals</p>
                          <ul className="mt-2 space-y-2 text-sm text-white/80">
                            {crisis.signals.map((signal) => (
                              <li key={signal} className="flex gap-2">
                                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary-100" />
                                <span>{signal}</span>
                              </li>
                            ))}
                          </ul>
                          <Button type="button" variant="danger" className="mt-4 w-full" onClick={() => setConfirmOpen(true)}>
                            Activate Break-Glass
                          </Button>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* AI Analysis Panel */}
              {selectedCrisis && (
                <div className="mt-6 rounded-3xl bg-white/10 p-5 backdrop-blur">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-primary-100">Selected Crisis</p>
                      <h3 className="mt-2 text-xl font-semibold">{selectedCrisis.type}</h3>
                    </div>
                    <Badge color={severityStyles(selectedCrisis.severity).badge}>{selectedCrisis.status}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-white/75">{selectedCrisis.location}</p>
                  <div className="mt-5">
                    <div className="mb-3 flex items-center gap-2">
                      <BrainCircuit className="h-4 w-4 text-primary-100" />
                      <p className="text-sm font-semibold">Gemini AI Analysis</p>
                    </div>
                    {aiLoading && !analysisCache[selectedCrisis.id] ? (
                      <div className="rounded-2xl bg-white/10 p-4">
                        <LoadingSpinner label="Gemini AI is analyzing..." />
                      </div>
                    ) : (
                      <div className="space-y-3 text-sm text-white/80">
                        <p>{analysisCache[selectedCrisis.id]?.summary || 'Awaiting AI assessment.'}</p>
                        <ul className="space-y-2">
                          {(analysisCache[selectedCrisis.id]?.recommendedActions || []).map((action) => (
                            <li key={action} className="flex gap-2">
                              <Siren className="mt-0.5 h-4 w-4 shrink-0 text-primary-100" />
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <Button type="button" variant="danger" className="mt-6 w-full text-base breakglass-active" onClick={() => setConfirmOpen(true)}>
                    🔴 ACTIVATE BREAK-GLASS
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Sidebar>

        <section className="p-4 sm:p-6 lg:p-8">
          {/* Stats Row */}
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl bg-white p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-red-50 p-3 text-red-600"><AlertTriangle className="h-5 w-5" /></div>
                <div>
                  <p className="text-sm text-slate-500">Active crises</p>
                  <p className="font-heading text-2xl font-bold text-navy">{MOCK_CRISIS_EVENTS.filter((i) => i.status === 'active').length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary-50 p-3 text-primary-600"><Users className="h-5 w-5" /></div>
                <div>
                  <p className="text-sm text-slate-500">Registered responders</p>
                  <p className="font-heading text-2xl font-bold text-navy">{MOCK_VOLUNTEERS.length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-600"><ShieldAlert className="h-5 w-5" /></div>
                <div>
                  <p className="text-sm text-slate-500">Privacy status</p>
                  <p className="font-heading text-2xl font-bold text-navy">Encrypted</p>
                </div>
              </div>
            </div>
            {/* Flood Risk Card */}
            <div className="rounded-3xl bg-white p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className={`rounded-2xl p-3 ${topFloodRisk?.risk_level === 'HIGH' || topFloodRisk?.risk_level === 'EXTREME' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                  <Waves className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Flood Risk</p>
                  <p className={`font-heading text-2xl font-bold ${topFloodRisk?.risk_level === 'HIGH' || topFloodRisk?.risk_level === 'EXTREME' ? 'text-blue-700' : 'text-green-700'}`}>
                    {floodLoading ? '...' : topFloodRisk?.risk_level || 'LOW'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Flood Advisory Banner */}
          {topFloodRisk && (topFloodRisk.risk_level === 'HIGH' || topFloodRisk.risk_level === 'EXTREME') && (
            <div className="mb-6 rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Waves className="mt-0.5 h-5 w-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-blue-800">
                    🌊 Flood Forecasting Alert — {topFloodRisk.basin_name}
                  </p>
                  <p className="mt-1 text-sm text-blue-700">{topFloodRisk.advisory}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-blue-600">
                    <span>📏 {topFloodRisk.distance_km}km away</span>
                    <span>🌧️ {topFloodRisk.rainfall_6h_mm}mm / 6h</span>
                    <span>📊 Gauge: {topFloodRisk.avg_gauge_capacity_pct}%</span>
                    <span>⏰ Next 6h: {topFloodRisk.forecast?.next_6h}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="h-[620px]">
            <CrisisMap 
              crises={MOCK_CRISIS_EVENTS} 
              volunteers={activeVolunteers.length > 0 ? activeVolunteers : MOCK_VOLUNTEERS} 
              selectedCrisis={selectedCrisis} 
              floodData={floodData} 
              drones={drones}
              onDroneClick={setSelectedDrone}
            />
          </div>
        </section>
      </div>

      {selectedDrone && (
        <DroneFeedModal drone={selectedDrone} onClose={() => setSelectedDrone(null)} />
      )}

      {/* Break-Glass Confirmation Modal */}
      {confirmOpen && selectedCrisis && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/55 px-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-8 shadow-card">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-red-50 p-3 text-red-600"><ShieldAlert className="h-6 w-6" /></div>
              <div>
                <h2 className="text-2xl font-bold text-navy">Confirm Break-Glass activation</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  This will temporarily grant access to minimum necessary volunteer data. All access will be logged. Continue?
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)} disabled={activating}>Cancel</Button>
              <Button type="button" variant="danger" onClick={handleBreakGlass} loading={activating}>
                {activating ? 'Gemini AI activating...' : 'Continue'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
