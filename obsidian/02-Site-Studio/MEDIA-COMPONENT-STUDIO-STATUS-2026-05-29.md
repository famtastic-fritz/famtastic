---
title: Media Studio + Component Studio — Real Status
date: 2026-05-29
tags:
- studio
- media-studio
- component-studio
- needs-convo
- phase2
status: needs-future-convo
bucket: 02-Site-Studio
---

# Media Studio + Component Studio — Real Status 2026-05-29

> Tagged: NEEDS FUTURE CONVO — do not assign tasks without reviewing this first

---

## Media Studio

### Spec 005 — Wrapper Foundation
Status: NEARLY COMPLETE (one task open)
- All implementation tasks checked off
- Dry-run proof job ran clean (flux-dev model, zero spend)
- Fallback chain wired: flux-dev → flux-kontext-max → gpt4o
- OPEN: docs/state closeout never done
- OPEN: Wave 6 never launched (was blocked on closeout)

### Spec 008 — Phase 2A Logo/Brand Lab
Status: STARTED, FROZEN mid-run
- Fritz authorized $50 budget, actual spend $0.19
- 5 logo candidates generated (MuAPI, flux-kontext-pro + gpt4o)
- Kept outputs:
  - 2376ad623... — FAMtastic wordmark (gpt4o, strong direction)
  - dae0c3a8b... — flat/vector production direction (best for vectorization)
  - b1d69568b... — dark-screen premium (app/splash direction)
  - 1d101bb39... — icon/app mark (needs iteration, too detailed at small size)
  - 8c97a91fe... — FAM energy reference (rejected as wordmark)
- Gallery HTML exists at media-studio/logo-lab/runs/2026-05-21-logo-lab-gallery.html
- OPEN: vectorization not done
- OPEN: lockups not done
- OPEN: DESIGN.md not created
- OPEN: brand-kit promotion not done
- OPEN: Phase 2A frozen since 2026-05-21

### Where Media Studio Lives
- Code: ~/famtastic/site-studio/ (integrated, not separate repo)
- media-studio/ folder: ~/famtastic/media-studio/
- Logo lab runs: ~/famtastic/media-studio/logo-lab/runs/

---

## Component Studio

### Spec 006 — Wrapper Foundation  
Status: COMPLETE (one integration task deferred to Wave 7)
- All core tasks done
- Catalog loader, search, reuse-context builder all built
- Data Center integration done
- Mission Control visibility done
- CLI search command works
- 6 components indexed in library.json
- KNOWN GAP: 9 manifests on disk, 6 in library.json — 3 unindexed
  - animated-counter
  - parallax-section  
  - photo-slideshow
- OPEN: Wire reuse context into Site Studio build flow (Wave 7, never happened)

### Full Spec (component-studio-full-spec.md)
Three jobs:
1. REGISTRY — catalog every component with provenance + preview + usage metrics
2. REUSE ENGINE — intercept Site Studio prompts, serve existing before generating new
3. MARKETPLACE — sell components as premium add-ons

Phase breakdown per spec:
- Phase 0 (Hardening): index 3 missing components, fix library.json, add quality gates
- Phase 1 (Visual UI): browser UI to see/preview/copy all components  
- Phase 2 (Reuse Loop): auto-inject into Site Studio build flow
- Phase 3 (Revenue): external access, pricing, payment, analytics

Current reality: substrate only. No UI, no reuse loop wired, no marketplace.

### Where Component Studio Lives
- Code: ~/famtastic/lib/famtastic/component-studio/index.js
- CLI: ~/famtastic/scripts/component-studio-search.js
- Registry: ~/famtastic/components/library.json (6 indexed)
- Full spec: ~/.shay/plans/component-studio-full-spec.md

---

## What Needs A Real Conversation

Both studios are real, have specs, have working substrates. Neither is in active development.

Before touching either:
1. Decide: do these stay in the monorepo or become separate repos? (Phase 2 Stream C question)
2. Decide: does Media Studio Phase 2A continue with MuAPI or switch to Sana/FAL? (FAL key now live)
3. Component Studio Wave 7 wire-up — is this still the priority or does the full-spec Phase 1 UI come first?
4. Logo lab — do we finish the FAMtastic brand before building client sites or ship client sites first?

Do not assign tasks until this convo happens.
