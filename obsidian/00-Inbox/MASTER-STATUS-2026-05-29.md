# FAMtastic Master Status Board
**Last Updated:** 2026-05-29 — Late Night Session
**Status Key:** ✅ Done | 🔄 In Progress | ⏸ Parked/Needs Convo | 🔥 Blocked | ⏰ Scheduled

---

## 1. SHAY (CLI + DESK + PLUGINS)

### 1A — Runtime / CLI
| Item | Status | Notes |
|------|--------|-------|
| FAL_KEY | ✅ Done | Live in .env |
| API_SERVER_KEY | ✅ Done | Set but disabled — Desk 401 fix |
| GEMINI_API_KEY | ✅ Done | Confirmed in .env |
| .hermes/ cleanup | ✅ Done | 2GB freed |
| Obsidian MCP | ✅ Done | Wired, needs restart |
| Cognee MCP | ✅ Done | Wired, needs ONE restart to activate |
| computer_use driver | ⏸ Low priority | Unverified |
| homeassistant token | ⏸ Low priority | Unverified |
| Thinking bug fix | ✅ Done | Confirmed in anthropic_adapter.py |
| Retry-once logic | ✅ Done | Confirmed in overnight_ops.py |
| GEMINI key rotation | 🔥 Blocked | Needs Fritz to revoke old key in Google AI Studio |

### 1B — Shay Desktop (Stream B — Phase 2)
| Item | Status | Notes |
|------|--------|-------|
| Starting point | ✅ Decided | Electron/fathah fork — NOT Swift |
| Design system | ✅ Captured | HERMES-AGENT-OS-DESIGN.md filed to vault |
| Codex UI patterns | ✅ Captured | Mode pills, right rail checklist, session queue |
| Phase 1 scope | ⏸ Tentative | Lock at 10am — 5 panels only |
| Second design capture | ⏰ 10am | Fritz to paste from Claude Web session |
| Stream B formal spec | ⏰ 10am | Blocked on second capture |
| Obsidian visual brain in Desk | 🔄 Tasked | Wire Cognee graph view into Desk panel |
| HermesDesktop rebrand | 🔄 Phase 1 | 34 symbol references to rename |
| CLI bridge | 🔄 Phase 1 | Desk ↔ Shay runtime connection |
| Mode switching | 🔄 Phase 1 | Chat / Workflows / Terminal pills |
| Pop-out terminal | 🔄 Phase 1 | node-pty + xterm.js → BrowserWindow |
| Computer-use thumbnail | 🔄 Phase 2 | After Phase 1 proves out |
| MCP server manager | 🔄 Phase 1 | Biggest Codex-settings gap |

### 1C — Shay's Closet
| Item | Status | Notes |
|------|--------|-------|
| Concept defined | ✅ Done | See below — Fritz's personal AI wardrobe |
| Implemented | ⏸ Phase 2 | Display panel in Desk, managed via SOUL.md |

### 1D — Phase 2 / 3 Plan (THE REAL PLAN)
```
Phase 1 (NOW)     → Stabilize runtime + wire everything + Desk Phase 1 overhaul
Phase 2 (NEXT)    → Three parallel streams:
  Stream A        → Shay B — true rebuild, own runtime, NOT Hermes in costume
                    Decision gate: if audit diff > 5k lines → Letta rewrite viable
  Stream B        → New Shay Desktop — native Electron, real design system
  Stream C        → Studio refactor — Site/Media/Component as separate repos
Phase 3 (FUTURE)  → Convergence: Desk points at Shay B, one config swap
```

---

## 2. SITE STUDIO

> Studio scope has been reconciled. Only Site Studio core lives here.
> Media Studio and Component Studio are platform-level — they will become
> separate repos in Phase 2 Stream C. Not scoped yet. Tagged for future convo.

### 2A — Site Studio Core
| Item | Status | Notes |
|------|--------|-------|
| Chat-driven build pipeline | ✅ Done | Waves 1-7 complete |
| Brief extraction + tier system | ✅ Done | Working |
| Platform vault (Netlify/cPanel/Resend) | ✅ Done | Keys wired |
| famtastic.com deploy | 🔥 Blocked | Localhost only, not deployed |
| launchd boot | 🔥 Blocked | 3 lib files never committed to git |
| Phase 0 content data layer | 🔄 Half done | Frozen mid-phase |
| Strip panels moving to Desk | ⏸ Needs convo | Cost, logs, research, idea inbox → Desk |
| Phase 2 Visual Workflows | ⏸ Not started | Plan exists, frozen |
| Phase 2 Brand Systems | ⏸ Not started | Plan exists, frozen |

