"""
Vercel serverless entrypoint for the SovereignGuard FastAPI backend.

Vercel's Python runtime can serve an ASGI app via Mangum. Cedar's native
Rust binding (`cedarpy`) is unavailable in the serverless runtime, so the
`SovereignInterceptor` automatically falls back to its pure-Python semantic
implementation. The FastAPI app, route surface, and agent behavior are
identical to the local deployment — only the transport (HTTP/WebSocket)
differs and is reflected in the vercel.json route map.
"""
from mangum import Mangum
from backend.main import app  # noqa: F401  (re-uses local FastAPI app)

handler = Mangum(app, lifespan="off")