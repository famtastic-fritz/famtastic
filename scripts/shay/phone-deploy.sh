#!/usr/bin/env bash
# phone-deploy.sh — pull the latest Shay Phone PWA, restart its server, and
# (optionally) expose it over Tailscale HTTPS so the PWA is installable + push works.
#
# RUN THIS ON THE MAC (not in a cloud session — a cloud box can't reach your laptop):
#   bash ~/famtastic/scripts/shay/phone-deploy.sh
#   bash ~/famtastic/scripts/shay/phone-deploy.sh --https   # also turn on tailscale serve
#
# Safe to run repeatedly (idempotent). It aligns the CURRENT branch to origin —
# it does NOT switch branches. If your Mac is on `main`, the phone changes must be
# on `main` first (merge the feature branch) for the pull to bring them in.
set -euo pipefail

REPO="${FAMTASTIC_HOME:-$HOME/famtastic}"
PORT="${SHAY_PHONE_PORT:-8787}"
SERVER="$REPO/shay-phone/server.py"

cd "$REPO"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "→ Repo: $REPO   Branch: $BRANCH"

# 1. Pull latest for the current branch (fast-forward only; never rewrites local work).
echo "→ Fetching + fast-forwarding origin/$BRANCH …"
git fetch origin "$BRANCH"
git merge --ff-only "origin/$BRANCH" || {
  echo "✗ Could not fast-forward (local commits diverge). Resolve by hand, then re-run." >&2
  exit 1
}

# 2. Restart the phone server: kill whatever holds :PORT, relaunch detached.
if command -v lsof >/dev/null 2>&1; then
  PIDS="$(lsof -ti "tcp:$PORT" 2>/dev/null || true)"
  if [ -n "$PIDS" ]; then
    echo "→ Stopping current server on :$PORT (pids: $PIDS)…"
    # shellcheck disable=SC2086
    kill $PIDS 2>/dev/null || true
    sleep 1
  fi
fi
echo "→ Starting phone server (:$PORT)…"
nohup python3 "$SERVER" >/tmp/shay-phone.log 2>&1 &
disown 2>/dev/null || true

# Wait for it to come up.
for _ in $(seq 1 15); do
  if curl -sf "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then break; fi
  sleep 1
done
if curl -sf "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then
  echo "✓ Phone server is up on http://127.0.0.1:$PORT/  (log: /tmp/shay-phone.log)"
else
  echo "✗ Server did not respond — check /tmp/shay-phone.log" >&2
fi

# 3. Optional: Tailscale HTTPS in front of :PORT (installable PWA + Web Push need a
#    secure origin — plain http blocks the service worker on non-localhost).
if [ "${1:-}" = "--https" ]; then
  if command -v tailscale >/dev/null 2>&1; then
    echo "→ Enabling Tailscale HTTPS → http://127.0.0.1:$PORT …"
    if tailscale serve --bg --https=443 "http://127.0.0.1:$PORT" 2>/tmp/ts-serve.err; then
      HOST="$(tailscale status --json 2>/dev/null | sed -n 's/.*"DNSName": *"\([^"]*\)".*/\1/p' | head -1 | sed 's/\.$//')"
      echo "✓ HTTPS on. Open on your phone:  https://${HOST:-<your-tailnet-host>}/"
    else
      echo "✗ tailscale serve failed (see /tmp/ts-serve.err). You may need to enable HTTPS" >&2
      echo "  certs in the Tailscale admin console (Settings → Feature previews → HTTPS)." >&2
    fi
  else
    echo "✗ tailscale CLI not found — install Tailscale or skip --https." >&2
  fi
fi

echo
echo "Done. On the phone, reopen the PWA (the service worker self-updates to v2)."
echo "Plain LAN/tailnet URL:  http://<tailnet-host>:$PORT/?k=<token-from-shay-phone/.token>"
