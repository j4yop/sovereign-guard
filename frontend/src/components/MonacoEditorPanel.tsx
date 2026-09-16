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
  isDarkMode?: boolean;
}

export const MonacoEditorPanel: React.FC<MonacoEditorPanelProps> = ({
  policyCode,
  setPolicyCode,
  onHotReload,
  isReloading,
  reloadStatus,
  isDarkMode = false,
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

  const policyPresets: Record<string, string> = {
    standard: `// ==============================================================================
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
};`,

    hipaa: `// ==============================================================================
// SOVEREIGN GUARD: HEALTHCARE & PATIENT DATA SHIELD (HIPAA / GxP)
// Enforces medical record confidentiality and audit logs for clinical AI agents.
// ==============================================================================

// HARD FORBID: Electronic Medical Records (EMR) and Protected Health Info (PHI)
forbid (
    principal in Role::"AutonomousAgent",
    action in [Action::"ReadFile", Action::"ExportData"],
    resource
)
when {
    resource.tag in ["emr", "phi", "patient_records", "clinical_trials"] ||
    resource.classification == "RestrictedMedical"
};

// FORBID: Cloud Mutations without Clinical Lead Override
forbid (
    principal in Role::"AutonomousAgent",
    action == Action::"InvokeAPI",
    resource
)
when {
    resource.mutating == true && context.clinical_lead_signoff != true
};

// PERMIT: Clinical Protocol Documentation & Public Healthcare Guidelines
permit (
    principal in Role::"AutonomousAgent",
    action == Action::"SearchDocs",
    resource
)
when {
    resource.classification in ["PublicClinicalGuidelines", "EngineeringDocs"]
};`,

    sandbox: `// ==============================================================================
// SOVEREIGN GUARD: DEVELOPER TESTING SANDBOX
// Permissive development policy allowing read-only access for internal audits.
// ==============================================================================

permit (
    principal in Role::"AutonomousAgent",
    action in [Action::"ReadFile", Action::"SearchDocs"],
    resource
);

forbid (
    principal in Role::"AutonomousAgent",
    action == Action::"InvokeAPI",
    resource
)
when {
    resource.mutating == true
};`
  };

  const handleSaveAndReload = async () => {
    await onHotReload();
    confetti({
      particleCount: 35,
      spread: 55,
      origin: { y: 0.8 },
      colors: ['#059669', '#0284c7', '#d97706'],
    });
  };

  const loadPreset = (key: string) => {
    if (policyPresets[key]) {
      setPolicyCode(policyPresets[key]);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col h-[760px] overflow-hidden shadow-xs transition-colors duration-200">
      {/* Panel Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
            <Code className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Cedar Policy Studio
            </h2>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Live Monaco IDE</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 font-mono text-[10px]">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
              activeTab === 'rules'
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            agent_rules.cedar
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
              activeTab === 'schema'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            schema.cedarschema
          </button>
        </div>
      </div>

      {/* Preset Switcher & Compiler Status Bar */}
      <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Preset:
          </span>
          <select
            onChange={(e) => loadPreset(e.target.value)}
            defaultValue="standard"
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer focus:border-emerald-500"
          >
            <option value="standard">Zero-Trust Shield (Default)</option>
            <option value="hipaa">Healthcare PHI/EMR Shield</option>
            <option value="sandbox">Developer Testing Sandbox</option>
          </select>
        </div>

        <button
          onClick={handleSaveAndReload}
          disabled={isReloading || activeTab === 'schema'}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
          Compile & Hot Reload
        </button>
      </div>

      {/* Monaco Editor Surface */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'rules' ? (
          <Editor
            height="100%"
            defaultLanguage="rust"
            value={policyCode}
            onChange={(val) => setPolicyCode(val || '')}
            theme={isDarkMode ? 'vs-dark' : 'light'}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'on',
              fontFamily: '"JetBrains Mono", Menlo, Monaco, Consolas, monospace',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              renderLineHighlight: 'all',
              padding: { top: 12, bottom: 12 },
            }}
          />
        ) : (
          <Editor
            height="100%"
            defaultLanguage="rust"
            value={defaultSchema}
            theme={isDarkMode ? 'vs-dark' : 'light'}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'on',
              fontFamily: '"JetBrains Mono", Menlo, Monaco, Consolas, monospace',
              scrollBeyondLastLine: false,
              padding: { top: 12, bottom: 12 },
            }}
          />
        )}
      </div>

      {/* Hot Reload Status Toast Bar */}
      {reloadStatus && (
        <div
          className={`p-3 border-t font-mono text-xs flex items-center gap-2 transition-all ${
            reloadStatus.success
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300'
          }`}
        >
          {reloadStatus.success ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span className="truncate">{reloadStatus.message}</span>
        </div>
      )}
    </div>
  );
};
