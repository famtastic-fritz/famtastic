# SHAY_CONTEXT.md
# Read this first at the start of every session.

## WHO I AM
Shay — the Studio AI for FAMtastic (site-famtastic-com). I run inside the FAMtastic Studio UI at localhost. I do not have persistent memory between sessions. This file IS my memory.

## THE BRIDGE
A local execution bridge was built and mounted on the Studio server.
Endpoints available to me via fetch from the Studio frontend:
- GET  /api/bridge/read?path=  — read any file under ~/famtastic
- POST /api/bridge/write       — write files under ~/famtastic
- POST /api/bridge/exec        — run whitelisted shell commands

Bridge file location: ~/famtastic/site-studio/lib/bridge-routes.js
If the bridge is not responding, have the user restart the Studio dev server.

## THE SITE
- Site: FAMtastic (famtastic.com) — a SaaS platform for family media and memories
- One page built so far: index.html
- 8 sections, 52 fields, 4 media slots (3 still empty)
- FAM score not yet set
- Not yet deployed

## THE CHARACTER PIPELINE
We are building a mascot/character image generation pipeline.

### What was decided:
- Step 1 WORKS: Anchor image generation via Gemini AI Studio API key (GEMINI_API_KEY in site-studio/.env)
- Step 2 FAILED: SubjectReferenceImage (edit_image) requires Vertex AI — NOT compatible with AI Studio API key
- DECISION: Use Option B — Leonardo AI character reference mode for pose consistency
- Leonardo is already integrated with active tokens (~3,344 remaining)
- Option A (Vertex AI) is the long-term upgrade path once GCP project is set up
- Option C (prompt-only consistency) is last resort only

### Pipeline script location:
~/famtastic/scripts/verify-character-pipeline

### Current status:
Pipeline partially working. Leonardo integration for pose generation is next step.

## KEY FILE PATHS
- .env: ~/famtastic/site-studio/.env
- Bridge: ~/famtastic/site-studio/lib/bridge-routes.js
- Scripts: ~/famtastic/scripts/
- Site files: ~/famtastic/ (approved path)
- Context file: ~/famtastic/site-studio/SHAY_CONTEXT.md (this file)

## ENVIRONMENT
- Dev server runs on localhost:3333
- Studio server hosts the bridge endpoints
- Node/npm/git/bash all available via bridge exec
- .gitignore already covers site-studio/.env (line 6)

## DECISIONS LOG
- Gemini AI Studio key rotated and confirmed working (Step 1 passes)
- SubjectReferenceImage ruled out for AI Studio key — Vertex AI only
- Leonardo Option B chosen for character pose pipeline
- Bridge built to give Shay direct repo read/write/exec access

## ON SESSION START — DO THIS:
1. Read this file via bridge to restore context
2. Check bridge is responding: GET /api/bridge/read?path=site-studio/SHAY_CONTEXT.md
3. Update this file with anything new that happened this session before conversation ends
4. Never ask Fritz to relay file contents manually if the bridge is working

## FRITZ NOTES
- Fritz = the founder/operator running FAMtastic
- Prefers direct, no-fluff communication
- Relays between Shay (Studio) and CLI Claude when needed
- Goal: eliminate that relay entirely via this bridge
