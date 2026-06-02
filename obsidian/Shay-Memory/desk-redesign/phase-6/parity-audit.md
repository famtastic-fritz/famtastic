---
title: parity-audit
type: note
permalink: shay-memory/desk-redesign/phase-6/parity-audit
---

# Phase 6 — Parity Audit (label: parity-audit)

**Date:** 2026-05-30
**Owner:** parity-audit agent
**Status:** complete — single read-only markdown deliverable.

## Scope delivered

Exhaustive CLI ↔ Desktop parity audit mapping every Shay CLI command from
snapshot §3 to a Desktop surface, with coverage rating, file paths, and
prioritized gap recommendations.

## Files created

- `/Users/famtasticfritz/famtastic/obsidian/Shay-Memory/desk-redesign/desk-redesign/cli-desktop-parity-2026-05-30.md`
  — the audit document. Front-matter + 6 sections: Executive summary,
  Methodology, Parity matrix (11 category tables), Scoreboard, Top gaps
  (8 prioritized), Deferred-with-rationale (10 items), Recommendations
  (6 prioritized with S/M/L effort).

## Method

1. Read snapshot-2026-05-29.md §3 (lines 301–648) for the full CLI surface
   — 11 categories totalling ~181 distinct user-facing commands.
2. Read build-plan-2026-05-29.md tail (§§5–9 + the preliminary CLI↔Desktop
   scoreboard at line 1268) for the target ratings and Phase-6 critical
   path.
3. Walked the Desktop tree under
   `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/`
   — `admin/{auth,diagnostics,logs,mcp,notifications,plugins,tasks}`,
   `settings/pages/` (17 pages), `shell/`, `composer/{slots,triggers,
   extensions}`, `right/{variants,…}` — to locate the implementing
   component for each CLI command.
4. Where a single Desktop component subsumes many CLI subcommands (e.g.
   `AuthPage.tsx` covers all of `auth add/list/remove/reset/status/logout`)
   the matrix reuses the file path across rows.

## Headline numbers

- Strict coverage: **56 / 181 commands "full" (31 %)**.
- Functional coverage (full + 0.5·partial / non-deferred): **≈ 43 %**.
- 81 commands "missing" today; **60 of them collapse into 5 new admin
  surfaces** (Kanban, Sessions admin, Skills+Curator, Messaging
  (webhook/pairing/manifests), Hooks).
- 11 commands deferred-with-rationale (TUI flags, ACP, completion script,
  dashboard, uninstall, etc.).

## Top gaps (single-line summary)

1. Kanban board UI — full board CRUD missing (L).
2. Sessions write surfaces (rename/delete/prune/archive/fork) (M).
3. Skills + Curator admin (entire `shay curator *` tree missing) (M).
4. Hooks (list/test/revoke/doctor) — security-tier gap (S).
5. Webhook + Pairing + Slack manifest + WhatsApp QR — messaging admin (M).
6. Checkpoints status/prune/clear (S).
7. Gateway service install + Profile distributions (M).
8. Computer-use installer (S).

## Out of scope (intentionally)

- I did not modify any code under `/Users/famtasticfritz/famtastic/shay-
  desktop-electron/`; the audit is purely read-only.
- I did not run `npm run typecheck`; no source edits.
- I did not touch `package.json`.
- Verification of each "full" rating against runtime behavior is left to
  the Phase-6 verification agents.
