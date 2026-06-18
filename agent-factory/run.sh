#!/usr/bin/env bash
# Convenience entrypoints for the Agent Factory. All paths stay inside this dir.
set -euo pipefail
cd "$(dirname "$0")"

PY="./.venv/bin/python"
[ -x "$PY" ] || PY="python3"   # fall back to system python if venv missing

case "${1:-help}" in
  init)    "$PY" -m src.queue_db ;;
  seed)    "$PY" -m src.seed --fresh ;;
  run)     "$PY" -m src.orchestrator --drain ;;        # process queue then exit
  daemon)  "$PY" -m src.orchestrator --daemon ;;        # long-running supervisor
  status)  "$PY" -m src.dashboard --html ;;
  test)    "$PY" -m tests.smoke ;;
  demo)    # full proof run: fresh seed -> drain -> dashboard
           "$PY" -m src.seed --fresh
           "$PY" -m src.orchestrator --drain
           "$PY" -m src.dashboard --html ;;
  *) echo "usage: ./run.sh {init|seed|run|daemon|status|test|demo}" ;;
esac
