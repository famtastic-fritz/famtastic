#!/usr/bin/env bash
# Agent-centric installer: Claude (native), Gemini (native), Codex via LiteLLM code-free only
set -euo pipefail
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

say "Prereqs…"
if has brew; then
  brew list age >/dev/null 2>&1 || brew install age
  brew list sops >/dev/null 2>&1 || brew install sops
  brew list jq  >/dev/null 2>&1 || brew install jq
  brew list yq  >/dev/null 2>&1 || brew install yq
fi
has curl || die "curl required"
has python3 || die "python3 required"
has git || die "git required"

say "Install SDKs for native agents…"
python3 -m pip install --user anthropic google-generativeai "litellm[proxy]" uvicorn fastapi pydantic-settings >/dev/null 2>&1 || true
grep -q "Library/Python" "$HOME/.zprofile" 2>/dev/null || echo 'export PATH="$HOME/Library/Python/3.11/bin:$HOME/.local/bin:$PATH"' >> "$HOME/.zprofile"

# SOPS key
KEY="$HOME/.config/famtastic/agent-hub/keys/age.txt"; mkdir -p "$(dirname "$KEY")"
if [ ! -s "$KEY" ]; then
  has age-keygen || die "age not installed"
  age-keygen -o "$KEY" >/dev/null 2>&1 || die "age-keygen failed"
fi
export SOPS_AGE_KEY_FILE="$KEY"
grep -q 'SOPS_AGE_KEY_FILE=' "$HOME/.zprofile" 2>/dev/null || echo "export SOPS_AGE_KEY_FILE=\"$KEY\"" >> "$HOME/.zprofile"

# Claim/install LiteLLM config for Codex (code-free lane)
if [ -x scripts/config-claim ]; then
  ./scripts/config-claim litellm
else
  CANON="$HUB/config/litellm/cj-litellm.yaml"
  RT="${XDG_CONFIG_HOME:-$HOME/.config}/famtastic/agent-hub/litellm/cj-litellm.yaml"
  mkdir -p "$(dirname "$RT")"
  [ -f "$CANON" ] || die "Missing canonical LiteLLM config at $CANON"
  ln -snf "$CANON" "$RT" 2>/dev/null || cp -f "$CANON" "$RT"
  grep -q 'CJ_LITELLM_CONFIG=' "$HOME/.zprofile" 2>/dev/null || printf '\nexport CJ_LITELLM_CONFIG="%s"\n' "$RT" >> "$HOME/.zprofile"
  export CJ_LITELLM_CONFIG="$RT"
fi

# Decrypt check (for OPENROUTER_KEY_R1_FREE ONLY; Claude/Gemini use their own keys)
sops -d secrets/agents.enc.yaml >/dev/null 2>&1 || die "SOPS decrypt failed"

# VS Code presence
if command -v code >/dev/null 2>&1 || [ -d "/Applications/Visual Studio Code.app" ]; then
  ok "VS Code present"
else
  warn "VS Code not found; install from https://code.visualstudio.com/ and enable 'code' on PATH"
fi

# Smokes
say "Smokes…"
./scripts/litellm-smoke || warn "LiteLLM smoke had issues (code-free lane)"
./scripts/smoke-claude  || warn "Claude smoke skipped/failed (need ANTHROPIC_API_KEY)"
./scripts/smoke-gemini  || warn "Gemini smoke skipped/failed (need GEMINI_API_KEY)"
./scripts/smoke-codex   || warn "Codex smoke skipped/failed (uses code-free)"

# Optional Platform compose
if [ -n "$PLATFORM_PATH" ]; then
  ( cd "$PLATFORM_PATH" && "$HUB/scripts/cj-reconcile-convo" latest-convo && ok "Platform composed" ) || warn "Platform compose warnings"
fi

ok "Install complete. Native CLIs ready."
say "Examples:"
echo '  echo "summarize this" | scripts/claude-cli'
echo '  echo "summarize this" | scripts/gemini-cli'
echo '  echo "write a one-line python hello world" | scripts/codex-cli'