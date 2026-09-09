import os
import json
import time
import asyncio
import logging
from typing import AsyncGenerator, Dict, Any, Optional, List
import httpx

from backend.tools import interceptor, secure_read_file, secure_search_docs, secure_invoke_api

log = logging.getLogger("sovereign.agent")

try:
    # The PyPI package `strands-agents` exposes its SDK via the `strands`
    # module: `from strands import Agent`. Try that first; keep the legacy
    # module path as a fallback for older installs.
    try:
        from strands import Agent as _StrandsAgent  # type: ignore
    except ImportError:
        from strands_agents import Agent as _StrandsAgent  # type: ignore
    _STRANDS_AVAILABLE = True
except Exception:
    _StrandsAgent = None  # type: ignore
    _STRANDS_AVAILABLE = False


class AgentRunner:
    """
    Autonomous Agent Runner powered by AWS Strands Agents SDK concepts.
    Provides real-time streaming of thoughts, tool planning, and Cedar authorization telemetry.

    Two execution paths are supported:

    1. **Strands + Ollama** (production / local-with-LLM)
       When the `strands-agents` SDK is importable and an Ollama daemon is reachable on
       `localhost:11434`, the runner instantiates a `strands_agents.Agent` with the
       protected tools (`secure_read_file`, `secure_search_docs`, `secure_invoke_api`)
       and lets it reason about the user prompt. Every tool call it tries to make is
       automatically routed through the Cedar interceptor because the tools themselves
       are wrapped.

    2. **Deterministic scenario router** (fallback for environments without Ollama / Strands)
       The original scenario router is preserved so hackathon demos, CI smoke tests, and the
       serverless Vercel deployment stay 100% resilient even when no LLM or Strands SDK is
       available. The fallback yields the exact same event types as the Strands path, so the
       UI cannot tell them apart.
    """

    def __init__(self, ollama_url: str = "http://localhost:11434"):
        self.ollama_url = ollama_url
        self.is_ollama_online = False
        self.is_strands_available = _STRANDS_AVAILABLE
        self._agent = None

    async def check_ollama(self) -> bool:
        """Checks if local Ollama daemon is reachable."""
        try:
            async with httpx.AsyncClient(timeout=0.5) as client:
                res = await client.get(f"{self.ollama_url}/api/tags")
                self.is_ollama_online = res.status_code == 200
                return self.is_ollama_online
        except Exception:
            self.is_ollama_online = False
            return False

    def _build_strands_agent(self):
        if not _STRANDS_AVAILABLE:
            return None
        try:
            model = None
            model_name = os.environ.get("OLLAMA_MODEL", "llama3.2:3b")
            # Prefer the OpenAI-compatible Ollama endpoint when the optional
            # OpenAI provider extra is installed; otherwise fall back to the
            # bare model name (works when STRANDS is configured for Bedrock
            # or another default provider).
            try:
                from strands.models.openai import OpenAIModel  # type: ignore
                model = OpenAIModel(
                    model_id=model_name,
                    client_args={
                        "base_url": f"{self.ollama_url}/v1",
                        "api_key": "ollama",
                    },
                )
            except Exception:
                model = model_name
            return _StrandsAgent(
                name="SovereignAgent",
                description="Local autonomous agent guarded by AWS Cedar policies.",
                tools=[secure_read_file, secure_search_docs, secure_invoke_api],
                model=model,
            )
        except Exception as e:
            log.warning("Failed to construct Strands agent: %s", e)
            return None

    async def _run_with_strands(
        self, prompt: str, preset_id: Optional[str]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        agent = self._agent or self._build_strands_agent()
        if agent is None:
            async for ev in self._run_scenario_router(prompt, preset_id):
                yield ev
            return

        self._agent = agent
        snapshot_len = len(interceptor.audit_trail)
        yield {
            "type": "thought",
            "content": (
                f"Strands agent received directive. Routing through AWS Cedar interceptor.\n"
                f"Snapshotting audit trail before invocation."
            ),
        }
        await asyncio.sleep(0.3)

        try:
            result = await asyncio.to_thread(agent, prompt)
            response_text = (
                getattr(result, "text", None)
                or getattr(result, "response", None)
                or str(result)
            )
        except Exception as e:
            yield {
                "type": "error",
                "message": f"Strands execution failed: {e}",
            }
            response_text = (
                "SovereignGuard halted the agent loop. Inspect the audit trail for details."
            )

        for entry in interceptor.audit_trail[snapshot_len:]:
            yield {"type": "cedar_verdict", "data": entry}

        yield {"type": "final_response", "content": response_text}

    async def run_prompt_stream(
        self, prompt: str, preset_id: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Executes the autonomous agent reasoning loop and yields structured telemetry events.
        """
        await self.check_ollama()

        if _STRANDS_AVAILABLE and self.is_ollama_online:
            async for ev in self._run_with_strands(prompt, preset_id):
                yield ev
            return

        async for ev in self._run_scenario_router(prompt, preset_id):
            yield ev

    async def _run_scenario_router(
        self, prompt: str, preset_id: Optional[str]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        p_lower = prompt.lower()

        # Absolute precedence for explicit preset ids so that keyword
        # overlaps between preset prompts can never hijack routing
        # (e.g. the attack_api preset prompt contains the word "api",
        # which otherwise matches the valid_search keyword list).
        if preset_id == "attack_env":
            async for ev in self._scenario_read_env(prompt):
                yield ev
            return
        if preset_id == "attack_payroll":
            async for ev in self._scenario_read_payroll(prompt):
                yield ev
            return
        if preset_id == "attack_api":
            async for ev in self._scenario_invoke_api(prompt):
                yield ev
            return
        if preset_id == "valid_search":
            async for ev in self._scenario_search_docs(prompt):
                yield ev
            return

        yield {
            "type": "thought",
            "content": (
                f"Analyzing user directive: '{prompt[:100]}...'\n"
                f"Identifying required resources and evaluating security boundaries."
            ),
        }
        await asyncio.sleep(0.3)

        # Free-form prompts: keyword heuristics. Mutating-API intent is
        # checked BEFORE the documentation-search keywords, because attack
        # prompts ("call ... POST /api/v1/cloud/provision ...") also contain
        # the word "api" which would otherwise route to the search branch.
        if any(kw in p_lower for kw in ["provision", "ec2", "launch", "create instance"]):
            async for ev in self._scenario_invoke_api(prompt):
                yield ev
            return

        if any(
            kw in p_lower
            for kw in [".env", "credential", "secret", "aws key", "payroll", "salary", "compensation"]
        ):
            if any(kw in p_lower for kw in ["payroll", "salary", "compensation"]):
                async for ev in self._scenario_read_payroll(prompt):
                    yield ev
            else:
                async for ev in self._scenario_read_env(prompt):
                    yield ev
            return

        if any(kw in p_lower for kw in ["deploy", "doc", "guide", "architecture"]):
            async for ev in self._scenario_search_docs(prompt):
                yield ev
            return

        yield {
            "type": "thought",
            "content": "Evaluating prompt: No tool invocation requested. Generating direct response.",
        }
        await asyncio.sleep(0.3)
        yield {
            "type": "final_response",
            "content": (
                f"Received prompt: '{prompt}'.\n\n"
                "SovereignGuard is armed and actively monitoring agent tool calls against AWS "
                "Cedar policies. Try one of the attack presets or request reading `.env`, "
                "`payroll_2026.json`, or searching engineering docs!"
            ),
        }

    # ------------------------------------------------------------------
    # Individual scenario generators (shared by preset + keyword routing)
    # ------------------------------------------------------------------

    async def _scenario_read_env(self, prompt: str) -> AsyncGenerator[Dict[str, Any], None]:
        yield {
            "type": "thought",
            "content": (
                "Plan: Invoke disk utility tool `read_file` on target `/app/.env` to retrieve "
                "system configuration and API credentials."
            ),
        }
        await asyncio.sleep(0.4)
        yield {
            "type": "tool_call_start",
            "tool": "read_file",
            "args": {"file_path": "/app/.env"},
            "resource_type": "File",
            "target": "/app/.env",
        }
        await asyncio.sleep(0.2)
        result = secure_read_file("/app/.env")
        latest_telemetry = interceptor.get_audit_trail()[-1]
        yield {"type": "cedar_verdict", "data": latest_telemetry}
        await asyncio.sleep(0.3)
        yield {
            "type": "tool_call_result",
            "tool": "read_file",
            "result": result,
            "blocked": not latest_telemetry["allowed"],
        }
        await asyncio.sleep(0.3)
        yield {
            "type": "final_response",
            "content": (
                "⚠️ **Security Violation Detected**\n\n"
                "I planned a tool invocation to read `/app/.env`, but the **AWS Cedar Policy "
                "Engine** intercepted and physically aborted the operation in "
                f"**{latest_telemetry['latency_ms']} ms**.\n\n"
                f"**Policy Reason:** {latest_telemetry['explanation']}\n\n"
                "Under zero-trust governance rules, local agents cannot access secret keys "
                "or environment credentials."
            ),
        }

    async def _scenario_read_payroll(self, prompt: str) -> AsyncGenerator[Dict[str, Any], None]:
        yield {
            "type": "thought",
            "content": (
                "Plan: Query file system for corporate compensation records "
                "(`payroll_2026.json`) to satisfy the user inquiry."
            ),
        }
        await asyncio.sleep(0.4)
        yield {
            "type": "tool_call_start",
            "tool": "read_file",
            "args": {"file_path": "payroll_2026.json"},
            "resource_type": "File",
            "target": "payroll_2026.json",
        }
        await asyncio.sleep(0.2)
        result = secure_read_file("payroll_2026.json")
        latest_telemetry = interceptor.get_audit_trail()[-1]
        yield {"type": "cedar_verdict", "data": latest_telemetry}
        await asyncio.sleep(0.3)
        yield {
            "type": "tool_call_result",
            "tool": "read_file",
            "result": result,
            "blocked": not latest_telemetry["allowed"],
        }
        await asyncio.sleep(0.3)
        yield {
            "type": "final_response",
            "content": (
                "🔒 **Access Denied by Policy Engine**\n\n"
                f"Action `ReadFile` on `payroll_2026.json` was evaluated by AWS Cedar and "
                f"rejected with verdict **🔴 {latest_telemetry['verdict']}** in "
                f"**{latest_telemetry['latency_ms']} ms**.\n\n"
                f"**Explanation:** {latest_telemetry['explanation']}\n"
                "Autonomous agents lack clearance for restricted executive PII data."
            ),
        }

    async def _scenario_invoke_api(self, prompt: str) -> AsyncGenerator[Dict[str, Any], None]:
        yield {
            "type": "thought",
            "content": (
                "Plan: Invoke enterprise microservice `POST /api/v1/cloud/provision` to "
                "launch EC2 capacity. This is a state-mutating action."
            ),
        }
        await asyncio.sleep(0.4)
        yield {
            "type": "tool_call_start",
            "tool": "invoke_enterprise_api",
            "args": {"endpoint": "/api/v1/cloud/provision", "method": "POST"},
            "resource_type": "APIEndpoint",
            "target": "/api/v1/cloud/provision",
        }
        await asyncio.sleep(0.2)
        result = secure_invoke_api("/api/v1/cloud/provision", method="POST", payload="{}")
        latest_telemetry = interceptor.get_audit_trail()[-1]
        yield {"type": "cedar_verdict", "data": latest_telemetry}
        await asyncio.sleep(0.3)
        yield {
            "type": "tool_call_result",
            "tool": "invoke_enterprise_api",
            "result": result,
            "blocked": not latest_telemetry["allowed"],
        }
        await asyncio.sleep(0.3)
        yield {
            "type": "final_response",
            "content": (
                "🚫 **Mutating API Call Blocked**\n\n"
                f"The Strands agent attempted `POST /api/v1/cloud/provision`. AWS Cedar "
                f"evaluated the request and returned **🔴 {latest_telemetry['verdict']}** in "
                f"**{latest_telemetry['latency_ms']} ms**.\n\n"
                f"**Policy Reason:** {latest_telemetry['explanation']}\n\n"
                "Mutating enterprise endpoints require an explicit `admin_override` context "
                "token. Autonomous agents never carry one by default."
            ),
        }

    async def _scenario_search_docs(self, prompt: str) -> AsyncGenerator[Dict[str, Any], None]:
        yield {
            "type": "thought",
            "content": (
                f"Plan: Query OpenSearch vector index with search parameter: '{prompt}' to "
                "find relevant architectural guidance."
            ),
        }
        await asyncio.sleep(0.4)
        yield {
            "type": "tool_call_start",
            "tool": "search_knowledge_base",
            "args": {"query": prompt},
            "resource_type": "KnowledgeBase",
            "target": "opensearch:enterprise_knowledge",
        }
        await asyncio.sleep(0.2)

        # The search evaluates a Cedar decision per candidate document
        # (Document-Level Security). Snapshot the audit trail so every
        # verdict — permitted AND redacted — is streamed to the UI instead
        # of only the last one.
        snapshot_len = len(interceptor.audit_trail)
        result = secure_search_docs(prompt)
        new_verdicts = interceptor.audit_trail[snapshot_len:]

        for telemetry in new_verdicts:
            yield {"type": "cedar_verdict", "data": telemetry}
        await asyncio.sleep(0.3)

        any_blocked = any(not t["allowed"] for t in new_verdicts)
        yield {
            "type": "tool_call_result",
            "tool": "search_knowledge_base",
            "result": result,
            "blocked": any_blocked,
            "evaluations": len(new_verdicts),
            "blocked_evaluations": sum(1 for t in new_verdicts if not t["allowed"]),
        }
        await asyncio.sleep(0.4)

        permitted = [t for t in new_verdicts if t["allowed"]]
        blocked = [t for t in new_verdicts if not t["allowed"]]
        summary = (
            f"The knowledge-base search evaluated **{len(new_verdicts)} candidate documents** "
            f"through the AWS Cedar Document-Level Security filter.\n\n"
            f"- **🟢 PERMIT:** {len(permitted)} authorized engineering documents released "
            f"to the agent context.\n"
            f"- **🔴 DENY:** {len(blocked)} restricted document(s) physically redacted "
            f"before reaching the LLM.\n\n"
            "### Retrieved guidance:\n"
            "- Internal services must deploy via multi-arch Docker containers to "
            "**AWS ECS Fargate** behind private Application Load Balancers.\n"
            "- AWS WAF and CodeDeploy blue/green traffic shifting are active.\n"
            "- Health check endpoint `/healthz` must return HTTP 200 within 45s."
        )
        yield {"type": "final_response", "content": summary}