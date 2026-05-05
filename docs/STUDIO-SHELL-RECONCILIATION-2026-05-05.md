# Studio Shell Reconciliation — 2026-05-05

**Status:** assessment only — no code changes proposed inside this doc.
**Author:** claude-code session 2026-05-05.
**Audience:** Fritz, plus any agent that needs to know the truth before touching either shell.

This document exists because today's Ops dashboard MVP was mounted into `index.html` while the canonical rules in `docs/STUDIO-UI-FOUNDATION.md` (locked 2026-05-04) say it should have lived elsewhere. That sent up the question: *which shell is real?* Answer below.

---

## 1. The canonical rules (quoted from `docs/STUDIO-UI-FOUNDATION.md`)

> **R1. Left navigation lists domains. Not modes. Not actions. Not site-specific items. Domains.**

> The current locked list:
> 1. **Sites** — the portfolio + every individual site
> 2. **Brainstorm** — capture ideas before promotion
> 3. **Plans** — the plan registry, decisions, runs
> 4. **Components** — the AI component library
> 5. **Media** — brand kit, assets, generation, usage
> 6. **Research** — intelligence loop, captures, vertical knowledge
> 7. **Admin** — keys, deploy targets, capability manifest, health

> **R2. The workspace reacts to the left nav.** A workspace is *what tools belong to this domain*. Each workspace declares its own tools.

> **R3. Shay is ambient, not a nav item.** She is never a left-nav domain.

> **R4. The Fritz filter** — every pixel earns its keep against "saves him a click | runs without him | makes him money | compounds learning | prevents a mistake."

> **The Page Rule** — a new page is justified only when **all four** are true: distinct intent · distinct primary surface · persists context independently · earns its slot. Default bias: *fewer pages, richer workspaces.*

> **Density rule** — Default to calm. The bench fills the screen. Chrome recedes. Tools appear on demand.

These are not aspirational. They are locked.

---

## 2. Foundation shell — `site-studio/public/workbench-foundation.html`

Last commit `dee1066` (2026-05-05) — "feat: align Workbench shell with frozen domains."

### Left rail (the 7 domains, frozen and rule-honoring)

| Icon | Domain | Verdict | What clicking does today |
|---|---|---|---|
| S | Sites | **WORKING** | Loads `/api/workflow/stage-catalog` + `data/workbench-plan-state.json`. Renders live preview bench with site/page/media/template toggles. The Sites Workbench you saw in the screenshot. |
| B | Brain *(Brainstorm)* | PLACEHOLDER | UI shell renders. Inbox/promote/parked submodes defined but no content API wired. Static text only. |
| P | Plans | **WORKING** | Loads plan state. Displays P0/P1/P2 task lanes, parent grid, metrics (active_parent_count, task_count, proof_count), pipeline visualizer badge. |
| C | Comp *(Components)* | PLACEHOLDER | UI shell renders. `buildComponentBench()` returns an empty canvas layer. No data API. |
| M | Media | PLACEHOLDER | UI shell renders. `buildMediaBench()` is a stub. No functional controls. |
| Intel *(Research)* | Intel | PLACEHOLDER | UI shell renders. `buildResearchBench()` is placeholder text. No API integration. |
| A | Admin | PLACEHOLDER | UI shell renders. `buildAdminBench()` is empty. No health check or environment wiring. |

### Bottom panels

| Tab | Verdict | What it does |
|---|---|---|
| Runs | **WORKING** | Pulls `data.current_run` from plan state. Displays run ID + current step. |
| Logs | PLACEHOLDER | Static hardcoded entries. No live log ingestion. |
| Trace | **WORKING** | Loads `/api/trace`, `/api/workflow/stage-catalog`. Displays workflow-as-data status + pipeline visualizer status + live event count. |
| Approvals | PLACEHOLDER | Static hardcoded entries. No approval gate data source. |
| Proof | **WORKING** | Pulls `proof_count`, `task_count` from plan state. Aggregates only — no proof detail navigation. |

### Right rail (Tools)

| Element | Verdict | What it does |
|---|---|---|
| Tool pods | PLACEHOLDER | `renderTools()` mounts pod containers from `mode.tools`. `mode.tools` is undefined for all domains except Sites. Pod drag/reorder works but no tools actually populate. |

