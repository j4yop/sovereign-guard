import React, { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Zap, ChevronDown, ChevronUp, Layers, AlertOctagon } from 'lucide-react';

export interface CedarDecision {
  timestamp: number;
  principal: string;
  action: string;
  resource: string;
  resource_attrs: Record<string, any>;
  context: Record<string, any>;
  allowed: boolean;
  verdict: 'PERMIT' | 'DENY';
  latency_ms: number;
  reasons: string[];
  errors: string[];
  explanation: string;
  entities: any[];
}

interface InterceptorFeedProps {
  decisions: CedarDecision[];
}

export const InterceptorFeed: React.FC<InterceptorFeedProps> = ({ decisions }) => {
  const [filter, setFilter] = useState<'ALL' | 'DENY' | 'PERMIT'>('ALL');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const filteredDecisions = decisions.filter((d) => {
    if (filter === 'DENY') return !d.allowed;
    if (filter === 'PERMIT') return d.allowed;
    return true;
  });

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col h-[750px] overflow-hidden">
      {/* Feed Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
            AWS Cedar Interceptor Telemetry
          </h2>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 font-mono text-[10px]">
          {(['ALL', 'DENY', 'PERMIT'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                filter === f
                  ? 'bg-slate-800 text-slate-100 font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Decision Cards List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-xs">
        {filteredDecisions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
            <Shield className="w-10 h-10 text-slate-700 stroke-1" />
            <p className="max-w-xs text-xs">
              Waiting for agent tool invocation. Intercepted authorization requests will stream here with sub-millisecond Rust benchmark metrics.
            </p>
          </div>
        ) : (
          filteredDecisions.map((decision, idx) => {
            const isDeny = !decision.allowed;
            const isExpanded = expandedIndex === idx;

            return (
              <div
                key={`dec-${idx}`}
                className={`rounded-xl border transition-all duration-300 ${
                  isDeny
                    ? 'border-red-600/70 bg-red-950/25 glow-crimson shadow-lg'
                    : 'border-emerald-600/70 bg-emerald-950/25 glow-emerald shadow-lg'
                }`}
              >
                {/* Decision Summary Bar */}
                <div
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="p-3.5 cursor-pointer flex items-center justify-between gap-3 select-none"
                >
                  <div className="flex items-center gap-2.5">
                    {isDeny ? (
                      <div className="w-8 h-8 rounded-lg bg-red-950 border border-red-700/60 flex items-center justify-center text-red-400 shrink-0">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            isDeny
                              ? 'bg-red-900/80 text-red-200 border border-red-500/50'
                              : 'bg-emerald-900/80 text-emerald-200 border border-emerald-500/50'
                          }`}
                        >
                          {decision.verdict}
                        </span>
                        <span className="text-[11px] text-slate-300 font-bold">
                          {decision.action}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                        Target: <code className="text-slate-200">{decision.resource}</code>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1 justify-end">
                        <Zap className="w-3 h-3" />
                        {decision.latency_ms.toFixed(2)} ms
                      </div>
                      <div className="text-[9px] text-slate-400 uppercase">Rust Engine</div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-800/80 space-y-2.5 text-[11px]">
                    {/* Explanation */}
                    <div
                      className={`p-2.5 rounded border text-[11px] leading-relaxed ${
                        isDeny
                          ? 'bg-red-950/60 border-red-900/60 text-red-200'
                          : 'bg-emerald-950/60 border-emerald-900/60 text-emerald-200'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1 mb-1">
                        {isDeny ? <AlertOctagon className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                        Cedar Rule Rationale:
                      </div>
                      {decision.explanation}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950/60 p-2.5 rounded border border-slate-800">
                      <div>
                        <span className="text-slate-400 block">Principal:</span>
                        <code className="text-slate-200">{decision.principal}</code>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Classification:</span>
                        <code className="text-amber-300">
                          {decision.resource_attrs?.classification || 'Restricted'}
                        </code>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Resource Tag:</span>
                        <code className="text-cyan-300">
                          {decision.resource_attrs?.tag || 'unclassified'}
                        </code>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Cedar Policy ID:</span>
                        <code className="text-slate-300">
                          {decision.reasons.length > 0 ? decision.reasons.join(', ') : 'Default-Deny'}
                        </code>
                      </div>
                    </div>

                    {/* Entity Inspector Button / JSON */}
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Formal Cedar Entity Graph:
                      </div>
                      <pre className="bg-slate-950 p-2 rounded text-[10px] text-slate-400 overflow-x-auto border border-slate-800 max-h-32">
                        {JSON.stringify(decision.entities, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
