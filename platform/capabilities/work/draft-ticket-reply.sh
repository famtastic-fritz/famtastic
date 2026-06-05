#!/usr/bin/env bash
# work/draft-ticket-reply.sh — draft a Jira ticket reply + suggested status
# transition from a ticket-context JSON, write it to the work outbox for human
# approval, and append an audit line.
#
# SAFETY GATE (NON-NEGOTIABLE): this is OUTBOUND communication on Fritz's behalf.
# This script NEVER sends anything to Jira. It only produces a local draft in the
# outbox with state "draft". Sending requires explicit human approval AND Jira
# credentials that do not exist in this environment yet (vault-key-pending).
# There are NO external API calls in this file by design.
#
# Usage: platform work draft-ticket-reply <ctx.json> [--check]

set -euo pipefail

PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HUB_ROOT="$(cd "$PLATFORM_ROOT/.." && pwd)"
VAULT="$PLATFORM_ROOT/vault/vault.sh"
INVOCATIONS_DIR="$PLATFORM_ROOT/invocations"
OUTBOX_DIR="$PLATFORM_ROOT/capabilities/work/outbox"
mkdir -p "$INVOCATIONS_DIR" "$OUTBOX_DIR"

CTX="${1:-}"
[[ -n "$CTX" ]] || { echo "Usage: platform work draft-ticket-reply <ctx.json> [--check]" >&2; exit 1; }
shift || true

MODE="draft"
for arg in "$@"; do
  case "$arg" in
    --check|--dry-run) MODE="check" ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

[[ -f "$CTX" ]] || { echo "draft-ticket-reply: context not found: $CTX" >&2; exit 1; }

vault_has() { "$VAULT" read "$1" >/dev/null 2>&1; }

# Jira creds are not connected here. Surface the gap honestly.
SEND_STATE="manual_required"
if vault_has "jira.api_token" && vault_has "jira.base_url" && vault_has "jira.email"; then
  SEND_STATE="creds_present_send_still_gated"  # even with creds, send requires explicit human approval
fi

if [[ "$MODE" == "check" ]]; then
  printf '\nwork draft-ticket-reply check\n'
  printf '%s\n' "=============================="
  printf '  %-28s %s\n' "context_file" "$CTX"
  printf '  %-28s %s\n' "outbox_dir" "$OUTBOX_DIR"
  printf '  %-28s %s\n' "send_capability" "$SEND_STATE"
  printf '  %-28s %s\n' "auto_send" "DISABLED (human-approval gate)"
  printf '\nMANUAL REQUIRED: Jira send is not wired. Needs vault keys '
  printf 'jira.api_token, jira.base_url, jira.email.\n'
  DAY="$(date +%Y-%m-%d)"
  printf '{"ts":"%s","capability":"work.draft-ticket-reply","args":{"ctx":"%s","mode":"check"},"result":"%s"}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$CTX" "$SEND_STATE" >> "$INVOCATIONS_DIR/$DAY.jsonl"
  exit 0
fi

# --- Drafting logic (genuinely produces a structured draft from the input) ---
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
DRAFT_ID="ticket-$(date +%Y%m%d-%H%M%S)-$$"
OUT_FILE="$OUTBOX_DIR/$DRAFT_ID.json"

python3 - "$CTX" "$OUT_FILE" "$DRAFT_ID" "$NOW" "$SEND_STATE" <<'PY'
import json, sys, re

ctx_path, out_path, draft_id, now, send_state = sys.argv[1:6]
with open(ctx_path) as f:
    ctx = json.load(f)

ticket_id = ctx.get("ticket_id", "UNKNOWN")
summary = ctx.get("summary", "")
intent = ctx.get("intent", "").strip()
tone = ctx.get("tone", "concise")
priority = ctx.get("priority", "")
reporter = ctx.get("reporter") or (ctx.get("latest_comment", {}) or {}).get("author") or "team"
last = (ctx.get("latest_comment") or {}).get("body", "").strip()

if not ticket_id or not summary or not intent:
    sys.stderr.write("draft-ticket-reply: ctx missing required ticket_id/summary/intent\n")
    sys.exit(1)

# Greeting scales with tone.
first = reporter.split(".")[0].split("@")[0].split()[0].capitalize() if reporter else "team"
openers = {
    "concise": f"Hi {first} —",
    "collaborative": f"Hey {first}, thanks for the nudge —",
    "direct": f"{first},",
    "formal": f"Hello {first},",
}
opener = openers.get(tone, openers["concise"])

# Split Fritz's intent into sentence-shaped body lines so the draft reads as prose,
# not as a copy of the steering note.
sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", intent) if s.strip()]
body_lines = []
for s in sentences:
    if not s.endswith((".", "!", "?")):
        s += "."
    body_lines.append(s)

# Decide the suggested transition: explicit field wins, else infer from intent text.
transition = ctx.get("suggested_transition", "").strip()
if not transition:
    low = intent.lower()
    if "in review" in low or "review" in low:
        transition = "In Review"
    elif "block" in low:
        transition = "Blocked"
    elif "done" in low or "close" in low or "resolve" in low or "ship" in low:
        transition = "Done"
    else:
        transition = "(no transition suggested)"

reply_text = opener + "\n\n" + " ".join(body_lines)
if last:
    reply_text += f"\n\nRe: your last note — \"{last[:140]}{'…' if len(last) > 140 else ''}\""
reply_text += "\n\n— Fritz"

draft = {
    "draft_id": draft_id,
    "kind": "ticket_reply",
    "created_at": now,
    "state": "draft",
    "channel": "jira",
    "send_capability": send_state,
    "auto_send": False,
    "approval_required": True,
    "ticket": {
        "id": ticket_id,
        "summary": summary,
        "priority": priority,
    },
    "suggested_transition": transition,
    "reply_text": reply_text,
    "source_intent": intent,
    "approved_by": None,
    "approved_at": None,
    "sent_at": None,
}

with open(out_path, "w") as f:
    json.dump(draft, f, indent=2)

print(f"draft-ticket-reply: drafted reply for {ticket_id}")
print(f"  suggested transition: {transition}")
print(f"  draft written: {out_path}")
PY

echo ""
echo "STATE: draft (awaiting Fritz's approval — NOTHING was sent)"
echo "MANUAL REQUIRED: sending to Jira is not wired. Approve via 'platform work outbox',"
echo "  then sending stays manual until vault keys jira.api_token / jira.base_url / jira.email exist."

DAY="$(date +%Y-%m-%d)"
printf '{"ts":"%s","capability":"work.draft-ticket-reply","args":{"ctx":"%s","mode":"draft","draft_id":"%s"},"result":"drafted","send_capability":"%s"}\n' \
  "$NOW" "$CTX" "$DRAFT_ID" "$SEND_STATE" >> "$INVOCATIONS_DIR/$DAY.jsonl"
