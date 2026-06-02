---
date: 2026-06-02
session: 67ea8b26
type: audit
topic: brain-wiring + hook efficiency
status: findings + fixes applied
---

# Brain-wiring & hook efficiency audit (2026-06-02)

Read-only audit (background agent) + the fixes applied this session.

## Headline problems found

1. **The hook surface was broken, not just unwired.** `.claude/settings.json`
   referenced **six `.wolf/hooks/*.js` files** (session-start, pre-read,
   pre-write, post-read, post-write, stop) — and `.wolf/hooks/` is **gitignored**
   (`.gitignore:36`). So those files were never committed, are absent on every
   fresh clone, and a failing `node` spawn fired on **every** SessionStart, Stop,
   and **every Read/Write/Edit tool call**. The OpenWolf auto-update loop
   documented in `.claude/rules/openwolf.md` never ran.
2. **Only Claude Code had brain wiring.** Codex, Gemini, Cowork, the `fam-hub
   agent` runner, and Shay wrote **zero** session traces to
   `obsidian/05-Captures/sessions/`. The Brain Sync Contract claimed all surfaces
   leave a trace; only Claude Code did.

## Fixes applied this session

| Problem | Fix | File |
|---|---|---|
| 6 dead hook refs (gitignored target) | Removed 5 no-op refs; moved the one real hook to a **tracked** path | `.claude/settings.json`, `scripts/brain/openwolf-post-write.js` |
| OpenWolf memory trail never written | Implemented `openwolf-post-write.js` (PostToolUse Write/Edit → append one line to gitignored `.wolf/memory.md`) | `scripts/brain/openwolf-post-write.js` |
| checkpoint not reusable by other agents | Added `BRAIN_SESSION_ID` fallback (after `CLAUDE_CODE_SESSION_ID`) | `scripts/brain/session-checkpoint.js:38` |
| Codex/Gemini/Claude-via-fam-hub untraced | One `brain_trace start/stop` call in `action_run` | `scripts/agents` |
| Shay untraced | `brain_checkpoint.py` wrapper + `start` call in launcher | `shay-agent-os/brain_checkpoint.py`, `launch-agent.py` |
| checkpoint git efficiency | branch+head in one `git` call; `--shortstat` instead of `diff --stat \| tail -1` | `scripts/brain/session-checkpoint.js` |

## Coverage now

| Surface | Brain trace? | How |
|---|---|---|
| Claude Code | ✅ | settings.json hooks → session-checkpoint.js |
| Claude/Gemini/Codex via `fam-hub agent run` | ✅ | `scripts/agents` brain_trace |
| Shay (`launch-agent.py`) | ✅ | brain_checkpoint.py |
| Shay (`run_*.py` drivers) | ⚠ partial | can `import brain_checkpoint` — not yet wired into each driver |
| Cowork | ❌ | needs a call from its entrypoint/briefing (gap) |

## Not fixed (deliberately)

- **`@STUDIO-CONTEXT.md` (CLAUDE.md:269) "missing"** — it's an intentionally
  **untracked, auto-generated** file (untracked in commit `9ce1a3b`), present on
  Fritz's Mac, absent only in fresh clones. NOT a real bug; not fabricated.
  Same for the absolute path in `.brain-context-{codex,gemini}` (resolves on his
  machine).
- **`famtastic-dna.md` heavy always-on `@include` (~14 KB, mostly an append-only
  build log)** — flagged for condensing; left as-is this session.

## Open gaps for next session
- Wire `brain_checkpoint` into each `shay-agent-os/run_*.py` driver entrypoint.
- Wire a Cowork session trace.
- Condense `famtastic-dna.md` build-log stanzas into one table.
