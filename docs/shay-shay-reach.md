# Shay-Shay Capability Reach Map
## Generated: 2026-04-17
## Phase 0 Audit — What Shay-Shay Can Drive Directly

---

## CAPABILITY MAP

### can_do_via_api (REST — no browser required)

| Endpoint | What it does |
|----------|-------------|
| `POST /api/autonomous-build` | **NEW** Full site creation + brief + build trigger |
| `POST /api/new-site` | Create site with client_brief pre-loaded |
| `POST /api/switch-site` | Switch active site |
| `GET /api/build-status/:tag` | Poll build completion |
| `GET /api/studio-state` | Full spec/state snapshot |
| `GET /api/verify` | Run FAMtastic score check |
| `GET /api/pages` | List pages for active site |
| `GET /api/sites` | List all sites |
| `GET /api/capability-manifest` | Live API health check |
| `PUT /api/brief` | Update design_brief fields |
| `PUT /api/decisions` | CRUD design decisions |
| `GET /api/versions` | List page versions |
| `POST /api/rollback` | Rollback to previous version |
| `POST /api/content-field` | Surgical field edit (no AI) |
| `GET /api/content-fields/:page` | List data-field-id elements |
| `POST /api/sync-content-fields` | Rebuild spec.content from HTML |
| `GET /api/stock-search` | Search stock photos |
| `POST /api/stock-photo` | Download + place stock photo |
| `POST /api/rescan` | Re-scan slot attributes |
| `GET /api/intel/findings` | Intelligence findings |
| `GET /api/intel/report` | Full intelligence report |
| `GET /api/deploy-info` | Staging/production URLs |
| `POST /api/shay-shay` | Shay-Shay orchestrator (self) |
| `POST /api/shay-shay/gap` | Log capability gap |
| `POST /api/shay-shay/outcome` | Score suggestion outcome |
| `POST /api/restart` | Restart Studio server |
| `GET /api/mutations` | View all field edits |
| `GET /api/build-metrics` | Build performance stats |

### can_do_via_websocket (requires active browser WS connection — Fritz must be watching)

| WS Message | What it does |
|-----------|-------------|
| `{ type: 'chat', content }` | Send user message to build pipeline |
| `{ type: 'execute-plan', planId }` | Approve a plan card |
| `{ type: 'approve-brief' }` | Approve the design brief |
| `{ type: 'set-brain', brain }` | Switch active brain |
| `{ type: 'set-page', page }` | Switch active page |

### autonomous_pipeline_NEW (no browser required)

Via `POST /api/autonomous-build`:
1. Pattern-based brief extraction (no Claude needed)
2. Claude brief extraction if API available
3. Site creation with synthesized design_brief
4. Direct `handleChatMessage()` call with mock WS
5. Build progress mirrored to all connected browsers
6. Polling via `GET /api/build-status/:tag`

### requires_ui (browser interaction required)

| Capability | Why |
|-----------|-----|
| Plan card approval (without autonomousBuildActive) | UI renders plan card, user must click |
| Client interview (6-step) | Sequential API calls possible but awkward |
| Image upload | File upload via multipart form |
| Component export | Requires active session context |
| Deploy to Netlify | `POST /api/build/cancel` is REST, but deploy flow needs WS monitoring |

### not_wired (capability exists in backend but not exposed to Shay-Shay)

| Capability | Endpoint | What's needed |
|-----------|---------|---------------|
| Lighthouse scoring | Not implemented in Studio | Needs integration |
| Google Imagen 4 | `POST /api/generate-image-prompt` | Gemini key required |
| Stock photo fill | `POST /api/stock-photo` | Stock API keys needed |
| Restyle | `/api/restyle` doesn't exist | Classifier intent only |
| Session summary | Internal only | No REST endpoint |

---

## AUTONOMOUS BUILD PIPELINE (Phase 1)

```
POST /api/autonomous-build { message, context }
         │
         ▼
extractBriefFromMessage(message)
  → Claude (if API key) or pattern matching
  → { business_name, tag, revenue_model, pages, ... }
         │
         ▼
POST /api/new-site { tag, client_brief } → site created
         │
         ▼
synthesize design_brief from client_brief → state:'briefed'
         │
         ▼
TAG = new site, invalidateSpecCache()
         │
         ▼
autonomousBuildActive = true → bypasses plan gate
         │
         ▼
handleChatMessage(mockWs, 'Rebuild the site', 'build', spec)
  → parallelBuild() → spawnClaude() subprocess builds pages
  → progress events mirrored to all browser WS clients
         │
         ▼
GET /api/build-status/:tag → poll for completion
         │
         ▼
GET /api/verify → FAMtastic score
```

