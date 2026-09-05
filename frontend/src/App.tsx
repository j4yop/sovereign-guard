import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { AttackPresets } from './components/AttackPresets';
import { AgentPanel } from './components/AgentPanel';
import { InterceptorFeed } from './components/InterceptorFeed';
import type { CedarDecision } from './components/InterceptorFeed';
import { MonacoEditorPanel } from './components/MonacoEditorPanel';
import { ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

type EngineKind = 'rust' | 'python';
type Deployment = 'vercel' | 'local';

export const App: React.FC = () => {
  const [systemArmed] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [agentEvents, setAgentEvents] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<CedarDecision[]>([]);
  const [policyCode, setPolicyCode] = useState<string>('');
  const [isReloading, setIsReloading] = useState(false);
  const [reloadStatus, setReloadStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [cedarLatency, setCedarLatency] = useState<number>(0.16);
  const [engineKind, setEngineKind] = useState<EngineKind>('rust');
  const [deployment, setDeployment] = useState<Deployment>('local');

  const socketRef = useRef<WebSocket | null>(null);

  // Play synthetic Web Audio alert tones + canvas-confetti on PERMIT verdicts
  const playAudioCue = (type: 'DENY' | 'PERMIT') => {
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
        try {
          confetti({
            particleCount: 70,
            spread: 70,
            startVelocity: 25,
            origin: { y: 0.35 },
            colors: ['#10b981', '#22d3ee', '#34d399'],
            scalar: 0.7,
          });
        } catch {
          // confetti may not be available in some environments; harmless.
        }
      }
    } catch (e) {
      // AudioContext suppressed before user gesture
    }
  };

  // Fetch initial policies and health
  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const [policiesRes, healthRes] = await Promise.all([
          fetch('/api/policies'),
          fetch('/api/health'),
        ]);
        if (policiesRes.ok) {
          const data = await policiesRes.json();
          setPolicyCode(data.policies);
        }
        if (healthRes.ok) {
          const data = await healthRes.json();
          if (data.cedar_engine_kind === 'python' || data.cedar_engine_kind === 'rust') {
            setEngineKind(data.cedar_engine_kind);
          }
          if (data.deployment === 'vercel' || data.deployment === 'local') {
            setDeployment(data.deployment);
          }
        }
      } catch (err) {
        console.error('Failed to load initial state:', err);
      }
    };
    fetchPolicies();
  }, []);

  // Connect WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/agent`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

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
      console.warn('WebSocket connection error, falling back to REST');
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => {
      ws.close();
    };
  }, [soundEnabled]);

  // Trigger agent run via WebSocket or fallback to REST
  const handleRunPrompt = async (inputPrompt?: string, presetId?: string) => {
    const targetPrompt = inputPrompt || prompt;
    if (!targetPrompt.trim() || isRunning) return;

    setIsRunning(true);
    setAgentEvents([]);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          prompt: targetPrompt,
          preset_id: presetId,
        })
      );
    } else {
      // REST fallback
      try {
        const res = await fetch('/api/agent/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: targetPrompt, preset_id: presetId }),
        });
        if (res.ok) {
          const data = await res.json();
          setAgentEvents(data.events);
          const verdictEvent = data.events.find((e: any) => e.type === 'cedar_verdict');
          if (verdictEvent) {
            setDecisions((prev) => [verdictEvent.data, ...prev]);
            setCedarLatency(verdictEvent.data.latency_ms);
            playAudioCue(verdictEvent.data.verdict);
          }
        }
      } catch (err) {
        console.error('REST call failed:', err);
      } finally {
        setIsRunning(false);
      }
    }
  };

  // Hot Reload Policies
  const handleHotReload = async () => {
    setIsReloading(true);
    setReloadStatus(null);
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
      } else {
        setReloadStatus({
          success: false,
          message: data.detail || 'Failed to compile Cedar policies',
        });
      }
    } catch (e: any) {
      setReloadStatus({
        success: false,
        message: e.message || 'Connection error',
      });
    } finally {
      setIsReloading(false);
    }
  };

  const blockedCount = decisions.filter((d) => !d.allowed).length;
  const permittedCount = decisions.filter((d) => d.allowed).length;

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Top Navigation & Metrics Header */}
      <Navbar
        systemArmed={systemArmed}
        cedarLatency={cedarLatency}
        blockedCount={blockedCount}
        permittedCount={permittedCount}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        engineKind={engineKind}
        deployment={deployment}
      />

      {/* Main Command Center Surface */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 md:p-6 space-y-5">
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

        {/* Enterprise Security Architecture Status Footer */}
        <footer className="border-t border-slate-800/80 pt-4 pb-6 flex flex-col md:flex-row items-center justify-between text-[11px] font-mono text-slate-400 gap-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              SovereignGuard Zero-Trust Architecture: Active
            </span>
            <span>•</span>
            <span>AWS Cedar Engine v4.8 (Sub-Millisecond Formal Reasoning)</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Bharat Builds Tour 2026</span>
            <span>•</span>
            <span className="text-slate-300">Track 1: Build It Winner</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
