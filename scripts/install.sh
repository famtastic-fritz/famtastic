#!/usr/bin/env bash
# FAMtastic Agent-Hub — zero-touch installer
# Usage:
#   ./scripts/install.sh [--platform PATH_TO_PLATFORM_REPO]
# Notes:
#   - Idempotent; safe to re-run.
#   - macOS/Linux. Requires git + Python3 available.

set -euo pipefail

# ---------- tiny ux helpers ----------
has(){ command -v "$1" >/dev/null 2>&1; }
say(){ printf "\033[36m%s\033[0m\n" "$*"; }
ok(){  printf "\033[32m✔ %s\033[0m\n" "$*"; }
warn(){ printf "\033[33m! %s\033[0m\n" "$*" >&2; }
die(){ printf "\033[31m✖ %s\033[0m\n" "$*" >&2; exit 1; }

HUB="${HUB:-$HOME/famtastic-agent-hub}"
PLATFORM_PATH=""
while [ $# -gt 0 ]; do
  case "$1" in
    --platform) PLATFORM_PATH="${2:-}"; shift 2 ;;
    *) die "Unknown flag: $1" ;;
  esac
done

[ -d "$HUB" ] || die "Hub repo not found at $HUB"

cd "$HUB"

# ---------- 0) prerequisites ----------
say "Checking prerequisites (best effort installs where possible)…"
if has brew; then
  # Don't fail if already installed
  brew list age >/dev/null 2>&1 || brew install age
  brew list sops >/dev/null 2>&1 || brew install sops
  brew list jq >/dev/null 2>&1 || brew install jq
  brew list yq >/dev/null 2>&1 || brew install yq
fi

has age        || warn "age not on PATH (install: brew install age / apt install age)"
has sops       || warn "sops not on PATH (install: brew install sops / apt install sops)"
has curl       || die  "curl is required"
has python3    || die  "python3 is required"
has git        || die  "git is required"

say "Ensuring LiteLLM proxy + deps…"
python3 -m pip install --user "litellm[proxy]" uvicorn fastapi pydantic-settings >/dev/null 2>&1 || true

# ensure user bin paths are usable (macOS pip user bin)
case ":$PATH:" in
  *":$HOME/Library/Python/"*) : ;;
  *) grep -q "Library/Python" "$HOME/.zprofile" 2>/dev/null || \
     echo 'export PATH="$HOME/Library/Python/3.11/bin:$HOME/.local/bin:$PATH"' >> "$HOME/.zprofile" ;;
esac

# ---------- 1) ensure age private key for SOPS ----------
KEY_DIR="$HOME/.config/famtastic/agent-hub/keys"
KEY_FILE="$KEY_DIR/age.txt"
mkdir -p "$KEY_DIR"

if [ ! -s "$KEY_FILE" ]; then
  say "No age private key found at $KEY_FILE."
  if has age-keygen; then
    read -r -p "Do you want to IMPORT an existing age key? [y/N] " ans
    if [[ "${ans:-N}" =~ ^[Yy]$ ]]; then
      say "Paste your entire private key (end with Ctrl-D):"
      umask 077
      cat > "$KEY_FILE"
      ok "Imported age key → $KEY_FILE"
    else
      say "Generating a NEW age key (only do this if you don't have an existing one)…"
      umask 077
      age-keygen -o "$KEY_FILE" >/dev/null
      ok "Generated age key → $KEY_FILE"
      warn "If the repo secrets were encrypted for a different key, you must add this key to .sops.yaml and run: sops updatekeys secrets/agents.enc.yaml"
    fi
  else
    die "age-keygen not available; install 'age' and re-run."
  fi
fi

export SOPS_AGE_KEY_FILE="$KEY_FILE"
grep -q 'SOPS_AGE_KEY_FILE=' "$HOME/.zprofile" 2>/dev/null || \
  echo "export SOPS_AGE_KEY_FILE=\"$KEY_FILE\"" >> "$HOME/.zprofile"

