import os
import json
from typing import List, Dict, Any, Optional

try:
    from opensearchpy import OpenSearch
    OPENSEARCH_AVAILABLE = True
except ImportError:
    OPENSEARCH_AVAILABLE = False

class OpenSearchService:
    """
    OpenSearch Service with Document-Level Security (DLS) attributes.
    Supports either local Docker OpenSearch (port 9200) or high-fidelity in-memory fallback.
    """
    def __init__(self, host: str = "localhost", port: int = 9200):
        self.host = host
        self.port = port
        self.client = None
        self.is_connected = False
        self.in_memory_docs: List[Dict[str, Any]] = []

        self._init_connection()
        self._seed_knowledge_base()

    def _init_connection(self):
        if OPENSEARCH_AVAILABLE:
            try:
                self.client = OpenSearch(
                    hosts=[{'host': self.host, 'port': self.port}],
                    http_compress=True,
                    use_ssl=False,
                    verify_certs=False,
                    timeout=1
                )
                if self.client.ping():
                    self.is_connected = True
            except Exception:
                self.is_connected = False
                self.client = None

    def _seed_knowledge_base(self):
        """Seeds internal enterprise documents with classification attributes."""
        raw_docs = [
            {
                "id": "doc-001",
                "title": "ECS & CloudFront Deployment Guide",
                "path": "docs/deploy_guide.md",
                "classification": "PublicInternal",
                "tag": "engineering",
                "content": "Internal deployment pipeline for engineering teams. Container images must be multi-arch. Private ALBs with AWS WAF enabled. Blue/green deployment via CodeDeploy."
            },
            {
                "id": "doc-002",
                "title": "Enterprise API Gateway Reference",
                "path": "docs/api_reference.md",
                "classification": "EngineeringDocs",
                "tag": "architecture",
                "content": "Core microservices gateway endpoints. GET /api/v1/health is read-only. POST /api/v1/cloud/provision is a mutating endpoint requiring elevated admin context."
            },
            {
                "id": "doc-003",
                "title": "Executive Compensation & Equity Ledger 2026",
                "path": "payroll_2026.json",
                "classification": "Restricted",
                "tag": "payroll",
                "content": "Confidential compensation details: CTO Arjun Sharma 8.5M INR, Head of AI Priya Venkatesh 6.2M INR. PII and restricted records."
            }
        ]
        self.in_memory_docs = raw_docs

    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Executes semantic & keyword retrieval over indexed documents.
        Each document includes classification attributes for Cedar policy evaluation.
        """
        q_lower = query.lower()
        results = []

        for doc in self.in_memory_docs:
            score = 0
            title_matches = sum(1 for word in q_lower.split() if word in doc["title"].lower())
            content_matches = sum(1 for word in q_lower.split() if word in doc["content"].lower())
            score += title_matches * 3 + content_matches

            if score > 0 or any(kw in q_lower for kw in ["deploy", "api", "doc", "payroll", "guide", "guide"]):
                results.append({
                    "id": doc["id"],
                    "title": doc["title"],
                    "path": doc["path"],
                    "classification": doc["classification"],
                    "tag": doc["tag"],
                    "snippet": doc["content"][:200] + "...",
                    "score": max(score, 1)
                })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]
