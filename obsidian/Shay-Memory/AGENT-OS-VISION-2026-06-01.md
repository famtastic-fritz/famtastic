---
title: AGENT-OS-VISION-2026-06-01
type: note
permalink: shay-memory/agent-os-vision-2026-06-01
tags: [memory/l3, vision, agent-os, mission-control, north-star]
---

# Agent OS = "Mission Control" (Fritz's real vision, captured 2026-06-01)

## What Fritz actually wants (from the YouTube ref "How to Build Your Own Agent Operating System")
A **Mission Control dashboard** — NOT just ported hermes-webui screens. Structure:
- **Left nav:** Mission Control + an **AGENTS** list, one entry PER BRAIN: Claude · OpenClaw ·
  Hermes · Gemini · Antigravity · Codex · Free Claude Code.
- **Top status strip:** per-agent live tiles — Online/Offline, version, **heartbeat**, **latency**
  (e.g. "CLAUDE Online 2.1.55 388ms", "HERMES Online step-3.7-flash:free", "FREE CLAUDE Offline
  fcc-server-down", "LATENCY 1892ms combined p50", "HEARTBEAT poll ticks 4s").
- **"AGENTS · CLICK TO OPEN CONTROL ROOM":** per-agent cards that open a control room. Each
  describes the brain: Claude = "direct streaming line to Claude Code, full tool use, MCPs,
  plugins"; OpenClaw = "local agent gateway, chat one-shot or open the control room"; Hermes =
  "Nous Research agent — tool calls, kanban, skills, plugins".

## The key realization
**Mission Control IS the visual of the pluggable-executor-backend architecture.** Every brain it
shows = an executor type Shay can route to. So what we built this session is the BACKEND:
- run-router + run-policy.yaml (picks orchestrator + executor)
- executor types + capability contract (claude-cli / codex-cli / gemini-cli / native)
- build coordinator (worktree isolation, overlap-aware, reconciliation)
- the agentos-domain screens (kanban polished to hermes v0.11.0, tools, gateway, etc.)
Mission Control is the FACE that's still missing: per-brain status (online/latency/heartbeat) +
control rooms. The plumbing exists; the dashboard doesn't.

## Honest state (Fritz: "isnt a waste, isnt bad, its buggy")
- BUILT + working: the full overnight plan (pipeline/memory/context/desktop lanes), run-model,
  build coordinator, C4 memory backend, Agent-OS Kanban polish, anti-drift, gap-discovery.
- BUGGY / gaps: the desktop nav looked stale until rebuilt; Agent OS icon was a spinner (fixed →
  Boxes); the swarm's worker-protocol reliability (fixed via protocol-retry + Watcher, not yet
  proven on a live swarm run); `shay builds` had a crash (fixed); user-profile memory hit its cap.
- NOT built = the Mission-Control dashboard (the per-brain tiles + control rooms) — that's the
  next-phase north star, sitting on the backend we just laid.

## Next phase (when Fritz says go)
Build the Mission Control surface: a per-brain registry (status/heartbeat/latency probes per
executor) + the dashboard (tiles + control rooms) in the agentos domain — wired to the
run-router's executor types so it's the live face of the brain-agnostic OS.
