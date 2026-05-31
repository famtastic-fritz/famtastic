---
title: UI-SPRINT-RESULT-2026-05-31
type: note
permalink: shay-memory/reviews/ui-sprint-result-2026-05-31
---

# Shay Desktop — Overnight UI Sprint Result (2026-05-31)

App: `Shay Desktop.app` (Electron, v0.4.3) — rebuilt, repackaged, reinstalled to /Applications.
Tunnel app `ShayDesktop.app` (Swift SSH) left untouched.

## Delivered (verified)

### 1. Shay's post-learning loop + skill creation (explicitly requested — DONE)
- 8 session lessons captured into Shay's store via `swarm.pipeline.capture_planning_lesson`.
- Mirrored to `obsidian/Shay-Memory/learnings/UI-SPRINT-LESSONS-2026-05-31.md` and `.wolf/cerebrum.md` (Do-Not-Repeat block).
- 7 skills minted under `shay-agent-os/skills/`: micro-patch-living-file, render-spine-guard, visual-qa-gate, claude-desktop-style-match, settings-store-snapshot-cache, dead-wire-detector, typed-screen-manifest.

### 2. Real bug fixed — Agents screen had 100% dead CSS
- Root cause: `Agents.tsx` rendered 25 kebab-case string classNames but never imported its stylesheet; the CSS module (`Agents.module.css`) was orphaned in the unused `index.tsx`, and module hashing wouldn't match string classNames anyway. Result: "87 skills" + "Gateway running" ran together, logo/Chat misaligned.
- Fix: authored `Agents/Agents.global.css` (global kebab-case, mirrors the module) and imported it in `Agents.tsx`, matching the app's global-stylesheet convention (main.css). This is exactly what the new `dead-wire-detector` skill encodes.

### 3. Settings controls styled
- `SettingsShell.module.css` `.fieldControl`: added accent-colored, sized checkboxes/radios and consistent text-input/select/textarea styling + focus rings. Previously bare `<input type="checkbox">` rendered unstyled/misaligned ("Launch on startup").

### 4. Status pill
- `StatusPill.module.css` `.label` max-width 18ch → 28ch so short status text isn't clipped.

## Verification
- `npm run typecheck`: clean (node + web).
- `npm run build:mac`: built + signed (ad-hoc) + packaged dmg/zip. Installed to /Applications.
- Electron smoke harness (`.ralph/electron-smoke.mjs`): **PASS** — booted, body rendered (755 chars), **0 console errors**, 34 nav controls driven, no render-loop.
- Vision gate (`.ralph/visual_qa.py`, Gemini 2.5 flash) on captured screens: Chat / chat-empty scored **9/10**; layout is the intended polished dark Claude-Desktop-style shell.
- Dead-CSS audit across all screens: **Agents was the only truly-dead screen.** Providers/Gateway/Studio looked "0 rules" under a wrong prefix check but actually reuse styled `settings-*` / `office-*` / `tools-toggle` classes — confirmed fine.
- `onChatChunk is not a function` (flagged by vision on late nav shots) was a FALSE alarm — a latched ErrorBoundary from the harness blindly clicking all 34 buttons in a degenerate order. Deterministic probe on fresh boot: `window.hermesAPI.onChatChunk === "function"`, and all 5 renderer `onChat*` calls (Chunk/Done/Error/ToolProgress/Usage) are bound. Chat IPC is fully wired. (Followed the "verify, don't self-attest" lesson.)

## Honest punch-list (not yet addressed — for morning review)
- **Chat tabs row**: "New chat" tab text cramped against the close `x`; the `+` button slightly indented vs tabs; "C…" terminal tab truncated. Cosmetic, repeated vision flag (scores 5–7).
- **Settings sub-nav**: "Desktop App — General" sub-nav text can clip; "Launch on startup" / "Use legacy Settings" toggle alignment could be tightened further.
- **Profile avatar "F"** bottom-left: vision read it as "cut off." CSS is a correct 28px centered circle — likely a screenshot-scale misread. Left as VERIFY (no blind edit, to avoid regression).
- **Models / cut-off text in some lists**: not re-verified per-screen this pass.

## Known gaps opened/confirmed
- Memory "Add custom section" modal shows a `Provider (stub)` label — incomplete feature, not a styling bug (per standing rule). Recorded as a known gap.
- Per-screen vision sweep covered Chat + the screens the smoke harness reached; a deliberate screen-by-screen navigated sweep (push each `view:<ref>`) is the cleaner next pass than clicking arbitrary buttons.