#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bun run server/index.ts &
API_PID=$!
cleanup() { kill "$API_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
cd web
bun run dev -- --host 127.0.0.1 --port 5173
