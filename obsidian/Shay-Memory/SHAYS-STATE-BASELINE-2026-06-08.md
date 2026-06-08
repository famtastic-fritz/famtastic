---
title: SHAYS-STATE-BASELINE-2026-06-08
type: note
permalink: shay-memory/shays-state-baseline-2026-06-08
---

# Shay's Current State — BEFORE Baseline

> **Purpose:** This is the "before" snapshot in a before/after comparison. It captures
> the state of the Shay + FAMtastic + Site Studio system **as it exists today**, so that
> after the consolidation work we can measure exactly what improved and by how much.
> Do not edit the BEFORE numbers — they are frozen. Improvements get recorded in a
> separate AFTER document and diffed against this one.

- **Baseline captured:** 2026-06-08 (this is the "June 6th — before" baseline referenced in conversation; actual capture date 2026-06-08)
- **Captured by:** Architecture assessment + 3 parallel code investigations + direct verification of load-bearing claims
- **Status:** Pre-consolidation. No structural changes made yet.

---

## The Target Architecture (what we are measuring AGAINST)

The owner's intended model — the definition of "done":

1. **FAMtastic is the BASE for everything** — current and future capabilities live on a shared spine.
2. **Shay is her own component within FAMtastic** — not a neighbor, an integrated component.
3. **Shay can act on the owner's behalf across ALL of FAMtastic** — first-class capability access, not raw shell.
4. **Shay is aware of everything** — unified memory; she can see across every store.
5. **Shay is memory-optimized** — possibly multiple memory systems tied together as ONE.

---

## Verdict at Baseline: bones exist, spine does not

The pieces were each built well in isolation and never given a shared spine. Three brains,
~26 memory stores, two desktop apps, two dueling "canonical" docs. The core that should act
on the owner's behalf (`shay-shay`) genuinely works — it's just walled off from the ecosystem
it's supposed to act across.

### 1. "FAMtastic is the base" — TRUE for Site Studio, FALSE for Shay
- Real shared spine is narrow: `lib/famtastic/` + `fam-hub`. **Only Site Studio consumes it.**
- `fam-hub` is a bash `case` router, not orchestration. **0 `shay` subcommands** (only 1 incidental comment, line 1011).
- The rest of the repo is ~75 top-level dirs co-located, not depending on a base.

### 2. "Shay is her own component that acts across FAMtastic" — FALSE; she is a sealed island
- `shay-shay/` is a **separate git repo, gitignored by FAMtastic** (`.gitignore` lines 79–81; `git ls-files shay-shay` = 0; `shay-shay/.git` exists). Runtime home `~/.shay/` is outside the repo.
- Shay has **zero references** to `fam-hub`, `site-studio`, or `sites/` in her tools/skills.
- Her only reach into FAMtastic is one config line: `terminal.cwd: /Users/famtasticfritz/famtastic` (she can `cd` like a human; no first-class capability wiring).
- The one intended seam is a **stub**: `site-studio/lib/shay-shay-sessions.js` opens with *"TEMPORARY STUB … The original module was never committed and is missing from the working tree."*
- **Three brain implementations** that never connect: shay-shay gateway switchboard (`~/.shay/config.yaml`), shay-phone `call_*` funcs (`shay-phone/server.py`), shay-agent-os `BrainChain` (`shay-agent-os/components/swarm/brain_client.py`). Confirmed by owner's own `SHAY-ECOSYSTEM-PLAN.md`.

