#!/usr/bin/env bash
# command-center-up.sh — bring the WHOLE Shay command center up with one command.
#
# Starts (idempotently — safe to re-run; skips anything already listening):
#   1. Dashboard API      :8643   (shay-agent-os/api/server.py — agents, jobs, /api/events, WS)
#   2. Dashboard UI        :5174   (the built React console — the LAPTOP surface)
#   3. Phone server        :8787   (shay-phone PWA — the PHONE surface)
#   4. Job runner          (—)     (runs queued jobs through Shay → status/result back)
#   5. (optional) Tailscale HTTPS in front of the phone, with --https
#
# RUN ON THE MAC:
#   bash ~/famtastic/scripts/shay/command-center-up.sh
#   bash ~/famtastic/scripts/shay/command-center-up.sh --https
#
# Logs: /tmp/shay-*.log . Stop everything: scripts/shay/command-center-down.sh
set -uo pipefail

REPO="${FAMTASTIC_HOME:-$HOME/famtastic}"
DIST="$REPO/shay-agent-os/components/dashboard/dist"
cd "$REPO"

listening() { lsof -ti "tcp:$1" >/dev/null 2>&1; }
running()   { pgrep -f "$1" >/dev/null 2>&1; }
ok()  { printf '  \033[32m✓\033[0m %s\n' "$1"; }
no()  { printf '  \033[31m✗\033[0m %s\n' "$1"; }
wait_port() { for _ in $(seq 1 "${2:-15}"); do listening "$1" && return 0; sleep 1; done; return 1; }

echo "→ Command center: pulling latest…"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git fetch origin "$BRANCH" >/dev/null 2>&1 && git merge --ff-only "origin/$BRANCH" >/dev/null 2>&1 \
  && ok "pulled origin/$BRANCH" || no "pull skipped (diverged or offline) — using local"

# 1. Dashboard API :8643
if listening 8643; then ok "Dashboard API already up (:8643)"; else
  echo "→ starting Dashboard API (:8643)…"
  ( cd "$REPO/shay-agent-os" && nohup python3 -m api.server >/tmp/shay-dash-api.log 2>&1 & )
  if wait_port 8643; then ok "Dashboard API (:8643)"; else no "Dashboard API failed — see /tmp/shay-dash-api.log"; fi
fi

# 2. Dashboard UI :5174  (serve the built console)
if listening 5174; then ok "Dashboard UI already up (:5174)"; else
  if [ -d "$DIST" ]; then
    echo "→ serving Dashboard UI (:5174)…"
    nohup python3 -m http.server 5174 --bind 0.0.0.0 --directory "$DIST" >/tmp/shay-dash-ui.log 2>&1 &
    if wait_port 5174; then ok "Dashboard UI (:5174)"; else no "Dashboard UI failed — see /tmp/shay-dash-ui.log"; fi
  else
    no "Dashboard not built ($DIST missing) — run: cd $REPO/shay-agent-os/components/dashboard && npm install && npm run build"
  fi
fi

# 3. Phone server :8787
if listening 8787; then ok "Phone server already up (:8787)"; else
  echo "→ starting Phone server (:8787)…"
  nohup python3 "$REPO/shay-phone/server.py" >/tmp/shay-phone.log 2>&1 &
  if wait_port 8787; then ok "Phone server (:8787)"; else no "Phone server failed — see /tmp/shay-phone.log"; fi
fi

# 4. Job runner (the executor — makes dispatched jobs actually run)
if running "scripts/shay/job-runner.py"; then ok "Job runner already running"; else
  echo "→ starting Job runner…"
  nohup python3 "$REPO/scripts/shay/job-runner.py" >/tmp/shay-job-runner.log 2>&1 &
  sleep 1
  if running "scripts/shay/job-runner.py"; then ok "Job runner (gateway :8642)"; else no "Job runner failed — see /tmp/shay-job-runner.log"; fi
fi

# 5. Optional Tailscale HTTPS for the phone
if [ "${1:-}" = "--https" ]; then
  if command -v tailscale >/dev/null 2>&1; then
    if tailscale serve --bg --https=443 http://127.0.0.1:8787 2>/tmp/ts-serve.err; then
      HOST="$(tailscale status --json 2>/dev/null | sed -n 's/.*"DNSName": *"\([^"]*\)".*/\1/p' | head -1 | sed 's/\.$//')"
      ok "Phone over HTTPS: https://${HOST:-<tailnet-host>}/"
    else no "tailscale serve failed — see /tmp/ts-serve.err"; fi
  else no "tailscale CLI not found"; fi
fi

echo
echo "Command center up. Open:"
echo "  Laptop dashboard →  http://localhost:5174/"
echo "  Phone app        →  http://<tailnet-host>:8787/?k=<token-in-shay-phone/.token>"
echo "  (HTTPS phone     →  https://<tailnet-host>/   if you ran --https)"
echo "Logs: /tmp/shay-dash-api.log  /tmp/shay-dash-ui.log  /tmp/shay-phone.log  /tmp/shay-job-runner.log"
