import { ArrowRight, BarChart3, Bell, MapPin, ShieldCheck, Users, UserPlus, Activity, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MOCK_CRISIS_EVENTS, MOCK_VOLUNTEERS } from '../config/mockData';
import { useMemo } from 'react';

export default function AdminHome() {
  const { currentUser } = useAuth();
  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Admin';

  const activeCrises = useMemo(() => MOCK_CRISIS_EVENTS.filter(e => e.status === 'active').length, []);
  const totalVolunteers = MOCK_VOLUNTEERS.length;

  const quickActions = [
    {
      icon: Activity,
      label: 'Command Center',
      description: 'Monitor live crises, activate Break-Glass, and dispatch responders.',
      to: '/dashboard',
      color: 'from-red-500 to-rose-600',
      bgLight: 'bg-red-50',
      textColor: 'text-red-600',
    },
    {
      icon: UserPlus,
      label: 'Manage Admins',
      description: 'Add or review local-level administrators for different regions.',
      to: '/manage-admins',
      color: 'from-primary-500 to-teal-600',
      bgLight: 'bg-primary-50',
      textColor: 'text-primary-600',
    },
    {
      icon: Users,
      label: 'Matching Engine',
      description: 'View Gemini-powered volunteer matching and mission dispatch.',
      to: '/matching',
      color: 'from-indigo-500 to-violet-600',
      bgLight: 'bg-indigo-50',
      textColor: 'text-indigo-600',
    },
    {
      icon: BarChart3,
      label: 'Mission Tracker',
      description: 'Track dispatched missions and volunteer status in real time.',
      to: '/missions',
      color: 'from-amber-500 to-orange-600',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
    {
      icon: TrendingUp,
      label: 'Resilience Score',
      description: 'View AI-computed community readiness and resource gap analysis.',
      to: '/resilience',
      color: 'from-emerald-500 to-green-600',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
  ];

  return (
    <main className="min-h-[calc(100vh-80px)] bg-gradient-to-br from-slate-50 via-white to-primary-50/30">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(13,122,107,0.1),_transparent_50%)]" />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600">Admin Console</p>
              <h1 className="mt-2 text-4xl font-bold text-navy">
                Welcome back, <span className="text-primary-600">{displayName}</span>
              </h1>
              <p className="mt-2 max-w-lg text-slate-500">
                Here's your operational overview. Monitor active emergencies, manage your team, and coordinate community response.
              </p>
            </div>
            <p className="text-sm text-slate-400">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Crises</p>
              <p className="text-2xl font-bold text-navy">{activeCrises}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-primary-100 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Registered Volunteers</p>
              <p className="text-2xl font-bold text-navy">{totalVolunteers}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">System Status</p>
              <p className="text-2xl font-bold text-green-600">Operational</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-xl font-bold text-navy">Quick Actions</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                to={action.to}
                className="group relative overflow-hidden rounded-[24px] border border-slate-100 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${action.color} opacity-[0.07] transition-transform duration-300 group-hover:scale-150`} />
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${action.bgLight} ${action.textColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-navy">{action.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{action.description}</p>
                <div className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${action.textColor} transition-transform duration-200 group-hover:translate-x-1`}>
                  Open <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Active Alerts Preview */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-xl font-bold text-navy">Live Alerts</h2>
        <div className="space-y-3">
          {MOCK_CRISIS_EVENTS.filter(e => e.status === 'active').map((crisis) => (
            <Link
              key={crisis.id}
              to="/dashboard"
              className="flex items-center justify-between rounded-2xl border border-red-100 bg-white px-6 py-4 shadow-sm transition-all hover:border-red-200 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                </span>
                <div>
                  <p className="font-semibold text-navy">{crisis.type}</p>
                  <p className="flex items-center gap-1 text-sm text-slate-500">
                    <MapPin className="h-3 w-3" /> {crisis.location}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase text-red-600">
                  {crisis.severity}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
