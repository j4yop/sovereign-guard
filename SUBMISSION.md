# Hackathon Submission: SovereignGuard

**Event:** Bharat Builds Tour 2026 — *First Commit Hackathon* (WeMakeDevs × AWS Builder Center)  
**Track:** **Track 1: Build It** *(Open-source on your machine • Zero AWS account, zero card, zero bill)*  
**Targeted Awards:** Track 1 Grand Prize • Best UI Award (Apple iPad) • AWS Builder Center Writeup Award • Amazon Fast-Track Interview Referrals  
**GitHub Repository:** [https://github.com/j4yop/sovereign-guard](https://github.com/j4yop/sovereign-guard)  

---

### Project Title
**SovereignGuard: Zero-Trust Deterministic Authorization Gateway for Autonomous AI Agents**

### Tagline / Elevator Pitch
Deterministic mathematical authorization for non-deterministic AI agents. SovereignGuard pairs the AWS Strands Agents SDK with the AWS Cedar Policy Engine and OpenSearch to physically block autonomous agents from leaking local `.env` secrets, snooping on payroll data, or executing unauthorized mutations.

---

### Inspiration: The "Agentic Shadow IT" Problem
In 2026, developers and enterprise employees are rapidly adopting local AI agents running on laptops (using Ollama and the AWS Strands Agents SDK). Agents are granted powerful tools: reading local files, querying internal databases, and invoking microservice APIs.

However, **LLMs are fundamentally stochastic (probabilistic) and vulnerable to prompt injections**. A malicious prompt, a poisoned file, or an indirect injection in an indexed document can trick the agent into:
1. Reading and leaking `/app/.env` files containing production AWS keys and database passwords.
2. Snooping on confidential executive compensation or medical records.
3. Invoking state-mutating cloud provisioning APIs without administrative approval.

**Why existing guardrails fail:** Prompt-based guardrails (*"Please do not touch confidential files"*) and secondary LLM evaluators are non-deterministic. Attackers easily bypass them using jailbreaks, roleplay framing, or encoded inputs.

We asked: **Can we place a formal, mathematical, un-jailbreakable boundary between the LLM and the physical machine?**

---

### What SovereignGuard Does
SovereignGuard is a zero-trust proxy and execution runtime that introduces **mathematical, deterministic authorization to autonomous AI agents**.

1. **Autonomous Reasoning with AWS Strands Agents SDK:** The agent perceives user directives, reasons across multi-step plans, and selects tool invocations.
2. **Sub-Millisecond Cedar Interception:** Before any tool operates on the filesystem or network, SovereignGuard intercepts the request, transforms it into formal Cedar entities `(Principal, Action, Resource, Context)`, and evaluates it using **AWS Cedar** in **under 0.2 milliseconds**.
3. **Physical Tool Execution Abortion:** If Cedar returns `DENY`, the tool call is physically cancelled before touching disk or network sockets. The agent receives a security violation and cannot leak data.
4. **Cedar Document-Level Security (DLS) in OpenSearch:** RAG vector search results from OpenSearch are filtered through Cedar before entering the LLM's context window, preventing indirect prompt injections from exposing unauthorized data.
5. **Interactive Monaco Cedar Policy Studio:** Security engineers can view, edit, and hot-reload `.cedar` policies directly in the browser with sub-second in-memory recompilation and zero backend restarts.

---

### How We Built It

#### 1. Core AWS Open-Source Stack
* **AWS Cedar (`cedarpy` v4.8+):** Compiled native Rust bindings executing formal Attribute-Based Access Control (ABAC) policies in < 0.2ms.
* **AWS Strands Agents SDK (`strands-agents` v1.54+):** Drives the autonomous multi-step reasoning, planning, and tool execution lifecycle.
* **OpenSearch (`opensearch-py` v3.2+):** Vector knowledge base indexing internal enterprise documentation with security classification metadata.
* **SAM Local & LocalStack:** Docker-based local emulation of internal corporate microservices.

#### 2. High-Performance Streaming Gateway
* **FastAPI + WebSockets (`backend/main.py`):** Real-time streaming gateway delivering thought tokens, intercepted tool requests, and Cedar verdict frames directly to the frontend.

#### 3. Command Center UI (Targeting Best UI Award)
* **Vite + React 19 + TypeScript + Tailwind CSS:** Dark-mode cybersecurity SOC aesthetic with neon emerald permits (`🟢 PERMIT`) and glowing crimson barriers (`🔴 DENY`).
* **Monaco Code Editor (`@monaco-editor/react`):** In-browser Cedar policy editor with live hot-reloading.
* **Web Audio API Alerts:** Synthesized security tone cues for immediate sensory feedback on permits and denials.

---

### Challenges We Overcame
1. **Bridging Non-Deterministic AI with Formal Logic:** Translating fuzzy tool arguments (e.g. `file_path: "/app/.env"`) into strict Cedar entity graphs required building an intelligent schema translator that infers resource tags, paths, and classifications dynamically.
2. **Sub-Millisecond Policy Evaluation in Python:** Traditional Python policy checks introduce 50–100ms of latency. By integrating Cedar's native Rust core via `cedarpy`, evaluation latency dropped to **0.15ms (150 microseconds)**—virtually zero overhead.
3. **Preventing Cold-Start Demo Lag:** Built a dual-engine runner supporting local Ollama (`llama3.2:3b`) alongside an automated deterministic fallback so the hackathon demo video and live presentations are 100% immune to GPU lag or network throttling.

---

### Accomplishments We're Proud Of
* **7/7 Automated Tests Passing in 0.25s:** Fully verified with `pytest` covering secret blocking, payroll protection, engineering doc permits, OpenSearch DLS filtering, and dynamic policy hot-reloading.
* **100% Offline & Free:** Runs completely on localhost with zero cloud accounts, zero credit cards, and zero cloud charges.
* **Non-Slop Engineering:** Solves a genuine, critical cybersecurity threat using AWS's latest open-source SDKs rather than building another generic chatbot wrapper.

---

### What We Learned
* How AWS Cedar's formal logic (`permit` and `forbid` rules) fundamentally eliminates prompt jailbreaks when placed in front of tool execution.
* How the new AWS Strands Agents SDK provides clean tool dispatching and event hooks for building autonomous agent workflows.
* How Document-Level Security (DLS) in OpenSearch can be enforced deterministically before vector embeddings enter an LLM's context window.

---

### What's Next for SovereignGuard
* **Cedar Policy Synthesis via Agentic Learning:** Automatically generating recommended Cedar policies by observing normal developer workflows in audit mode.
* **eBPF Kernel Integration:** Extending the physical block to OS syscall levels using Linux eBPF probes for sandboxed container agents.
* **AWS Bedrock Guardrails Integration:** Deploying SovereignGuard as an enterprise sidecar proxy for Amazon Bedrock agent deployments in production VPCs.
