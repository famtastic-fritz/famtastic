---
title: Phase 9 — Cutover Plan (prove-then-switch, fully reversible)
date: 2026-06-09
author: claude
source: directive
confidence: decision
status: awaiting-approval
tags:
- cutover
- phase-9
- rollback
- shay-platform
- migration
permalink: shay-memory/plans/phase-9-cutover-plan-2026-06-09
---

# Phase 9 — Cutover Plan

> **Note from Claude:** Fritz asked for the exact cutover sequence + rollback. This is the
> prove-then-switch path: the old Python Hermes gateway stays bootable at every step until the
> new TS platform has proven itself in a parallel run. **Awaiting Fritz + Shay approval before
> Stages 1+.** Stage 0 (snapshot, zero risk) may be run immediately.

## Reality check
Phases 0–8 shipped a verified MVP (9 @shay/* packages, 260 tests, on branch `shay-platform-build`
in worktree `~/famtastic/shay-shay-build`). It is NOT yet a live assistant: no bound gateway
server, model lanes not wired to real providers, Hermes ingested structurally (fixtures) not live.
So "cutover" includes real make-it-runnable work (Stage 1) and a validation soak (Stage 2) before
any switch. This is intentional — it's what makes rollback cheap.

## Invariants (why rollback always works)
1. The old `~/.shay/state.db` is NEVER moved or overwritten — only COPIED. New platform writes its OWN store.
2. Old gateway code stays on `main` behind a `pre-cutover` git tag — always restorable.
3. The old launchd plist (`ai.shay.gateway`) is saved before any change.
4. The new gateway runs on a SEPARATE port + SEPARATE launchd label (`ai.shay.gateway-next`) until the final flip — the switch is a config change, not a rebuild.
5. `SOUL.md` + `PERSONA.md` integrity is verified before AND after every stage (standing rule).

## Sequence

### Stage 0 — Snapshot (rollback anchor) · ZERO production impact
- `git tag pre-cutover` on shay-shay main; record the live gateway commit + plist.
- Timestamped backup of `~/.shay/` critical state (config.yaml, *.db + wal/shm, *.jsonl, memories/, sessions/, skills/, SOUL.md, PERSONA.md).
- Verify SOUL.md + PERSONA.md present + non-empty.
- **Rollback:** N/A — this is the baseline.

### Stage 1 — Make the new platform runnable · zero production impact
- Stand up a runtime (tsx or build); bind `@shay/brain` + `@shay/surfaces` into a gateway server on a NEW port under a NEW launchd label `ai.shay.gateway-next`.
- Wire Brain Router lanes to real providers; run the REAL Hermes ingestion end-to-end (read-only over `~/.shay/skills`) → Doctor VERIFY → Ingestion Manifest.
- **Rollback:** `launchctl bootout ai.shay.gateway-next`; optionally delete the build worktree. Live gateway untouched. Zero impact.

### Stage 2 — Shadow / parallel run · fully reversible
- Run `-next` alongside the live gateway. New platform reads state.db/vault READ-ONLY; writes only its own store.
- Point ONE surface (CLI/test) at `-next`; run real tasks; Doctor runs continuously until green. Old Shay stays primary.
- **Rollback:** stop `-next`. Nothing to undo.

### Stage 3 — The switch · only consequential step, reversible in minutes
- After Doctor-green soak: migrate state.db ONCE into the new store (copy in; original untouched).
- Re-point surfaces / relabel services so `-next` answers on `:8642`; stop (don't delete) the old gateway.
- **Rollback:** re-point to old gateway + `launchctl kickstart ai.shay.gateway`. Old state.db never overwritten — minutes to recover. Deep restore = Stage-0 backup.

### Stage 4 — Soak & retire · reversible until "retire" executes
- Soak 48h–1 week with old gateway stopped but recoverable (code on tag, plist saved, state.db preserved).
- Only after clean soak: merge `shay-platform-build` → `main`, remove old launchd, archive the Python gateway.
- **Rollback before retire:** restart old gateway from saved plist + tag. **After retire:** restore from Stage-0 backup + `git checkout pre-cutover`.

## Effort
Stages 0/3/4 are quick. Stage 1 (server bind + live model wiring + live ingestion) is the real work; Stage 2 is trust-building. Prove-then-switch, not big-bang.

## Approvals needed before Stage 1
- Shay sign-off (her runtime + identity files + memory migration).
- Fritz go on the make-it-runnable scope (Stage 1).

— Claude (relaying for Fritz)

---

## Stage 0 — EXECUTED 2026-06-09 (rollback anchor live)
- **git tag `pre-cutover`** → commit `de06082fa6ffe10e411c3b1f1a7993160b4b78c7` (live gateway code).
- **Backup:** `~/shay-backups/pre-cutover-20260609-172840/` (179M) — state.db (99MB) + wal/shm, config.yaml, memories/, sessions/, skills/, events.jsonl, SOUL.md (21375B), PERSONA.md (7290B), ai.shay.gateway.plist, MANIFEST.txt.
- **Integrity:** SOUL.md + PERSONA.md verified present + non-empty BEFORE snapshot.
- **To roll back to this anchor at any later point:** restore `~/shay-backups/pre-cutover-20260609-172840/` into `~/.shay/`, `git -C ~/famtastic/shay-shay checkout pre-cutover`, reinstate the saved plist, `launchctl kickstart -k gui/$(id -u)/ai.shay.gateway`.

**Stages 1–4 NOT started — awaiting Fritz + Shay approval.**