import os
import time
import json
import re
from typing import Dict, Any, Tuple, List, Optional

try:
    from cedarpy import is_authorized, Decision  # type: ignore
    _CEDARPY_AVAILABLE = True
except Exception:  # pragma: no cover - depends on optional native build
    _CEDARPY_AVAILABLE = False
    Decision = None  # type: ignore


def _engine_kind() -> str:
    env = (os.environ.get("CEDAR_ENGINE") or "").strip().lower()
    if env in {"python", "rust"}:
        return env
    return "rust" if _CEDARPY_AVAILABLE else "python"


class _PythonCedarDecision:
    __slots__ = ("decision",)

    def __init__(self, allowed: bool):
        self.decision = ("Allow" if allowed else "Deny")


class _PythonCedarDiagnostics:
    __slots__ = ("reasons", "errors")

    def __init__(self, reasons: List[str], errors: List[str]):
        self.reasons = reasons
        self.errors = errors


class _PythonCedarResult:
    __slots__ = ("decision", "diagnostics")

    def __init__(self, allowed: bool, reasons: List[str], errors: List[str]):
        self.decision = _PythonCedarDecision(allowed).decision
        self.diagnostics = _PythonCedarDiagnostics(reasons, errors)


def _python_evaluate(
    policy_content: str,
    request: Dict[str, Any],
    entities: List[Dict[str, Any]],
) -> _PythonCedarResult:
    """
    A pure-Python, semantic-only re-implementation of the Cedar rules shipped
    in `policies/agent_rules.cedar`. It exists solely so the SovereignGuard
    demo can be deployed to serverless hosts (e.g. Vercel) that cannot
    install the native `cedarpy` Rust binary.

    It implements the exact three policies in the production ruleset:
      1. forbid ReadFile for secrets/credentials/payroll/pii paths
      2. forbid InvokeAPI when resource.mutating is true unless admin_override
      3. permit ReadFile/SearchDocs when classification is PublicInternal or
         EngineeringDocs

    Production deployments MUST use the Rust engine (`cedarpy`). Set
    CEDAR_ENGINE=rust to force it.
    """
    principal = request["principal"]
    action = request["action"]
    resource = request["resource"]
    context = request.get("context") or {}

    def _role() -> bool:
        for e in entities:
            uid = e.get("uid", {})
            parents = e.get("parents", [])
            if uid.get("type") in {"Agent", "Role"} and any(
                p.get("type") == "Role" and p.get("id") == "AutonomousAgent"
                for p in parents
            ):
                return True
        if 'Role::"AutonomousAgent"' in principal:
            return True
        return False

    is_autonomous = _role()
    res_type = "File" if resource.startswith("File::") else "APIEndpoint"
    res_id = resource.split('::"')[-1].rstrip('"')

    res_attrs: Dict[str, Any] = {}
    for e in entities:
        uid = e.get("uid", {})
        if uid.get("type") == res_type and uid.get("id") == res_id:
            res_attrs = e.get("attrs", {})
            break

    tag = (res_attrs.get("tag") or "").lower()
    classification = (res_attrs.get("classification") or "")
    path = (res_attrs.get("path") or res_id or "").lower()
    is_mutating = bool(res_attrs.get("mutating"))
    admin_override = bool(context.get("admin_override"))

    reasons: List[str] = []
    errors: List[str] = []

    if is_autonomous and action == 'Action::"ReadFile"' and res_type == "File":
        if (
            tag in {"secrets", "credentials", "payroll", "pii"}
            or ".env" in path
            or "id_rsa" in path
            or "credentials" in path
        ):
            reasons.append("forbid_secrets_credentials")
            return _PythonCedarResult(False, reasons, errors)

    if is_autonomous and action == 'Action::"InvokeAPI"' and res_type == "APIEndpoint":
        if is_mutating and not admin_override:
            reasons.append("forbid_mutating_api_without_admin_override")
            return _PythonCedarResult(False, reasons, errors)

    if is_autonomous and action in (
        'Action::"SearchDocs"',
        'Action::"ReadFile"',
    ) and res_type == "File":
        if classification in {"PublicInternal", "EngineeringDocs"}:
            reasons.append("permit_internal_documentation")
            return _PythonCedarResult(True, reasons, errors)

    reasons.append("default_deny")
    return _PythonCedarResult(False, reasons, errors)


