import os
import time
import json
from typing import Dict, Any, Tuple, List, Optional
from cedarpy import is_authorized, Decision

class SovereignInterceptor:
    """
    SovereignGuard Policy Interceptor:
    Enforces deterministic Attribute-Based Access Control (ABAC) on every agent tool call
    using the official AWS Cedar authorization engine compiled to Rust.
    """
    def __init__(self, policy_path: str = "policies/agent_rules.cedar"):
        self.policy_path = policy_path
        self.policy_content = ""
        self.load_policies()
        
        # In-memory audit trail of all evaluated decisions
        self.audit_trail: List[Dict[str, Any]] = []

    def load_policies(self, custom_content: Optional[str] = None):
        """Loads or hot-reloads Cedar policies from disk or memory."""
        if custom_content is not None:
            self.policy_content = custom_content
        else:
            if os.path.exists(self.policy_path):
                with open(self.policy_path, "r", encoding="utf-8") as f:
                    self.policy_content = f.read()
            else:
                raise FileNotFoundError(f"Cedar policy file not found: {self.policy_path}")

    def evaluate(
        self,
        principal_id: str,
        action_id: str,
        resource_id: str,
        resource_attrs: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Evaluates a tool call request against compiled Cedar policies.
        Calculates exact microsecond evaluation latency and extracts diagnostics.
        """
        context = context or {}

        # Construct formal Cedar entity graph
        entities = [
            {
                "uid": {"type": "Role", "id": "AutonomousAgent"},
                "attrs": {},
                "parents": []
            },
            {
                "uid": {"type": "Agent", "id": principal_id},
                "attrs": {},
                "parents": [{"type": "Role", "id": "AutonomousAgent"}]
            },
            {
                "uid": {"type": "File" if action_id != "InvokeAPI" else "APIEndpoint", "id": resource_id},
                "attrs": resource_attrs,
                "parents": []
            }
        ]

        # Request parameters
        res_type = "File" if action_id != "InvokeAPI" else "APIEndpoint"
        request = {
            "principal": f'Agent::"{principal_id}"',
            "action": f'Action::"{action_id}"',
            "resource": f'{res_type}::"{resource_id}"',
            "context": context
        }

        # Benchmarked Rust-compiled Cedar execution
        t0 = time.perf_counter()
        try:
            result = is_authorized(
                request=request,
                policies=self.policy_content,
                entities=entities
            )
            elapsed_ms = (time.perf_counter() - t0) * 1000
            allowed = (result.decision == Decision.Allow)
            reasons = list(result.diagnostics.reasons)
            errors = list(result.diagnostics.errors)
        except Exception as e:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            allowed = False
            reasons = []
            errors = [str(e)]

        # Determine user-friendly policy explanation
        if allowed:
            explanation = "Access permitted under policy granting access to classified internal documentation."
        else:
            if "secrets" in str(resource_attrs) or ".env" in resource_id:
                explanation = "Blocked by Cedar Policy: Access to credentials, secrets, or .env files is strictly forbidden."
            elif "payroll" in str(resource_attrs):
                explanation = "Blocked by Cedar Policy: Access to confidential compensation and PII data is forbidden."
            elif action_id == "InvokeAPI" and resource_attrs.get("mutating"):
                explanation = "Blocked by Cedar Policy: Mutating enterprise API actions require elevated admin credentials."
            else:
                explanation = "Access denied: Default-deny policy enforced by Cedar engine."

        telemetry = {
            "timestamp": time.time(),
            "principal": principal_id,
            "action": action_id,
            "resource": resource_id,
            "resource_attrs": resource_attrs,
            "context": context,
            "allowed": allowed,
            "verdict": "PERMIT" if allowed else "DENY",
            "latency_ms": round(elapsed_ms, 3),
            "reasons": reasons,
            "errors": errors,
            "explanation": explanation,
            "entities": entities
        }

        self.audit_trail.append(telemetry)
        return allowed, telemetry

    def get_audit_trail(self) -> List[Dict[str, Any]]:
        return self.audit_trail
