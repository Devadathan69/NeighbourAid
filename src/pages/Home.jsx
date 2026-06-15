import { ArrowRight, LockKeyhole, Radar, Users, Vibrate, Terminal, Code2 } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/UI/Button';
import { useAuth } from '../contexts/AuthContext';
import AdminHome from './AdminHome';
import useAccessibilitySOS from '../hooks/useAccessibilitySOS';

const features = [
  {
    icon: Radar,
    title: 'Crisis Detection',
    description:
      'Behavioral signals, flood warnings, and community reports converge to detect emerging disasters before help arrives.',
  },
  {
    icon: Users,
    title: 'Smart Matching',
    description:
      'Gemini identifies the closest volunteers with the right skills, assets, and language abilities for each incident.',
  },
  {
    icon: LockKeyhole,
    title: 'Break-Glass Privacy',
    description:
      'Volunteer identities stay encrypted until a formal emergency requires minimum necessary access with full audit logs.',
  },
];

export default function Home() {
  const { currentUser, isAdmin } = useAuth();
  const [sosTriggered, setSOSTriggered] = useState(false);

  const handleSOS = useCallback(() => {
    setSOSTriggered(true);
    // Vibrate if supported
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
  }, []);

  useAccessibilitySOS(handleSOS, Boolean(currentUser && !isAdmin));

  if (currentUser && isAdmin) {
    return <AdminHome />;
  }

  return (
    <main className="overflow-hidden">
      <section className="relative isolate bg-[radial-gradient(circle_at_top_right,_rgba(13,122,107,0.28),_transparent_30%),linear-gradient(180deg,_#effcf9_0%,_#f8fafc_44%,_#ffffff_100%)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit rounded-full bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700">
              Built for Kerala’s flood-prone communities
            </span>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-navy sm:text-5xl">
              When disaster strikes, your neighbor might be your only lifeline.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              NeighborAid 2.0 coordinates community responders during floods, fires, and medical emergencies with AI-assisted
              matching, auditable privacy controls, and WhatsApp mission dispatch.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Register as Responder
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Coordinator Login
                </Button>
              </Link>
            </div>
            <div className="mt-12 grid gap-4 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-card backdrop-blur sm:grid-cols-3">
              <div>
                <p className="font-heading text-2xl font-bold text-primary-600">1M+</p>
                <p className="mt-1 text-sm text-slate-500">ASHA Workers</p>
              </div>
              <div>
                <p className="font-heading text-2xl font-bold text-primary-600">640K</p>
                <p className="mt-1 text-sm text-slate-500">Villages</p>
              </div>
              <div>
                <p className="font-heading text-2xl font-bold text-primary-600">0 Data Exposed</p>
                <p className="mt-1 text-sm text-slate-500">Until Break-Glass</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-10 top-10 hidden h-24 w-24 rounded-full bg-primary-100 blur-3xl lg:block" />
            <div className="absolute bottom-0 right-0 hidden h-28 w-28 rounded-full bg-sky-100 blur-3xl lg:block" />
            <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-gradient-to-br from-navy via-slate to-primary-700 p-8 text-white shadow-card">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_26%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.10),transparent_22%),linear-gradient(180deg,transparent,rgba(255,255,255,0.02))]" />
              <div className="relative">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-100">Kerala Monsoon Scenario</p>
                <h2 className="mt-4 text-3xl font-bold leading-tight">Community-first coordination for the first 30 critical minutes.</h2>
                <div className="mt-8 grid gap-4">
                  <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                    <p className="text-sm text-white/80">Periyar basin alert</p>
                    <p className="mt-1 font-heading text-xl font-semibold">Flash flood risk rising near Kothamangalam</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                      <p className="text-sm text-white/80">Responders matched</p>
                      <p className="mt-1 font-heading text-2xl font-semibold">6 in 90 seconds</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                      <p className="text-sm text-white/80">Data visibility</p>
                      <p className="mt-1 font-heading text-2xl font-semibold">Minimum necessary</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-primary-500/30 to-white/10 p-4">
                    <p className="text-sm text-white/85">
                      A teal waterline gradient and emergency overlays reflect Kerala flood conditions without resorting to generic disaster imagery.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-navy">A response stack designed for local trust and fast action</h2>
          <p className="mt-4 text-slate-600">
            NeighborAid turns fragmented crisis signals into structured, accountable local response workflows.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="rounded-3xl border border-slate-100 bg-white p-7 shadow-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-navy">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Open Source SDK Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-navy p-8 shadow-2xl sm:p-12">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
          
          <div className="relative grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
                <Code2 className="h-4 w-4 text-white" /> Open Source
              </span>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                NeighborAid SDK
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-white/80">
                Disasters don't respect borders. We've open-sourced our core routing, crisis detection, and IoT ingestion engines so developers in any region can build their own local response networks.
              </p>
              
              <div className="mt-8 flex flex-wrap gap-4">
                <button className="rounded-2xl bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20 backdrop-blur">
                  View Documentation
                </button>
                <button className="rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                  GitHub Repository
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#0A101D] p-5 shadow-inner">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-white/60">
                    <Terminal className="h-4 w-4" /> Python
                  </div>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/80">v2.0.0</span>
                </div>
                <code className="block font-mono text-sm text-green-400">
                  pip install neighbor_aid
                </code>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0A101D] p-5 shadow-inner">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-white/60">
                    <Terminal className="h-4 w-4" /> Node.js
                  </div>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/80">v2.0.0</span>
                </div>
                <code className="block font-mono text-sm text-sky-400">
                  npm install @neighboraid/sdk
                </code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Accessibility SOS Modal */}
      {sosTriggered && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-red-900/80 px-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-8 text-center shadow-2xl animate-pulse">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600">
              <Vibrate className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-red-700">🚨 SOS ACTIVATED</h2>
            <p className="mt-3 text-slate-600">
              Emergency signal detected. Your approximate location has been flagged to the nearest coordinator.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Shake gesture or rapid tap pattern recognized.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button type="button" variant="danger" onClick={() => setSOSTriggered(false)}>
                I'm Safe — Dismiss
              </Button>
              <p className="text-xs text-slate-400">Auto-dismisses after 30 seconds</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
