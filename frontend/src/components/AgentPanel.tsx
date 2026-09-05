import React from 'react';
import { Bot, Send, BrainCircuit, Terminal, CheckCircle2, AlertTriangle } from 'lucide-react';

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
}

export const AgentPanel: React.FC<AgentPanelProps> = ({
  prompt,
  setPrompt,
  onSubmit,
  isRunning,
  events,
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

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col h-[750px] overflow-hidden">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
            Autonomous Agent Runtime
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className={`inline-flex h-full w-full rounded-full ${isRunning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isRunning ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {isRunning ? 'Reasoning...' : 'Ready'}
          </span>
        </div>
      </div>

      {/* Main Stream Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 font-mono text-xs">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
            <BrainCircuit className="w-10 h-10 text-slate-700 stroke-1" />
            <p className="max-w-xs text-xs">
              Agent loop is idle. Select an attack preset above or type a custom query to observe the Strands reasoning loop.
            </p>
          </div>
        ) : (
          <>
            {/* Thought Stream */}
            {thoughts.map((t, idx) => (
              <div
                key={`thought-${idx}`}
                className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 space-y-1.5 animate-in fade-in duration-300"
              >
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-[11px]">
                  <BrainCircuit className="w-3.5 h-3.5" />
                  <span>Agent Thought Step {idx + 1}</span>
                </div>
                <p className="text-slate-300 text-[11px] whitespace-pre-wrap leading-relaxed">
                  {t.content}
                </p>
              </div>
            ))}

            {/* Tool Planning Card */}
            {toolCalls.map((tc, idx) => (
              <div
                key={`tc-${idx}`}
                className="bg-amber-950/20 border border-amber-800/40 rounded-lg p-3 space-y-1 animate-in fade-in duration-300"
              >
                <div className="flex items-center justify-between text-amber-400 font-bold text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    Planned Tool Invocation: <code className="text-amber-300">{tc.tool}</code>
                  </span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-900/40 border border-amber-700/50">
                    Intercepting
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Target Resource: <code className="text-slate-300">{tc.target || JSON.stringify(tc.args)}</code>
                </div>
              </div>
            ))}

            {/* Tool Execution Result */}
            {toolResults.map((tr, idx) => (
              <div
                key={`tr-${idx}`}
                className={`border rounded-lg p-3 space-y-1.5 animate-in fade-in duration-300 ${
                  tr.blocked
                    ? 'bg-red-950/20 border-red-800/50 text-red-300'
                    : 'bg-emerald-950/20 border-emerald-800/50 text-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-[11px]">
                  <span className="flex items-center gap-1.5">
                    {tr.blocked ? <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    Tool Result ({tr.tool})
                  </span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">
                    {tr.blocked ? 'Execution Blocked' : 'Execution Success'}
                  </span>
                </div>
                <div className="bg-slate-950/90 rounded p-2.5 max-h-36 overflow-y-auto text-[10px] text-slate-300 font-mono whitespace-pre-wrap border border-slate-900">
                  {tr.result}
                </div>
              </div>
            ))}

            {/* Final AI Response */}
            {finalResponse && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2 animate-in fade-in duration-500">
                <div className="flex items-center gap-2 text-slate-300 font-bold text-xs">
                  <Bot className="w-4 h-4 text-emerald-400" />
                  <span>Agent Final Synthesis</span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {finalResponse.content}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Prompt Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-950/80 flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask agent or type prompt injection exploit..."
          disabled={isRunning}
          className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 outline-none font-mono"
        />
        <button
          type="submit"
          disabled={isRunning || !prompt.trim()}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
        >
          {isRunning ? (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              Running
            </span>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              Send
            </>
          )}
        </button>
      </form>
    </div>
  );
};
