# FAMtastic Session Snapshot — 2026-05-29 (Late Session)
*Captured after full audit, file processing, and system cleanup*

---

## WHAT WAS DONE THIS SESSION

### Shay Runtime — Closed
- FAL_KEY live and loaded
- API_SERVER_KEY set (8642 now authenticated)
- GEMINI_API_KEY confirmed set
- ~/.hermes/ deleted (2GB freed)
- Obsidian MCP wired (mcp-obsidian live)
- Cognee MCP wired in config (needs Shay restart to activate)
- Plans folder: 27 files → 11 live + 16 archived
- famtastic-capture skill built and deployed
- Vault filed: 18 documents organized into 6 buckets

### Vault Structure (~/famtastic/obsidian/)
- 00-Inbox/ — SNAPSHOT files
- 00-FAMtastic-Core/ — build principles, cowork briefing, complete prompt
- 01-Shay/ — platform intel, agent OS design, skill library architecture
- 02-Site-Studio/ — V1 + revised build plans
- 03-MBSH/ — 6 MBSH docs (planning, vibe, reels, Harry char sheet, execution)
- 04-Research-Revenue/ — research digests
- 05-Captures/ — processed captures with frontmatter
- 05-Captures/archive/ — historical docs

### MBSH — Closed (partial)
- Swarm work committed (bb6b54f, 16 files)
- Obsidian review note created
- Monday 10am reminder cron set
- STILL OPEN: hero images (FAL ready), Harry assets, API_BASE_URL prod fix, Fritz visual review, deploy

---

## THE REAL PLAN (corrected from earlier)

### Phase 1 — CURRENT (stabilize + wire everything)
- Runtime: operational, not fully stabilized
- Desk: fathah Electron fork is live starting point
- Goal: get everything fully wired, confirmed working, no holes

### Phase 2 — THREE PARALLEL STREAMS
- Stream A: Shay B true rebuild — own runtime, own repo, NOT Hermes in costume. Clean extraction. FAMtastic moat in unique layer. Decision gate: if diff > 5k lines → Letta rewrite viable.
- Stream B: New Shay Desktop rewrite — real native app, not patched Electron. Design foundation = the Hermes Agent OS design doc Fritz built in web session (3-column layout, color system, glass buttons, agent cards).
- Stream C: Studio refactor — Site, Media, Component become separate repos with integrations, not one monolith.

### Phase 3 — Convergence
- Desk (Stream B) stops pointing at current Shay, points at Shay B (Stream A)
- One config swap. Clean.

---

## SHAY DESKTOP — CORRECTED UNDERSTANDING

### Two products on disk:
1. Swift app (~/famtastic/shay-desktop/) v0.8.1 — SSH-native, NO chat, operator panels only. Philosophy: no gateway, no daemon, read real remote state.
2. Electron app (~/famtastic/shay-desktop-electron/) v0.4.3 — fathah community fork. Has chat, sessions, profiles, skills, kanban. THIS is what's running now. THIS is Phase 1 starting point.

### Phase 1 Desk scope (5 items, from fathah base):
1. Chat polish
2. CLI bridge (biggest gap)
3. Log watcher
4. Notification queue
5. Cost panel

### Stream B Design Foundation (from Fritz's web session — NOT yet filed to vault):
- Three-column OS layout: left nav (Command Center, Agents, Workflows, Data Hub, Integrations, Analytics, Marketplace, Settings), center orchestration workspace, right intelligence panel
- Mode pills at top: Chat / Workflows / Terminal (stolen from Codex)
- Right rail: live /goal checklist + environment state
- Left sidebar: session queue with ⌘1-5 shortcuts
- Agent cards with live status dots + glass button states
- Pop-out terminal (node-pty + xterm.js, detaches to BrowserWindow)
- Computer-use live thumbnail
- MCP server manager

---

## WHAT'S STILL MISSING / NOT YET FILED

### CRITICAL — needs to be filed to vault:
1. The Hermes Agent OS design spec doc (color system, component structure, UX principles) — Fritz built this in web session, never filed
2. The Codex desktop UI research session (exact patterns to steal) — never filed
3. The markup + design files Fritz had built — never filed
4. The separate Desk redesign session Fritz mentioned — not yet received

### ACTIVE TASKS STILL OPEN:
1. Competitor analysis re-run — real web research, min 10 citations (STARTED as background task this session, needs completion)
2. Home services market research — same, real citations needed
3. Shay restart for Cognee to activate (Fritz needs to run launchctl command)
4. Master-plan update with correct Phase 2 (3 streams, not 2) + Phase 3 convergence spec
5. Stream B design spec write-up (formal doc)
6. Studio refactor planning (Stream C)

---

## KNOWLEDGE MANAGEMENT — OPEN DESIGN QUESTION

Fritz identified the real problem: ideas, research, convos, skills, and tasks all live in different silos with no connective tissue. The system needs:

### The pipeline Fritz described:
IDEA (captured convo) → RESEARCH (citations, validation) → ADVERSARIAL REVIEW (Shay + Codex loop, loop-breaking rule) → PLAN → /goal + /bg → ORCHESTRATED EXECUTION (SDD style, cost-optimized)

### Visual display options needed:
- Desk panel (native, always visible)
- CLI (quick status)
- Obsidian (rich view, graph)
- Google tools (NotebookLM, possible anti-gravity integration — Fritz has Google API)

### Status indicators needed:
- Checkboxes/status per plan item (idea → research → reviewed → tasked → in-flight → done)
- Logic to group related plans across sessions
- Dedup + merge detection
- Blocker identification
- Priority history (why we chose what we chose)

### Research tagging:
- Every research note tagged to its topic bucket
- Research has freshness date + confidence level
- Stale research triggers re-run, not silent decay

### Tools to research (Fritz called this out — not yet done):
- Google NotebookLM for research synthesis
- Anti-gravity (Google)
- Existing solutions for skill/plugin tracking at scale (157 skills)

---

## FOUR TOPIC BUCKETS (canonical)

1. SHAY (CLI + Desk + Plugins)
   - 1A: Runtime (operational, 3 holes remain)
   - 1B: Desktop (fathah live, Phase 1 not started)
   - 1C: Plugins/MCP (Obsidian wired, Cognee pending restart)

2. SITE STUDIO
   - 3 missing lib files blocking launchd
   - Phase 0 half done, frozen
   - Stream C (Phase 2): full refactor to 3 separate repos

3. MBSH REUNION
   - Committed, needs hero images + deploy

4. RESEARCH + REVENUE (morning session)
   - Payment path, GoDaddy inventory, client pipeline
   - Competitor analysis (in progress)
   - Home services market (in progress)

---

*This snapshot supersedes SNAPSHOT-2026-05-29.md. Both kept for record.*
