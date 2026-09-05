// ==============================================================================
// SOVEREIGN GUARD: PRODUCTION CEDAR POLICIES
// Formal, mathematically verified authorization rules for autonomous AI agents.
// ==============================================================================

// POLICY 1: HARD FORBID - Secrets & Credentials Access
// Physically prevents any autonomous agent from reading files containing secrets,
// tokens, SSH keys, or environment files, regardless of LLM reasoning or prompt instructions.
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
// Prevents the agent from invoking state-mutating enterprise APIs unless an
// explicit elevated administrative override context token is provided.
forbid (
    principal in Role::"AutonomousAgent",
    action == Action::"InvokeAPI",
    resource
)
when {
    resource.mutating == true && context.admin_override != true
};

// POLICY 3: PERMIT - Authorized Internal Engineering Documentation
// Permits agents to read and perform semantic vector searches over internal documents
// that have been explicitly classified as PublicInternal or EngineeringDocs.
permit (
    principal in Role::"AutonomousAgent",
    action in [Action::"SearchDocs", Action::"ReadFile"],
    resource
)
when {
    resource.classification == "PublicInternal" ||
    resource.classification == "EngineeringDocs"
};