### Foundation summary

**3 working surfaces** (Sites domain, Plans domain, three bottom panels) out of **13 total**. The shell is beautifully designed but **6 of 7 domain buttons are visual-only**.

---

## 3. `index.html` shell — `site-studio/public/index.html`

Last commit `bc08020` (2026-05-05) — today's "feat: ops jobs tab" addition.

### Workspace nav (5 entries)

| Entry | Verdict | What clicking does today |
|---|---|---|
| Brief | **WORKING** | `window.StudioBrief.mount()`. Renders interview form. Broadcasts `brief-updated` event with completion %. |
| Assets | **WORKING** | `window.StudioScreens.mountAssets()`. Loads `/api/assets`. Real media library UI. |
| Mission Control | **WORKING** | `window.StudioScreens.mountMCTab()`. Loads `/api/ops/*` routes. Renders job queue + worker status + deployment controls. |
| Ops *(added today)* | **WORKING** | `ops-jobs.js` mounts the seven-lane swimlane board + Stale Debt drawer + slide-over inspector + 5s polling. The MVP shipped today. |
| Deploy | **WORKING** | `window.StudioScreens.mountDeploy()` + `refreshDeployInfo()`. Fetches `/api/deploy-info`. Renders deployment checklist + live status. |

### Left rail (8 icons — separate from workspace nav)

| Rail icon | Verdict | What it does |
|---|---|---|
| Site | **WORKING** | `loadSiteTree()`. Fetches `/api/sites`. Clickable site list with deployed/built/gold status indicators. |
| Components | **WORKING** | `switchTab('components')` → `StudioScreens.mountComponents()`. |
| Media Studio | **WORKING** | `switchTab('assets')` → real asset browser. |
| Mission Control | **WORKING** | `switchTab('mc')` → real ops interface. |
| Intelligence | **WORKING** | `loadIntelligenceFeed()`. Fetches `/api/intel/findings`. Renders findings with severity badges + run-diagnostic / dismiss actions. |
| Research | **WORKING** | `loadResearchFeed()`. Fetches `/api/research/feed`. Renders research items by category. Supports `RunResearch()` POST. |
| Shay | **WORKING** | `switchTab('shay')` → Shay-Shay v2 UI. Integrates ShayHandoff + ShayWorkshop. |
| Deploy | **WORKING** | `switchTab('deploy')` → real deployment surface. |

### index.html summary

**13 working surfaces out of 13.** Almost everything in this shell is wired to live APIs.

---

## 4. The 5 + 7 + 11 problem (overlap visualized)

| index.html (5 workspace nav) | Foundation (7 domains) | Ops MVP (11 sub-tabs) |
|---|---|---|
| Brief | Sites | Pulse |
| Assets | Brainstorm *(Brain)* | Plans |
| Mission Control | Plans | Tasks |
| **Ops** *(added today)* | Components *(Comp)* | Jobs |
| Deploy | Media | Runs |
| | Research *(Intel)* | Proofs |
| | Admin | Agents |
| | | Reviews |
| | | Gaps |
| | | Memory |
| | | Debt |

**Plus `index.html` left rail (8 icons):** Site, Components, Media Studio, Mission Control, Intelligence, Research, Shay, Deploy.

Per R3, **Shay should not be a left-nav domain anywhere.** index.html violates this.

Per R1, **Ops should not be a workspace nav entry** — it's a workspace, not a domain. index.html violates this (added today).

---

## 5. Per-entry verdict table

Categories used:
- `canonical-match` — already on Foundation per rules, working
- `canonical-match-broken` — canonical entry but no data wiring (empty room)
- `belongs-inside-domain` — currently a sibling but per R1 should be a sub-page of an existing domain
- `legacy-must-port` — works in index.html but no canonical equivalent yet
- `deprecate` — orphan with no canonical home
- `rule-violation` — should not exist as a top-level entry per the rules

