import os
import json
from typing import Dict, Any, List
from strands import tool
from backend.interceptor import SovereignInterceptor
from backend.opensearch_service import OpenSearchService

interceptor = SovereignInterceptor(policy_path="policies/agent_rules.cedar")
opensearch = OpenSearchService()

DUMMY_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dummy_data"))

@tool(name="read_file", description="Reads the content of a local file from disk")
def secure_read_file(file_path: str) -> str:
    """
    Protected tool: Intercepts file read requests and submits them to AWS Cedar.
    If Cedar denies the action, the file is never opened from disk.
    """
    clean_path = file_path.strip().replace("/app/", "")
    
    # Infer metadata tags for Cedar evaluation
    if ".env" in clean_path or "secrets" in clean_path or "credentials" in clean_path:
        tag = "secrets"
        classification = "Restricted"
    elif "payroll" in clean_path or "salary" in clean_path:
        tag = "payroll"
        classification = "Restricted"
    elif "docs/" in clean_path:
        tag = "general"
        classification = "PublicInternal" if "deploy" in clean_path else "EngineeringDocs"
    else:
        tag = "general"
        classification = "Unclassified"

    allowed, telemetry = interceptor.evaluate(
        principal_id="AutonomousDeveloperAgent",
        action_id="ReadFile",
        resource_id=file_path,
        resource_attrs={
            "tag": tag,
            "classification": classification,
            "path": file_path
        }
    )

    if not allowed:
        return (
            f"[SOVEREIGN_GUARD SECURITY BARRIER]\n"
            f"Verdict: 🔴 CEDAR POLICY DENIED (evaluated in {telemetry['latency_ms']}ms)\n"
            f"Explanation: {telemetry['explanation']}\n"
            f"Physical block: Disk I/O was aborted before read operation."
        )

    # Physical file read only if Cedar permitted
    full_path = os.path.join(DUMMY_DATA_DIR, clean_path)
    if os.path.exists(full_path):
        with open(full_path, "r", encoding="utf-8") as f:
            return f.read()
    else:
        return f"File '{file_path}' not found on disk."

@tool(name="search_knowledge_base", description="Performs semantic search across internal corporate knowledge documents")
def secure_search_docs(query: str) -> str:
    """
    Protected RAG tool: Intercepts document chunks retrieved from OpenSearch
    and applies Cedar Document-Level Security (DLS) to filter out unauthorized chunks.
    """
    candidates = opensearch.search(query, top_k=5)
    if not candidates:
        return f"No documents found matching query: '{query}'"

    permitted_docs = []
    blocked_docs = []

    for doc in candidates:
        allowed, tel = interceptor.evaluate(
            principal_id="AutonomousDeveloperAgent",
            action_id="SearchDocs",
            resource_id=doc["path"],
            resource_attrs={
                "tag": doc["tag"],
                "classification": doc["classification"],
                "path": doc["path"]
            }
        )

        if allowed:
            permitted_docs.append(f"📄 [{doc['classification']}] {doc['title']}:\n{doc['snippet']}")
        else:
            blocked_docs.append(f"🔒 [BLOCKED] {doc['title']} ({doc['classification']}) - Denied by Cedar")

    response_parts = []
    if permitted_docs:
        response_parts.append("### Authorized Knowledge Chunks (Cedar Permitted):\n" + "\n\n".join(permitted_docs))
    if blocked_docs:
        response_parts.append("\n### Redacted Results (Cedar Denied Document-Level Security):\n" + "\n".join(blocked_docs))

    return "\n".join(response_parts)

@tool(name="invoke_enterprise_api", description="Invokes an internal enterprise microservice REST endpoint")
def secure_invoke_api(endpoint: str, method: str = "GET", payload: str = "{}", admin_override: bool = False) -> str:
    """
    Protected API tool: Intercepts microservice invocations and enforces Cedar rules
    for state-mutating actions.
    """
    is_mutating = method.upper() in ["POST", "PUT", "DELETE", "PATCH"]

    allowed, telemetry = interceptor.evaluate(
        principal_id="AutonomousDeveloperAgent",
        action_id="InvokeAPI",
        resource_id=endpoint,
        resource_attrs={
            "service": "InternalEnterpriseGateway",
            "mutating": is_mutating
        },
        context={
            "admin_override": admin_override
        }
    )

    if not allowed:
        return (
            f"[SOVEREIGN_GUARD SECURITY BARRIER]\n"
            f"Verdict: 🔴 CEDAR POLICY DENIED (evaluated in {telemetry['latency_ms']}ms)\n"
            f"Explanation: {telemetry['explanation']}\n"
            f"Physical block: Network HTTP request was aborted before socket transmission."
        )

    return f"HTTP 200 OK: Successfully invoked {method.upper()} {endpoint}. Action permitted under enterprise policy."
