import os
import json
import time
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.interceptor import SovereignInterceptor
from backend.agent_runner import AgentRunner
from backend.tools import interceptor
from backend.opensearch_service import OpenSearchService

app = FastAPI(
    title="SovereignGuard: Zero-Trust Agentic Proxy",
    description="Mathematical deterministic authorization gateway for autonomous AI agents using AWS Cedar",
    version="1.0.0"
)

# CORS configuration for local React Vite dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

runner = AgentRunner()
opensearch = OpenSearchService()

class PolicyUpdateRequest(BaseModel):
    policy_content: str

class PromptRequest(BaseModel):
    prompt: str
    preset_id: Optional[str] = None

@app.get("/api/health")
async def health_check():
    return {
        "status": "ARMED",
        "service": "SovereignGuard Gateway",
        "cedar_engine": "Active (Rust Native)" if getattr(interceptor, "engine", "rust") == "rust" else "Active (Python Semantic Mirror)",
        "cedar_engine_kind": getattr(interceptor, "engine", "rust"),
        "opensearch_connected": opensearch.is_connected,
        "deployment": "vercel" if os.environ.get("VERCEL") else "local",
        "timestamp": time.time()
    }

@app.get("/api/policies")
async def get_policies():
    """Returns current active Cedar policies."""
    return {
        "policies": interceptor.policy_content,
        "policy_path": interceptor.policy_path
    }

@app.post("/api/policies/reload")
async def reload_policies(payload: PolicyUpdateRequest):
    """
    Live hot-reloads Cedar policies in memory without restarting the backend.
    Enables instant policy testing directly from the in-browser Monaco Editor.
    """
    try:
        interceptor.load_policies(custom_content=payload.policy_content)
        # Verify compilation by testing a dummy dry-run evaluation
        allowed, diag = interceptor.evaluate(
            principal_id="SyntaxValidator",
            action_id="ReadFile",
            resource_id="test.txt",
            resource_attrs={"tag": "test", "classification": "PublicInternal", "path": "test.txt"}
        )
        engine = getattr(interceptor, "engine", "rust")
        message = (
            "Cedar policies successfully hot-reloaded and verified by Rust core."
            if engine == "rust"
            else (
                "Cedar policy source accepted. Note: the serverless Python engine "
                "uses a semantic mirror of the shipped policy file; custom "
                "edits are stored but evaluation follows the canonical ruleset."
            )
        )
        return {
            "success": True,
            "message": message,
            "dry_run_verdict": diag["verdict"],
            "latency_ms": diag["latency_ms"],
            "engine": engine,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cedar policy compilation error: {str(e)}")

@app.get("/api/audit-log")
async def get_audit_log():
    """Retrieves all past Cedar evaluation decisions and latencies."""
    return {
        "total_evaluations": len(interceptor.audit_trail),
        "audit_trail": interceptor.get_audit_trail()
    }

@app.post("/api/agent/run")
async def run_agent_rest(payload: PromptRequest):
    """REST endpoint for single-turn prompt execution."""
    events = []
    async for event in runner.run_prompt_stream(payload.prompt, payload.preset_id):
        events.append(event)
    return {"events": events}

@app.websocket("/ws/agent")
async def agent_websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint streaming live agent thought tokens, tool planning,
    and sub-millisecond Cedar policy intercept decisions directly to the UI.
    """
    await websocket.accept()
    try:
        while True:
            raw_data = await websocket.receive_text()
            data = json.loads(raw_data)
            prompt = data.get("prompt", "")
            preset_id = data.get("preset_id")

            # Stream thought and intercept frames in real-time
            async for frame in runner.run_prompt_stream(prompt, preset_id):
                await websocket.send_json(frame)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