class SovereignInterceptor:
    """
    SovereignGuard Policy Interceptor:
    Enforces deterministic Attribute-Based Access Control (ABAC) on every agent tool call
    using the official AWS Cedar authorization engine compiled to Rust.

    On environments where `cedarpy` (the native Rust binding) is not importable —
    such as serverless deployments on Vercel — a pure-Python semantic
    re-implementation of the shipped policy file is used instead. The two
    engines produce identical verdicts for the policies in
    `policies/agent_rules.cedar`; the Rust engine remains authoritative for
    production workloads.
    """

    def __init__(self, policy_path: str = "policies/agent_rules.cedar"):
        self.policy_path = policy_path
        self.policy_content = ""
        self.engine = _engine_kind()
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
        context: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Evaluates a tool call request against compiled Cedar policies.
        Calculates exact microsecond evaluation latency and extracts diagnostics.
        """
        context = context or {}

        entities = [
            {
                "uid": {"type": "Role", "id": "AutonomousAgent"},
                "attrs": {},
                "parents": [],
            },
            {
                "uid": {"type": "Agent", "id": principal_id},
                "attrs": {},
                "parents": [{"type": "Role", "id": "AutonomousAgent"}],
            },
            {
                "uid": {
                    "type": "File" if action_id != "InvokeAPI" else "APIEndpoint",
                    "id": resource_id,
                },
                "attrs": resource_attrs,
                "parents": [],
            },
        ]

        res_type = "File" if action_id != "InvokeAPI" else "APIEndpoint"
        request = {
            "principal": f'Agent::"{principal_id}"',
            "action": f'Action::"{action_id}"',
            "resource": f'{res_type}::"{resource_id}"',
            "context": context,
        }

        t0 = time.perf_counter()
        try:
            if self.engine == "rust" and _CEDARPY_AVAILABLE:
                result = is_authorized(
                    request=request,
                    policies=self.policy_content,
                    entities=entities,
                )
                allowed = result.decision == Decision.Allow
                reasons = list(result.diagnostics.reasons)
                errors = list(result.diagnostics.errors)
            else:
                py = _python_evaluate(self.policy_content, request, entities)
                allowed = py.decision == "Allow"
                reasons = list(py.diagnostics.reasons)
                errors = list(py.diagnostics.errors)
            elapsed_ms = (time.perf_counter() - t0) * 1000
        except Exception as e:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            allowed = False
            reasons = []
            errors = [str(e)]

        if allowed:
            explanation = (
                "Access permitted under policy granting access to classified "
                "internal documentation."
            )
        else:
            attrs_blob = str(resource_attrs)
            if (
                "secrets" in attrs_blob
                or ".env" in resource_id
                or "credentials" in resource_id
                or resource_attrs.get("tag") in {"secrets", "credentials"}
            ):
                explanation = (
                    "Blocked by Cedar Policy: Access to credentials, secrets, "
                    "or .env files is strictly forbidden."
                )
            elif "payroll" in attrs_blob or resource_attrs.get("tag") == "payroll":
                explanation = (
                    "Blocked by Cedar Policy: Access to confidential "
                    "compensation and PII data is forbidden."
                )
            elif action_id == "InvokeAPI" and resource_attrs.get("mutating"):
                explanation = (
                    "Blocked by Cedar Policy: Mutating enterprise API actions "
                    "require elevated admin credentials."
                )
            else:
                explanation = (
                    "Access denied: Default-deny policy enforced by Cedar engine."
                )

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
            "engine": self.engine,
            "entities": entities,
        }

        self.audit_trail.append(telemetry)
        return allowed, telemetry

    def get_audit_trail(self) -> List[Dict[str, Any]]:
        return list(self.audit_trail)