### 3. "Aware of everything + memory-optimized" — FALSE; two memory worlds, one launchd bridge
- **World A (Shay reads this):** `~/.shay/memories/MEMORY.md` + `USER.md` (injected every prompt), `~/.shay/state.db` (70MB history + FTS5), Obsidian vault via 3 MCP servers (on-demand).
- **World B (graveyard):** `.brain/` (stale Mar 31), `memory/` (frozen May 19), `second-brain/` (May 19), `captures/` (May 19), `data-center/` (May 21), `.wolf/`. **Three of these Shay literally cannot read.**
- The bridge `shay-agent-os/sync_lessons_to_shay.py` confesses in its header: *"Shay's gateway chat brain reads NONE of those … Hours of lessons were effectively invisible to the assistant the user actually talks to."* It mirrors `.wolf/` → vault every 30 min but **misses `.brain/` and `memory/`**.
- **No unifying index.** Awareness depends on what got copied into the vault and whether Shay searches that turn.
- **Always-on memory is tiny and already over budget** (~10.5KB: MEMORY 8000 + USER 2500 chars; MEMORY.md notes profile cap is full).
- **Triplicate truth:** STATE/CHANGELOG/SITE-LEARNINGS exist in repo + vault repo-docs + Google Drive; two files (`FAMTASTIC-STATE.md`, 497KB `SITE-LEARNINGS.md`) both claim to be canonical.

---

## BASELINE METRICS (frozen — the "before" column)

### A. Architecture / Integration
| Metric | Before | Target |
|---|---|---|
| Shay→FAMtastic bridges wired into the LIVE gateway (what Fritz talks to) | 0 (incidental terminal cwd only) | ≥1 real interface |
| Capability-bridge interface built but UNWIRED (shay-agent-os/bridges: Site/Media/Component) | 3 exist, 0 wired to gateway | wired into gateway tools |
| `fam-hub` shay subcommands | 0 | ≥1 |
| Brain implementations (should be 1) | 3 | 1 |
| Desktop apps (1 abandoned) | 2 | 1 |
| Studio↔Shay seam | stub (0 functional) | working |
| `shay-shay` integrated into FAMtastic | No (gitignored separate repo) | Yes (defined component) |

### B. Memory
| Metric | Before | Target |
|---|---|---|
| Distinct memory stores | ~26 | consolidated / indexed |
| Stores Shay can actually read | 4 channels (MEMORY.md, USER.md, state.db, vault-MCP) | all relevant via 1 fabric |
| Orphaned/stale stores Shay can't read | ≥3 (.brain, memory/, second-brain) | 0 |
| Unifying index across stores | 0 (none) | 1 |
| Always-on memory cap | ~10.5KB (8000+2500 chars); current use ~6.8KB; user-profile sub-cap FULL/overflowing | optimized tiering |
| Docs claiming to be "canonical" | 2 (conflict) | 1 |
| Copies of core knowledge docs | 3 (repo, vault, Drive) | 1 source of truth |
| Memory bridge coverage | partial (.wolf only; misses .brain, memory/) | full |
| Memory bridge direction | one-way, launchd (30 min, StartInterval 1800) | unified |

### C. Repo Hygiene
| Metric | Before | Target |
|---|---|---|
| Working tree size | 21 GB | materially smaller |
| `.git` size | 596 MB | smaller after history work (optional) |
| Tracked files | 2,965 | cleaned |
| Tracked `node_modules` files | 634 (site-studio) | 0 |
| Tracked `.pyc`/`.log`/`.DS_Store` | 88 | 0 |
| `rowboat-base` limbo (gitlink mode 160000, NO .gitmodules = broken/orphan submodule ref) | ~1.3 GB | resolved |

---

## What this baseline IMPROVES, and how

1. **Turns "better" from a feeling into a number.** Every claim of progress can be proven against a frozen before-column instead of vibes.
2. **Catches regressions.** If a later change quietly re-introduces a second brain or a new orphan store, the metric moves the wrong way and we see it.
3. **Forces a target definition.** Each metric has a target column — that *is* the spec for "done." It converts the vision into measurable acceptance criteria.
4. **Creates accountability for consolidation.** "3 brains → 1," "634 tracked node_modules → 0," "0 capability bridges → ≥1" are unambiguous done/not-done gates.
5. **Gives Shay a self-aware reference.** Stored in the vault, Shay can read her own before-state and reason about her own evolution — directly serving "Shay aware of everything."

