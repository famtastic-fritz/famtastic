# Plan: Chat Capture, Tag, Learn, Optimize Loop

- **ID:** `plan_2026_05_05_chat_capture_learn_optimize`
- **Label:** `chat-capture-learn-optimize`
- **Tags:** `platform-upgrades`, `memory`, `shay-shay`, `intelligence`, `ledgers`
- **Status:** active
- **Created:** 2026-05-05
- **Owner:** Fritz

## Purpose

Build a working **capture → tag → promote → use → optimize** loop so learnings from chat sessions land in canonical memory, get tagged consistently, are surfaced to Shay-Shay automatically when relevant, and produce telemetry on which ones actually moved the needle.

## Why now

This session alone produced multiple high-value learnings (Netlify can't link git via API, single-Netlify-project model beats two, sites must never commit to Studio history, cowork ghost-session pattern) and **none were captured** by any system. `.wolf/cerebrum.md` is hand-written prose; `SITE-LEARNINGS.md` is 5,425 unstructured lines; `captures/` has an extractor but no promoter. Infrastructure today: 50% designed, 20% built, 0% promoted into canonical memory.

## Architecture

```
Chat session  ──► Capture  ──► Review packet  ──► Promote  ──► Canonical memory  ──► Retrieve  ──► Use  ──► Telemetry  ──► Optimize
  (any source)    (extract)   (captures/inbox)   (gated)    (memory/<type>/*.md)  (Shay)      (audit)  (signals)   (weekly digest)
```

See `plan.json` for the full workstream list and `captures/SCHEMA.md` + `memory/TAXONOMY.md` for the schemas.

## MVP

1. `ws_capture_substrate` — schema + taxonomy + store dirs + INDEX
2. `ws_capture_orchestrator` — adapters for claude-code + manual minimum
3. `ws_promoter` — gated + auto-allowlist
4. `ws_retriever` + Shay-Shay context provider
5. `ws_telemetry` — usage.jsonl writes
6. `ws_first_e2e_proof` — this session's learnings land as canonical entries

## Decisions

| ID | Decision |
|---|---|
| D1 | All four capture sources supported via adapter pattern |
| D2 | Auto-promote: confidence ≥ 0.85 + type ∈ {vendor-fact, do-not-repeat, bug-pattern} |
| D3 | Optimizer: report + auto-promote high-recurrence to candidate (not active) |
| D4 | Store: markdown + YAML frontmatter, SQLite later if needed |
| D5 | Telemetry: local-only, configurable disable |

## Verification (end-to-end)

```bash
# 1. Capture this session
fam-hub capture extract --source manual ~/famtastic/captures/inbox/test-session-2026-05-05.json

# 2. Review (proposes canonical entries)
fam-hub memory review test-session-2026-05-05

# 3. Promote (auto-promotes vendor-facts; gates the rest)
fam-hub memory promote test-session-2026-05-05 --auto

# 4. Verify in store
ls memory/vendor-fact/ memory/decision/ memory/rule/

# 5. Verify telemetry
tail memory/usage.jsonl

# 6. Verify Shay context
# (open a fresh Shay-Shay session in Site Studio with site=mbsh-reunion;
#  confirm RELEVANT MEMORY block contains the new entries)
```
