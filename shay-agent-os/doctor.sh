#!/usr/bin/env bash
#
# doctor.sh — Shay readiness check. Run on the Mac after a reinstall / backup
# restore to see exactly what she needs to be fully functional. Read-only, never
# hard-fails — it just reports ✓ / ✗ with a fix hint for each requirement.
#
#   bash ~/famtastic/shay-agent-os/doctor.sh
#
set +e
ROOT="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SHAY_HOME="${SHAY_HOME:-$HOME/.shay}"
ok(){ printf '  \033[1;32m✓\033[0m %s\n' "$1"; }
no(){ printf '  \033[1;31m✗\033[0m %-42s → %s\n' "$1" "$2"; FAILS=$((FAILS+1)); }
hdr(){ printf '\n\033[1;36m%s\033[0m\n' "$1"; }
have(){ command -v "$1" >/dev/null 2>&1; }
FAILS=0

hdr "1. Core CLIs"
have shay   && ok "shay CLI on PATH" || no "shay CLI" "reinstall/link the shay gateway binary; check ~/.shay + shell rc PATH"
have node   && ok "node $(node -v)" || no "node" "brew install node"
have npm    && ok "npm present" || no "npm" "comes with node"
have git    && ok "git present" || no "git" "xcode-select --install"

hdr "2. Services (message bus + local models)"
if have redis-cli && [ "$(redis-cli ping 2>/dev/null)" = "PONG" ]; then ok "Redis up (PONG)"; else no "Redis" "brew services start redis  (inter-agent message bus)"; fi
if have ollama && ollama list >/dev/null 2>&1; then
  ok "Ollama running"
  for m in hermes3 qwen2.5:1.5b phi4-mini; do
    ollama list 2>/dev/null | grep -q "$m" && ok "model $m present" || no "model $m" "ollama pull $m"
  done
else
  no "Ollama" "start Ollama, then: ollama pull hermes3 qwen2.5:1.5b phi4-mini"
fi

hdr "3. Runtime home (~/.shay — restored from backup)"
[ -d "$SHAY_HOME" ]            && ok "~/.shay exists" || no "~/.shay" "restore from backup — this is SOUL/gateway/kanban/cron/skills"
[ -f "$SHAY_HOME/SOUL.md" ]    && ok "SOUL.md (persona/governance)" || no "SOUL.md" "restore from backup — persona is governed by this"
[ -d "$SHAY_HOME/skills" ]     && ok "~/.shay/skills" || no "~/.shay/skills" "restore or re-sync skills"
[ -d "$SHAY_HOME/gateway" ] || [ -e "$SHAY_HOME/gateway" ] && ok "gateway present" || no "gateway" "restore/reinstall the gateway"

hdr "4. Code on main (shay-agent-os + new skills)"
branch="$(git -C "$ROOT/.." rev-parse --abbrev-ref HEAD 2>/dev/null)"
[ "$branch" = "main" ] && ok "repo on main" || no "repo branch ($branch)" "git checkout main && git pull  (Shay runs off main)"
behind="$(git -C "$ROOT/.." rev-list --count HEAD..origin/main 2>/dev/null)"
[ "${behind:-0}" = "0" ] && ok "main up to date" || no "main is $behind behind" "git pull  (you're missing merged work — caused the 'can't see it' bug)"
for s in humanize-writing ask-claude gap-analysis logo-transparent; do
  [ -d "$ROOT/skills/$s" ] && ok "skill: $s" || no "skill $s" "git pull (should be on main now)"
done

hdr "5. Brain wiring (memory + traces)"
[ -d "$ROOT/../obsidian" ]                  && ok "obsidian brain present" || no "obsidian/" "git pull"
[ -f "$ROOT/brain_checkpoint.py" ]          && ok "brain_checkpoint.py (run traces)" || no "brain_checkpoint.py" "git pull"
[ -f "$ROOT/../scripts/brain/session-checkpoint.js" ] && ok "session-checkpoint.js" || no "session-checkpoint.js" "git pull"

hdr "6. Brain model / provider"
echo "  ℹ Brain model is now Gemini Pro (was ollama hermes3). Confirm the Gemini"
echo "    provider is configured + keyed in Shay's provider settings. Local Ollama"
echo "    models above are for worker-lane tasks. ask-claude is wired for escalation."

hdr "7. Dashboard (optional UI)"
[ -d "$ROOT/components/dashboard/node_modules" ] && ok "dashboard deps installed" || no "dashboard deps" "cd components/dashboard && npm install"

printf '\n\033[1m== %s ==\033[0m\n' "$([ "$FAILS" = 0 ] && echo 'Shay is GREEN — fully functional' || echo "Shay needs attention: $FAILS item(s) ✗ above")"
[ "$FAILS" = 0 ] && echo "Smoke test: python3 launch-agent.py smoke ~/famtastic/prompts/<any>.md && watch a heartbeat appear in logs/."
exit 0
