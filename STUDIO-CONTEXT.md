# FAMtastic Studio — Current Context
## Generated: 2026-05-01T21:11:08.316Z
## Active Site: site-mbsh96reunion
## Event: session:started

## Current Site Brief
MBSH Class of '96 30th Reunion — Industry: 30th reunion website

## Current Site State
- Pages: home, about, schedule, rsvp, gallery, contact
- Deployed URL: not deployed
- Last build: undefined
- Build status: built

## All Pages
### _template.html
- H1: "(no H1)"
- Sections: 3 (data-section-id)
- Images: 2 slots
- Last edited: 2026-04-30 19:50

### about.html
- H1: "(no H1)"
- Sections: 3 (data-section-id)
- Images: 2 slots
- Last edited: 2026-04-30 19:53

### contact.html
- H1: "Let's Connect, Class of '96"
- Sections: 4 (data-section-id)
- Images: 1 slots
- Last edited: 2026-04-30 19:53

### index.html (active)
- H1: "(no H1)"
- Sections: 6 (data-section-id)
- Images: 2 slots
- Last edited: 2026-04-30 19:53

### rsvp.html
- H1: "(no H1)"
- Sections: 4 (data-section-id)
- Images: 1 slots
- Last edited: 2026-04-30 19:53

### schedule.html
- H1: "(no H1)"
- Sections: 4 (data-section-id)
- Images: 1 slots
- Last edited: 2026-04-30 19:53

## Component Library
- Total components: 6
- Recently updated: Video Hero Section, Garage Sale Product Card, Display Stage — Deal Showcase, CSS Starburst Badge, Live Countdown Timer

## What We Know About This Vertical (30th reunion website)
No Pinecone research available yet for vertical: "30th reunion website". Run Phase 4 (fam-hub research seed-from-sites) to seed knowledge base.

## Intelligence Findings
No promoted findings yet.

## Available Tools (This Session)
- Claude Code CLI: active (subscription)
- Gemini CLI: active (GEMINI_API_KEY set)
- Codex CLI: active
- Pinecone: connected (famtastic-intelligence)

## Standing Rules
- Always use TAG (mutable runtime variable) not process.env.SITE_TAG (startup-only env var)
- Register static Express routes BEFORE parameterized routes (e.g. /api/research/verticals before /api/research/:filename)
- library.json is { version, components[], last_updated } — always extract .components, never use root array
- Default classifier intent is content_update (not layout_update) — surgical edits bypass plan gate
- Do NOT modify lib/fam-motion.js, lib/fam-shapes.css, lib/character-branding.js
- Every HTML write path must go through runPostProcessing — no exceptions including fallback paths
