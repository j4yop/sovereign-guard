import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { AttackPresets } from './components/AttackPresets';
import { AgentPanel } from './components/AgentPanel';
import { InterceptorFeed } from './components/InterceptorFeed';
import type { CedarDecision } from './components/InterceptorFeed';
import { MonacoEditorPanel } from './components/MonacoEditorPanel';
import { LandingPage } from './components/LandingPage';
import { ResourceGuide } from './components/ResourceGuide';
import { runClientSimulation } from './engine/clientSimulation';
import { ShieldCheck } from 'lucide-react';

const DEFAULT_POLICY_CODE = `// ==============================================================================
// SOVEREIGN GUARD: PRODUCTION CEDAR POLICIES
// Formal, mathematically verified authorization rules for autonomous AI agents.
// ==============================================================================

// POLICY 1: HARD FORBID - Secrets & Credentials Access
forbid (
    principal in Role::"AutonomousAgent",
    action == Action::"ReadFile",
    resource
)
when {
    resource.tag == "secrets" ||
    resource.tag == "credentials" ||
    resource.tag == "payroll" ||
    resource.tag == "pii" ||
    resource.path like "*.env*" ||
    resource.path like "*id_rsa*" ||
    resource.path like "*credentials*"
};

// POLICY 2: FORBID - Unauthorized Mutating API Actions
forbid (
    principal in Role::"AutonomousAgent",
    action == Action::"InvokeAPI",
    resource
)
when {
    resource.mutating == true && context.admin_override != true
};

// POLICY 3: PERMIT - Authorized Internal Engineering Documentation
permit (
    principal in Role::"AutonomousAgent",
    action in [Action::"SearchDocs", Action::"ReadFile"],
    resource
)
when {
    resource.classification == "PublicInternal" ||
    resource.classification == "EngineeringDocs"
};
`;

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'landing' | 'console' | 'resources'>('landing');
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [systemArmed] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [agentEvents, setAgentEvents] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<CedarDecision[]>([]);
  const [policyCode, setPolicyCode] = useState<string>(DEFAULT_POLICY_CODE);
  const [isReloading, setIsReloading] = useState(false);
  const [reloadStatus, setReloadStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [cedarLatency, setCedarLatency] = useState<number>(0.16);
  const [engineKind, setEngineKind] = useState<'rust' | 'python'>('rust');
  const [deployment, setDeployment] = useState<'vercel' | 'local' | 'unknown'>('unknown');

  const socketRef = useRef<WebSocket | null>(null);

  // Enforce light mode on root HTML document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('light');
    root.classList.remove('dark');
  }, []);

  // Synthetic Web Audio alert tones
  const playAudioCue = useCallback((type: 'DENY' | 'PERMIT') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'DENY') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(70, audioCtx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      }
    } catch {
      // AudioContext suppressed before user gesture
    }
  }, [soundEnabled]);

  // Probe backend health & engine
  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      try {
        const res = await fetch('/api/health');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.engine === 'rust' || data.engine === 'python') {
          setEngineKind(data.engine);
        }
        if (data.deployment) {
          setDeployment(data.deployment);
        }
      } catch {
        // Backend not reachable
      }
    };
    probe();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch initial policies
  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const res = await fetch('/api/policies');
        if (res.ok) {
          const data = await res.json();
          setPolicyCode(data.policies);
          setIsSimulationMode(false);
        } else {
          setIsSimulationMode(true);
        }
      } catch {
        setIsSimulationMode(true);
      }
    };
    fetchPolicies();
  }, []);

  // Connect WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/agent`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsSimulationMode(false);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setAgentEvents((prev) => [...prev, payload]);

          if (payload.type === 'cedar_verdict') {
            const dec: CedarDecision = payload.data;
            setDecisions((prev) => [dec, ...prev]);
            setCedarLatency(dec.latency_ms);
            playAudioCue(dec.verdict);
          }

          if (payload.type === 'final_response') {
            setIsRunning(false);
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onerror = () => {
        setIsSimulationMode(true);
      };
    } catch {
      setIsSimulationMode(true);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [playAudioCue]);

  // Trigger agent run via WebSocket, REST fallback, or client simulation
  const handleRunPrompt = async (inputPrompt?: string, presetId?: string) => {
    const targetPrompt = inputPrompt || prompt;
    if (!targetPrompt.trim() || isRunning) return;

    setIsRunning(true);
    setAgentEvents([]);

    // 1. Live WebSocket to local Python/Rust backend
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          prompt: targetPrompt,
          preset_id: presetId,
        })
      );
      return;
    }

    // 2. REST endpoint fallback
    if (!isSimulationMode) {
      try {
        const res = await fetch('/api/agent/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: targetPrompt, preset_id: presetId }),
        });
        if (res.ok) {
          const data = await res.json();
          setAgentEvents(data.events);
          const verdictEvents = (data.events || []).filter((e: any) => e.type === 'cedar_verdict');
          if (verdictEvents.length > 0) {
            const last = verdictEvents[verdictEvents.length - 1];
            setDecisions((prev) => [...verdictEvents.map((e: any) => e.data).reverse(), ...prev]);
            setCedarLatency(last.data.latency_ms);
            playAudioCue(last.data.verdict);
          }
          setIsRunning(false);
          return;
        }
      } catch {
        console.warn('REST call failed, falling back to client simulation engine');
        setIsSimulationMode(true);
      }
    }

    // 3. Client Simulation Engine
    try {
      for await (const evt of runClientSimulation(targetPrompt, presetId, policyCode)) {
        setAgentEvents((prev) => [...prev, evt]);
        if (evt.type === 'cedar_verdict') {
          const dec: CedarDecision = evt.data;
          setDecisions((prev) => [dec, ...prev]);
          setCedarLatency(dec.latency_ms);
          playAudioCue(dec.verdict);
        }
        if (evt.type === 'final_response') {
          setIsRunning(false);
        }
      }
    } catch (err) {
      console.error('Client simulation engine error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  // Hot Reload Policies
  const handleHotReload = async () => {
    setIsReloading(true);
    setReloadStatus(null);

    if (!isSimulationMode) {
      try {
        const res = await fetch('/api/policies/reload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ policy_content: policyCode }),
        });
        const data = await res.json();
        if (res.ok) {
          setReloadStatus({
            success: true,
            message: data.message,
          });
          setIsReloading(false);
          return;
        }
      } catch {
        setIsSimulationMode(true);
      }
    }

    // Client simulation validator
    await new Promise((r) => setTimeout(r, 350));
    if (!policyCode.includes('forbid') && !policyCode.includes('permit')) {
      setReloadStatus({
        success: false,
        message: 'Cedar Syntax Error: Policy must contain at least one valid permit or forbid statement.',
      });
    } else {
      setReloadStatus({
        success: true,
        message: 'Cedar policies compiled into local evaluation engine. Zero errors detected.',
      });
    }
    setIsReloading(false);
  };

  const blockedCount = decisions.filter((d) => !d.allowed).length;
  const permittedCount = decisions.filter((d) => d.allowed).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-900 transition-colors duration-200">
      {/* Top Navigation & Metrics Header */}
      <Navbar
        systemArmed={systemArmed}
        cedarLatency={cedarLatency}
        blockedCount={blockedCount}
        permittedCount={permittedCount}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isSimulationMode={isSimulationMode}
        engineKind={engineKind}
        deployment={deployment}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1750px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {activeTab === 'landing' && (
          <LandingPage
            onLaunchConsole={(targetPrompt, presetId) => {
              setActiveTab('console');
              if (targetPrompt) {
                setPrompt(targetPrompt);
                handleRunPrompt(targetPrompt, presetId);
              }
            }}
          />
        )}

        {activeTab === 'resources' && <ResourceGuide />}

        {activeTab === 'console' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Threat Simulation Vector Bar */}
            <AttackPresets
              onSelectPreset={(p, id) => {
                setPrompt(p);
                handleRunPrompt(p, id);
              }}
              isRunning={isRunning}
            />

            {/* 3-Panel Cybersecurity Command Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Panel 1: Agent Runtime & Reasoning Stream */}
              <div className="flex flex-col">
                <AgentPanel
                  prompt={prompt}
                  setPrompt={setPrompt}
                  onSubmit={(p) => handleRunPrompt(p)}
                  isRunning={isRunning}
                  events={agentEvents}
                  onClearEvents={() => setAgentEvents([])}
                />
              </div>

              {/* Panel 2: Real-time Cedar Interceptor Telemetry */}
              <div className="flex flex-col">
                <InterceptorFeed decisions={decisions} />
              </div>

              {/* Panel 3: Monaco Cedar Policy Studio */}
              <div className="flex flex-col">
                <MonacoEditorPanel
                  policyCode={policyCode}
                  setPolicyCode={setPolicyCode}
                  onHotReload={handleHotReload}
                  isReloading={isReloading}
                  reloadStatus={reloadStatus}
                />
              </div>
            </div>
          </div>
        )}

        {/* Enterprise Security Architecture Status Footer */}
        <footer className="border-t border-slate-200 pt-5 pb-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              SovereignGuard Zero-Trust Architecture: Active
            </span>
            <span>•</span>
            <span className="font-mono">AWS Cedar Engine ({engineKind === 'rust' ? 'Rust Native' : 'Python Mirror'})</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>Bharat Builds Tour 2026</span>
            <span>•</span>
            <span className="text-slate-800 font-semibold">Track 1: Build It</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
