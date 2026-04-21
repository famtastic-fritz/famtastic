# FAMtastic Studio — Current Context
## Generated: 2026-04-21T15:27:28.400Z
## Active Site: site-famtastic-com
## Event: session:started

## Current Site Brief
FAMtastic — Industry: saas_platform

## Current Site State
- Pages: index.html
- Deployed URL: not deployed
- Last build: unknown
- Build status: draft

## Current Studio Focus
- Media Studio is mid-redesign toward a prompt-first, row-based mini-app model inspired by Leonardo.ai but with FAMtastic styling.
- Active Media nav contract: Create, Image, Motion, Library, Brand, Queue / History, Providers.
- Shay Lite is now a persistent companion layer across Media Studio states; Lite identities remain mutually exclusive.
- Current known gap: direct video generation is not yet wired as a backend Media endpoint.

## All Pages
### index.html (active)
- H1: "(no H1)"
- Sections: 7 (data-section-id)
- Images: 4 slots
- Last edited: 2026-04-21 10:45

## Component Library
- Total components: 6
- Recently updated: Video Hero Section, Garage Sale Product Card, Display Stage — Deal Showcase, CSS Starburst Badge, Live Countdown Timer

## What We Know About This Vertical (saas_platform)
No Pinecone research available yet for vertical: "saas_platform". Run Phase 4 (fam-hub research seed-from-sites) to seed knowledge base.

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
- Media Studio should keep Shay reachable from every major state; do not bury Lite or require a separate workspace hop for core media help
