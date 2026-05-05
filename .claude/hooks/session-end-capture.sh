#!/usr/bin/env bash
# session-end-capture.sh — Claude Code session-end hook (optional).
#
# When Claude Code emits a session transcript at end-of-session, this hook
# pipes it into the chat-capture-learn-optimize pipeline:
#
#   1. session-capture.js --source claude-code --input <transcript>
#   2. memory-promote.js review <capture-id>
#   3. memory-promote.js promote <capture-id> --auto   (auto-allowlist only)
#
# Wire this from settings.json hooks. Disable by removing the hook entry.
#
# Env:
#   CLAUDE_SESSION_TRANSCRIPT — path Claude writes the session transcript to
#   MEMORY_TELEMETRY=off       — disable telemetry events

set -euo pipefail

REPO="${HOME}/famtastic"
TRANSCRIPT="${CLAUDE_SESSION_TRANSCRIPT:-${1:-}}"

if [[ -z "${TRANSCRIPT}" || ! -f "${TRANSCRIPT}" ]]; then
  echo "session-end-capture: no transcript at '${TRANSCRIPT}', skipping" >&2
  exit 0
fi

cd "${REPO}"

# Step 1: capture
CAPTURE_OUTPUT=$(node scripts/session-capture.js --source claude-code --input "${TRANSCRIPT}" 2>&1) || {
  echo "session-end-capture: capture failed" >&2
  echo "${CAPTURE_OUTPUT}" >&2
  exit 0
}
echo "${CAPTURE_OUTPUT}"

# Extract capture-id from output (last line typically contains "next: fam-hub memory review <id>")
CAPTURE_ID=$(echo "${CAPTURE_OUTPUT}" | grep -oE 'cap_[0-9T:.\-]+_[a-f0-9]+' | head -n1 || true)
if [[ -z "${CAPTURE_ID}" ]]; then
  echo "session-end-capture: could not parse capture_id, stopping after capture" >&2
  exit 0
fi

# Step 2: review
node scripts/memory-promote.js review "${CAPTURE_ID}" || {
  echo "session-end-capture: review failed for ${CAPTURE_ID}" >&2
  exit 0
}

# Step 3: auto-promote (allowlist only — gated entries stay in review/)
node scripts/memory-promote.js promote "${CAPTURE_ID}" --auto || {
  echo "session-end-capture: auto-promote failed for ${CAPTURE_ID}" >&2
  exit 0
}

echo "session-end-capture: complete for ${CAPTURE_ID}"
