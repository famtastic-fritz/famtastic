#!/usr/bin/env bash
#
# install-odysseus.sh — Install Odysseus (self-hosted AI workspace) on Fritz's Mac.
#
# Odysseus is a local-first, privacy-first self-hosted alternative to the
# ChatGPT/Claude web UI: chat, autonomous agent (built on opencode), deep
# research, model cookbook, document editor, persistent memory/skills, email
# triage, notes/tasks, and a CalDAV calendar. Repo:
#   https://github.com/pewdiepie-archdaemon/odysseus
#
# This script is SAFE to re-run. It clones (or updates) the repo, seeds a
# sensible .env, and prints the exact commands to start it. It does NOT touch
# launchd and does NOT expose any port beyond loopback unless you ask it to.
#
# Usage:
#   bash scripts/odysseus/install-odysseus.sh            # clone/update + setup, prints start cmd
#   bash scripts/odysseus/install-odysseus.sh --start    # also start it (Apple Silicon native)
#   ODYSSEUS_DIR=~/tools/odysseus bash scripts/odysseus/install-odysseus.sh
#
# Env overrides:
#   ODYSSEUS_DIR   install location          (default: ~/odysseus)
#   ODYSSEUS_PORT  web UI port               (default: 7860 native / 7000 docker)
#   ODYSSEUS_LAN   "1" to bind 0.0.0.0       (default: loopback only — keep it private)
#
set -euo pipefail

REPO="https://github.com/pewdiepie-archdaemon/odysseus.git"
ODYSSEUS_DIR="${ODYSSEUS_DIR:-$HOME/odysseus}"
ODYSSEUS_PORT="${ODYSSEUS_PORT:-7860}"
ODYSSEUS_LAN="${ODYSSEUS_LAN:-0}"
START=0
[[ "${1:-}" == "--start" ]] && START=1

say()  { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ── 1. Prereqs ───────────────────────────────────────────────────────────────
say "Checking prerequisites"
command -v git >/dev/null    || die "git not found. Install Xcode CLT: xcode-select --install"
command -v python3 >/dev/null|| die "python3 not found. Install Python 3.11+ (brew install python@3.11)"
PYV=$(python3 -c 'import sys;print("%d.%d"%sys.version_info[:2])')
case "$PYV" in
  3.11|3.12|3.13) : ;;
  *) warn "Python $PYV detected — Odysseus wants 3.11+. Cookbook/serving may misbehave on older." ;;
esac
command -v tmux >/dev/null || warn "tmux not found — only needed for Cookbook background model serves (brew install tmux)"

# ── 2. Clone or update ───────────────────────────────────────────────────────
if [[ -d "$ODYSSEUS_DIR/.git" ]]; then
  say "Updating existing checkout at $ODYSSEUS_DIR"
  git -C "$ODYSSEUS_DIR" pull --ff-only || warn "Could not fast-forward; resolve manually in $ODYSSEUS_DIR"
else
  say "Cloning Odysseus into $ODYSSEUS_DIR"
  git clone --depth 1 "$REPO" "$ODYSSEUS_DIR"
fi
cd "$ODYSSEUS_DIR"

# ── 3. Seed .env (only if missing — never clobber an edited one) ──────────────
if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    say "Seeded .env from .env.example"
  else
    : > .env
    say "Created empty .env"
  fi
  {
    echo "APP_PORT=${ODYSSEUS_PORT}"
    echo "AUTH_ENABLED=true"
    if [[ "$ODYSSEUS_LAN" == "1" ]]; then
      echo "APP_BIND=0.0.0.0"
    else
      echo "APP_BIND=127.0.0.1"
    fi
  } >> .env
else
  warn ".env already exists — leaving it untouched"
fi

if [[ "$ODYSSEUS_LAN" == "1" ]]; then
  warn "LAN mode requested. Only reach it over a trusted VPN/LAN (Tailscale). Keep AUTH_ENABLED=true. Never expose to the public internet."
fi

# ── 4. Start (Apple Silicon native path) or print next steps ─────────────────
START_CMD="./start-macos.sh"
[[ "$ODYSSEUS_LAN" == "1" ]] && START_CMD="ODYSSEUS_HOST=0.0.0.0 ./start-macos.sh"

if [[ "$START" == "1" ]]; then
  [[ -x ./start-macos.sh ]] || die "start-macos.sh missing/not executable in $ODYSSEUS_DIR"
  say "Starting Odysseus (first run creates an admin user + prints a temp password)"
  warn "Watch the terminal for the temporary admin password, then change it in Settings."
  exec bash -c "$START_CMD"
fi

cat <<EOF

$(say "Odysseus is installed at: $ODYSSEUS_DIR")

Next steps (Apple Silicon — native, GPU-capable Cookbook):
  cd "$ODYSSEUS_DIR"
  $START_CMD
  # → opens http://127.0.0.1:7860  (watch terminal for the temp admin password)

Prefer Docker instead (no Metal GPU for Cookbook)?
  cd "$ODYSSEUS_DIR" && docker compose up -d --build
  # → http://localhost:${ODYSSEUS_PORT}   (password: docker compose logs odysseus)

To wrap it as a clickable Mac app:
  cd "$ODYSSEUS_DIR" && ./build-macos-app.sh

After first login: open Settings → add a model (Ollama / OpenRouter / OpenAI /
vLLM / llama.cpp), configure search + email, and change the admin password.

NOTE: This box is managed by launchd for FAMtastic Studio only. Odysseus runs
independently — do NOT register it under com.famtastic.studio. If you want it to
survive reboots, create a separate launchd plist (com.fritz.odysseus).
EOF
