import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
  ChevronDown,
  ChevronUp,
  Layers,
  AlertOctagon,
  Download,
  Copy,
  Check,
  Search
} from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const filteredDecisions = decisions.filter((d) => {
    if (filter === 'DENY' && d.allowed) return false;
    if (filter === 'PERMIT' && !d.allowed) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.resource.toLowerCase().includes(q) ||
        d.action.toLowerCase().includes(q) ||
        d.explanation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCopyJSON = (decision: CedarDecision, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(decision, null, 2));
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(decisions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sovereign-guard-audit-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl flex flex-col h-[760px] overflow-hidden shadow-subtle transition-colors duration-200">
      {/* Feed Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Cedar Telemetry Feed
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">Formal Rust Engine</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {decisions.length > 0 && (
            <button
              onClick={handleExportJSON}
              title="Export all audit events as JSON"
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-1.5 text-[10px] font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              <Download className="w-3 h-3 text-slate-500" />
              <span>Export</span>
            </button>
          )}

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-semibold">
            {(['ALL', 'DENY', 'PERMIT'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                  filter === f
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/40">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search decisions by resource, action, or rationale..."
            className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Decision Cards List */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3 font-sans text-xs">
        {filteredDecisions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <Shield className="w-6 h-6 stroke-1" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">No Decisions Logged Yet</p>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Trigger an agent attack vector to watch intercepted tool invocations and sub-0.2ms Rust evaluations stream in real time.
              </p>
            </div>
          </div>
        ) : (
          filteredDecisions.map((decision, idx) => {
            const isDeny = !decision.allowed;
            const isExpanded = expandedIndex === idx;

            return (
              <div
                key={`dec-${idx}`}
                className={`rounded-xl border transition-all duration-200 shadow-2xs ${
                  isDeny
                    ? 'border-rose-200 bg-rose-50/30'
                    : 'border-emerald-200 bg-emerald-50/30'
                }`}
              >
                {/* Decision Summary Bar */}
                <div
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="p-3 cursor-pointer flex items-center justify-between gap-3 select-none hover:bg-white/80 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {isDeny ? (
                      <div className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            isDeny
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {decision.verdict}
                        </span>
                        <span className="text-xs font-mono text-slate-900 font-bold">
                          {decision.action}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 font-mono truncate max-w-[210px] sm:max-w-xs">
                        Target: <code className="text-slate-900 font-semibold">{decision.resource}</code>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-amber-700 flex items-center gap-1 justify-end tabular-nums">
                        <Zap className="w-3 h-3" />
                        {decision.latency_ms.toFixed(2)} ms
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 uppercase">Rust Engine</div>
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
                  <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-200 space-y-2.5 text-xs">
                    {/* Explanation */}
                    <div
                      className={`p-3 rounded-xl border text-[11px] leading-relaxed font-sans ${
                        isDeny
                          ? 'bg-white border-rose-200 text-rose-950'
                          : 'bg-white border-emerald-200 text-emerald-950'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1">
                          {isDeny ? <AlertOctagon className="w-3.5 h-3.5 text-rose-600" /> : <Shield className="w-3.5 h-3.5 text-emerald-700" />}
                          Cedar Rule Verdict Rationale:
                        </span>
                        <button
                          onClick={(e) => handleCopyJSON(decision, idx, e)}
                          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-700" />
                              <span className="text-emerald-700 font-bold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy JSON</span>
                            </>
                          )}
                        </button>
                      </div>
                      {decision.explanation}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div>
                        <span className="text-slate-400 block">Principal:</span>
                        <code className="text-slate-800 font-semibold">{decision.principal}</code>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Classification:</span>
                        <code className="text-amber-700 font-semibold">
                          {decision.resource_attrs?.classification || 'Restricted'}
                        </code>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Resource Tag:</span>
                        <code className="text-indigo-700 font-semibold">
                          {decision.resource_attrs?.tag || 'unclassified'}
                        </code>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Matching Rule:</span>
                        <code className="text-slate-700 font-semibold">
                          {decision.reasons.length > 0 ? decision.reasons.join(', ') : 'Default-Deny'}
                        </code>
                      </div>
                    </div>

                    {/* Entity Inspector */}
                    <div>
                      <div className="text-[10px] font-mono font-bold text-slate-500 mb-1 flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Formal Cedar Entity Graph:
                      </div>
                      <pre className="bg-slate-50 text-slate-800 p-2.5 rounded-lg text-[10px] font-mono overflow-x-auto border border-slate-200 max-h-32 shadow-2xs">
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