---

## Three things that must become true to reach the target
- **A — Shay becomes a real FAMtastic component** with a first-class capability bridge (invokes fam-hub/site-studio through an interface, not a raw shell).
- **B — One brain.** Phone and swarm call Shay's gateway instead of re-implementing it.
- **C — One memory fabric.** Single index over all stores, orphans fed in, duplicates collapsed. The vault is already the convergence point — finish the job.

---

---

## Post-Review Corrections (verified 2026-06-08)

This baseline was cross-checked by two independent adversarial reviews before being treated as final:
an **internal** skeptical reviewer (`SHAYS-STATE-INTERNAL-REVIEW.md`) and **Gemini** (`SHAYS-STATE-GEMINI-REVIEW.md`).
(A Codex review was commissioned but Codex hit its usage limit — credits reset Jun 10; not run.)
Neither reviewer could refute the headline thesis. The following factual corrections were verified directly
against code/config and applied above; the original numbers were errors, not improvements:

1. **Capability bridges (material):** a real bridge layer EXISTS — `shay-agent-os/bridges/site_bridge.py:58` wraps `fam-hub site {build,preview,deploy}` via subprocess (plus Media/Component bridges). It is NOT wired into the live `shay-shay` gateway Fritz talks to. So functional reach from the assistant = still 0, but the interface is partially built (lowers the cost of fixing). Original "0 bridges, full stop" was overstated.
2. **Memory budget:** cap is ~10.5KB (8000+2500 chars, `~/.shay/config.yaml:371-372`); current usage ~6.8KB (MEMORY.md 5285B + USER.md 1681B) — UNDER total. But the user-profile 2.5KB sub-cap IS full/overflowing (verbatim note in MEMORY.md: "User-profile cap full — lives here until triage"). Original "over budget" conflated the two.
3. **Sync mechanism:** launchd (`com.famtastic.shay-lessons-sync.plist`, StartInterval 1800), NOT cron (crontab empty). 30-min interval correct.
4. **Top-level dirs:** ~75, not ~130 (original misread `ls` link-count as entry count).
5. **rowboat-base:** gitlink mode 160000 with no `.gitmodules` (broken/orphan submodule ref), ~1.3GB.

**Confirmed exact (no change):** 2,965 tracked files, 634 tracked node_modules, 88 tracked pyc/log/DS_Store, 596MB `.git`, 21GB tree, 3 brain implementations (internal found it WORSE — `shay-agent-os/components/swarm/brain_client.py:4` comments "NO imports from shay-shay"), 2 desktop apps, Studio↔Shay stub, shay-shay gitignored with 0 tracked files, fam-hub 0 shay subcommands, 497KB SITE-LEARNINGS.md, 2 dueling canonical docs.

**Also noted (richer than first stated):** Shay has THREE memory pipelines, not one — the 30-min lessons sync, a nightly L0→L3 consolidation (`obsidian/Shay-Memory/_system/reflect.py` via `ai.shay.memory-reflect.plist`), and on-demand vault-search MCP. One launchd agent is dead: `com.famtastic.shay-codex-switch` (exit 127).

**First-move divergence between reviewers:** internal recommends **B (one brain)** first; Gemini recommends extending the sync to cover the `.brain/`+`memory/` orphans first (**C**, ~50 lines, lowest risk) then wiring the existing SiteBridge (**A**). Both note the SiteBridge interface already exists.

---

*Companion files: Claude memory `project_shay_state_baseline.md`; vault copy `obsidian/Shay-Memory/SHAYS-STATE-BASELINE-2026-06-08.md`; CHANGELOG entry 2026-06-08. Adversarial reviews: `SHAYS-STATE-INTERNAL-REVIEW.md`, `SHAYS-STATE-GEMINI-REVIEW.md`.*