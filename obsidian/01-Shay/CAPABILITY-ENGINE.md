---
title: Capability Engine
date: 2026-07-23
status: active
tags:
- capability-engine
- agent-routing
- dispatch
- gap-tracking
- living-system
permalink: famtastic/01-shay/capability-engine
---

# Capability Engine

A living system that maps what every agent in the FAMtastic ecosystem can do, tracks what's missing, and plans how to dispatch work to the right lane. It grows with every dispatch — each task either confirms a capability or surfaces a new gap.

2026-07-23 update: Site Studio now has a proof-backed callable modular baseline on the live localhost runtime. The capability shift is that Shay can route work against a named runtime-vnext contract and extracted seams instead of only treating Site Studio as one fragile monolith.

## Why It Exists

Multi-agent orchestration kept failing silently: tasks dispatched to lanes without the right capabilities, subscription caps burning through expensive brains on worker tasks, and no visibility into which gaps were blocking execution. The capability engine makes agent capabilities, constraints, and gaps explicit and queryable.

## Components

### Agent Registry (`AGENT-REGISTRY.yaml`)
25 agent lanes cataloged with:
- Tier (free / subscription / paid)
- Cost model (per-token, monthly cap, free)
- Capabilities (what it can do)
- Constraints (rate caps, context limits, hardware limits)
- Quality rating (brain vs worker classification)

### Capability Matrix (`CAPABILITY-MATRIX.yaml`)
35 capabilities across 8 categories:
1. **Code generation** — write, edit, refactor, debug
2. **Research** — search, summarize, cite, fact-check
3. **Reasoning** — plan, decompose, verify, judge
4. **Creative/Media** — generate images, video, audio, design
5. **System operations** — shell, file ops, git, deploy
6. **Data/Analysis** — parse, transform, visualize, model
7. **Communication** — draft, send, notify, translate
8. **Orchestration** — decompose, delegate, monitor, report

Each capability maps to which lanes provide it, at what quality/speed/context level.

### Gap Tracker (`GAP-TRACKER.yaml`)
18 prioritized capability gaps. Each records:
- What's needed
- Which agent lane is blocked
- What's missing (credential, subscription, model, integration)
- Priority (blocking / high / medium / low)
- Resolution path (when known)

### Dispatch Planner (`dispatch-planner` skill)
The pre-delegation workflow every agent surface runs:

```
decompose → check → select → log gaps → build plan → dispatch
```

1. Break the task into required capabilities
2. Query the capability matrix for matching lanes
3. Pick the best available lane (free > subscription > paid)
4. Record gaps for capabilities with no available lane
5. Construct a dispatch plan with fallback chains
6. Send the work

## Core Principles

### Brain vs Worker Separation
- **Brain lanes** orchestrate, reason, verify, synthesize — expensive, high-context, slow (Claude, Codex, Gemini Pro)
- **Worker lanes** code, search, transform, generate — cheap, fast, narrow (Qwen 1.5B, Phi-4-mini, free cloud agents)
- Brain lanes never do worker work. Worker lanes never do brain work.
- Subscription-backed lanes tied to Shay's own brain budget are protected by default; they are not the default labor pool.
- If a subscription lane shares budget/caps with Shay's brain, worker routing must avoid it unless the packet explicitly justifies that spend.
- Text-only lanes (for example `glm-5.2` in Fritz's current environment) can serve review/copy/reasoning packets that do not require tools, but must stay out of tool-heavy builder or agent-loop work.

### Routing Hierarchy
1. **Free** (17 lanes) — zero cost, limited quality/speed
2. **Subscription** (4 lanes) — zero marginal cost within caps
3. **Paid** (4+ potential) — per-token or monthly, highest quality

### Hardware Constraint
M5 16GB = max 2 large Ollama models simultaneously. The planner checks current load before routing to local workers.

## Current State (2026-06-08)

- **25 lanes** registered (4 subscription, 9 free cloud, 8 local, 4 potential)
- **35 capabilities** mapped across 8 categories
- **18 gaps** tracked — the top blockers are:
  - No standalone Anthropic API key (subscription-only, weekly cap)
  - Codex credits exhausted (resets June 10)
  - No paid worker subscription (MiniMax $20/mo recommended)
  - Several free-cloud services not yet integrated
- **$200+** in available sign-up credits identified across free-tier services
- **Codex token leak** resolved — Fritz closed the app manually, cap resets June 10

## Current State (2026-07-23 addendum)

- **Site Studio callable modular baseline is live** — `site-studio/runtime-vnext/SITE-STUDIO-CALLABLE-CONTRACT-2026-07-23.md` and `SITE-STUDIO-RUN-TO-COMPLETION-BRIEF-2026-07-23.md` now freeze the external contract and milestone truth.
- **Live proof-backed runtime available** — localhost Studio is serving on `http://127.0.0.1:3334/` with health checks returning 200 and runtime-vnext rebuild proof artifacts written to disk.
- **Capability improvement** — Shay can now route build work toward a named callable Site Studio contract instead of treating the whole studio as one implicit `server.js` behavior blob.
- **Honest limitation remains** — backend decomposition is partial. `site-studio/server.js` is still large, so the capability state is “callable modular baseline” rather than “fully decomposed site factory.”

## How It Grows

The capability engine is a living system:

1. **Every dispatch feeds back.** After a task completes, the dispatcher records whether the selected lane succeeded or failed. Failures either update gap priority or add new gaps.

2. **New lanes are cataloged.** When Fritz adds a new subscription, installs a new local model, or discovers a new free service, it gets a registry entry with capabilities, constraints, and quality ratings.

3. **Gaps get resolved.** When a gap is closed (credential vaulted, integration wired, model installed), the gap tracker marks it resolved and the capability matrix gains a new lane-to-capability mapping.

4. **The matrix deepens.** As lanes are exercised, quality/speed/context ratings get refined from initial estimates to measured benchmarks.

5. **The planner adapts.** Dispatch plans incorporate learned preferences (which lanes are most reliable for which capability), fallback chains based on real failure rates, and current load/cap status.

## Next Steps

- [ ] Wire the dispatch-planner skill into Shay's gateway as a pre-flight check
- [ ] Add benchmark data from real dispatches to refine capability ratings
- [ ] Integrate MiniMax ($20/mo) as a paid worker lane
- [ ] Close the top 5 blocking gaps
- [ ] Build a dashboard view of the capability engine state
- [ ] Automate gap resolution tracking (when a credential is vaulted, auto-close the gap)

---

*This note is a living document. Update it whenever the capability engine gains lanes, closes gaps, or learns from dispatches.*