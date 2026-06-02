#!/usr/bin/env bash
#
# install-odysseus-shay.sh — Shay's headless/agentic Odysseus instance.
#
# Separate from Fritz's interactive copy so the two never collide:
#   Fritz : ~/odysseus        port 7860
#   Shay  : ~/odysseus-shay   port 7870
#
# Both stay on loopback with auth on. This wraps the same upstream repo.
#
set -euo pipefail

REPO="https://github.com/pewdiepie-archdaemon/odysseus.git"
ODYSSEUS_DIR="${ODYSSEUS_DIR:-$HOME/odysseus-shay}"
ODYSSEUS_PORT="${ODYSSEUS_PORT:-7870}"
START=0
[[ "${1:-}" == "--start" ]] && START=1

say()  { printf '\033[1;35m▸ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

command -v git >/dev/null     || die "git not found"
command -v python3 >/dev/null || die "python3 not found (need 3.11+)"

if [[ -d "$ODYSSEUS_DIR/.git" ]]; then
  say "Updating Shay's Odysseus at $ODYSSEUS_DIR"
  git -C "$ODYSSEUS_DIR" pull --ff-only || warn "Resolve manually in $ODYSSEUS_DIR"
else
  say "Cloning Shay's Odysseus into $ODYSSEUS_DIR"
  git clone --depth 1 "$REPO" "$ODYSSEUS_DIR"
fi
cd "$ODYSSEUS_DIR"

if [[ ! -f .env ]]; then
  [[ -f .env.example ]] && cp .env.example .env || : > .env
  {
    echo "APP_PORT=${ODYSSEUS_PORT}"
    echo "APP_BIND=127.0.0.1"
    echo "AUTH_ENABLED=true"
    echo "ODYSSEUS_ADMIN_USER=shay"
  } >> .env
  say "Seeded Shay .env (loopback, port ${ODYSSEUS_PORT}, admin=shay)"
else
  warn ".env exists — leaving untouched"
fi

# Brain trace per the Brain Sync Contract (best-effort, never fail the install).
if command -v node >/dev/null && [[ -f "$HOME/famtastic/scripts/brain/session-checkpoint.js" ]]; then
  AI_AGENT=shay BRAIN_SESSION_ID="odysseus-install-$(date +%Y%m%d%H%M%S)" \
    node "$HOME/famtastic/scripts/brain/session-checkpoint.js" start 2>/dev/null || true
fi

if [[ "$START" == "1" ]]; then
  [[ -x ./start-macos.sh ]] || die "start-macos.sh missing in $ODYSSEUS_DIR"
  say "Starting Shay's Odysseus (watch terminal for temp admin password, then rotate)"
  exec ./start-macos.sh
fi

cat <<EOF

$(say "Shay's Odysseus installed at: $ODYSSEUS_DIR")
Start it:   cd "$ODYSSEUS_DIR" && ./start-macos.sh    # → http://127.0.0.1:${ODYSSEUS_PORT}
Then: log in with the printed temp password, rotate it, add a local model.
Next: adopt shay-agent-os/agents/odysseus.md and bridge skills/memory.
EOF
