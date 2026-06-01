#!/usr/bin/env bash
# Boot Shay Web — upstream hermes-webui v0.51 configured to talk to the Shay brain.
#
# Usage: ./run-shay-web.sh
# Stop:  kill the process / pkill -f 'hermes-webui-v0.51/server.py'
#
# The upstream webui is run directly out of _refs/hermes-webui-v0.51/ (read-only).
# All configuration lives in .env in this directory — no upstream code is modified.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
WEBUI_DIR="/Users/famtasticfritz/famtastic/_refs/hermes-webui-v0.51"

cd "$HERE"

# Load env vars (POSIX-compatible export-all)
if [ -f ./.env ]; then
  set -a
  . ./.env
  set +a
fi

# Run upstream server.py with our venv's python, from the webui repo dir
# (server.py uses relative imports from api/ and reads its CWD for templates).
cd "$WEBUI_DIR"
exec "$HERE/.venv/bin/python" server.py
