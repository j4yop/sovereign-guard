import React from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Volume2,
  VolumeX,
  Terminal,
  Layers,
  BookOpen
} from 'lucide-react';

interface NavbarProps {
  systemArmed: boolean;
  cedarLatency: number;
  blockedCount: number;
  permittedCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  activeTab: 'landing' | 'console' | 'resources';
  onSelectTab: (tab: 'landing' | 'console' | 'resources') => void;
  isSimulationMode?: boolean;
  engineKind?: 'rust' | 'python';
  deployment?: 'vercel' | 'local' | 'unknown';
}

export const Navbar: React.FC<NavbarProps> = ({
  systemArmed,
  cedarLatency,
  blockedCount,
  permittedCount,
  soundEnabled,
  onToggleSound,
  activeTab,
  onSelectTab,
  isSimulationMode = false,
  engineKind = 'rust',
  deployment = 'unknown',
}) => {
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-sm px-4 sm:px-6 py-2.5 sticky top-0 z-50">
      <div className="max-w-[1750px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center justify-between w-full lg:w-auto gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900">
                  Sovereign<span className="text-emerald-700">Guard</span>
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  v1.2
                </span>
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border ${
                  systemArmed
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${systemArmed ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                  {systemArmed ? 'Armed' : 'Standby'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal">
                Deterministic AWS Cedar policy gateway for local AI agents
              </p>
            </div>
          </div>
        </div>

        {/* Primary View Switcher Tabs (Sleek Linear-style pill) */}
        <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200 text-xs font-medium">
          <button
            onClick={() => onSelectTab('landing')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'landing'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-slate-700" />
            <span>Overview & Architecture</span>
          </button>
          <button
            onClick={() => onSelectTab('console')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'console'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-700" />
            <span>Security Console</span>
          </button>
          <button
            onClick={() => onSelectTab('resources')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'resources'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-700" />
            <span>Policy Specs & Guide</span>
          </button>
        </nav>

        {/* Live Metrics & Utilities HUD */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {deployment === 'vercel' && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              Live on Vercel
            </span>
          )}

          {isSimulationMode && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-medium" title="In-browser client simulation mode">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
              <span>Client Simulation</span>
            </div>
          )}

          {/* Real-time latency gauge */}
          <div className="bg-white border border-slate-200 px-3 py-1 rounded-lg flex items-center gap-2 shadow-2xs font-mono text-[11px]">
            <span className="text-slate-500">Cedar:</span>
            <span className="text-emerald-700 font-bold tabular-nums">
              {cedarLatency > 0 ? `${cedarLatency.toFixed(2)}ms` : '< 0.20ms'}
            </span>
            <span className="text-[9px] uppercase px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-semibold">
              {engineKind}
            </span>
          </div>

          {/* Intercept Scoreboard */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-2xs font-mono text-[11px]">
            <span className="text-rose-700 flex items-center gap-1 font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              {blockedCount} Denied
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-700 flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              {permittedCount} Permitted
            </span>
          </div>

          {/* Audio Alert Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute Security Sound Alerts' : 'Enable Security Sound Alerts'}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-700" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {/* GitHub Link */}
          <a
            href="https://github.com/j4yop/sovereign-guard"
            target="_blank"
            rel="noreferrer"
            title="View on GitHub"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-[11px] shadow-2xs transition-colors"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
};