| Entry | Where it lives today | Verdict | Canonical home (if applicable) |
|---|---|---|---|
| Sites (Foundation) | Foundation rail | **canonical-match** | own domain |
| Brain/Brainstorm (Foundation) | Foundation rail | **canonical-match-broken** | own domain (needs wiring) |
| Plans (Foundation) | Foundation rail | **canonical-match** | own domain |
| Components (Foundation) | Foundation rail | **canonical-match-broken** | own domain (needs wiring) |
| Media (Foundation) | Foundation rail | **canonical-match-broken** | own domain (needs wiring) |
| Research/Intel (Foundation) | Foundation rail | **canonical-match-broken** | own domain (needs wiring) |
| Admin (Foundation) | Foundation rail | **canonical-match-broken** | own domain (needs wiring) |
| Brief (index workspace nav) | index.html | **belongs-inside-domain** | tool inside Sites (per Section 4.1 — site brief is part of Sites workspace) |
| Assets (index workspace nav) | index.html | **belongs-inside-domain** | duplicates Media domain |
| Mission Control (index workspace nav) | index.html | **legacy-must-port** + **belongs-inside-domain** | belongs in Admin (worker queue, capability manifest per Section 4.7) |
| Ops (index workspace nav, added today) | index.html | **rule-violation** + **belongs-inside-domain** | dissolves: see §6 below |
| Deploy (index workspace nav) | index.html | **belongs-inside-domain** | belongs in Admin (deploy targets per Section 4.7) |
| Site (index left rail) | index.html | **canonical-match** | duplicates Foundation Sites |
| Components (index left rail) | index.html | **canonical-match** | duplicates Foundation Components (this one's WORKING; the Foundation's is empty) |
| Media Studio (index left rail) | index.html | **canonical-match** | duplicates Foundation Media (WORKING here, empty in Foundation) |
| Mission Control (index left rail) | index.html | **belongs-inside-domain** | inside Admin |
| Intelligence (index left rail) | index.html | **canonical-match** | duplicates Foundation Research (WORKING here, empty in Foundation) |
| Research (index left rail) | index.html | **canonical-match** | duplicates Foundation Research (WORKING here, empty in Foundation) |
| Shay (index left rail) | index.html | **rule-violation** | per R3, Shay is ambient — never a left-nav domain |
| Deploy (index left rail) | index.html | **belongs-inside-domain** | inside Admin |

---

## 6. The 11 Ops sub-tabs — where the rules say they belong

Per R1 ("domains only"), R2 ("workspaces hold tools"), and the Page Rule ("default bias: fewer pages, richer workspaces"), the 11 Ops sub-tabs dissolve like this:

