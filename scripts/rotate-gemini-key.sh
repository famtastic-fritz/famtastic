#!/usr/bin/env bash
# rotate-gemini-key.sh — securely rotate the Gemini API key
#
# Prompts for the new key without echoing it.
# Replaces (not appends) any existing GEMINI_API_KEY exports in:
#   ~/.zshrc, ~/.zprofile, ~/.bashrc
# Backs up each rc file before editing.
# Exports into current shell.
# Tests the key against the Gemini API using HEADER auth (key never in URL).
# Writes status (no key value) to /tmp/gemini-rotate-status.txt.
#
# The key is never echoed, written to chat, or committed to git.

set -euo pipefail

echo "=================================================="
echo "  MBSH Premiere — Gemini API Key Rotation"
echo "=================================================="
echo

# ----------------------------------------------------------------------
# 1. Secure prompt — hidden input
# ----------------------------------------------------------------------
# Read into a variable; -s suppresses echo
read -r -s -p "Paste new GEMINI_API_KEY (will not echo): " NEW_GEMINI_API_KEY
echo
echo

# ----------------------------------------------------------------------
# 2. Validate non-empty + Google API key shape
# ----------------------------------------------------------------------
if [ -z "${NEW_GEMINI_API_KEY:-}" ]; then
  echo "ERROR: empty input. Aborting." >&2
  exit 1
fi

LEN=${#NEW_GEMINI_API_KEY}
PREFIX=$(printf "%s" "$NEW_GEMINI_API_KEY" | cut -c1-4)
SUFFIX=$(printf "%s" "$NEW_GEMINI_API_KEY" | rev | cut -c1-4 | rev)

echo "Key received."
echo "  Length: ${LEN}"
echo "  Shape:  ${PREFIX}***${SUFFIX}"
echo

# Standard Google API key: starts with AIza, ~39 chars total, [A-Za-z0-9_-]
if printf "%s" "$NEW_GEMINI_API_KEY" | grep -qE '^AIza[0-9A-Za-z_-]{35}$'; then
  echo "  Format: matches Google API key shape (AIza + 35 chars)."
else
  echo "  Format: does NOT match standard Google shape."
  echo "  Length is ${LEN}; standard is 39."
  read -r -p "  Continue anyway? [y/N] " ANSWER
  case "$ANSWER" in
    [yY]|[yY][eE][sS]) ;;
    *) echo "Aborting." >&2; exit 1 ;;
  esac
fi
echo

# ----------------------------------------------------------------------
# 3. Replace existing GEMINI_API_KEY in rc files (no duplicates)
# ----------------------------------------------------------------------
ROTATE_TS=$(date +%Y%m%d-%H%M%S)
for RCFILE in "$HOME/.zshrc" "$HOME/.zprofile" "$HOME/.bashrc"; do
  if [ -f "$RCFILE" ]; then
    BACKUP="${RCFILE}.pre-gemini-rotate-${ROTATE_TS}.bak"
    cp "$RCFILE" "$BACKUP"
    # Strip any existing export GEMINI_API_KEY=... lines
    # (matches optional leading whitespace, "export", whitespace, key name, optional whitespace, =)
    grep -vE '^[[:space:]]*(export[[:space:]]+)?GEMINI_API_KEY[[:space:]]*=' "$BACKUP" > "$RCFILE"
    # Append the new export line
    printf '\n# GEMINI_API_KEY rotated on %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$RCFILE"
    printf 'export GEMINI_API_KEY="%s"\n' "$NEW_GEMINI_API_KEY" >> "$RCFILE"
    echo "  Rewrote: $RCFILE  (backup: $BACKUP)"
  fi
done
echo

# ----------------------------------------------------------------------
# 4. Export into current shell (effective if this script is sourced;
#    if run as ./script.sh the parent shell is unaffected — open a new
#    terminal or `source ~/.zshrc` after this finishes)
# ----------------------------------------------------------------------
export GEMINI_API_KEY="$NEW_GEMINI_API_KEY"
echo "  Exported into this script's shell (if you ran with ./ or bash, open a new terminal or source your rc to pick it up in your interactive shell)."
echo

# ----------------------------------------------------------------------
# 5. studio-config.json — env-var precedence preferred; do not touch
# ----------------------------------------------------------------------
STUDIO_CFG="$HOME/.config/famtastic/studio-config.json"
if [ -f "$STUDIO_CFG" ]; then
  echo "  studio-config.json exists. Env var \$GEMINI_API_KEY is the preferred source."
  echo "  (Not modifying studio-config.json — toolchain already reads from env.)"
fi
echo

# ----------------------------------------------------------------------
# 6. Test the key — header auth so it never appears in URLs
# ----------------------------------------------------------------------
echo "=== Testing Gemini API ==="
TEST_OUT=/tmp/gemini-rotate-test.json
HTTP_STATUS=$(curl -sS -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Reply with just: OK"}]}]}' \
  -o "$TEST_OUT" -w "%{http_code}")

echo "  HTTP status: $HTTP_STATUS"
echo

# ----------------------------------------------------------------------
# 7. Report — write status to /tmp (no key value in this file)
# ----------------------------------------------------------------------
STATUS_FILE=/tmp/gemini-rotate-status.txt
{
  echo "rotated_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "key_length: $LEN"
  echo "key_shape: ${PREFIX}***${SUFFIX}"
  echo "http_status: $HTTP_STATUS"
} > "$STATUS_FILE"

if [ "$HTTP_STATUS" = "200" ]; then
  REPLY=$(node -e 'try{const r=require("'"$TEST_OUT"'");console.log((r.candidates&&r.candidates[0]&&r.candidates[0].content&&r.candidates[0].content.parts&&r.candidates[0].content.parts[0].text)||"(no text)")}catch(e){console.log("(parse error: "+e.message+")")}')
  echo "  ✓ SUCCESS — Gemini API auth working."
  echo "  Model reply: $REPLY"
  {
    echo "verdict: UNBLOCKED"
    echo "model_reply: $REPLY"
  } >> "$STATUS_FILE"
else
  echo "  ✗ FAILED — exact error response below:"
  echo
  cat "$TEST_OUT" | head -40
  {
    echo "verdict: STILL_BLOCKED"
    echo "error_response_first_40_lines:"
    head -40 "$TEST_OUT" | sed 's/^/  /'
  } >> "$STATUS_FILE"
fi

echo
echo "=================================================="
echo "  Status file: $STATUS_FILE  (no key value inside)"
echo "  Test response: $TEST_OUT  (Google's response only)"
echo "  rc backups: ${RCFILE%.bak}.pre-gemini-rotate-${ROTATE_TS}.bak"
echo "=================================================="
echo
echo "Next: open a new terminal OR run \`source ~/.zshrc\` so other shells pick up the new key."
echo "Then tell the running build session: \"key rotated — read /tmp/gemini-rotate-status.txt\""
