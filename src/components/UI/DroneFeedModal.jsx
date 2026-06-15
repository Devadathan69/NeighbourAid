import { X, Battery, Wifi, LocateFixed } from 'lucide-react';
import Button from './Button';

export default function DroneFeedModal({ drone, onClose }) {
  if (!drone) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-navy/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-[28px] bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-800 p-4">
          <div className="flex items-center gap-3">
            <LocateFixed className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="font-heading text-lg font-bold text-white">Live Feed: {drone.drone_id}</h3>
              <p className="text-xs text-slate-400">Status: {drone.status.toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-300">
            <div className="flex items-center gap-1">
              <Wifi className="h-4 w-4 text-green-400" />
              <span>Stable</span>
            </div>
            <div className="flex items-center gap-1">
              <Battery className="h-4 w-4 text-green-400" />
              <span>{drone.battery}%</span>
            </div>
            <button onClick={onClose} className="ml-4 rounded-full p-2 hover:bg-white/10 text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="relative aspect-video bg-black">
          {/* Simulated Drone Feed */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 font-mono text-[10px] text-green-500 text-shadow-sm">
            <span>REC •</span>
            <span>LAT: {drone.lat.toFixed(4)}</span>
            <span>LNG: {drone.lng.toFixed(4)}</span>
            <span>ALT: 120m</span>
          </div>
          
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="h-full w-full object-cover opacity-80"
            src={drone.stream_url}
          />
          
          {/* Overlay to make it look like a tactical HUD */}
          <div className="pointer-events-none absolute inset-0 border-[1px] border-white/10">
            <div className="absolute top-1/2 left-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 border-[1px] border-cyan-500/50 rounded-full" />
            <div className="absolute top-1/2 left-1/2 h-0.5 w-4 -translate-x-1/2 -translate-y-1/2 bg-cyan-500/50" />
            <div className="absolute top-1/2 left-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-cyan-500/50" />
          </div>
        </div>
      </div>
    </div>
  );
}