| Ops sub-tab | Canonical home per Foundation Section 4 |
|---|---|
| Pulse | **Plans** (default home view) or **Sites** (portfolio overview) — pick one |
| Plans | **Plans** (it's literally the Plans domain — duplicate) |
| Tasks | **Plans** (Section 4.3 mentions tasks as part of Plans) |
| Jobs | **Admin** (Section 4.7: "worker queue") |
| Runs | **Plans** (Section 4.3: "decisions, runs") |
| Proofs | Either **Plans** (proof_count is part of plan state) or **Admin** (capability proofs) |
| Agents | **Admin** (Section 4.7: implied under "worker queue") |
| Reviews | **Admin** (Section 4.7: "approvals queue") |
| Gaps | **Admin** (Section 4.7: "system health") |
| Memory | could be its own — Section 4 doesn't have a Memory domain. Strong candidate to live in **Brain** *(Brainstorm)* since brain entries are memory candidates |
| Debt | **Admin** (Section 4.7: "system health" — debt cleanup) |

**Net effect:** Ops as a top-level concept disappears. Its sub-tabs become tools inside Plans + Admin (+ maybe Brain for Memory). The 11 sub-tabs collapse to **3 expanded existing domains**.

---

## 7. The empty-rooms list (Foundation surfaces with no data wiring)

These are the rooms in the Foundation that look right but don't actually do anything yet:

1. **Brainstorm domain** — UI shell, no content API
2. **Components domain** — `buildComponentBench()` returns empty canvas
3. **Media domain** — `buildMediaBench()` is a stub
4. **Research/Intel domain** — `buildResearchBench()` is placeholder text
5. **Admin domain** — `buildAdminBench()` is empty
6. **Logs bottom panel** — hardcoded fake entries
7. **Approvals bottom panel** — hardcoded fake entries
8. **All right-rail Tools** for non-Sites domains — pod containers but no tool definitions

---

## 8. The orphans-in-index list (index.html surfaces with no clean canonical home)

These are surfaces that work today in `index.html` but don't have a clear single home in the Foundation rules:

1. **Brief** — works, but Section 4.1 doesn't explicitly call out Brief as a Sites tool (only "site spec" and "design brief" implicitly). Needs a rules clarification or a sub-page declaration.
2. **Mission Control** — Section 4.7 has worker queue + approvals + health, which together cover most of MC. But MC's deployment controls overlap with Section 4.7's deploy-targets. Clean port.
3. **Shay tab** — direct R3 violation. Shay is ambient. The Shay tab in index.html is the wrong abstraction. Workshop UI is fine; making it a tab is not.
4. **Deploy as workspace nav** — works, fits Admin per Section 4.7. Just needs to move.
5. **Ops** — see Section 6. Dissolves into Plans + Admin (+ maybe Brain).

---

## 9. Three reconciliation paths

Each described, none chosen. Pick one to drive the next plan.

### Path A — Foundation wins
**Move:** Wire the Foundation's 6 empty domains to the live APIs already powering `index.html`. Move every working `index.html` surface into its canonical Foundation domain. Eventually serve `workbench-foundation.html` as `/`. Retire `index.html`.

**Cost:** Highest. ~6 domain wirings + 11 Ops-tab dissolutions + Shay un-tabbing + serve-route swap. Multi-session.

**Wins:** Fully honors locked rules. One shell. No drift. Aspirational architecture becomes operational reality.

**Risks:** You said you don't yet love the Foundation visual style ("too many round shapes"). Building everything into a shell you may not keep is wasted work.

### Path B — index.html wins
**Move:** Formally update `STUDIO-UI-FOUNDATION.md` to reflect the working `index.html` taxonomy. Deprecate `workbench-foundation.html`. Re-lock the rules around what actually ships value.

**Cost:** Lowest. Mostly a doc rewrite. Zero code migration.

**Wins:** Pragmatic. The doc matches reality. No more drift because there's only one canonical surface.

**Risks:** Breaks the freeze decision from 2026-05-04. The Foundation design was deliberate and beautiful — throwing it out is real loss. The 7-domain model may genuinely be better and we just haven't built it yet.

### Path C — Hybrid
**Move:** Keep the Foundation as a *designed roadmap document*. Continue shipping into `index.html` as the live shell. Each new feature in `index.html` carries a comment like `// canonical home: Plans domain` so the eventual port is half-done. Periodically migrate clusters of features when a domain reaches enough mass.

**Cost:** Medium, spread over time.

**Wins:** Doesn't force a now-decision. Lets you see Foundation evolve with real data while shipping value.

**Risks:** Slowest path. Drift continues. Requires a written rule that *every* new feature declares its canonical home, or this becomes lip service.

---

## 10. Why this matters for today's deferred decisions

The three questions you couldn't answer earlier:

- **D-deferred-1** *(which shell wins)* — Path A, B, or C is your answer.
- **D-deferred-2** *(where Ops tabs land)* — Section 6 above answers this for Path A. For Path B, Ops stays where it is and the Ops sub-tabs evolve organically. For Path C, Ops tabs land where convenient now with future-home comments.
- **D-deferred-3** *(visual style winner)* — independent of the architecture decision. You can prefer index.html's button density and still adopt Path A by re-styling the Foundation. Or prefer the Foundation visual and adopt Path B by porting its tokens into index.html.

---

## 11. What this doc is, and is not

**This doc IS:**
- A truthful inventory of today's state
- A direct quote of the canonical rules
- A per-entry verdict table
- A description of three concrete paths

**This doc is NOT:**
- A recommendation
- A code change
- A migration plan
- A binding decision

The follow-up plan (whichever path you pick) lives in `plans/` and gets its own audit + closeout cycle.

---

## 12. Companion artifact

Open `http://localhost:3334/shell-compare.html` in your browser. It renders both shells side-by-side in two iframes. Click around in both. Form an opinion by sight. Then come back and pick a path.
