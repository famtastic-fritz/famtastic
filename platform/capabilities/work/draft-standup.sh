#!/usr/bin/env bash
# work/draft-standup.sh — draft a team standup / status update (yesterday /
# today / blockers) from a standup-input JSON, or from the FAMtastic runs/tasks
# ledgers when no explicit activity is supplied. Writes to the work outbox for
# human approval and appends an audit line.
#
# SAFETY GATE (NON-NEGOTIABLE): this is OUTBOUND communication on Fritz's behalf.
# This script NEVER posts anything to Slack/Teams/email. It only produces a
# local draft in the outbox with state "draft". Sending requires explicit human
# approval AND a messaging credential that does not exist here yet
# (slack.webhook is vault-key-pending). There are NO external API calls here.
#
# Usage: platform work draft-standup [<input.json>] [--check]

set -euo pipefail

PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HUB_ROOT="$(cd "$PLATFORM_ROOT/.." && pwd)"
VAULT="$PLATFORM_ROOT/vault/vault.sh"
INVOCATIONS_DIR="$PLATFORM_ROOT/invocations"
OUTBOX_DIR="$PLATFORM_ROOT/capabilities/work/outbox"
mkdir -p "$INVOCATIONS_DIR" "$OUTBOX_DIR"

INPUT=""
MODE="draft"
for arg in "$@"; do
  case "$arg" in
    --check|--dry-run) MODE="check" ;;
    -*) echo "Unknown option: $arg" >&2; exit 1 ;;
    *) INPUT="$arg" ;;
  esac
done

vault_has() { "$VAULT" read "$1" >/dev/null 2>&1; }

SEND_STATE="manual_required"
vault_has "slack.webhook" && SEND_STATE="creds_present_send_still_gated"

RUNS_LEDGER="$HUB_ROOT/runs/runs.jsonl"
TASKS_LEDGER="$HUB_ROOT/tasks/tasks.jsonl"

if [[ "$MODE" == "check" ]]; then
  printf '\nwork draft-standup check\n'
  printf '%s\n' "========================"
  printf '  %-28s %s\n' "input_file" "${INPUT:-<none — will read ledgers>}"
  printf '  %-28s %s\n' "runs_ledger" "$([[ -f "$RUNS_LEDGER" ]] && echo "$RUNS_LEDGER" || echo missing)"
  printf '  %-28s %s\n' "tasks_ledger" "$([[ -f "$TASKS_LEDGER" ]] && echo "$TASKS_LEDGER" || echo missing)"
  printf '  %-28s %s\n' "outbox_dir" "$OUTBOX_DIR"
  printf '  %-28s %s\n' "send_capability" "$SEND_STATE"
  printf '  %-28s %s\n' "auto_send" "DISABLED (human-approval gate)"
  printf '\nMANUAL REQUIRED: posting is not wired. Optional vault key slack.webhook pending.\n'
  DAY="$(date +%Y-%m-%d)"
  printf '{"ts":"%s","capability":"work.draft-standup","args":{"input":"%s","mode":"check"},"result":"%s"}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${INPUT:-}" "$SEND_STATE" >> "$INVOCATIONS_DIR/$DAY.jsonl"
  exit 0
fi

[[ -z "$INPUT" || -f "$INPUT" ]] || { echo "draft-standup: input not found: $INPUT" >&2; exit 1; }

NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
DRAFT_ID="standup-$(date +%Y%m%d-%H%M%S)-$$"
OUT_FILE="$OUTBOX_DIR/$DRAFT_ID.json"

# --- Drafting logic. Uses explicit activity if present; otherwise derives a
#     best-effort yesterday/today/blockers view from the FAMtastic ledgers. ---
python3 - "${INPUT:-}" "$OUT_FILE" "$DRAFT_ID" "$NOW" "$SEND_STATE" "$RUNS_LEDGER" "$TASKS_LEDGER" <<'PY'
import json, sys, os, datetime

input_path, out_path, draft_id, now, send_state, runs_ledger, tasks_ledger = sys.argv[1:8]

