import React from 'react';
import { Shield, ShieldAlert, Cpu, Activity, Zap, Volume2, VolumeX } from 'lucide-react';

interface NavbarProps {
  systemArmed: boolean;
  cedarLatency: number;
  blockedCount: number;
  permittedCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  systemArmed,
  cedarLatency,
  blockedCount,
  permittedCount,
  soundEnabled,
  onToggleSound,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 py-3.5 sticky top-0 z-50">
      <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-wider text-slate-100 uppercase">
                Sovereign<span className="text-emerald-400">Guard</span>
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-400">
                Zero-Trust Proxy
              </span>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${
                systemArmed
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}>
                {systemArmed ? 'ARMED' : 'STANDBY'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              AWS Cedar Deterministic Gatekeeper for Local AI Agents
            </p>
          </div>
        </div>

        {/* AWS Tech Stack Pills */}
        <div className="hidden lg:flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            AWS Strands SDK
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            AWS Cedar (Rust Native)
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            OpenSearch DLS
          </span>
        </div>

        {/* Live Metrics Counter & Toggles */}
        <div className="flex items-center gap-4 font-mono text-xs">
          {/* Real-time latency gauge */}
          <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded flex items-center gap-2">
            <span className="text-slate-400">Cedar Latency:</span>
            <span className="text-emerald-400 font-bold tabular-nums">
              {cedarLatency > 0 ? `${cedarLatency.toFixed(2)}ms` : '< 0.20ms'}
            </span>
          </div>

          {/* Intercept Scoreboard */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded">
            <span className="text-red-400 flex items-center gap-1 font-bold">
              <ShieldAlert className="w-3.5 h-3.5" />
              {blockedCount} BLOCKED
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400 flex items-center gap-1 font-bold">
              <Shield className="w-3.5 h-3.5" />
              {permittedCount} PERMITTED
            </span>
          </div>

          {/* Sound FX Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute Security Sound Alerts' : 'Enable Security Sound Alerts'}
            className="p-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
