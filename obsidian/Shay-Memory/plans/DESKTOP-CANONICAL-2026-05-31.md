---
title: Shay Apps — Canonical Map (CORRECTED) — desktop vs tunnel, no crossing wires
date: 2026-05-31
author: claude-code (Fritz confirmed)
tags:
- desktop
- tunnel
- canonical
- decision
- do-not-confuse
- electron
- swift
permalink: shay-memory/plans/desktop-canonical-2026-05-31
---

# Shay apps — the CORRECT map (confirmed by Fritz 2026-05-31)

Two installed apps whose names differ ONLY by a space. This caused repeated confusion.
Confirmed mapping:

## ✅ `Shay Desktop.app` (WITH space) — THE DESKTOP Fritz works in
- **Electron** app, v0.4.3, productName "Shay Desktop".
- Installed at `/Applications/Shay Desktop.app` (packaged 2026-05-19).
- **Source: `~/famtastic/shay-desktop-electron`** (repo `fathah/hermes-desktop`).
- THIS is the real daily-driver desktop. All desktop dev targets this source.
- Tonight's fixes (IPC bridge 140/140, QA gate, screens) are IN THE SOURCE but
  NOT in the installed May-19 package yet → needs a repackage to land.

## 🔌 `ShayDesktop.app` (NO space) — the SSH-TUNNEL app (different product)
- **Native Swift** (`HermesDesktop`), repo `dodo-reach/hermes-desktop`.
- Source: `~/famtastic/shay-desktop`. Built into `/Applications/ShayDesktop.app`.
- This is the remote-access / SSH-tunnel product, NOT a desktop UI to build on.
- Keep as a SEPARATE product (Fritz: two builds for now). Frozen for desktop work.

## ⚠️ Bundle-id collision (must fix)
BOTH apps use `com.famtastic.shaydesktop`. macOS can't disambiguate them. Fix:
give the TUNNEL its own id+name → `com.famtastic.shaytunnel` / "Shay Tunnel".
Desktop keeps `com.famtastic.shaydesktop` / "Shay Desktop".

## The other running pieces (not desktops)
- `~/.shay` = runtime/config git repo (auth, SOUL, sessions) + checked-out
  `hermes-agent` (= NousResearch/shay-shay, the agent core) + `hermes-office` (claw3d, npm dev :3333).
- `ai.shay.gateway` = the brain gateway. `com.famtastic.studio` = FAMtastic Studio (launchd).
- `shay-phone` (:8787) = phone PWA + API. vault-search MCP (:8766).

## Decisions (Fritz)
1. Keep BOTH as separate builds (desktop + tunnel).
2. Fix the bundle-id collision (rename tunnel → shaytunnel / "Shay Tunnel").
3. Repackage "Shay Desktop.app" from current source so the installed app gets
   tonight's fixes — AFTER a no-regression check vs the installed build.
4. Do NOT delete the Swift tunnel source — archive/freeze it, clearly labeled.

## Guardrail
Shay's build loop / build_app target ONLY `shay-desktop-electron`. Check this note
before any desktop work. The space-vs-no-space naming is the trap — always verify.