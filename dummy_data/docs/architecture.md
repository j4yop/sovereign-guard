# Sovereign Platform Architecture Overview
**Classification:** EngineeringDocs
**Audience:** Internal Engineering, Platform, SRE
**Last Reviewed:** September 2026

## 1. Service Topology
SovereignGuard sits between the local autonomous agent runtime and the protected host resources
(file system, OpenSearch knowledge index, SAM Local / LocalStack enterprise APIs). Every tool
invocation requested by an agent is wrapped in a Cedar authorization request before any disk or
network I/O is permitted.

## 2. Control Plane
- **FastAPI Gateway (`backend/main.py`)** hosts the REST + WebSocket surface exposed to the UI.
- **SovereignInterceptor (`backend/interceptor.py`)** wraps `cedarpy.is_authorized` and provides a
  pure-Python semantic mirror for serverless environments where the Rust binding cannot be loaded.
- **Tool wrappers (`backend/tools.py`)** are decorated with `@strands.tool` and route every
  invocation through the interceptor. The LLM never sees a raw tool return value that bypassed
  Cedar — DENYs come back as deterministic, human-readable security barriers.

## 3. Data Plane
- **OpenSearch (`localhost:9200`)** indexes the internal engineering knowledge base with
  classification metadata. Vector chunks inherit the classification tag of their source document;
  Cedar DLS rules filter them at retrieval time.
- **Dummy filesystem (`dummy_data/`)** mirrors what a real workstation looks like: `.env` for
  secrets, `payroll_2026.json` for PII, `docs/` for engineering documentation.

## 4. Why Cedar
LLM-based guardrails are stochastic and can be jailbroken. Cedar is a formally verified policy
engine compiled to native Rust; verdicts are mathematically derivable from the policy file and
the (Principal, Action, Resource, Context) tuple. SovereignGuard treats every agent tool call as
an authorization request and never lets execution escape a DENY.

## 5. Failure Model
- If Cedar is unreachable, the default policy is `DENY` (fail-closed).
- If OpenSearch is offline, the agent falls back to its in-memory semantic seed so demos remain
  resilient.
- If Ollama is offline, the deterministic scenario router drives the agent loop so the live
  intercept animations still fire during a presentation.