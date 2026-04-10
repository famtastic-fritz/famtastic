# FAMtastic Studio — Current Context
## Generated: 2026-04-10T13:19:52.618Z
## Active Site: site-auntie-gale-garage-sales
## Event: session:started

## Current Site Brief
Auntie Gale's Garage Sales — Industry: garage sales & estate sales

## Current Site State
- Pages: home, shop, about, contact
- Deployed URL: https://effortless-tiramisu-ed9345.netlify.app
- Last build: unknown
- Build status: prototype

## All Pages
### about.html
- H1: "Meet Auntie Gale"
- Sections: 7 (data-section-id)
- Images: 5 slots
- Last edited: 2026-04-10 01:25

### contact.html
- H1: "Get In Touch"
- Sections: 5 (data-section-id)
- Images: 1 slots
- Last edited: 2026-04-10 01:25

### deals.html
- H1: "THIS WEEKEND'S DEALS"
- Sections: 4 (data-section-id)
- Images: 2 slots
- Last edited: 2026-04-10 01:25

### index.html (active)
- H1: "(no H1)"
- Sections: 9 (data-section-id)
- Images: 8 slots
- Last edited: 2026-04-10 01:25

### shop.html
- H1: "All Items"
- Sections: 5 (data-section-id)
- Images: 3 slots
- Last edited: 2026-04-10 01:25

## Component Library
- Total components: 6
- Recently updated: Video Hero Section, Garage Sale Product Card, Display Stage — Deal Showcase, CSS Starburst Badge, Live Countdown Timer

## What We Know About This Vertical (garage sales & estate sales)
No Pinecone research available yet for vertical: "garage sales & estate sales". Run Phase 4 (fam-hub research seed-from-sites) to seed knowledge base.

## Intelligence Findings
- [agents] Codex failing 100% of calls

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
