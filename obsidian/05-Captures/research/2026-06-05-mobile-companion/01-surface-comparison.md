---
title: 01-surface-comparison
type: note
permalink: famtastic/05-captures/research/2026-06-05-mobile-companion/01-surface-comparison
---

# Mobile Companion — Surface Comparison (agent 1 of 3)
> Background swarm, 2026-06-05. Raw report. Synthesized into the final build brief once all 3 land.

## Verdict: standardize on **Shay Web (hermes-webui v0.51)** for the phone companion

| Dimension | Shay Desktop (electron) | **Shay Web (webui v0.51)** | Shay Workspace (v2.3) |
|---|---|---|---|
| Completeness | Built-out UI but functionally broken (5 gateway routers unregistered, dead session persistence, 43% CLI parity) | **Fully functional** (chat, sessions, kanban, skills, memory, cron, terminal — all live) | Fully functional (richer: swarm dispatch, knowledge graph, inspector) |
| Mobile fitness | ✗ Electron — can't open on phone | **✓ Already a browser app — expose :8787 over Tailscale → full UI on phone, no build** | ~ Electron; must detach Node server first |
| Gateway wiring | direct + CLI shellout | **env-var hookpoints only** (`HERMES_WEBUI_CHAT_BACKEND=gateway`) | env-var URLs (`HERMES_API_URL`) |
| Branding | most FAMtastic-branded | **Shay chrome overlay already specced** (PART-3-DECISIONS §4.2) | preload overlay |

**Why Web UI:** it's the only one that's *already browser-delivered* — phone gets the full working Shay (chat, session list, kanban, morning briefing via memory read, approvals) the moment you expose port 8787 over Tailscale. Hookpoints are env-var-only (no fork). The Shay branding overlay is already written on paper. **Workspace** is richer but that richness is overhead for a phone remote (revisit when swarm-monitoring becomes the phone use case). **Desktop** can't run on a phone.

**Final wiring for Web UI:** (A) backend shim at :8642 speaking gateway-chat SSE + set `HERMES_WEBUI_CHAT_BACKEND=gateway`; (B) state shim for kanban/skills/memory; (C) Shay chrome overlay (copy-execute of PART-3 §4.2); (D) Tailscale exposure (bind 0.0.0.0:8787). Skip: RuntimeAdapter protocol, onboarding bypass.

Sources: `plans/shay-environments/scans/{A,B,C}-*.md`, `plans/shay-environments/PART-3-DECISIONS.md`, `obsidian/Shay-Memory/plans/shay-desktop-plan-shay-authored-2026-05-30.md`.