#!/usr/bin/env bash
# shay-launch.sh — bring up Shay's services + surfaces in the right order,
# starting anything that's down (idempotent). Safe to run repeatedly.
#
# Order matters: the two Electron .apps (Shay Desktop, Shay Workspace) and the
# web UI all talk to the SAME two backend services, so those must be up first:
#   1. shay gateway   — OpenAI-compat API server on 127.0.0.1:8642 (the "brain")
#   2. shay dashboard — sessions/skills/config API on 127.0.0.1:9119 (token-gated)
#
# The .apps do NOT start these themselves — run this first (or at login), then
# double-click the .apps on the Desktop.
#
# Usage:
#   ./shay-launch.sh            # start services (gateway + dashboard)
#   ./shay-launch.sh --web      # also start Shay Web   (127.0.0.1:8787)
#   ./shay-launch.sh --workspace# also start Workspace dev surface (127.0.0.1:3002)
#   ./shay-launch.sh --status   # just report status, start nothing
set -uo pipefail

SHAY_BIN="$HOME/.local/bin/shay"
SHAY_REPO="$HOME/famtastic/shay-shay"
DASH_TOKEN="shay-workspace-local-dev-token"   # must match HERMES_DASHBOARD_TOKEN in shay-workspace/.env
HERE="$(cd "$(dirname "$0")" && pwd)"

listening() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
status_line() { listening "$1" && echo "  ✓ $2 — 127.0.0.1:$1 LISTENING" || echo "  ✗ $2 — 127.0.0.1:$1 down"; }

report() {
  echo "Shay surface status:"
  status_line 8642 "gateway  (brain / OpenAI-compat API)"
  status_line 9119 "dashboard (sessions/skills/config)"
  status_line 8787 "web      (Shay Web PWA)"
  status_line 3002 "workspace (dev overlay surface)"
}

[ "${1:-}" = "--status" ] && { report; exit 0; }

# 1. Gateway (launchd-managed). API server on :8642 requires API_SERVER_ENABLED=true
#    in ~/.shay/.env (the gateway loads that file). Ensure it, then (re)start.
if ! grep -q '^API_SERVER_ENABLED=true' "$HOME/.shay/.env" 2>/dev/null; then
  echo "API_SERVER_ENABLED=true" >> "$HOME/.shay/.env"
  echo "→ enabled API server in ~/.shay/.env"
fi
if ! listening 8642; then
  echo "→ starting gateway (:8642)…"
  "$SHAY_BIN" gateway restart >/dev/null 2>&1
  for _ in $(seq 1 15); do listening 8642 && break; sleep 1; done
fi

# 2. Dashboard (:9119) with the matched bearer token. Build the web UI once if absent.
if ! listening 9119; then
  if [ ! -f "$SHAY_REPO/shay_cli/web_dist/index.html" ]; then
    echo "→ building dashboard web UI (one-time)…"
    ( cd "$SHAY_REPO/web" && npm run build >/dev/null 2>&1 )
  fi
  echo "→ starting dashboard (:9119)…"
  SHAY_DASHBOARD_TOKEN="$DASH_TOKEN" nohup "$SHAY_BIN" dashboard --no-open --skip-build \
    >/tmp/shay-dashboard.log 2>&1 &
  disown || true
  for _ in $(seq 1 20); do listening 9119 && break; sleep 1; done
fi

# 3. (optional) Shay Web
if [ "${1:-}" = "--web" ] || [ "${2:-}" = "--web" ]; then
  if ! listening 8787; then
    echo "→ starting Shay Web (:8787)…"
    nohup "$HERE/shay-web/run-shay-web.sh" >/tmp/shay-web.log 2>&1 &
    disown || true
    for _ in $(seq 1 15); do listening 8787 && break; sleep 1; done
  fi
fi

# 4. (optional) Workspace dev surface
if [ "${1:-}" = "--workspace" ] || [ "${2:-}" = "--workspace" ]; then
  if ! listening 3002; then
    echo "→ starting Workspace dev surface (:3002)…"
    nohup "$HERE/shay-workspace/run-shay-workspace.sh" >/tmp/shay-workspace.log 2>&1 &
    disown || true
    for _ in $(seq 1 20); do listening 3002 && break; sleep 1; done
  fi
fi

echo
report
echo
echo "Brain check (gateway):  curl -s http://127.0.0.1:8642/health"
echo "Dashboard check:        curl -s -H 'Authorization: Bearer $DASH_TOKEN' http://127.0.0.1:9119/api/sessions"
echo "Desktop apps: double-click 'Shay Desktop.app' / 'Shay Workspace.app' on the Desktop."
