#!/usr/bin/env bash
# work/outbox.sh — list drafted work communications awaiting Fritz's approval,
# show their state (draft / approved / sent), and let Fritz approve a draft.
#
# SAFETY GATE (NON-NEGOTIABLE): approving a draft does NOT send it. Approval only
# flips the local state to "approved" so it is queued for a future, separate,
# explicitly-invoked send step. Sending itself is manual_required until Jira /
# messaging credentials exist (vault-key-pending). This script makes NO external
# API calls and CANNOT transmit anything on Fritz's behalf.
#
# Usage:
#   platform work outbox                      list all drafts
#   platform work outbox --check              show outbox status summary
#   platform work outbox show <draft_id>      print a draft's full content
#   platform work outbox approve <draft_id>   mark a draft approved (still NOT sent)
#   platform work outbox send <draft_id>      blocked: prints manual_required, exits 0

set -euo pipefail

PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INVOCATIONS_DIR="$PLATFORM_ROOT/invocations"
OUTBOX_DIR="$PLATFORM_ROOT/capabilities/work/outbox"
mkdir -p "$INVOCATIONS_DIR" "$OUTBOX_DIR"

SUB="${1:-list}"
[[ "$SUB" == "--check" ]] && SUB="check"
ARG="${2:-}"

log() {
  local result="$1" extra="${2:-}"
  local day; day="$(date +%Y-%m-%d)"
  printf '{"ts":"%s","capability":"work.outbox","args":{"sub":"%s","draft":"%s"},"result":"%s"%s}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SUB" "$ARG" "$result" "$extra" >> "$INVOCATIONS_DIR/$day.jsonl"
}

list_drafts() {
  shopt -s nullglob
  local files=("$OUTBOX_DIR"/*.json)
  if [[ ${#files[@]} -eq 0 ]]; then
    echo "Outbox is empty. Draft something with:"
    echo "  platform work draft-ticket-reply <ctx.json>"
    echo "  platform work draft-standup [<input.json>]"
    return 0
  fi
  printf '\nWork outbox — drafts awaiting Fritz\047s approval\n'
  printf '%s\n' "================================================"
  printf '  %-34s %-14s %-10s %s\n' "DRAFT_ID" "KIND" "STATE" "SUBJECT"
  for f in "${files[@]}"; do
    python3 - "$f" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
kind = d.get("kind", "?")
state = d.get("state", "?")
if kind == "ticket_reply":
    subj = (d.get("ticket") or {}).get("id", "") + " " + (d.get("ticket") or {}).get("summary", "")
else:
    subj = (d.get("workstream") or "") + " standup " + (d.get("date") or "")
print("  %-34s %-14s %-10s %s" % (d.get("draft_id","?"), kind, state, subj.strip()[:60]))
PY
  done
  echo ""
  echo "NOTE: 'approved' means queued for send, NOT sent. Sending is manual_required."
}

status_summary() {
  shopt -s nullglob
  local files=("$OUTBOX_DIR"/*.json)
  local draft=0 approved=0 sent=0
  for f in "${files[@]}"; do
    local st; st="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("state","?"))' "$f")"
    case "$st" in
      draft) draft=$((draft+1)) ;;
      approved) approved=$((approved+1)) ;;
      sent) sent=$((sent+1)) ;;
    esac
  done
  printf '\nwork outbox status\n'
  printf '%s\n' "=================="
  printf '  %-12s %d\n' "draft" "$draft"
  printf '  %-12s %d\n' "approved" "$approved"
  printf '  %-12s %d\n' "sent" "$sent"
  printf '  %-12s %s\n' "send" "manual_required (no Jira/messaging creds vaulted)"
  printf '  %-12s %s\n' "auto_send" "DISABLED (human-approval gate)"
}

case "$SUB" in
  list)
    list_drafts
    log "listed"
    ;;
  check)
    status_summary
    log "checked"
    ;;
  show)
    [[ -n "$ARG" ]] || { echo "Usage: platform work outbox show <draft_id>" >&2; exit 1; }
    F="$OUTBOX_DIR/$ARG.json"
    [[ -f "$F" ]] || { echo "outbox: draft not found: $ARG" >&2; exit 1; }
    python3 -m json.tool "$F"
    log "shown"
    ;;
  approve)
    [[ -n "$ARG" ]] || { echo "Usage: platform work outbox approve <draft_id>" >&2; exit 1; }
    F="$OUTBOX_DIR/$ARG.json"
    [[ -f "$F" ]] || { echo "outbox: draft not found: $ARG" >&2; exit 1; }
    python3 - "$F" <<'PY'
import json, sys, datetime
f = sys.argv[1]
d = json.load(open(f))
d["state"] = "approved"
d["approved_by"] = "fritz"
d["approved_at"] = datetime.datetime.utcnow().isoformat() + "Z"
json.dump(d, open(f, "w"), indent=2)
print(f"outbox: {d['draft_id']} marked approved.")
print("Approval recorded — the draft is queued for send but has NOT been sent.")
PY
    echo "MANUAL REQUIRED: sending is not wired. Needs Jira creds (jira.api_token,"
    echo "  jira.base_url, jira.email) or a messaging credential before 'send' can do anything."
    log "approved"
    ;;
  send)
    # Intentionally inert. We never transmit on Fritz's behalf without creds + an
    # explicit, separately-built send capability. This surfaces the gap loudly.
    echo "outbox: send is BLOCKED (manual_required)." >&2
    echo "No Jira/messaging credentials are vaulted, and auto-send is disabled by design." >&2
    echo "Approve the draft, then a human sends it manually until the send capability is built." >&2
    log "send_blocked"
    exit 0
    ;;
  *)
    echo "Usage: platform work outbox [list|--check|show <id>|approve <id>|send <id>]" >&2
    exit 1
    ;;
esac
