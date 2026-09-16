/**
 * SovereignGuard: Client-Side Simulation Engine
 * Emulates the AWS Cedar authorization engine and AWS Strands agent reasoning loop
 * directly in the browser for static hosted environments (Vercel, AWS Amplify Hosting).
 */

export interface SimulationEvent {
  type: string;
  content?: string;
  tool?: string;
  args?: Record<string, any>;
  target?: string;
  result?: string;
  blocked?: boolean;
  data?: any;
}

export async function* runClientSimulation(
  prompt: string,
  presetId?: string,
  currentPolicyCode?: string
): AsyncGenerator<SimulationEvent, void, unknown> {
  const pLower = prompt.toLowerCase();
  const policy = (currentPolicyCode || '').toLowerCase();

  // Check if secrets rule is currently disabled/commented in Monaco editor
  const secretsForbidden =
    policy.includes('resource.tag == "secrets"') ||
    policy.includes('resource.path like "*.env*"') ||
    policy.includes('resource.tag in ["secrets"');

  const payrollForbidden =
    policy.includes('resource.tag == "payroll"') ||
    policy.includes('resource.tag == "pii"') ||
    policy.includes('resource.tag in ["payroll"');

  const mutatingForbidden =
    policy.includes('resource.mutating == true') ||
    policy.includes('invokeapi');

  // Step 1: Agent perceives input and reasons
  yield {
    type: 'thought',
    content: `Analyzing user directive: "${prompt.slice(0, 90)}..."\nEvaluating security boundaries and tool requirements.`,
  };
  await new Promise((r) => setTimeout(r, 300));

  // Scenario 1: Attack on .env
  if (
    presetId === 'attack_env' ||
    pLower.includes('.env') ||
    pLower.includes('credential') ||
    pLower.includes('secret') ||
    pLower.includes('aws key')
  ) {
    yield {
      type: 'thought',
      content: 'Plan: Request disk tool `read_file` on target `/app/.env` to inspect system configuration.',
    };
    await new Promise((r) => setTimeout(r, 350));

    yield {
      type: 'tool_call_start',
      tool: 'read_file',
      args: { file_path: '/app/.env' },
      target: '/app/.env',
    };
    await new Promise((r) => setTimeout(r, 200));

    const latency = +(0.15 + Math.random() * 0.08).toFixed(2);

    if (secretsForbidden) {
      // Denied by Cedar
      const telemetry = {
        timestamp: Date.now() / 1000,
        principal: 'AutonomousDeveloperAgent',
        action: 'ReadFile',
        resource: '/app/.env',
        resource_attrs: { tag: 'secrets', classification: 'Restricted', path: '/app/.env' },
        context: {},
        allowed: false,
        verdict: 'DENY' as const,
        latency_ms: latency,
        reasons: ['policy0'],
        errors: [],
        explanation: 'Blocked by Cedar Policy: Access to credentials, secrets, or .env files is strictly forbidden.',
        entities: [
          { uid: { type: 'Role', id: 'AutonomousAgent' }, attrs: {}, parents: [] },
          { uid: { type: 'Agent', id: 'AutonomousDeveloperAgent' }, attrs: {}, parents: [{ type: 'Role', id: 'AutonomousAgent' }] },
          { uid: { type: 'File', id: '/app/.env' }, attrs: { tag: 'secrets', classification: 'Restricted' }, parents: [] },
        ],
      };

      yield { type: 'cedar_verdict', data: telemetry };
      await new Promise((r) => setTimeout(r, 250));

      yield {
        type: 'tool_call_result',
        tool: 'read_file',
        result: `[SOVEREIGN_GUARD SECURITY BARRIER]\nVerdict: 🔴 CEDAR POLICY DENIED (evaluated in ${latency}ms)\nExplanation: Blocked by Cedar Policy: Access to credentials, secrets, or .env files is strictly forbidden.\nPhysical block: Disk I/O was aborted before read operation.`,
        blocked: true,
      };
      await new Promise((r) => setTimeout(r, 300));

      yield {
        type: 'final_response',
        content: `⚠️ **Security Violation Detected**\n\nI planned a tool invocation to read \`/app/.env\`, but the **AWS Cedar Policy Engine** intercepted and physically aborted the operation in **${latency} ms**.\n\n**Policy Rationale:** Access to credentials, secrets, or .env files is strictly forbidden.\n\nUnder zero-trust governance rules, autonomous agents cannot access private keys or credentials.`,
      };
    } else {
      // Permitted because user disabled the rule in Monaco editor!
      const telemetry = {
        timestamp: Date.now() / 1000,
        principal: 'AutonomousDeveloperAgent',
        action: 'ReadFile',
        resource: '/app/.env',
        resource_attrs: { tag: 'secrets', classification: 'Restricted', path: '/app/.env' },
        context: {},
        allowed: true,
        verdict: 'PERMIT' as const,
        latency_ms: latency,
        reasons: ['policy_relaxed'],
        errors: [],
        explanation: 'Access permitted under modified Cedar policy rules.',
        entities: [],
      };

      yield { type: 'cedar_verdict', data: telemetry };
      await new Promise((r) => setTimeout(r, 250));

      yield {
        type: 'tool_call_result',
        tool: 'read_file',
        result: 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\nAWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        blocked: false,
      };
      await new Promise((r) => setTimeout(r, 300));

      yield {
        type: 'final_response',
        content: `🔓 **Access Permitted (Live Policy Exemption Active)**\n\nThe modified Cedar policy permitted reading \`/app/.env\` (**🟢 PERMIT** in **${latency} ms**).\n\nNotice: Re-enabling the forbid rule in the Monaco Editor will instantly re-arm the physical block.`,
      };
    }

    // Scenario 2: Attack on payroll
  } else if (
    presetId === 'attack_payroll' ||
    pLower.includes('payroll') ||
    pLower.includes('salary') ||
    pLower.includes('compensation')
  ) {
    yield {
      type: 'thought',
      content: 'Plan: Invoke file reader tool on confidential executive ledger `payroll_2026.json`.',
    };
    await new Promise((r) => setTimeout(r, 350));

    yield {
      type: 'tool_call_start',
      tool: 'read_file',
      args: { file_path: 'payroll_2026.json' },
      target: 'payroll_2026.json',
    };
    await new Promise((r) => setTimeout(r, 200));

    const latency = +(0.16 + Math.random() * 0.05).toFixed(2);

    const telemetry = {
      timestamp: Date.now() / 1000,
      principal: 'AutonomousDeveloperAgent',
      action: 'ReadFile',
      resource: 'payroll_2026.json',
      resource_attrs: { tag: 'payroll', classification: 'Restricted', path: 'payroll_2026.json' },
      context: {},
      allowed: !payrollForbidden,
      verdict: (payrollForbidden ? 'DENY' : 'PERMIT') as any,
      latency_ms: latency,
      reasons: payrollForbidden ? ['policy0'] : ['policy_override'],
      errors: [],
      explanation: payrollForbidden
        ? 'Blocked by Cedar Policy: Access to confidential compensation and PII data is forbidden.'
        : 'Access permitted.',
      entities: [
        { uid: { type: 'File', id: 'payroll_2026.json' }, attrs: { tag: 'payroll', classification: 'Restricted' }, parents: [] },
      ],
    };

    yield { type: 'cedar_verdict', data: telemetry };
    await new Promise((r) => setTimeout(r, 250));

    yield {
      type: 'tool_call_result',
      tool: 'read_file',
      result: `[SOVEREIGN_GUARD SECURITY BARRIER]\nVerdict: 🔴 CEDAR POLICY DENIED (evaluated in ${latency}ms)\nExplanation: Blocked by Cedar Policy: Access to confidential compensation and PII data is forbidden.\nPhysical block: Disk I/O was aborted before read operation.`,
      blocked: payrollForbidden,
    };
    await new Promise((r) => setTimeout(r, 300));

    yield {
      type: 'final_response',
      content: `🔒 **Access Denied by Policy Engine**\n\nAction \`ReadFile\` on \`payroll_2026.json\` was evaluated by AWS Cedar and rejected with verdict **🔴 DENY** in **${latency} ms**.\n\n**Reason:** Autonomous agents lack clearance for restricted executive compensation records.`,
    };

    // Scenario 3: Valid search across engineering docs
  } else if (
    presetId === 'valid_search' ||
    pLower.includes('deploy') ||
    pLower.includes('doc') ||
    pLower.includes('guide') ||
    pLower.includes('ecs') ||
    pLower.includes('architecture')
  ) {
    yield {
      type: 'thought',
      content: `Plan: Query OpenSearch vector index with search query: "${prompt}" to find internal engineering documentation.`,
    };
    await new Promise((r) => setTimeout(r, 350));

    yield {
      type: 'tool_call_start',
      tool: 'search_knowledge_base',
      args: { query: prompt },
      target: 'opensearch:enterprise_knowledge',
    };
    await new Promise((r) => setTimeout(r, 200));

    const latency = +(0.14 + Math.random() * 0.06).toFixed(2);

    const telemetry = {
      timestamp: Date.now() / 1000,
      principal: 'AutonomousDeveloperAgent',
      action: 'SearchDocs',
      resource: 'docs/deploy_guide.md',
      resource_attrs: { tag: 'engineering', classification: 'PublicInternal', path: 'docs/deploy_guide.md' },
      context: {},
      allowed: true,
      verdict: 'PERMIT' as const,
      latency_ms: latency,
      reasons: ['policy2'],
      errors: [],
      explanation: 'Access permitted under policy granting access to classified internal documentation.',
      entities: [
        { uid: { type: 'File', id: 'docs/deploy_guide.md' }, attrs: { classification: 'PublicInternal' }, parents: [] },
      ],
    };

    yield { type: 'cedar_verdict', data: telemetry };
    await new Promise((r) => setTimeout(r, 250));

    yield {
      type: 'tool_call_result',
      tool: 'search_knowledge_base',
      result:
        '### Authorized Knowledge Chunks (Cedar Permitted):\n📄 [PublicInternal] ECS & CloudFront Deployment Guide:\nInternal deployment pipeline for engineering teams. Container images must be multi-arch. Private ALBs with AWS WAF enabled. Blue/green deployment via CodeDeploy.\n\n### Redacted Results (Cedar Denied Document-Level Security):\n🔒 [BLOCKED] Executive Compensation Ledger (Restricted) - Denied by Cedar',
      blocked: false,
    };
    await new Promise((r) => setTimeout(r, 350));

    yield {
      type: 'final_response',
      content: `✅ **Authorized Information Retrieved**\n\nThe tool request was approved by the AWS Cedar Engine (**🟢 PERMIT** in **${latency} ms**).\n\n### Deployment Overview:\n- Internal services must deploy via multi-arch Docker containers to **AWS ECS Fargate** behind private Application Load Balancers.\n- AWS WAF and CodeDeploy blue/green traffic shifting are active.\n- Health check endpoint \`/healthz\` must return HTTP 200 within 45s.`,
    };

    // Scenario 4: Mutating API call
  } else if (
    presetId === 'attack_api' ||
    pLower.includes('provision') ||
    pLower.includes('launch') ||
    pLower.includes('post ')
  ) {
    yield {
      type: 'thought',
      content: 'Plan: Invoke enterprise API endpoint POST /api/v1/cloud/provision to launch compute resources.',
    };
    await new Promise((r) => setTimeout(r, 350));

    yield {
      type: 'tool_call_start',
      tool: 'invoke_enterprise_api',
      args: { endpoint: '/api/v1/cloud/provision', method: 'POST' },
      target: '/api/v1/cloud/provision (POST)',
    };
    await new Promise((r) => setTimeout(r, 200));

    const latency = +(0.18 + Math.random() * 0.06).toFixed(2);

    const telemetry = {
      timestamp: Date.now() / 1000,
      principal: 'AutonomousDeveloperAgent',
      action: 'InvokeAPI',
      resource: '/api/v1/cloud/provision',
      resource_attrs: { service: 'InternalEnterpriseGateway', mutating: true },
      context: { admin_override: false },
      allowed: !mutatingForbidden,
      verdict: (mutatingForbidden ? 'DENY' : 'PERMIT') as any,
      latency_ms: latency,
      reasons: mutatingForbidden ? ['policy1'] : ['policy_override'],
      errors: [],
      explanation: 'Blocked by Cedar Policy: Mutating enterprise API actions require elevated admin credentials.',
      entities: [],
    };

    yield { type: 'cedar_verdict', data: telemetry };
    await new Promise((r) => setTimeout(r, 250));

    yield {
      type: 'tool_call_result',
      tool: 'invoke_enterprise_api',
      result: `[SOVEREIGN_GUARD SECURITY BARRIER]\nVerdict: 🔴 CEDAR POLICY DENIED (evaluated in ${latency}ms)\nExplanation: Blocked by Cedar Policy: Mutating enterprise API actions require elevated admin credentials.\nPhysical block: Network HTTP request was aborted before socket transmission.`,
      blocked: mutatingForbidden,
    };
    await new Promise((r) => setTimeout(r, 300));

    yield {
      type: 'final_response',
      content: `🚫 **Mutating API Call Blocked**\n\nThe agent attempted to invoke \`POST /api/v1/cloud/provision\`, but Cedar rejected the request in **${latency} ms** because state-mutating actions require explicit admin approval.`,
    };

    // Generic response
  } else {
    yield {
      type: 'thought',
      content: 'Evaluating prompt: No tool invocation requested. Generating direct response.',
    };
    await new Promise((r) => setTimeout(r, 250));
    yield {
      type: 'final_response',
      content: `Received: "${prompt}".\n\nSovereignGuard is armed and actively enforcing Cedar policies. Try one of the threat presets above to observe sub-millisecond mathematical authorization in action!`,
    };
  }
}
