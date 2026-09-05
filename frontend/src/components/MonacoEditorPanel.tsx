import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Code, RefreshCw, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MonacoEditorPanelProps {
  policyCode: string;
  setPolicyCode: (code: string) => void;
  onHotReload: () => Promise<void>;
  isReloading: boolean;
  reloadStatus: { success: boolean; message: string } | null;
}

export const MonacoEditorPanel: React.FC<MonacoEditorPanelProps> = ({
  policyCode,
  setPolicyCode,
  onHotReload,
  isReloading,
  reloadStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'schema'>('rules');

  const defaultSchema = `entity Role;
entity Agent in [Role];
entity File {
    tag: String,
    classification: String,
    path: String
};
entity APIEndpoint {
    service: String,
    mutating: Bool
};

action ReadFile appliesTo {
    principal: [Agent],
    resource: [File]
};

action SearchDocs appliesTo {
    principal: [Agent],
    resource: [File]
};

action InvokeAPI appliesTo {
    principal: [Agent],
    resource: [APIEndpoint]
};`;

  const handleSaveAndReload = async () => {
    await onHotReload();
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#10b981', '#06b6d4', '#f59e0b'],
    });
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col h-[750px] overflow-hidden">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
            Monaco Cedar Policy Studio
          </h2>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 font-mono text-[10px]">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
              activeTab === 'rules'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            agent_rules.cedar
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
              activeTab === 'schema'
                ? 'bg-slate-800 text-slate-200 border border-slate-700 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            schema.cedarschema
          </button>
        </div>
      </div>

      {/* Compiler Status Bar */}
      <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between font-mono text-[11px]">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-slate-300">Cedar Policy Engine v4.8</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Rust Core Verified
          </span>
        </div>

        <button
          onClick={handleSaveAndReload}
          disabled={isReloading || activeTab === 'schema'}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-1 rounded flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <RefreshCw className={`w-3 h-3 ${isReloading ? 'animate-spin' : ''}`} />
          Save & Hot Reload
        </button>
      </div>

      {/* Editor Surface */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'rules' ? (
          <Editor
            height="100%"
            defaultLanguage="rust"
            value={policyCode}
            onChange={(val) => setPolicyCode(val || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'on',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              renderLineHighlight: 'all',
            }}
          />
        ) : (
          <Editor
            height="100%"
            defaultLanguage="rust"
            value={defaultSchema}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'on',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            }}
          />
        )}
      </div>

      {/* Hot Reload Status Toast Bar */}
      {reloadStatus && (
        <div
          className={`p-3 border-t font-mono text-[11px] flex items-center gap-2 animate-in fade-in duration-200 ${
            reloadStatus.success
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-red-950/60 border-red-800 text-red-300'
          }`}
        >
          {reloadStatus.success ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="truncate">{reloadStatus.message}</span>
        </div>
      )}
    </div>
  );
};
