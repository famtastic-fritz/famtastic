# FAMtastic Studio — Current Context
## Generated: 2026-04-10T16:23:48.184Z
## Active Site: site-drop-the-beat
## Event: build:completed

## Current Site Brief
Drop The Beat Entertainment — Industry: mobile DJ entertainment

## Current Site State
- Pages: home, services, contact
- Deployed URL: not deployed
- Last build: unknown
- Build status: briefed

## All Pages
### _template.html
- H1: "(no H1)"
- Sections: 5 (data-section-id)
- Images: 0 slots
- Last edited: 2026-04-10 16:18

### contact.html
- H1: "Get In Touch"
- Sections: 13 (data-section-id)
- Images: 0 slots
- Last edited: 2026-04-10 16:23

### index.html (active)
- H1: "Drop The Beat. Transform Your Event."
- Sections: 26 (data-section-id)
- Images: 1 slots
- Last edited: 2026-04-10 16:23

### services.html
- H1: "Our Premium DJ Services"
- Sections: 21 (data-section-id)
- Images: 3 slots
- Last edited: 2026-04-10 16:23

## Component Library
- Total components: 6
- Recently updated: Video Hero Section, Garage Sale Product Card, Display Stage — Deal Showcase, CSS Starburst Badge, Live Countdown Timer

## What We Know About This Vertical (mobile DJ entertainment)
No Pinecone research available yet for vertical: "mobile DJ entertainment". Run Phase 4 (fam-hub research seed-from-sites) to seed knowledge base.

## Intelligence Findings
No promoted findings yet.

## Available Tools (This Session)
- Claude Code CLI: active (subscription)
- Gemini CLI: active (GEMINI_API_KEY set)
- Codex CLI: active
- Pinecone: not configured (PINECONE_API_KEY not set — Phase 4 required)

## Standing Rules
- Always use TAG (mutable runtime variable) not process.env.SITE_TAG (startup-only env var)
- Register static Express routes BEFORE parameterized routes (e.g. /api/research/verticals before /api/research/:filename)
- library.json is { version, components[], last_updated } — always extract .components, never use root array
- Default classifier intent is content_update (not layout_update) — surgical edits bypass plan gate
- Do NOT modify lib/fam-motion.js, lib/fam-shapes.css, lib/character-branding.js
- Every HTML write path must go through runPostProcessing — no exceptions including fallback paths
