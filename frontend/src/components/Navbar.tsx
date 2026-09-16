import React from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Volume2,
  VolumeX,
  Terminal,
  Sparkles,
  Sun,
  Moon,
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
  isDarkMode: boolean;
  onToggleTheme: () => void;
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
  isDarkMode,
  onToggleTheme,
  engineKind = 'rust',
  deployment = 'unknown',
}) => {
  return (
    <header className="border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 py-3 sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-[1750px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-3.5">
        {/* Brand identity */}
        <div className="flex items-center justify-between w-full lg:w-auto gap-3.5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-cyan-950/40 border border-emerald-200 dark:border-emerald-500/40 flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Sovereign<span className="text-emerald-600 dark:text-emerald-400">Guard</span>
                </h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold">
                  Zero-Trust Gateway
                </span>
                <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border font-semibold ${
                  systemArmed
                    ? 'bg-emerald-100/70 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-500/30'
                    : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700'
                }`}>
                  {systemArmed ? 'ARMED' : 'STANDBY'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                AWS Cedar Deterministic Gatekeeper for Autonomous AI Agents
              </p>
            </div>
          </div>

          {/* Mobile Theme / Sound Quick Actions */}
          <div className="flex lg:hidden items-center gap-1.5">
            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>

        {/* View Switcher Tabs (Modern Segmented Control) */}
        <nav className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium">
          <button
            onClick={() => onSelectTab('landing')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'landing'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Architecture & Proof</span>
          </button>
          <button
            onClick={() => onSelectTab('console')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'console'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Security Console</span>
          </button>
          <button
            onClick={() => onSelectTab('resources')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'resources'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Resource Hub</span>
          </button>
        </nav>

        {/* Live Metrics Counter & Utility Toggles */}
        <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
          {deployment === 'vercel' && (
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live on Vercel
            </span>
          )}

          {isSimulationMode && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-300 text-[11px]" title="Client simulation mode active">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
              <span className="font-semibold">Client Engine</span>
            </div>
          )}

          {/* Real-time latency gauge */}
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 px-3 py-1 rounded-lg flex items-center gap-2 shadow-2xs">
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">Cedar:</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums text-xs">
              {cedarLatency > 0 ? `${cedarLatency.toFixed(2)}ms` : '< 0.20ms'}
            </span>
            <span className="text-[9px] uppercase px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-semibold">
              {engineKind}
            </span>
          </div>

          {/* Intercept Scoreboard */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 px-3 py-1 rounded-lg shadow-2xs">
            <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 font-bold text-xs">
              <ShieldAlert className="w-3.5 h-3.5" />
              {blockedCount} BLOCKED
            </span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-bold text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              {permittedCount} PERMITTED
            </span>
          </div>

          {/* Audio FX Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute Security Sound Alerts' : 'Enable Security Sound Alerts'}
            className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* GitHub Source Link */}
          <a
            href="https://github.com/j4yop/sovereign-guard"
            target="_blank"
            rel="noreferrer"
            title="View on GitHub"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity font-semibold text-[11px] shadow-2xs"
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
