#!/usr/bin/env bash
#
# recover-codex-research.sh — rescue a heavy Codex research day before it's lost.
#
# Codex CLI logs EVERY session to $CODEX_HOME/sessions (default ~/.codex/sessions)
# as rollout-*.jsonl transcripts. These live in your HOME dir, not the app bundle,
# so they usually survive an app reinstall. This script (read-only on the source)
# copies the transcripts into a local staging folder and extracts readable markdown
# so Claude/Shay can organize them into the brain.
#
# Usage:
#   scripts/recover-codex-research.sh                # harvest ALL sessions
#   scripts/recover-codex-research.sh 2026-05-28     # only that day (the heavy day)
#   CODEX_HOME=/path/to/.codex scripts/recover-codex-research.sh 2026-05-28
#
# Output: research-recovery/codex/  (gitignored — raw transcripts may hold secrets;
# the ORGANIZED result goes to obsidian/07-Research, which is committed).
#
set -euo pipefail
ROOT="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
DAY="${1:-}"
SRC="${CODEX_HOME:-$HOME/.codex}/sessions"
STAGE="$ROOT/research-recovery/codex"

have(){ command -v "$1" >/dev/null 2>&1; }
have jq || echo "[warn] jq not found — will copy raw transcripts without text extraction." >&2

if [ ! -d "$SRC" ]; then
  cat >&2 <<EOF
No Codex sessions found at: $SRC

Try one of these, then re-run:
  • Point at the real home:   CODEX_HOME=~/.codex scripts/recover-codex-research.sh $DAY
  • Search for it:            find ~ -type d -name sessions -path '*codex*' 2>/dev/null
  • Other fallbacks to check: ~/.config/codex, shell history (history | grep codex),
    Shay's backup, and git reflog/stash in any repo Codex wrote to.
EOF
  exit 1
fi

mkdir -p "$STAGE"
mapfile -t FILES < <(find "$SRC" -type f -name '*.jsonl' 2>/dev/null | sort)
[ "${#FILES[@]}" -gt 0 ] || { echo "No .jsonl transcripts under $SRC" >&2; exit 1; }

INDEX="$STAGE/INDEX.md"
{ echo "# Recovered Codex transcripts"; echo "_harvested $(date -u +%Y-%m-%dT%H:%MZ) from $SRC${DAY:+ (day filter: $DAY)}_"; echo; } > "$INDEX"

count=0
for f in "${FILES[@]}"; do
  fday="$(date -r "$f" +%Y-%m-%d 2>/dev/null || echo '')"
  if [ -n "$DAY" ]; then
    case "$f" in *"$DAY"*) : ;; *) [ "$fday" = "$DAY" ] || continue ;; esac
  fi
  base="$(basename "$f")"
  cp "$f" "$STAGE/$base"
  md="$STAGE/${base%.jsonl}.md"
  {
    echo "# Codex transcript: $base"
    echo "_source: $f · session date: ${fday:-unknown}_"
    echo
    if have jq; then
      # Best-effort across Codex rollout format variants; raw .jsonl kept regardless.
      jq -r '
        (.payload // .) as $p
        | (($p.role // $p.type // "entry")) as $role
        | (($p.content // $p.text // "")
            | if type=="array" then (map(.text // .content // (.|tostring)) | join(" ")) else tostring end) as $txt
        | select($txt != "") | "**" + $role + ":** " + $txt' "$f" 2>/dev/null \
        || jq -r '.. | .text? // empty' "$f" 2>/dev/null || true
    fi
  } > "$md"
  first="$(grep -m1 -iE 'user:|\*\*user' "$md" 2>/dev/null | head -c 140 || true)"
  printf -- '- **%s** (%s, %s) — %s\n' "$base" "${fday:-?}" "$(wc -c <"$f" | tr -d ' ')b" "${first:-—}" >> "$INDEX"
  count=$((count+1))
done

echo "✓ recovered $count transcript(s) → $STAGE"
echo "  Index: $INDEX"
echo
echo "Next — organize it into the brain (Claude does the synthesis):"
echo "  scripts/ask-claude --context \"$INDEX\" \"Organize this recovered Codex research into a clean, structured report filed under obsidian/07-Research: group by topic, extract findings + gap analyses + decisions, list what's complete vs unfinished, and flag any lessons/skills worth promoting.\""
