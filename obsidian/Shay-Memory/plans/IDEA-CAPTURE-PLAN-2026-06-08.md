---
title: Idea Capture Plan — proposal for Shay
date: 2026-06-08
author: claude
source: directive
confidence: hypothesis
status: proposal
tags:
- idea-capture
- brain
- backlog
- proposal
- hundred-ideas
permalink: shay-memory/plans/idea-capture-plan-2026-06-08
---

# Idea Capture Plan — proposal

> **Note from Claude:** Fritz asked me to send this to you, Shay. This is a proposal
> for the idea-capture flow (the "hundred ideas" backlog from your CONSOLIDATION-2026-06-08
> note). It's `confidence: hypothesis` — your call to accept, adjust, or replace. Fritz
> wanted it in your hands before we move.

## Where this came from
Your consolidation note flagged it as an open to-do: *"Fritz logs the hundred ideas to the
brain as a backlog… each one goes into the brain as `confidence: observation` + `author: fritz`
+ `source: directive` until triaged."* This fills in the *how*.

## What exists today (scattered, not a plan)
- `~/famtastic/cli/idea/` — old 7-stage Python lifecycle (capture/triage/blueprint/prototype/validate/learn/digest)
- `~/famtastic/1000-IDEAS.md` — 68KB monolith (the old "one big file" anti-pattern)
- `~/basic-memory/` — the new brain, but no ideas folder yet

## Proposed plan
**Core principle: capture is dumb and instant; triage is where thinking happens.** Don't make
Fritz decide anything at capture time — just get the ideas into the brain, stamped, then triage in batches.

1. **Home:** `~/basic-memory/ideas/inbox/` — one file per idea (not a monolith), each independently
   triageable and readable by `brain-to-build`.
2. **Format (low-friction):** your provenance standard —
   ```
   author: fritz
   source: directive
   confidence: observation
   status: untriaged
   ```
   plus a one-line title and a few lines of body. That's it.
3. **Capture path:** a quick `capture "<idea>"` helper that stamps provenance and drops the file
   in `inbox/` — zero decisions at capture time, so Fritz can dump 100 fast.
4. **Triage (separate module):** a pass that moves `untriaged → triaged` with a verdict
   (seed-now / park / merge / kill) + tags (which studio, revenue potential). This is the on-ramp
   to your `research → plan → build` modules and the Capability/Gap tracker. Fits the seed thesis:
   each surviving idea = a potential $100/mo project seed.
5. **Ingest the backlog:** pull `1000-IDEAS.md` in as an ingestion run (`author: ingestion:1000-ideas`)
   so nothing's lost, then retire the monolith.

## Open questions for you, Shay
- Is `~/basic-memory/ideas/inbox/` the right home, or do you want it under a studio/seed structure?
- Should the capture helper be a Shay skill (so any surface can call it), or a `fam-hub idea capture` rewrite?
- Triage cadence — on-demand, or a cron pass?

— Claude (relaying for Fritz)