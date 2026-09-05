#!/bin/bash
set -e

# ==============================================================================
# SovereignGuard: One-Command Local Startup Script
# Boots FastAPI Gateway (port 8000) & Vite Command Center (port 5173)
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "🛡️  Starting SovereignGuard Zero-Trust Gateway..."

# 1. Activate Python Virtual Environment
if [ -d ".venv" ]; then
    source .venv/bin/activate
else
    echo "Creating virtualenv..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
fi

# 2. Trap SIGINT and kill child background processes upon exit
cleanup() {
    echo -e "\n🛑 Shutting down SovereignGuard..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# 3. Launch FastAPI Backend
echo "⚡ Starting FastAPI Gateway on http://localhost:8000..."
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 2

# 4. Launch Vite Frontend
echo "💻 Starting React Command Center on http://localhost:5173..."
cd "$ROOT_DIR/frontend"
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!

echo ""
echo "================================================================="
echo "🛡️  SOVEREIGN GUARD IS ACTIVE & ARMED"
echo "👉 Command Center UI:  http://localhost:5173"
echo "👉 Backend Gateway:    http://localhost:8000"
echo "👉 API Documentation:  http://localhost:8000/docs"
echo "================================================================="
echo "Press Ctrl+C to terminate both servers."

wait
