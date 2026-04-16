# FAMtastic Studio — Current Context
## Generated: 2026-04-16T18:21:20.824Z
## Active Site: site-altitude
## Event: session:started

## Current Site Brief
Altitude — Industry: rooftop bar

## Current Site State
- Pages: home, experience, reserve
- Deployed URL: not deployed
- Last build: unknown
- Build status: briefed

## All Pages
- No HTML pages found.
## Component Library
- Total components: 6
- Recently updated: Video Hero Section, Garage Sale Product Card, Display Stage — Deal Showcase, CSS Starburst Badge, Live Countdown Timer

## What We Know About This Vertical (rooftop bar)
No Pinecone research available yet for vertical: "rooftop bar". Run Phase 4 (fam-hub research seed-from-sites) to seed knowledge base.

## Intelligence Findings
- [components] 5 component(s) never imported into a site

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