PUB="$(grep '^# public key:' "$KEY_FILE" | sed 's/# public key: //')"
[ -n "$PUB" ] || die "age private key looks malformed at $KEY_FILE"

# Ensure .sops.yaml contains our recipient (idempotent)
if [ -f .sops.yaml ] && ! grep -q "$PUB" .sops.yaml; then
  say "Adding public key to .sops.yaml recipients…"
  awk -v key="$PUB" '
    {print}
    /age:/ && !added {print "      - " key; added=1}
  ' .sops.yaml > .sops.yaml.tmp && mv .sops.yaml.tmp .sops.yaml
  ok "Recipient added"
fi

# ---------- 2) claim/install Hub-owned configs ----------
say "Claiming/Installing configs to runtime paths…"
chmod +x scripts/config-claim 2>/dev/null || true
if [ -x scripts/config-claim ]; then
  ./scripts/config-claim litellm
else
  # minimal inline claim for LiteLLM if helper missing
  CANON="$HUB/config/litellm/cj-litellm.yaml"
  RT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/famtastic/agent-hub/litellm"
  RT="$RT_DIR/cj-litellm.yaml"
  mkdir -p "$RT_DIR"
  [ -f "$CANON" ] || die "Missing canonical LiteLLM config at $CANON"
  ln -snf "$CANON" "$RT" 2>/dev/null || cp -f "$CANON" "$RT"
  grep -q 'CJ_LITELLM_CONFIG=' "$HOME/.zprofile" 2>/dev/null || \
    printf '\nexport CJ_LITELLM_CONFIG="%s"\n' "$RT" >> "$HOME/.zprofile"
  export CJ_LITELLM_CONFIG="$RT"
  ok "LiteLLM runtime → $RT"
fi

# ---------- 3) decrypt check (repo-first secrets) ----------
say "Verifying SOPS decryption of repo secrets…"
if sops -d secrets/agents.enc.yaml >/dev/null 2>&1; then
  ok "SOPS decrypt ok"
else
  warn "SOPS decrypt failed. If this is a new key, run: sops updatekeys secrets/agents.enc.yaml"
  exit 1
fi

# ---------- 4) LiteLLM smoke test ----------
say "Running LiteLLM smoke (repo config + repo secrets)…"
chmod +x scripts/litellm-serve scripts/litellm-smoke 2>/dev/null || true
if [ -x scripts/litellm-smoke ]; then
  ./scripts/litellm-smoke
else
  # inline quick smoke
  scripts/litellm-serve >/tmp/litellm.out 2>&1 & PID=$! || true
  sleep 4
  curl -fsS http://127.0.0.1:8089/ >/dev/null && ok "REST /" || { warn "REST / failed"; sed -n '1,120p' /tmp/litellm.out || true; kill $PID 2>/dev/null || true; exit 1; }
  curl -fsS -H "Content-Type: application/json" -X POST http://127.0.0.1:8089/v1/chat/completions \
    -d '{"model":"code-free","messages":[{"role":"user","content":"reply with: ok"}]}' >/dev/null && ok "CHAT" || { warn "CHAT failed"; sed -n '1,120p' /tmp/litellm.out || true; kill $PID 2>/dev/null || true; exit 1; }
  kill $PID 2>/dev/null || true
fi

# ---------- 5) optional: Platform compose ----------
if [ -n "$PLATFORM_PATH" ]; then
  say "Triggering Platform compose…"
  [ -d "$PLATFORM_PATH" ] || die "Platform path not found: $PLATFORM_PATH"
  ( cd "$PLATFORM_PATH" && "$HUB/scripts/cj-reconcile-convo" latest-convo && ok "Platform composed" ) || warn "Platform compose had warnings"
fi

ok "Install complete."
say "Next: start router with: $HUB/scripts/litellm-serve"