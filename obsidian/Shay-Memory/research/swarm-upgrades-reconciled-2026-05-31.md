---
title: swarm-upgrades-reconciled-2026-05-31
type: note
permalink: shay-memory/research/swarm-upgrades-reconciled-2026-05-31
---

# Swarm-orchestration upgrades — reconciled (Pass A + Pass B), 2026-05-31

Source passes: swarm-patterns-passA (thorough) + swarm-patterns-passB (skeptical).
Refs: claude-swarm (affaan-m) = real engineering reference; the goldstarlinks Hermes
article = marketing/vocabulary only (do NOT cite as proof).

## Adopt into our kanban-lane swarm (both passes agree)
1. **Dependency-graph + wave scheduling** — decomposition is an explicit board artifact;
   cards carry `depends_on`; a pull-guard promotes a card only when parents are `done`.
2. **Kanban-layer file-scope locking** — each card declares `claims:` (files/paths it will
   touch); the dispatcher refuses to run two cards with overlapping claims concurrently.
   MUST live in OUR kanban layer (not an SDK lock) because lanes are heterogeneous
   (Claude orchestrator + Gemini/Shay workers). **This replaces "serialize the build lane"
   — parallel build cards become safe, so we get speed AND no collisions.**
3. **Versioned lane identity bundles** — a `swarm.yaml`-style file pinning each lane's
   prompt + model + skills (researcher/builder/reviewer/orchestrator).
4. **Per-board budget ceiling + bounded retries + cost tracking** — still matters with caps
   relaxed (rate limits + OpenRouter $). Auto-retry → blocked-lane on Nth failure.
5. **Integration-review card per wave** — a reviewer card over the COMBINED output of a
   wave, distinct from per-card review. Keep our stronger `adversarial_verify`/`judge_panel`
   — do NOT downgrade to claude-swarm's single consensus gate (Pass B).
6. **`--dry-run` board plan-gate** — preview the decomposition/cost before spending.

## Same-task redundancy (the pattern Fritz asked for — absent from both sources; our design)
- claude-swarm is divide-and-merge, NOT redundancy/adversarial debate. We build redundancy ourselves.
- **High-value variant = CROSS-VENDOR** (Claude + Gemini) → uncorrelated errors. Homogeneous
  same-vendor clones give correlated errors (low value).
- Rule: use redundancy ONLY for high-stakes / irreversible / genuinely ambiguous / contested-low-confidence
  cards. Default = exactly **2 agents from different vendors + 1 reconciliation pass**. Never >2 same-vendor.
  Drop redundancy first when nearing budget.
- Honest caveat: today's Pass A/Pass B were BOTH Claude general-purpose agents (same vendor →
  correlated). The canonical high-value version pairs Claude + Gemini. Use that next time.

## Net effect
The biggest win is #2 (kanban-layer claims-locking): it lets the deskbuild/agentos build cards
run in parallel safely, removing the "serialize renderer builds" constraint from the game plan.