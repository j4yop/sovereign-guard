import React, { useState } from 'react';
import {
  BookOpen,
  Code,
  Terminal,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react';

export const ResourceGuide: React.FC = () => {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const codeSnippets = {
    pythonHook: `# SovereignGuard: Agent Tool Interceptor Hook (Python)
from cedarpy import is_authorized
import json

def sovereign_guard_hook(tool_call, agent_context):
    """Intercepts tool invocation before execution"""
    request = {
        "principal": f'Agent::"{agent_context.agent_id}"',
        "action": f'Action::"{tool_call.action_name}"',
        "resource": f'File::"{tool_call.target_path}"',
        "context": agent_context.attributes
    }
    
    # Sub-millisecond mathematical policy evaluation
    verdict = is_authorized(
        request, 
        policies=CURRENT_CEDAR_POLICIES, 
        entities=ENTITY_GRAPH
    )
    
    if verdict.decision == "DENY":
        raise PermissionError(f"[SovereignGuard] Policy Denied: {verdict.reasons}")
        
    return tool_call.execute()`,

    cliRun: `# Clone & Run SovereignGuard Locally
git clone https://github.com/j4yop/sovereign-guard.git
cd sovereign-guard

# Run full local stack with AWS Strands + Cedar + FastAPI
chmod +x run.sh
./run.sh`
  };

  const faqs = [
    {
      q: 'Why can’t we just use system prompts like "Never read .env files"?',
      a: 'LLMs are probabilistic token predictors, not formal state machines. Attackers use indirect prompt injection, multi-step roleplay, or encoded jailbreaks to persuade the model to ignore prior system prompts. System prompts are stochastic; AWS Cedar is deterministic mathematical logic that intercepts OS calls directly.'
    },
    {
      q: 'How does AWS Cedar achieve sub-millisecond (< 0.2ms) latency?',
      a: 'The AWS Cedar engine is written in Rust and compiles authorization policies into a fast abstract syntax tree (AST). Because authorization rules evaluate deterministic boolean expressions over entity graphs rather than running deep neural network inference, Cedar evaluates in under 0.2 milliseconds.'
    },
    {
      q: 'How does SovereignGuard compare to Open Policy Agent (OPA)?',
      a: 'While OPA uses Rego (a general-purpose declarative query language), AWS Cedar is specifically designed from first principles for Access Control and authorization. Cedar policies are mathematically verifiable via automated reasoning tools and guarantee termination.'
    },
    {
      q: 'Can SovereignGuard be used in healthcare (HIPAA / GxP)?',
      a: 'Yes! SovereignGuard includes dedicated policy profiles for healthcare. It can intercept agent requests to ensure that Electronic Medical Records (EMR), Protected Health Information (PHI), and clinical trial databases cannot be accessed without explicit clinical sign-off tokens.'
    }
  ];

  return (
    <div className="max-w-[1250px] mx-auto space-y-12 pb-16 font-sans">
      {/* Header */}
      <div className="text-center space-y-3 pt-6 sm:pt-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 text-xs font-semibold">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Documentation & Architecture Knowledge Base</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
          SovereignGuard Technical Resource Hub
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          Everything you need to know about deterministic authorization, AWS Cedar policy mechanics, and integrating zero-trust into autonomous agents.
        </p>
      </div>

      {/* Comparison Matrix: SovereignGuard vs Traditional Guardrails */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Enterprise Defense Matrix
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comparing defense approaches for local and autonomous AI agents
            </p>
          </div>
          <span className="text-[11px] font-mono bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 font-semibold">
            Zero-Trust Standard
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                <th className="py-3 px-3">Dimension</th>
                <th className="py-3 px-3">System Prompts</th>
                <th className="py-3 px-3">Secondary LLM Evaluator</th>
                <th className="py-3 px-3 text-emerald-700 dark:text-emerald-400 font-bold">SovereignGuard (AWS Cedar)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">Execution Nature</td>
                <td className="py-3 px-3 text-rose-600">Probabilistic (Stochastic)</td>
                <td className="py-3 px-3 text-amber-600">Probabilistic (Stochastic)</td>
                <td className="py-3 px-3 font-bold text-emerald-700 dark:text-emerald-400">Deterministic Mathematical Logic</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">Evaluation Latency</td>
                <td className="py-3 px-3">0 ms (Pre-Prompt)</td>
                <td className="py-3 px-3 text-rose-600">800 - 2,500 ms (Slow)</td>
                <td className="py-3 px-3 font-bold text-emerald-700 dark:text-emerald-400">&lt; 0.20 ms (Rust Core)</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">Jailbreak Resistance</td>
                <td className="py-3 px-3 text-rose-600">Trivially Bypassed</td>
                <td className="py-3 px-3 text-rose-600">Vulnerable to Indirect Injection</td>
                <td className="py-3 px-3 font-bold text-emerald-700 dark:text-emerald-400">Mathematically Impossible</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">Physical Abort Hook</td>
                <td className="py-3 px-3 text-slate-400">None (LLM Decides)</td>
                <td className="py-3 px-3 text-slate-400">Post-Hoc Flagging</td>
                <td className="py-3 px-3 font-bold text-emerald-700 dark:text-emerald-400">OS Socket & Disk Hook Intercept</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">Auditability</td>
                <td className="py-3 px-3 text-slate-400">Unstructured Text</td>
                <td className="py-3 px-3 text-slate-400">Natural Language Log</td>
                <td className="py-3 px-3 font-bold text-emerald-700 dark:text-emerald-400">Structured Formal Entity JSON</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Code Snippets & Quick Integration */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Python Interceptor Hook */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Python Agent Hook Implementation
              </h3>
            </div>
            <button
              onClick={() => copyToClipboard(codeSnippets.pythonHook, 'hook')}
              className="text-[11px] font-mono text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              {copiedSnippet === 'hook' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="bg-slate-950 text-emerald-400 p-4 rounded-xl text-[11px] font-mono overflow-x-auto border border-slate-800 leading-relaxed max-h-72">
            {codeSnippets.pythonHook}
          </pre>
        </div>

        {/* Local Run Quickstart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Local CLI Quickstart
              </h3>
            </div>
            <button
              onClick={() => copyToClipboard(codeSnippets.cliRun, 'cli')}
              className="text-[11px] font-mono text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              {copiedSnippet === 'cli' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="bg-slate-950 text-cyan-400 p-4 rounded-xl text-[11px] font-mono overflow-x-auto border border-slate-800 leading-relaxed max-h-72">
            {codeSnippets.cliRun}
          </pre>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            💡 <strong>Offline Guarantee:</strong> Runs locally with Ollama (or mocks) and the official AWS Cedar Python bindings (<code className="font-mono text-slate-800 dark:text-slate-200">cedarpy</code>). Zero cloud bills.
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions Accordion */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Frequently Asked Questions
        </h2>

        <div className="space-y-2.5">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full text-left p-3.5 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800 flex items-center justify-between gap-3 cursor-pointer"
                >
                  <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                    {faq.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="p-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
