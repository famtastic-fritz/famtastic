# FAMtastic Capture — README

Layer 4 of the FAMtastic architecture. The flywheel that ensures no important conversation evaporates.

## What this is

A tool for ingesting input sources (Cowork sessions, exported Web chats, Studio conversation logs), scaffolding structured capture proposals, reviewing them, and promoting approved items to canonical files (`.wolf/cerebrum.md`, `.wolf/gaps.jsonl`, `.wolf/buglog.json`, `FAMTASTIC-STATE.md`).

The mission is compounding: every captured insight feeds future Shay routing, future audits, future builds. Site #1,000 benefits from everything captured during sites #1–999.

## Status

**MVP (iteration 2, 2026-05-02):**
- `scan` / `summary` — inventory inputs and existing captures
- `scaffold` — create a new capture from the template
- `dry-run` — show what would be promoted
- `promote` — NOT YET IMPLEMENTED (manual canonical-file edits for now)

**Iteration 3 (planned):**
- LLM-assisted extraction (Shay reads a transcript, proposes items)
- `promote` writers per destination file format
- Pattern detection (auto-flag when a pattern recurs 3+ times)

## Directory layout

```
lib/famtastic/capture/
├── index.js         # programmatic API
├── cli.js           # command-line entry
├── template.md      # scaffold template
└── README.md        # this file

~/famtastic/imports/
├── web-chats/       # exported Claude Web chats (markdown or JSON)
├── cowork-sessions/ # exported Cowork session transcripts
└── (loose files)    # any other capture inputs

~/famtastic/docs/captures/
└── YYYY-MM-DD_<surface>-<slug>.md   # one per session/conversation
```

## Workflow

### 1. Drop inputs

Export your Web chat (markdown is easiest), drop it in `~/famtastic/imports/web-chats/`. Or drop a Cowork session transcript in `~/famtastic/imports/cowork-sessions/`.

Naming convention: `YYYY-MM-DD_<short-label>.md` e.g. `2026-05-02_shay-design-conversation.md`.

### 2. Scaffold a capture

```bash
node lib/famtastic/capture/cli.js scaffold \
  --session "shay-design-conversation" \
  --surface web \
  --source-file imports/web-chats/2026-05-02_shay-design-conversation.md
```

Creates `docs/captures/2026-05-02_web-shay-design-conversation.md` with item slots for Decisions, Breakthroughs, Gaps, Lessons, Patterns, Contradictions.

### 3. Fill in items

Open the scaffold. Read your input source. For each insight worth capturing, fill in one of the templated item blocks. Mark each item with:
- `STATUS:` — `pending` (not ready), `approved` (ready to promote), `rejected` (don't promote)
- `LANDS IN:` — which canonical file/section this item belongs in

Items are separated by `---` lines.

### 4. Dry-run to verify

```bash
node lib/famtastic/capture/cli.js dry-run docs/captures/2026-05-02_web-shay-design-conversation.md
```

Lists every item marked `approved` and shows where each will land. Catches typos before you commit.

### 5. Promote (manual for MVP)

Until the `promote` command is implemented, copy each approved item by hand into its `LANDS IN:` destination. The dry-run output is your checklist.

## Item ID conventions

| Prefix | Type | Lands in |
|---|---|---|
| `D-YYYY-MM-DD-XX` | Decision | `.wolf/cerebrum.md` (Decision Log) |
| `B-YYYY-MM-DD-XX` | Breakthrough | `.wolf/cerebrum.md` (Key Learnings) |
| `G-YYYY-MM-DD-XX` | Gap | `.wolf/gaps.jsonl` |
| `L-YYYY-MM-DD-XX` | Lesson | `.wolf/cerebrum.md` (Lessons / Do-Not-Repeat) |
| `P-YYYY-MM-DD-XX` | Pattern (watch-list) | `.wolf/cerebrum.md` (Patterns) |
| `C-YYYY-MM-DD-XX` | Contradiction | `.wolf/cerebrum.md` (revised Decision Log entry) |
| `Bug-YYYY-MM-DD-XX` | Bug pattern | `.wolf/buglog.json` |

## Why this matters

Per the FAMtastic briefing: "every conversation that ends without capture is leakage." This tool exists so that ends.

Per the cerebrum's "Separation-Ready Architecture" rule (2026-04-24): this lives in `lib/famtastic/`, not `lib/site-studio/`, because it's an ecosystem service that every Studio (and every pillar — Web/Cowork/Code) eventually uses.
