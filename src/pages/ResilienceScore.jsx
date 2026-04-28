import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Shield, Users, Wrench, Clock, Waves, AlertTriangle, TrendingUp } from 'lucide-react';
import Badge from '../components/UI/Badge';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { getResilienceScore } from '../services/floodService';

function ScoreRing({ score, grade, size = 160 }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#0d7a6b' : score >= 60 ? '#d97706' : '#dc2626';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold" style={{ color }}>{score}</span>
        <span className="text-lg font-semibold text-slate-500">Grade {grade}</span>
      </div>
    </div>
  );
}

function ComponentBar({ label, value, icon: Icon }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
        <span className="text-sm font-bold text-slate-800">{value}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color} transition-all duration-1000`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function ResilienceScore() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await getResilienceScore(10.0559, 76.6497);
        setData(result);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
        <LoadingSpinner label="Computing Community Resilience Score..." />
      </div>
    );
  }

  if (!data) return null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600">Innovative Feature</p>
        <h1 className="mt-2 text-3xl font-bold text-navy">Community Resilience Score</h1>
        <p className="mt-2 text-slate-500">
          AI-computed readiness assessment for Kothamangalam based on volunteer density, skill coverage, assets, and flood preparedness.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Score Ring */}
        <div className="flex flex-col items-center justify-center rounded-[28px] border border-slate-100 bg-white p-8 shadow-card">
          <ScoreRing score={data.score} grade={data.grade} />
          <p className="mt-6 text-center text-sm text-slate-600">
            {data.score >= 80
              ? 'This community is well-prepared for crisis response.'
              : data.score >= 60
                ? 'Moderate preparedness. Some gaps need attention.'
                : 'Critical gaps in crisis readiness. Immediate action needed.'}
          </p>
        </div>

        {/* Component Breakdown */}
        <div className="rounded-[28px] border border-slate-100 bg-white p-8 shadow-card">
          <h2 className="mb-6 text-xl font-bold text-navy">Readiness Components</h2>
          <div className="space-y-5">
            <ComponentBar label="Volunteer Density" value={data.components.volunteer_density} icon={Users} />
            <ComponentBar label="Skill Coverage" value={data.components.skill_coverage} icon={Shield} />
            <ComponentBar label="Asset Availability" value={data.components.asset_coverage} icon={Wrench} />
            <ComponentBar label="Response Time" value={data.components.response_time} icon={Clock} />
            <ComponentBar label="Flood Preparedness" value={data.components.flood_preparedness} icon={Waves} />
          </div>
        </div>
      </div>

      {/* Gaps & Recommendations */}
      {data.gaps && data.gaps.length > 0 && (
        <div className="mt-6 rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-bold text-amber-900">Identified Gaps</h2>
          </div>
          <div className="space-y-3">
            {data.gaps.map((gap) => (
              <div key={gap.area} className="flex items-start gap-3 rounded-2xl bg-white p-4">
                <Badge color={gap.severity === 'high' ? 'red' : 'amber'}>{gap.severity}</Badge>
                <div>
                  <p className="font-semibold text-slate-800">{gap.area}</p>
                  <p className="mt-1 text-sm text-slate-600">{gap.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Predictive Pre-positioning */}
      <div className="mt-6 rounded-[28px] border border-primary-100 bg-gradient-to-r from-primary-50 to-teal-50 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-bold text-navy">Predictive Resource Pre-positioning</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Based on the current flood risk and community gaps, NeighborAid recommends pre-positioning these resources:
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { resource: '🚤 Rescue Boats', location: 'Ward 7 Junction', reason: 'High flood risk zone' },
            { resource: '⚡ Generators', location: 'Parish Community Hall', reason: 'Power backup for shelter' },
            { resource: '🏥 First Aid Kits', location: 'KSRTC Bus Stand', reason: 'High foot traffic area' },
          ].map((item) => (
            <div key={item.resource} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="font-semibold text-slate-800">{item.resource}</p>
              <p className="mt-1 text-xs text-slate-500">📍 {item.location}</p>
              <p className="mt-1 text-xs text-primary-600">{item.reason}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
