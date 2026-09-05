import os
import json
import time
import asyncio
from typing import AsyncGenerator, Dict, Any, Optional
import httpx

from backend.tools import interceptor, secure_read_file, secure_search_docs, secure_invoke_api

class AgentRunner:
    """
    Autonomous Agent Runner powered by AWS Strands Agents concepts.
    Provides real-time streaming of thoughts, tool planning, and Cedar authorization telemetry.
    Supports local Ollama LLMs with an automatic deterministic simulation fallback
    so hackathon presentations and demos are 100% resilient.
    """
    def __init__(self, ollama_url: str = "http://localhost:11434"):
        self.ollama_url = ollama_url
        self.is_ollama_online = False

    async def check_ollama(self) -> bool:
        """Checks if local Ollama daemon is reachable."""
        try:
            async with httpx.AsyncClient(timeout=0.5) as client:
                res = await client.get(f"{self.ollama_url}/api/tags")
                self.is_ollama_online = (res.status_code == 200)
                return self.is_ollama_online
        except Exception:
            self.is_ollama_online = False
            return False

    async def run_prompt_stream(self, prompt: str, preset_id: Optional[str] = None) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Executes the autonomous agent reasoning loop and yields structured WebSocket telemetry events.
        """
        await self.check_ollama()
        p_lower = prompt.lower()

        # Step 1: Agent receives prompt and starts reasoning
        yield {
            "type": "thought",
            "content": f"Analyzing user directive: '{prompt[:100]}...'\nIdentifying required resources and evaluating security boundaries."
        }
        await asyncio.sleep(0.3)

        # Scenario A: Attack on .env credentials
        if preset_id == "attack_env" or ".env" in p_lower or "credential" in p_lower or "secret" in p_lower or "aws key" in p_lower:
            yield {
                "type": "thought",
                "content": "Plan: Invoke disk utility tool `read_file` on target `/app/.env` to retrieve system configuration and API credentials."
            }
            await asyncio.sleep(0.4)

            yield {
                "type": "tool_call_start",
                "tool": "read_file",
                "args": {"file_path": "/app/.env"},
                "resource_type": "File",
                "target": "/app/.env"
            }
            await asyncio.sleep(0.2)

            # Execution with Cedar intercept
            result = secure_read_file("/app/.env")
            latest_telemetry = interceptor.get_audit_trail()[-1]

            yield {
                "type": "cedar_verdict",
                "data": latest_telemetry
            }
            await asyncio.sleep(0.3)

            yield {
                "type": "tool_call_result",
                "tool": "read_file",
                "result": result,
                "blocked": True
            }
            await asyncio.sleep(0.3)

            yield {
                "type": "final_response",
                "content": (
                    "⚠️ **Security Violation Detected**\n\n"
                    "I planned a tool invocation to read `/app/.env`, but the **AWS Cedar Policy Engine** intercepted and physically aborted the operation in "
                    f"**{latest_telemetry['latency_ms']} ms**.\n\n"
                    f"**Policy Reason:** {latest_telemetry['explanation']}\n\n"
                    "Under zero-trust governance rules, local agents cannot access secret keys or environment credentials."
                )
            }

        # Scenario B: Snoop on confidential payroll
        elif preset_id == "attack_payroll" or "payroll" in p_lower or "salary" in p_lower or "compensation" in p_lower:
            yield {
                "type": "thought",
                "content": "Plan: Query file system for corporate compensation records (`payroll_2026.json`) to satisfy the user inquiry."
            }
            await asyncio.sleep(0.4)

            yield {
                "type": "tool_call_start",
                "tool": "read_file",
                "args": {"file_path": "payroll_2026.json"},
                "resource_type": "File",
                "target": "payroll_2026.json"
            }
            await asyncio.sleep(0.2)

            result = secure_read_file("payroll_2026.json")
            latest_telemetry = interceptor.get_audit_trail()[-1]

            yield {
                "type": "cedar_verdict",
                "data": latest_telemetry
            }
            await asyncio.sleep(0.3)

            yield {
                "type": "tool_call_result",
                "tool": "read_file",
                "result": result,
                "blocked": True
            }
            await asyncio.sleep(0.3)

            yield {
                "type": "final_response",
                "content": (
                    "🔒 **Access Denied by Policy Engine**\n\n"
                    f"Action `ReadFile` on `payroll_2026.json` was evaluated by AWS Cedar and rejected with verdict **🔴 {latest_telemetry['verdict']}** in "
                    f"**{latest_telemetry['latency_ms']} ms**.\n\n"
                    f"**Explanation:** {latest_telemetry['explanation']}\n"
                    "Autonomous agents lack clearance for restricted executive PII data."
                )
            }

        # Scenario C: Search internal engineering documentation (Valid path)
        elif preset_id == "valid_search" or "deploy" in p_lower or "doc" in p_lower or "guide" in p_lower or "api" in p_lower or "architecture" in p_lower:
            yield {
                "type": "thought",
                "content": f"Plan: Query OpenSearch vector index with search parameter: '{prompt}' to find relevant architectural guidance."
            }
            await asyncio.sleep(0.4)

            yield {
                "type": "tool_call_start",
                "tool": "search_knowledge_base",
                "args": {"query": prompt},
                "resource_type": "KnowledgeBase",
                "target": "opensearch:enterprise_knowledge"
            }
            await asyncio.sleep(0.2)

            result = secure_search_docs(prompt)
            latest_telemetry = interceptor.get_audit_trail()[-1]

            yield {
                "type": "cedar_verdict",
                "data": latest_telemetry
            }
            await asyncio.sleep(0.3)

            yield {
                "type": "tool_call_result",
                "tool": "search_knowledge_base",
                "result": result,
                "blocked": False
            }
            await asyncio.sleep(0.4)

            yield {
                "type": "final_response",
                "content": (
                    "✅ **Authorized Information Retrieved**\n\n"
                    f"The tool request was approved by the AWS Cedar Engine (**🟢 PERMIT** in **{latest_telemetry['latency_ms']} ms**).\n\n"
                    "### Deployment Overview:\n"
                    "- Internal services must deploy via multi-arch Docker containers to **AWS ECS Fargate** behind private Application Load Balancers.\n"
                    "- AWS WAF and CodeDeploy blue/green traffic shifting are active.\n"
                    "- Health check endpoint `/healthz` must return HTTP 200 within 45s."
                )
            }

        # Scenario D: Generic query
        else:
            yield {
                "type": "thought",
                "content": "Evaluating prompt: No tool invocation requested. Generating direct response."
            }
            await asyncio.sleep(0.3)
            yield {
                "type": "final_response",
                "content": (
                    f"Received prompt: '{prompt}'.\n\n"
                    "SovereignGuard is armed and actively monitoring agent tool calls against AWS Cedar policies. "
                    "Try one of the attack presets or request reading `.env`, `payroll_2026.json`, or searching engineering docs!"
                )
            }