cfg = {}
if input_path and os.path.isfile(input_path):
    with open(input_path) as f:
        cfg = json.load(f)

author = cfg.get("author") or "Fritz Medine"
workstream = cfg.get("workstream", "")
date = cfg.get("date") or datetime.date.today().isoformat()
fmt = cfg.get("format", "ytb")
tone = cfg.get("tone", "concise")

def read_jsonl(path):
    rows = []
    if os.path.isfile(path):
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rows.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return rows

activity = cfg.get("activity") or {}
source = "explicit_input"

if not activity:
    # Ledger fallback: completed tasks -> yesterday, active/open -> today, blocked -> blockers.
    source = "famtastic_ledgers"
    tasks = read_jsonl(tasks_ledger)
    runs = read_jsonl(runs_ledger)
    yesterday, today, blockers = [], [], []
    for t in tasks:
        title = t.get("title") or t.get("task_id") or "untitled task"
        st = (t.get("status") or "").lower()
        if st in ("completed", "done"):
            yesterday.append(title)
        elif st in ("blocked",):
            blockers.append(title)
        elif st in ("active", "in_progress", "in-progress", "open", "todo", "ready"):
            today.append(title)
    for r in runs:
        st = (r.get("status") or "").lower()
        step = r.get("current_step") or r.get("target") or r.get("run_id")
        if st == "active" and step:
            today.append(f"Run {r.get('run_id','?')}: {step}")
    # Keep the standup readable.
    activity = {
        "yesterday": yesterday[:6],
        "today": today[:6],
        "blockers": blockers[:6],
    }

yesterday = activity.get("yesterday", []) or []
today = activity.get("today", []) or []
blockers = activity.get("blockers", []) or []

def bullets(items):
    return "\n".join(f"- {i}" for i in items) if items else "- (nothing to report)"

header = f"*Standup — {author}*"
if workstream:
    header += f" · {workstream}"
header += f" · {date}"

if fmt == "status":
    parts = [header, ""]
    if yesterday:
        parts.append("Since last update: " + "; ".join(yesterday))
    if today:
        parts.append("Up next: " + "; ".join(today))
    parts.append("Blockers: " + ("; ".join(blockers) if blockers else "none"))
    message_text = "\n".join(parts)
else:
    message_text = (
        f"{header}\n\n"
        f"*Yesterday*\n{bullets(yesterday)}\n\n"
        f"*Today*\n{bullets(today)}\n\n"
        f"*Blockers*\n{('- none' if not blockers else bullets(blockers))}"
    )

draft = {
    "draft_id": draft_id,
    "kind": "standup",
    "created_at": now,
    "state": "draft",
    "channel": "team_message",
    "send_capability": send_state,
    "auto_send": False,
    "approval_required": True,
    "author": author,
    "workstream": workstream,
    "date": date,
    "format": fmt,
    "activity_source": source,
    "message_text": message_text,
    "approved_by": None,
    "approved_at": None,
    "sent_at": None,
}

with open(out_path, "w") as f:
    json.dump(draft, f, indent=2)

print(f"draft-standup: drafted {fmt} standup for {author}"
      + (f" / {workstream}" if workstream else ""))
print(f"  activity source: {source}")
print(f"  draft written: {out_path}")
PY

echo ""
echo "STATE: draft (awaiting Fritz's approval — NOTHING was posted)"
echo "MANUAL REQUIRED: posting to a team channel is not wired. Approve via 'platform work outbox';"
echo "  sending stays manual until a messaging credential (optional slack.webhook) is vaulted."

DAY="$(date +%Y-%m-%d)"
printf '{"ts":"%s","capability":"work.draft-standup","args":{"input":"%s","mode":"draft","draft_id":"%s"},"result":"drafted","send_capability":"%s"}\n' \
  "$NOW" "${INPUT:-}" "$DRAFT_ID" "$SEND_STATE" >> "$INVOCATIONS_DIR/$DAY.jsonl"