### 2B — Media Studio (Platform Level — Future Repo)
| Item | Status | Notes |
|------|--------|-------|
| Dry-run pipeline | ✅ Done | Spec 005 complete |
| Fallback chain | ✅ Done | flux-dev → flux-kontext → gpt4o |
| Logo Lab PoC | ✅ Done | $0.19 spent, 3 keepers identified |
| Vectorization + lockups | 🔥 Frozen | Since 2026-05-21 |
| Wave 6 launch | 🔥 Blocked | Docs closeout never happened |
| Sana engine test | ⏸ Needs convo | $5-10 Replicate test |
| Remotion assembly layer | ⏸ Future | After Sana validates |

### 2C — Component Studio (Platform Level — Future Repo)
| Item | Status | Notes |
|------|--------|-------|
| Spec 006 | ✅ Done | Complete |
| 6 components indexed | ✅ Done | In library.json |
| 3 components NOT indexed | 🔥 Gap | On disk, not in library |
| Wave 7 reuse wire | 🔥 Blocked | Never happened |
| Semantic search | ⏸ Not started | |

---

## 3. MBSH REUNION

| Item | Status | Notes |
|------|--------|-------|
| Swarm work committed | ✅ Done | bb6b54f — 16 files |
| Obsidian review note | ✅ Done | Filed to vault |
| Monday cron reminder | ✅ Done | Set |
| Hero images (7 pages) | 🔄 Ready | FAL key live, prompts in HERO-SPEC.md |
| Harry character assets | 🔥 Blocked | Placeholder only |
| API_BASE_URL prod config | 🔥 Blocked | Still null |
| Full Fritz visual review | ⏸ Needs session | Before deploy |
| Production deploy | 🔥 Blocked | Blocked on above 3 |

---

## 4. RESEARCH + REVENUE + KNOWLEDGE

### 4A — Revenue Sprint
| Item | Status | Notes |
|------|--------|-------|
| Payment path | 🔥 NOT DONE | Morning interview — Stripe/PayPal/GoDaddy |
| GoDaddy domain inventory | 🔥 NOT DONE | Morning interview |
| Client pipeline | 🔥 NOT DONE | $10k-15k/mo home services |
| Competitor analysis | 🔥 Needs redo | Zero citations — fake research |
| Home services market | 🔥 Needs redo | Zero citations — fake research |

### 4B — Knowledge Management System
| Item | Status | Notes |
|------|--------|-------|
| Current vault structure | ✅ Done | 6 buckets, 18+ docs |
| famtastic-capture skill | ✅ Done | Portable, works in any AI |
| Obsidian MCP read/write | ✅ Done | Wired |
| Cognee knowledge graph | ⏰ Pending restart | Wired, needs one bounce |
| Visual brain in Desk | 🔄 Tasked | Add Cognee graph panel to Desk |
| Knowledge pipeline design | ⏰ 10am research | idea→research→review→/goal |
| NotebookLM / AntiGravity research | ⏰ 10am cron | Running at 10am |
| Duplicate/merge logic | ⏸ Future | Groups related plans across sessions |
| Staleness detection | ⏸ Future | Flag plans with no movement |

### 4C — Pending Research
| Item | Status | Notes |
|------|--------|-------|
| Adobe usage audit | ⏸ Needs cron | 30 days → keep/cancel decision |
| Sana engine validation | ⏸ Needs budget | $5-10 Replicate test |
| adb-mcp UXP status | ⏸ Before Adobe cancel | Verify require('fs') fix |
| Imagen deprecation | 🔥 Jun 24 deadline | Migrate to gemini-2.5-flash-image |

---

## TONIGHT'S CRONS SET
- 9am — Full morning briefing (all 7 agenda items)
- 10am — Knowledge management research (NotebookLM, AntiGravity, graph viz)
- Monday 10am — MBSH review reminder

## ONE THING FRITZ MUST DO
```
launchctl stop ai.shay.gateway && sleep 3 && launchctl start ai.shay.gateway
```
This activates Cognee MCP. Everything else is set.
