import { AlertTriangle, ArrowRight, CheckCircle2, Globe, Route, ShieldAlert, Smartphone } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import CrisisMap from '../components/Map/CrisisMap';
import Button from '../components/UI/Button';
import Badge from '../components/UI/Badge';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { MOCK_CRISIS_EVENTS } from '../config/mockData';
import useGemini from '../hooks/useGemini';
import { useToast } from '../hooks/useToast';
import { getVolunteersWithDistance } from '../utils/distance';
import { hashVolunteerId } from '../utils/hashUtils';
import { getVolunteers, logBreakGlassAccess, saveMission } from '../services/firebaseService';
import { generateMultilingualBrief, sendWhatsApp } from '../services/whatsappService';
import { enrichVolunteersWithRoutes } from '../services/routingService';

const loadingSteps = [
  { label: 'Decrypting minimum necessary data', state: 'done' },
  { label: 'Computing OSRM road distances', state: 'done' },
  { label: 'Running skill-need matching algorithm', state: 'active' },
  { label: 'Generating multilingual mission briefs', state: 'pending' },
];

export default function Matching() {
  const [searchParams] = useSearchParams();
  const crisisId = searchParams.get('crisisId') || 'c001';
  const crisis = useMemo(() => MOCK_CRISIS_EVENTS.find((i) => i.id === crisisId) || MOCK_CRISIS_EVENTS[0], [crisisId]);
  const { matchVolunteers } = useGemini();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [volunteers, setVolunteers] = useState([]);
  const [matches, setMatches] = useState(null);
  const [dispatched, setDispatched] = useState({});
  const [dispatchingAll, setDispatchingAll] = useState(false);
  const [translatedBriefs, setTranslatedBriefs] = useState({});

  useEffect(() => {
    let active = true;
    async function runMatching() {
      setLoading(true);
      try {
        const responderData = await getVolunteers();
        const nearbyByHaversine = getVolunteersWithDistance(responderData, crisis.lat, crisis.lng)
          .filter((v) => v.distance <= 2000);

        // Enrich with OSRM road distances
        const enriched = await enrichVolunteersWithRoutes(nearbyByHaversine, crisis.lat, crisis.lng);

        const response = await new Promise((resolve, reject) => {
          setTimeout(async () => {
            try {
              const result = await matchVolunteers(crisis.type, crisis.location, enriched);
              resolve(result);
            } catch (error) { reject(error); }
          }, 2200);
        });

        if (!active) return;
        setVolunteers(enriched);
        setMatches(response);
      } catch (error) {
        showToast(error.message || 'Unable to match responders.', 'error');
      } finally {
        if (active) setLoading(false);
      }
    }
    runMatching();
    return () => { active = false; };
  }, [crisis, matchVolunteers, showToast]);

  const matchedVolunteers = useMemo(() => {
    if (!matches?.selected) return [];
    return matches.selected
      .map((sel) => {
        const vol = volunteers.find((i) => i.id === sel.id);
        return vol ? { ...vol, selection: sel } : null;
      })
      .filter(Boolean);
  }, [matches, volunteers]);

  const handleDispatch = async (volunteer, selection) => {
    try {
      // Generate multilingual brief
      const briefResult = await generateMultilingualBrief(volunteer, crisis, selection.assignedTask, 'NeighborAid Control');
      const finalMessage = briefResult.finalBrief;

      // Store translated brief for preview
      setTranslatedBriefs((c) => ({ ...c, [volunteer.id]: briefResult }));

      await sendWhatsApp(volunteer.phone, finalMessage);
      const hashedVolunteerId = await hashVolunteerId(volunteer.id);

      await logBreakGlassAccess({
        timestamp: new Date().toISOString(),
        volunteerId_hashed: hashedVolunteerId,
        crisisId: crisis.id,
        fieldsAccessed: ['phone', 'skills', 'location'].join(', '),
        coordinatorId: 'coordinator_demo',
      });

      await saveMission({
        crisisId: crisis.id,
        volunteerId: volunteer.id,
        volunteerName: selection.anonymizedName,
        phone: volunteer.phone,
        primarySkill: selection.primarySkill,
        assignedTask: selection.assignedTask,
        status: 'Notified',
        statusHistory: [{ status: 'Notified', at: new Date().toISOString() }],
        whatsappPreview: finalMessage,
        translatedLanguage: briefResult.language,
      });

      setDispatched((c) => ({ ...c, [volunteer.id]: true }));
      showToast(`Mission dispatched to ${selection.anonymizedName} in ${briefResult.language}`, 'success');
    } catch (error) {
      showToast(error.message || 'Dispatch failed.', 'error');
    }
  };

  const handleDispatchAll = async () => {
    setDispatchingAll(true);
    try {
      for (const volunteer of matchedVolunteers) {
        if (!dispatched[volunteer.id]) {
          await handleDispatch(volunteer, volunteer.selection);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } finally { setDispatchingAll(false); }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 rounded-[28px] border border-red-200 bg-red-50 p-5 shadow-card breakglass-active">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-white p-3 text-red-600 shadow-sm"><ShieldAlert className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-700">Break-Glass Active</p>
              <h1 className="mt-1 text-2xl font-bold text-navy">{crisis.type} response in progress</h1>
              <p className="mt-1 text-sm text-slate-600">
                Activated at {new Date().toLocaleString('en-IN')} · All access logged · OSRM routing active
              </p>
            </div>
          </div>
          <Button type="button" variant="danger" onClick={handleDispatchAll} loading={dispatchingAll}>Dispatch All</Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-[28px] border border-slate-100 bg-white p-8 shadow-card">
          <LoadingSpinner label="Gemini AI is analyzing signals and computing OSRM road routes..." />
          <div className="mt-8 grid gap-3">
            {loadingSteps.map((step) => (
              <div key={step.label} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                  step.state === 'done' ? 'bg-green-100 text-green-700' : step.state === 'active' ? 'bg-primary-100 text-primary-700' : 'bg-slate-200 text-slate-500'
                }`}>{step.state === 'done' ? '✓' : step.state === 'active' ? '⟳' : '○'}</span>
                <p className="text-sm font-medium text-slate-700">{step.label}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="space-y-5">
            <div className="rounded-3xl border border-primary-100 bg-primary-50 p-5 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-700">Gemini Brief</p>
              <p className="mt-2 text-base font-medium text-navy">{matches?.coordinatorBrief}</p>
              <p className="mt-2 text-sm text-slate-600">{matches?.totalResponseCapacity}</p>
            </div>

            {matchedVolunteers.length === 0 && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5" />
                  <p className="font-medium">No nearby volunteers within the 2km response radius.</p>
                </div>
              </div>
            )}

            {matchedVolunteers.map((volunteer) => {
              const { selection } = volunteer;
              const isDispatched = dispatched[volunteer.id];
              const brief = translatedBriefs[volunteer.id];
              const preferredLang = (volunteer.languages || []).find(
                (l) => l !== 'English' && ['Malayalam', 'Tamil', 'Hindi'].includes(l),
              );

              return (
                <article key={volunteer.id} className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-3 w-3 rounded-full bg-green-500" />
                        <h2 className="font-heading text-xl font-semibold text-navy">{selection.anonymizedName}</h2>
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-700">Skill: {selection.primarySkill}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Route className="h-3.5 w-3.5" />
                          {volunteer.roadDistance ? `${(volunteer.roadDistance / 1000).toFixed(1)}km road` : `${selection.distanceMeters}m`}
                        </span>
                        <span>🕐 {volunteer.roadDurationText || selection.estimatedArrival}</span>
                        {volunteer.routeSource === 'osrm' && <Badge color="green" className="text-[10px]">OSRM</Badge>}
                      </div>
                    </div>
                    <div className="rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
                      {selection.skillMatchPercent}% ✓
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">Assigned Task:</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">"{selection.assignedTask}"</p>
                  </div>

                  {/* Language badge */}
                  {preferredLang && (
                    <div className="mt-3 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-indigo-500" />
                      <span className="text-xs font-medium text-indigo-600">
                        Brief will be translated to {preferredLang}
                      </span>
                    </div>
                  )}

                  {/* Translated brief preview */}
                  {brief && brief.language !== 'English' && brief.method === 'gemini' && (
                    <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
                      <p className="text-xs font-semibold text-indigo-700">🌐 Translated to {brief.language}</p>
                      <p className="mt-1 text-xs text-indigo-600 line-clamp-3">{brief.translated?.slice(0, 200)}...</p>
                    </div>
                  )}

                  <div className="mt-5 flex flex-col gap-3">
                    <Button type="button" variant={isDispatched ? 'success' : 'primary'} disabled={isDispatched}
                      onClick={() => handleDispatch(volunteer, selection)}>
                      {isDispatched ? <CheckCircle2 className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                      {isDispatched ? 'Dispatched' : `DISPATCH VIA WHATSAPP${preferredLang ? ` (${preferredLang})` : ''}`}
                    </Button>
                    {isDispatched && (
                      <Link to={`/missions?crisisId=${crisis.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700">
                        View Mission Tracker <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </section>

          <section>
            <div className="h-[720px]">
              <CrisisMap crises={[crisis]} volunteers={matchedVolunteers} selectedCrisis={crisis} />
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
