# Building SovereignGuard: Zero-Trust Deterministic Authorization for AI Agents with AWS Cedar and AWS Strands SDK

*Published for the Bharat Builds Tour 2026 — First Commit Hackathon (WeMakeDevs × AWS Builder Center)*  
**Author:** Jay Gopal ([@j4yop](https://github.com/j4yop))  
**Project Repository:** [github.com/j4yop/sovereign-guard](https://github.com/j4yop/sovereign-guard)  
**Track:** Track 1: Build It (Open-Source on Your Machine)  

---

## 1. Introduction: The Agentic Dilemma of 2026

If 2024 was the year of chatbots and 2025 was the year of RAG, 2026 is undeniably the year of **autonomous AI agents running on developer workstations**.

Using modern tool-calling frameworks like the **AWS Strands Agents SDK** and local models via Ollama, developers are giving local agents unprecedented power:
* Reading local project files and configuration.
* Performing semantic search across corporate repositories.
* Calling internal microservices.
* Executing terminal commands.

But here lies the fundamental security contradiction: **Large Language Models are probabilistic reasoning engines. Security boundaries require mathematical determinism.**

When an autonomous agent processes untrusted inputs—such as a prompt injection in a customer ticket, a poisoned dependency, or a malicious instruction in a markdown document—it can be tricked into abusing its tools. A single prompt injection can persuade an agent to read your `/app/.env` file, extract production AWS keys, or snoop on confidential payroll spreadsheets.

Existing solutions rely on system prompts (*"You are a helpful assistant. Never disclose .env files."*). But as the security community knows, **system prompts are jailbreakable by design**.

To solve this, we built **SovereignGuard**: an open-source, local-first zero-trust gateway that places **AWS Cedar** between the agent's reasoning loop and your machine's physical resources.

---

## 2. Why AWS Cedar Changes the Game for AI Safety

Most developers know AWS IAM, but fewer know that AWS open-sourced its most advanced policy language: **AWS Cedar**.

Cedar is not just another rule engine. It was built using **Automated Reasoning** and formal verification. When Cedar evaluates a request:
1. It processes Attribute-Based Access Control (ABAC) rules.
2. It operates on strict `permit` and `forbid` semantics (with default-deny).
3. It compiles and evaluates in **native Rust** in microseconds.

In SovereignGuard, we used Cedar as a **hard mathematical circuit breaker**. If Cedar says `DENY`, the tool execution is physically aborted in under **0.2 milliseconds**. The LLM never touches the file or socket, and no amount of prompt engineering or linguistic trickery can persuade Cedar's Rust engine to execute the action.

---

## 3. Architecture Deep-Dive

```
   ┌────────────────────────────────────────────────────────┐
   │             User Prompt / Threat Vector                │
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │         SovereignGuard Command Center (React 19)       │
   │      - Live WebSocket Telemetry & Latency Gauges       │
   │      - Monaco Editor for Live Cedar Hot-Reloading      │
   └───────────────────────────┬────────────────────────────┘
                               │ WebSocket Stream
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │           FastAPI Streaming Gateway (Port 8000)        │
   │                                                        │
   │   ┌────────────────────────────────────────────────┐   │
   │   │        AWS Strands Agents SDK Runtime          │   │
   │   │  - Multi-step reasoning & tool planning        │   │
   │   └───────────────────────┬────────────────────────┘   │
   │                           │ Tool Call: read_file('/app/.env')
   │                           ▼                            │
   │   ┌────────────────────────────────────────────────┐   │
   │   │       SovereignGuard Policy Interceptor        │   │
   │   │  Translates tool payload into Cedar entities:  │   │
   │   │  Principal: Agent::"AutonomousAgent"           │   │
   │   │  Action:    Action::"ReadFile"                 │   │
   │   │  Resource:  File::"/app/.env"                  │   │
   │   │  Attributes: { tag: "secrets", path: ".env" }  │   │
   │   └───────────────────────┬────────────────────────┘   │
   │                           │                            │
   │                           ▼                            │
   │   ┌────────────────────────────────────────────────┐   │
   │   │       AWS Cedar Authorization Engine           │   │
   │   │      (Compiled Rust core via cedarpy)          │   │
   │   └───────────────┬────────────────┬───────────────┘   │
   │                   │                │                   │
   │         PERMIT    │                │  DENY (< 0.2ms)   │
   │                   ▼                ▼                   │
   │   ┌─────────────────────┐   ┌──────────────────────┐   │
   │   │ Execute Local Tool  │   │ Physical Abort       │   │
   │   │ - Safe disk read    │   │ - Abort disk I/O     │   │
   │   │ - OpenSearch DLS    │   │ - Emit Audit Trace   │   │
   │   └─────────────────────┘   └──────────────────────┘   │
   └────────────────────────────────────────────────────────┘
```

---

## 4. The Cedar Schema and Policy Implementation

### Formal Schema (`policies/schema.cedarschema`)
```cedar
entity Role;
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
};
```

### Production Policies (`policies/agent_rules.cedar`)
Here is where the magic happens. We defined three core rules:

```cedar
// 1. HARD FORBID: Never allow any agent to read secrets or environment keys
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
    resource.path like "*id_rsa*"
};

// 2. FORBID: Block state-mutating enterprise APIs without elevated admin tokens
forbid (
    principal in Role::"AutonomousAgent",
    action == Action::"InvokeAPI",
    resource
)
when {
    resource.mutating == true && context.admin_override != true
};

// 3. PERMIT: Allow read-only search across authorized internal engineering docs
permit (
    principal in Role::"AutonomousAgent",
    action in [Action::"SearchDocs", Action::"ReadFile"],
    resource
)
when {
    resource.classification == "PublicInternal" ||
    resource.classification == "EngineeringDocs"
};
```

---

## 5. Integrating with the AWS Strands Agents SDK

AWS Strands Agents SDK provides an agentic reasoning lifecycle. In `backend/tools.py`, we wrapped each tool with the `SovereignInterceptor`:

```python
from strands import tool
from backend.interceptor import SovereignInterceptor

interceptor = SovereignInterceptor(policy_path="policies/agent_rules.cedar")

@tool(name="read_file", description="Reads the content of a local file from disk")
def secure_read_file(file_path: str) -> str:
    # 1. Infer metadata attributes
    tag = "secrets" if ".env" in file_path else "general"
    classification = "Restricted" if tag == "secrets" else "PublicInternal"

    # 2. Evaluate with AWS Cedar
    allowed, telemetry = interceptor.evaluate(
        principal_id="AutonomousDeveloperAgent",
        action_id="ReadFile",
        resource_id=file_path,
        resource_attrs={"tag": tag, "classification": classification, "path": file_path}
    )

    # 3. Physical Circuit Breaker: Abort execution if Cedar denies
    if not allowed:
        return f"[SOVEREIGN_GUARD SECURITY EXCEPTION] 🔴 Cedar Denied in {telemetry['latency_ms']}ms."

    # 4. Safe disk read only upon permit
    with open(file_path, "r") as f:
        return f.read()
```

---

## 6. What Fought Back: Lessons from the Trenches

Building SovereignGuard over the hackathon weekend came with real systems engineering hurdles:

### Challenge 1: The String Matching Syntax in Cedar v4
When authoring Cedar policies, we initially attempted to use `resource.classification in ["PublicInternal", "EngineeringDocs"]`. However, in Cedar's formal grammar, `in` is strictly reserved for entity hierarchy traversal (e.g. `principal in Role::"Admin"`). For primitive string comparisons, Cedar requires explicit disjunctions:
```cedar
when {
    resource.classification == "PublicInternal" ||
    resource.classification == "EngineeringDocs"
};
```
Understanding Cedar's mathematical type system was a revelation—it prevents subtle runtime type ambiguities that plague other policy languages.

### Challenge 2: Eliminating Latency Bottlenecks
In agentic loops, agents can invoke dozens of tool planning steps. If authorization took 100ms per call, the user experience would degrade rapidly. By utilizing the official `cedarpy` native Python-to-Rust CFFI bindings, warm evaluation latency dropped to **0.15 milliseconds** (150 microseconds). Cedar is so fast it can evaluate 6,000 policy requests per second on a standard laptop.

### Challenge 3: Live Policy Hot-Reloading in Monaco Editor
We wanted judges and security teams to be able to modify security policies in real-time. We implemented an in-memory policy reload endpoint (`POST /api/policies/reload`) that recompiles the Cedar policy set instantly without dropping active WebSocket client connections.

---

## 7. Results and Performance

* **Test Suite Verification:** 7/7 automated unit tests pass in **0.25 seconds** (`pytest -v`).
* **Evaluation Latency:** Average warm evaluation: **0.15 – 0.20 ms**.
* **Zero Cloud Cost:** Runs 100% locally with zero cloud charges and zero credentials required.
* **Open Source Repository:** [https://github.com/j4yop/sovereign-guard](https://github.com/j4yop/sovereign-guard)

---

## 8. Conclusion: The Future of Agentic Governance

As AI agents become autonomous coworkers, we cannot rely on probabilistic prompt engineering to safeguard our credentials, databases, and operating systems.

By uniting **AWS Strands Agents SDK** for probabilistic reasoning with **AWS Cedar** for deterministic mathematical authorization, SovereignGuard demonstrates that zero-trust security and autonomous AI can coexist cleanly.

*Special thanks to the WeMakeDevs and AWS Builder Center teams for organizing the Bharat Builds Tour 2026 First Commit Hackathon.*
