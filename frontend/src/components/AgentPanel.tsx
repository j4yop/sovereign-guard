import React from 'react';
import {
  Bot,
  Send,
  BrainCircuit,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface AgentEvent {
  type: string;
  content?: string;
  tool?: string;
  target?: string;
  args?: Record<string, any>;
  result?: string;
  blocked?: boolean;
  data?: any;
}

interface AgentPanelProps {
  prompt: string;
  setPrompt: (p: string) => void;
  onSubmit: (p?: string) => void;
  isRunning: boolean;
  events: AgentEvent[];
  onClearEvents?: () => void;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({
  prompt,
  setPrompt,
  onSubmit,
  isRunning,
  events,
  onClearEvents,
}) => {
  const thoughts = events.filter((e) => e.type === 'thought');
  const toolCalls = events.filter((e) => e.type === 'tool_call_start');
  const toolResults = events.filter((e) => e.type === 'tool_call_result');
  const finalResponse = events.find((e) => e.type === 'final_response');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isRunning) {
      onSubmit(prompt);
    }
  };

  const samplePrompts = [
    'Read confidential file /app/.env',
    'Summarize executive compensation from payroll_2026.json',
    'Search documentation for AWS ECS Fargate deployment guide',
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl flex flex-col h-[760px] overflow-hidden shadow-subtle transition-colors duration-200">
      {/* Panel Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Agent Runtime Stream
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">AWS Strands Agents SDK</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {events.length > 0 && onClearEvents && (
            <button
              onClick={onClearEvents}
              title="Clear event stream"
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer text-[11px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white border border-slate-200 shadow-2xs">
            <span className="flex h-2 w-2 relative">
              <span className={`inline-flex h-full w-full rounded-full ${isRunning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isRunning ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            </span>
            <span className="text-[10px] font-mono text-slate-600 font-semibold">
              {isRunning ? 'Reasoning...' : 'Idle'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Stream Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 font-sans text-xs">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <BrainCircuit className="w-6 h-6 stroke-1" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Agent is standby</p>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Select an attack preset from the top bar or pick a sample prompt below to observe real-time tool planning and zero-trust interception:
              </p>
            </div>

            <div className="w-full space-y-2 max-w-sm pt-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Quick Sample Queries
              </span>
              {samplePrompts.map((sp, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setPrompt(sp);
                    onSubmit(sp);
                  }}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/50 hover:border-emerald-300 text-slate-700 text-[11px] transition-all cursor-pointer flex items-center justify-between group"
                >
                  <span className="truncate font-mono">{sp}</span>
                  <span className="text-slate-400 group-hover:text-emerald-700 shrink-0 ml-2">&rarr;</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Thought Stream */}
            {thoughts.map((t, idx) => (
              <div
                key={`thought-${idx}`}
                className="bg-sky-50/70 border border-sky-200 rounded-xl p-3.5 space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center gap-2 text-sky-800 font-semibold text-xs">
                  <BrainCircuit className="w-3.5 h-3.5 text-sky-600" />
                  <span>Agent Reasoning Step {idx + 1}</span>
                </div>
                <p className="text-slate-800 text-xs leading-relaxed font-mono whitespace-pre-wrap">
                  {t.content}
                </p>
              </div>
            ))}

            {/* Tool Planning Card */}
            {toolCalls.map((tc, idx) => (
              <div
                key={`tc-${idx}`}
                className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between text-amber-900 font-semibold text-xs">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-amber-600" />
                    Planned Tool Call: <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-900 font-mono text-[11px]">{tc.tool}</code>
                  </span>
                  <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-semibold font-mono">
                    Intercepting
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  Target Resource: <code className="text-slate-800 font-semibold">{tc.target || JSON.stringify(tc.args)}</code>
                </div>
              </div>
            ))}

            {/* Tool Execution Result */}
            {toolResults.map((tr, idx) => (
              <div
                key={`tr-${idx}`}
                className={`border rounded-xl p-3.5 space-y-2 transition-all shadow-2xs ${
                  tr.blocked
                    ? 'bg-rose-50/50 border-rose-200 text-rose-950'
                    : 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span className="flex items-center gap-1.5">
                    {tr.blocked ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    )}
                    Tool Result ({tr.tool})
                  </span>
                  <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold border ${
                    tr.blocked
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {tr.blocked ? 'Execution Aborted' : 'Execution Approved'}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg max-h-40 overflow-y-auto text-[11px] text-slate-800 font-mono whitespace-pre-wrap border border-slate-200 leading-relaxed shadow-2xs">
                  {tr.result}
                </div>
              </div>
            ))}

            {/* Final AI Response */}
            {finalResponse && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <Bot className="w-4 h-4 text-emerald-700" />
                  <span>Agent Final Synthesis</span>
                </div>
                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                  {finalResponse.content}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Prompt Input Form */}
      <form onSubmit={handleSubmit} className="p-3.5 border-t border-slate-100 bg-slate-50/60 flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask agent or type custom prompt injection exploit..."
          disabled={isRunning}
          className="flex-1 bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition-colors shadow-2xs"
        />
        <button
          type="submit"
          disabled={isRunning || !prompt.trim()}
          className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-[0.99] shrink-0"
        >
          {isRunning ? (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              Evaluating
            </span>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              Dispatch
            </>
          )}
        </button>
      </form>
    </div>
  );
};
