---
title: Shay Memory Schema — L0→L3 Layering Convention
date: 2026-05-31
type: convention
tags:
- shay
- memory
- schema
- l0-l3
- convention
- track4
permalink: shay-memory/_system/memory-schema-l0-l3
---

# Shay Memory Schema — L0→L3 Layering (Tencent-style)

> Additive convention layered over the EXISTING basic-memory / Obsidian vault at
> `~/famtastic/obsidian/Shay-Memory`. No existing note is moved or rewritten by this
> convention. Layering is expressed purely as **front-matter `memory_layer:` + tags**,
> plus optional new (empty-on-creation) folders. The running gateway picks notes up
> through the existing `obsidian` + `basic-memory` MCP servers with no config change.

## The four layers

This vault adopts the Tencent / Second-Me L0→L3 *shape*. Note: the canonical
architecture doc (`research/next-phase-architecture-2026-05-31.md`) maps these to
RAW / NL-MEMORY / PARAMETERS / IDENTITY. This convention uses the Track-4 task's
naming (raw → episodic → semantic → reflective) as the **markdown layering**, and
records the architecture mapping alongside so the two never drift.

| Layer | Track-4 name | Architecture-doc name | What lives here | Who writes it |
|-------|--------------|-----------------------|-----------------|---------------|
| **L0** | raw         | RAW            | Verbatim capture: conversation logs, inbox dumps, session transcripts, research notes as-captured. The existing vault contents are L0 by default. | Humans + agents, live |
| **L1** | episodic    | (sub-layer of RAW→NL) | Per-event summaries: "what happened in this session / on this day." One note per episode (day or session), distilled from L0. | Nightly reflection pass |
| **L2** | semantic    | NL-MEMORY      | Durable, de-duplicated natural-language facts ABOUT Fritz / projects / decisions. Cross-episode, merged. The seed is the existing `learnings/` notes + `MEMORY.md`/`USER.md`. | Nightly reflection pass |
| **L3** | reflective  | IDENTITY       | Stable contract + meta-reflections: standing constraints, identity/DNA, recurring patterns, "what we keep getting wrong." Slow-churn, injected into every session. | Nightly reflection pass + human |

`L0` is the floor (everything is at least L0). Higher layers are *derived* and
*condensed*; they never delete the L0 source.

## How a note declares its layer

Add to the YAML front-matter (additive — existing notes without it are treated as L0):

```yaml
memory_layer: L1        # one of L0 | L1 | L2 | L3
memory_source: [shay-memory/inbox/2026-05-31-foo]   # permalinks/paths of the L0/Ln notes this was distilled from
memory_reflected_at: 2026-05-31T03:00:00Z           # set by the reflection pass
```

And add the matching tag so retrieval (Smart Connections / FTS) can filter by layer:

```yaml
tags:
- memory/l1
```

Tag namespace: `memory/l0`, `memory/l1`, `memory/l2`, `memory/l3`.

## Folder convention (new, empty-on-creation only)

Derived layers are written into dedicated folders so they are easy to scan and
easy to roll back, WITHOUT relocating any existing note:

```
Shay-Memory/
  _system/                  ← this convention + the reflection script (new)
  reflections/
    episodic/   (L1)        ← one note per day/session, created by the cron
    semantic/   (L2)        ← merged durable facts, created by the cron
    reflective/ (L3)        ← identity/meta notes, created by the cron + human
```

Existing folders (`inbox/`, `learnings/`, `research/`, `plans/`, `reviews/`, …)
remain untouched and are read as L0 (or whatever layer their front-matter declares).

## Reflection pass contract

The nightly reflection job (`_system/reflect.py`) does, idempotently:

1. **L0 → L1**: collect notes modified in the last 24h that are not already a
   reflection output; write/refresh one `reflections/episodic/<date>.md` summarising
   the day. Re-running for the same date overwrites that single dated note (idempotent).
2. **L1 → L2**: append/refresh durable facts into `reflections/semantic/<date>.md`,
   flagging likely duplicates against existing L2 notes (mirrors the
   `consolidate-memory` discipline). It does NOT auto-delete; it annotates.
3. **L2 → L3**: surface recurring patterns / standing constraints as candidate L3
   entries in `reflections/reflective/<date>.md` for human ratification.

The pass is **read-mostly on existing notes** (it only reads L0/L1) and **write-only
into the `reflections/` tree**. It never edits or moves a pre-existing note.

## Activation status

- Schema + folders + script: **live in the vault** (this commit).
- Nightly automation: a standalone launchd plist is provided at
  `_system/ai.shay.memory-reflect.plist`. It is **NOT loaded** by this pass (loading is
  an attended step). To activate without touching `~/.shay/config.yaml`:
  `cp _system/ai.shay.memory-reflect.plist ~/Library/LaunchAgents/ && launchctl load ~/Library/LaunchAgents/ai.shay.memory-reflect.plist`
  This is a freestanding launchd entry — it does NOT use the gateway's config cron.
