#!/usr/bin/env bash
# command-center-down.sh — stop everything command-center-up.sh started.
# Leaves Shay's gateway (:8642) and other launchd-managed services alone.
set -uo pipefail

stop_port() { local p="$1" n="$2"; local pids; pids="$(lsof -ti "tcp:$p" 2>/dev/null || true)"
  if [ -n "$pids" ]; then kill $pids 2>/dev/null && echo "  ✓ stopped $n (:$p)"; else echo "  · $n not running (:$p)"; fi; }

echo "→ Stopping command center…"
stop_port 5174 "Dashboard UI"
stop_port 8643 "Dashboard API"
stop_port 8787 "Phone server"
if pgrep -f "scripts/shay/job-runner.py" >/dev/null 2>&1; then
  pkill -f "scripts/shay/job-runner.py" && echo "  ✓ stopped Job runner"
else echo "  · Job runner not running"; fi
echo "Done. (Gateway :8642 and launchd services left untouched.)"
