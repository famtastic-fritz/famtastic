#!/usr/bin/env bash
# Sandbox setup. Stdlib-only → installs nothing. Creates a .venv for parity,
# seeds the queue, and can detach this folder into its own git repo.
set -euo pipefail
cd "$(dirname "$0")"

cmd="${1:-bootstrap}"

case "$cmd" in
  bootstrap)
    echo "▶ agent-factory setup (stdlib-only, fully offline)"
    if [ ! -d .venv ]; then
      python3 -m venv .venv && echo "  created .venv (no packages required)"
    fi
    if [ ! -f .env ]; then
      cp .env.example .env && echo "  created .env from template (all keys optional)"
    fi
    python3 seed.py
    echo "✔ ready. Run: ./run.sh"
    ;;

  init-repo)
    # Detach into a standalone git repo (per SANDBOX.md).
    if [ -d .git ]; then echo "already a git repo"; exit 0; fi
    git init -q
    git add -A
    git -c user.name='agent-factory' -c user.email='factory@local' \
        commit -q -m "agent-factory: standalone sandbox snapshot"
    echo "✔ initialized standalone git repo in $(pwd)"
    ;;

  *)
    echo "usage: ./setup.sh [bootstrap|init-repo]"; exit 1;;
esac
