---
title: SHAY-MEMORY-SOURCE-OF-TRUTH-CORRECTION-2026-06-15
type: note
permalink: famtastic/01-shay/shay-memory-source-of-truth-correction-2026-06-15
---

# Shay memory source-of-truth correction — 2026-06-15

## Why this note exists

A drift showed up in the analysis itself.

The mistake was treating the 2026-06-12 memory hierarchy and policy docs as if they were still the highest authority for Shay's current memory reality. They were useful doctrine, but they were overtaken by the newer preserved live evolution from 2026-06-14 and 2026-06-15.

## The old model

Primary anchor:
- `docs/shay-memory-hierarchy.md` (last updated 2026-06-12)

That model says:
- `~/.shay/memories/MEMORY.md` and `~/.shay/memories/USER.md` are the bounded hot-memory layer
- `~/.shay/state.db` is the canonical conversation-recall layer
- the Obsidian vault is the shared retrieval substrate
- everything else is auxiliary, legacy, or manual-only

That was a cleanup/classification doctrine. It is not the final truth when it conflicts with newer preserved live state.

## The newer live source of truth

### In `~/famtastic/`
- `a257227` — preserve local vault and platform work before main cleanup
- `d745ea4` — preserve local vault metadata drift before main cleanup

### In `~/famtastic/shay-shay/`
- `b30a8f5` — capability truth layer CLI
- `78043aa` — intelligence layer command surface
- `bde9b62` — surface capability status in routing output
- `393b5ca` — preserve local intelligence and doctrine work

These commits preserve the better live model.

## What the newer model treats as real operating state

Not just bounded memory and transcript recall:
- `obsidian/Shay-Memory/reflections/episodic/`
- `obsidian/Shay-Memory/reflections/reflective/`
- `obsidian/Shay-Memory/reflections/semantic/`
- `obsidian/Shay-Memory/repo-docs/`
- `obsidian/Shay-Memory/operational/`
- `obsidian/Shay-Memory/research/`
- doctrine artifacts
- capability/intelligence truth surfaces
- hot-context pointers
- metadata/frontmatter drift that reflects real local evolution

This is the key correction:
- the vault-backed intelligence fabric is not just a secondary retrieval layer anymore
- it is part of the live operating brain/state

## Clean comparison

### Old model
- `MEMORY.md` / `USER.md` = primary auto truth
- `state.db` = canonical recall truth
- vault = support/retrieval layer
- reflection/intelligence/doctrine surfaces = secondary

### New live model
- `MEMORY.md` / `USER.md` = bounded injection layer
- `state.db` = one important recall layer
- vault = active intelligence substrate
- reflections/semantic/episodic/doctrine/capability-truth surfaces = real operating state
- meaningful metadata/frontmatter drift may itself be state worth preserving

## Practical rule going forward

When assessing Shay memory architecture, cleanup risk, or drift:
1. prefer the latest preserved live evolution
2. then prefer the latest runtime/intelligence commits
3. treat older hierarchy/policy docs as historical doctrine if they conflict

Do not demote the 2026-06-14 / 2026-06-15 preserved vault/intelligence fabric back into "auxiliary retrieval" just because the older hierarchy doc is cleaner.

## Bottom line

The problem was not that later commits drifted away from the right architecture.

The problem was that the older architecture doc was being mistaken for current truth.

Current truth lives in the preserved 2026-06-14 / 2026-06-15 live vault/intelligence evolution.