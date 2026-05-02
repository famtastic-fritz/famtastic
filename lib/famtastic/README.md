# lib/famtastic/ — Ecosystem services

Shared services that every FAMtastic Studio (Site, Media, Brand, Component, Think Tank, future) uses. **Per the Separation-Ready Architecture rule (.wolf/cerebrum.md, 2026-04-24)**: nothing in this directory may depend on Site Studio internals. Studios import from here; they don't reach into each other.

## Layout

```
lib/famtastic/
├── capture/         # Knowledge capture flywheel (Layer 4)
├── ecosystem/       # Studio registration + cross-Studio routing
├── research/        # Research service (proxies to site-studio/lib/research-router.js for now)
├── memory/          # 3-layer memory (episodic / semantic / procedural)
├── learning/        # Promotion engine + outcome scoring
├── components/      # Pluggable component library (Studios contribute, all consume)
├── recipes/         # Codified build patterns Shay pulls from
└── iteration-report/  # Per-iteration HTML report generator
```

## Why this matters

**The compounding rule:** Site #1,000 must benefit from everything learned building sites #1–#999. That only works if learnings are stored in shared services every Studio reads from, not buried in any one Studio's local code.

**The ecosystem framing:** Each Studio is its own product (Media Studio shipped as its own thing, then Brand Studio, etc.). They interact via standardized contracts. The shared services in `lib/famtastic/` ARE those contracts.

## Adding a new Studio

1. Register at boot:
   ```js
   const ecosystem = require('lib/famtastic/ecosystem');
   ecosystem.registerStudio({
     id: 'my_studio',
     name: 'My Studio',
     capabilities: [...],
     tools: [...],
     routes: { handoff_in: 'workshop', handoff_out: ['site_studio.workshop'] }
   });
   ```
2. Register page-context providers via the browser-side ShayContextRegistry on each page mount
3. Contribute Workshop tools via `ShayWorkshop.registerTool(...)` if the Studio adds tooling
4. Use the shared services for research / memory / learning / capture — don't roll your own

## Status of each module

| Module | Status | Notes |
|---|---|---|
| `capture/` | MVP shipped | scan, scaffold, dry-run, promote, extract (LLM-assisted), patterns. CLI works. Route mountable. |
| `ecosystem/` | Scaffold | Registry + cross-Studio routing. 4 Studios pre-registered (Site live, Media/Brand/Think Tank seed). |
| `research/` | Proxy | Wraps existing site-studio/lib/research-router.js. Iter 4+ relocates impl here. |
| `memory/` | Proxy | Wraps existing site-studio/lib/memory.js. Iter 4+ Mem0+Kuzu integration. |
| `learning/` | Scaffold | Promotion log + suggestion-logger proxy. Iter 4+ full promotion engine. |
| `components/` | Scaffold | Pluggable registry. 2-3 starter components. |
| `recipes/` | Scaffold | Aspirational. Iter 5+ populates with proven recipes. |
| `iteration-report/` | Live | Generates per-iteration HTML report. Used at end of every Cowork session. |
