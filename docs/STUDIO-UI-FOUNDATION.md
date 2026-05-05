# FAMtastic Site Studio — UI Foundation

**Status:** FROZEN canonical foundation — read before any UI work
**Date locked:** 2026-05-04
**Freeze decision:** 2026-05-04 — Fritz approved this as the Studio UI rulebook
**Supersedes:** any prior layout/shell proposal that conflicts with these rules
**Companion:** `docs/mockups/workbench-night.html` (the visual reference)

---

## 0. Identity (locked, not up for revision)

**FAMtastic Site Studio** is the application.

It is a **generator of AI-based components** — a collection of smaller components
working together to produce websites, media, plans, and intelligence at scale,
operated by one person.

It is not a CMS. It is not a developer dashboard. It is not an IDE.
It is an **AI Creation Workbench** for one operator running an empire of sites.

Every UI decision is judged against this identity. If a surface starts to feel
like a dev dashboard or an admin panel, it has drifted.

---

## 1. The Four Foundational Rules

These are the load-bearing rules. Every page, panel, and component obeys them.

### R1. Left nav is site-level only

The left navigation lists **the high-level domains of the application**.
Not modes within a workspace. Not actions. Not site-specific items.
Domains. The current locked list:

1. **Sites** — the portfolio + every individual site
2. **Brainstorm** — capture ideas before promotion
3. **Plans** — the plan registry, decisions, runs
4. **Components** — the AI component library (the heart of "generator of AI components")
5. **Media** — brand kit, assets, generation, usage
6. **Research** — intelligence loop, captures, vertical knowledge
7. **Admin** — keys, deploy targets, capability manifest, health

The list grows only when a new domain is justified by R4 (Fritz filter).
Adding a left-nav item is a frozen-guardrail-level decision.

### R2. The workspace reacts to the left nav

When a domain is selected in the left nav, the workspace asks one question:

> *"What tools belong in this workspace, given this domain?"*

The workspace then composes itself from those tools. Tools are not always-on.
The Sites workspace is not the same as the Plans workspace is not the same
as the Components workspace.

This means: there is no universal "tool shelf." Each workspace declares its
tools. A tool that's needed in two workspaces is registered in both, with
the same identity, so behavior stays consistent.

### R3. Shay is ambient, not a nav item

Shay is present everywhere. She listens (top-right whisper), she's reachable
(orb bottom-right), she proposes when triggered. **She is never a left-nav
domain.** Domains are *things*; Shay is *the air*.

### R4. The Fritz filter (every decision answers this)

For every feature, panel, button, and tool, ask:

> *"How does this help Fritz?"*

The answer must be one of:
- **Saves him a click** (efficiency)
- **Runs without him** (automation)
- **Makes him money** (revenue)
- **Compounds learning** (every site benefits from prior sites)
- **Prevents a mistake** (guardrail)

If the answer is "it's nice to have," "it's a best practice," or "users
expect it" — it does not earn its place. FAMtastic is for one operator
running 1,000 sites. Every pixel earns its keep against that mission.

---

## 2. The Visual Rule — Night Scheme

Extracted from `docs/mockups/workbench-night.html`. These tokens are the
design language. Any new surface inherits them.

### Color tokens

```
--bg-0:        #08080A     near-black canvas (the night)
--bg-1:        #0C0C10     elevated surface
--glass:       rgba(255,255,255,0.025)   default translucent panel
--glass-2:     rgba(255,255,255,0.045)   hover state
--border:      rgba(255,255,255,0.06)    default 1px hairline
--border-hi:   rgba(255,255,255,0.11)    hover hairline

--text-1:      #F2EFE8     primary, warm white
--text-2:      rgba(242,239,232,0.55)    secondary
--text-3:      rgba(242,239,232,0.32)    tertiary / labels

--glow-warm:   #F5C46B     primary accent (active, focus, urgency)
--glow-warm-2: #E6A856     warm gradient stop
--glow-cool:   #6FE0D2     Shay accent (presence, listening)
```

### Type scale

```
Display (Fraunces, weight 300-400, italic for emphasis):
  hero      clamp(38px, 5.4vw, 68px)   greetings, big titles
  large     38px                        hero card titles
  default   26px                        card titles

UI (Inter):
  body      16.5px                      paragraph
  small     14.5px                      card sub
  meta      12px                        secondary detail

Mono (JetBrains Mono):
  eyebrow   10.5px, letter-spacing 0.22-0.26em, uppercase
  data      11.5px, letter-spacing 0.04em
  kbd       10px,   letter-spacing 0.10em
```

### Glass spec (mandatory for all panels)

```
background:      var(--glass)
border:          1px solid var(--border)
backdrop-filter: blur(20-28px) saturate(180%)
border-radius:   16-20px (cards), 7-9px (kbd, pills)
box-shadow:      0 20px 40px -28px rgba(0,0,0,0.6),
                 inset 0 1px 0 rgba(255,255,255,0.03)
```

### Motion

```
ease:        cubic-bezier(0.16, 1, 0.3, 1)
durations:   400ms (hover), 600ms (transition), 1.2-1.6s (entrance)
breathe:     2.4-3.6s loop on pulses, presence dots, ambient orbs
entrance:    stagger 0.2s between elements, opacity + 22px translateY
```

### Glow rule

Glow is reserved for **focal points only**. Three places it appears:
1. The brand mark (subtle, always)
2. The active/hero element (warm radial halo)
3. Shay's presence dot + orb (cool, breathing)

Anywhere else — grayscale glass. Color is punctuation, not paint.

### Density rule

Default to **calm**. The bench fills the screen. Chrome recedes. Tools
appear on demand (hover-edge or CMD-K). No surface should ever feel
"packed." If a surface starts to feel busy, you're missing a workspace
or you're showing tools that should be contextual.

---

## 3. The Page Rule (how to decide if something needs its own page)

A new page is justified when **all four** of these are true:

1. **Distinct intent** — the user comes to this page with a different goal
   than any existing page (not just "a different view")
2. **Distinct primary surface** — the workspace render is fundamentally
   different (not just different data in the same shape)
3. **Persists context independently** — the user expects to leave and
   return and find the same state, separate from other pages
4. **Earns its left-nav slot or its sub-route** — passes the Fritz filter

If any of those is false, the need is a **mode**, **panel**, or **tool**
inside an existing workspace, not a new page.

**Default bias:** *fewer pages, richer workspaces.* A page is expensive —
each one is a new identity to maintain. A tool inside an existing workspace
is cheap. Lean toward tools.

---

## 4. Left Nav Inventory — Discovery

Each left-nav domain has the same discovery contract. Below is the
discovery for each of the seven locked domains.

### 4.1 Sites *(largest domain — has its own deeper rules)*

**Purpose.** Manage the empire. View the portfolio at a glance.
Drill into any individual site. Build, refine, ship, operate, and learn
from every site.

**Sub-needs (workspace tools when "Sites" is selected):**
- Portfolio view (all sites, status, stage, MRR, last touched)
- Single-site overview (the six-field site location block + brief)
- Page-by-page view (each page within a site — preview + edit)
- Section/component editor (drill into the page)
- Build trigger + monitor + trace
- Deploy + rollback
- Brand kit per site
- Asset usage map per site
- Conversation history per site
- Version history per site
- Per-site research / vertical knowledge

**What groups together:**
- Portfolio + single-site overview (same workspace, two zoom levels)
- Page view + section editor + preview (same workspace, drill-down)
- Build + deploy + trace (same workspace, the "ship" flow)

**What needs its own page (sub-route within Sites):**
- `/sites` — portfolio (default)
- `/sites/<tag>` — single-site overview
- `/sites/<tag>/build` — build/deploy/trace
- `/sites/<tag>/page/<page>` — page editor with preview

Anything more granular (sections, fields, assets) is a *panel inside*
those pages, not a new page. Per R3 of the page rule.

**Preview requirements.**
- Single-site overview: small thumbnail preview
- Page editor: live preview pane, side-by-side with editor
- Build/deploy: trace + status, no full preview (they go to the page editor for that)

**How does this help Fritz?**
- Saves clicks: portfolio shows everything in flight in one glance (efficiency + revenue)
- Compounds: build trace + intel loop feed back into every future site (learning)
- Prevents mistakes: deploy preflight + slug-collision guard (guardrail)

### 4.2 Brainstorm

**Purpose.** Capture ideas before they become plans. The inbox where
unstructured thought lives until it's promoted (or discarded).

**Sub-needs:**
- New capture (text, voice, paste, drop a file)
- Capture inbox (list of unpromoted captures, by source: phone / chat / detector / Shay)
- Capture detail (read the full capture, see its source, its inferred topic)
- Promote → plan / task / note / discard
- Search captures
- Connect related captures (proto-clustering)

**What groups together:**
- Capture + inbox + detail (one workspace, one flow)
- Promote action lives inside detail view

**What needs its own page:**
- `/brainstorm` — inbox (default)
- `/brainstorm/<id>` — single capture detail

Optional later: `/brainstorm/threads` — clustered related captures.

**Preview requirements.** None. Brainstorm is text-first.

**How does this help Fritz?**
- Saves clicks: phone capture lands here automatically (automation)
- Compounds: every captured idea is preserved, never lost (learning)
- Prevents mistakes: nothing becomes a plan without your explicit promotion (guardrail)

### 4.3 Plans

**Purpose.** Answer "where are we?" the same way on every surface.
Read, create, update, and supersede plans, tasks, and runs.

**Sub-needs:**
- Active plans list (six-field view per plan)
- Single plan detail (workstreams, tasks, runs, proof, decisions tail)
- Task list across plans (filterable)
- Run status (active runs with progress + stop conditions)
- Decisions log (append-only audit, searchable)
- Supersede flow (with confirmation)

**What groups together:**
- Plans + tasks + runs (same workspace, three depths)
- Decisions log is a panel/drawer, not a separate page

**What needs its own page:**
- `/plans` — active plans (default)
- `/plans/<id>` — plan detail with workstreams/tasks/runs

**Preview requirements.** None — text and list views.

**How does this help Fritz?**
- Saves clicks: one place to ask "where are we?" (efficiency)
- Prevents mistakes: append-only decisions log + explicit supersession (guardrail)
- Compounds: cross-plan task list reveals overlap (learning)

### 4.4 Components

**Purpose.** The AI component library. *This is the heart of FAMtastic
as a "generator of AI-based components."* Reusable building blocks that
get smarter every time they're used.

**Sub-needs:**
- Component grid (all components, filterable by type/status)
- Component detail (variants, usage map, dependencies, code)
- Promote a generated component into the library
- Edit/version a component
- See where a component is used across sites

**What groups together:**
- Grid + detail + usage map (one workspace)
- Promotion gate is inline in detail, not a separate page

**What needs its own page:**
- `/components` — grid (default)
- `/components/<id>` — single component detail

**Preview requirements.** Live render of the component (in isolation +
in-context across sites that use it).

**How does this help Fritz?**
- Compounds: every site contributes to the library, every new site uses it (learning)
- Saves time: promoted components are cited in builds (efficiency)
- Revenue: better library = better sites = more conversions (revenue)

### 4.5 Media

**Purpose.** The asset workspace. Brand kit, generated media, archival,
usage map, generation queue, replacement rules.

**Sub-needs:**
- Brand kit (per site)
- Asset library (filterable by site, type, source, rights)
- Media generation (route via capability manifest)
- Generation queue (active generations + history)
- Asset detail (usage map, source, rights, variants)
- Replacement rules (swap an asset everywhere it's used)

**What groups together:**
- Library + detail (one workspace, drill-down)
- Generation queue is a panel, not a page

**What needs its own page:**
- `/media` — library (default)
- `/media/<id>` — asset detail
- `/media/generate` — generation surface (dedicated because the form is big)

**Preview requirements.** Visual gallery default. Image/video preview in detail.

**How does this help Fritz?**
- Saves clicks: replacement rules update assets everywhere at once (automation)
- Revenue: better media = better sites (revenue)
- Compounds: generated assets feed back into the library (learning)

### 4.6 Research

**Purpose.** The intelligence layer. Captures across all sources, the
intelligence loop, vertical knowledge, promoted findings.

**Sub-needs:**
- Recent findings (intelligence loop output)
- Per-vertical knowledge (Pinecone-backed)
- Promoted findings (what's been injected into builds)
- Research queue (open research questions across plans)
- Source library (links, transcripts, reports)

**What groups together:**
- Findings + promotions + queue (one workspace)

**What needs its own page:**
- `/research` — recent findings (default)
- `/research/vertical/<name>` — per-vertical drill

**Preview requirements.** None — text and list.

**How does this help Fritz?**
- Compounds: research persists across sessions and surfaces (learning)
- Saves time: promoted findings auto-inject into builds (automation)

### 4.7 Admin

**Purpose.** Keys, deploy targets, capability manifest, health, worker
queue, approvals, exports.

**Sub-needs:**
- Capability manifest (what's wired, verified, partial, broken)
- Credentials / vault (Keychain-backed)
- Deploy targets (Netlify, GoDaddy, etc.)
- Worker queue (active jobs, history)
- Approvals queue (anything awaiting your decision)
- System health (Studio process, intelligence loop, cron status)
- Export packs (handoff a site as a portable bundle)

**What groups together:**
- Everything in Admin is one workspace, tabbed by sub-domain

**What needs its own page:**
- `/admin` — health overview (default)
- `/admin/capabilities` — capability manifest detail
- `/admin/approvals` — approvals queue
- `/admin/deploy-targets` — deploy config

Other items are panels inside `/admin` until they prove they need a page.

**Preview requirements.** None.

**How does this help Fritz?**
- Prevents mistakes: capability manifest is honest about what's broken (guardrail)
- Saves clicks: approvals queue centralizes decisions (efficiency)

---

## 5. The "New Page" Procedure

When any future need arises (yours, Codex's, Cowork's, Shay's), follow this
procedure to decide where it goes:

1. **Identify the domain.** Which left-nav slot does this belong to?
   If none, do not add a left-nav slot — find the closest existing domain.
2. **Apply the page rule (Section 3).** All four conditions met?
   If not, it's a tool/panel inside an existing workspace.
3. **Apply the Fritz filter (R4).** Which of the five values does it deliver?
   If "nice to have," cut it.
4. **Declare in the workspace's discovery.** Update Section 4 of this doc.
   Append to `decisions.jsonl` with type `add-page`.
5. **Inherit the visual rule (Section 2).** No new design tokens. No new
   patterns unless the existing vocabulary genuinely cannot express it
   (high bar — must be justified in the decision entry).
6. **Build it.** File-structure rule applies (its own CSS/JS file).

This procedure is the answer to "should this be a new page?" It removes
the decision from the moment of building and moves it to a written rule.

---

## 6. UX Principles (the consultant's distilled rules)

Eight principles, applied throughout. Drawn from the established UX literature
adapted to a single-operator AI creation tool:

1. **One primary action per surface.** The user always knows what to do next.
   Other actions are secondary (smaller, less colored, or contextual).
2. **Recognition over recall.** Don't make Fritz remember IDs, paths, or
   shortcuts. Show the breadcrumb. Suggest the next move. Pre-fill what's known.
3. **Progressive disclosure.** Hide advanced. Show the 80% case by default.
   "More" buttons / expanded states / hover-edge tools are the surface for the rest.
4. **Direct manipulation over forms.** When something is visible, the user
   should be able to act on it where it lives. Inline edits beat modal forms.
5. **Surface state, not options.** Show "MBSH is closest to ship," not
   "view by status." The system reasons about ranking; the user reads the result.
6. **Errors are quiet, recoveries are loud.** Failures don't shout. Successful
   recoveries (a build that auto-fixed an issue, a capture that promoted
   itself) are surfaced because they're the proof of compounding.
7. **No spinner without explanation.** Every wait state names what it's doing
   ("generating hero image via Imagen," not "loading…").
8. **Trust the canvas.** The bench is the work. Don't crowd it with chrome.
   The user came here to look at *the work*, not at the tool.

---

## 7. Naming and vocabulary (locked)

Words shape feel. These are the canonical terms. Don't mix synonyms.

| Use | Don't use |
|---|---|
| Workbench | dashboard, IDE, console |
| Bench (the work area) | viewport, canvas (canvas is HTML5) |
| Workspace (a domain's render) | mode, view, panel set |
| Capture | note, idea, memo |
| Plan / task / run | issue, ticket, job (job is for worker queue only) |
| Decision | log, change, update |
| Component (AI building block) | block, widget |
| Asset | media file, resource |
| Promote | accept, approve into |
| Supersede | replace, deprecate |
| Generate | create, make (when AI does the work) |
| Ship / deploy | publish, release |

---

## 8. Frozen Workspace Contract

Every production workspace declares this contract before design or code starts.
The contract is what lets Shay, the intelligence loop, and future agents know
what the screen is for and how work on that screen compounds.

```json
{
  "domain": "Sites | Brainstorm | Plans | Components | Media | Research | Admin",
  "route": "/domain/or/subroute",
  "parent": "the object this surface helps execute",
  "purpose": "what Fritz came here to accomplish",
  "primary_work_surface": "preview | prompt | graph | canvas | source board | environment board | threaded desk",
  "selected_object_model": ["site", "page", "section"],
  "contextual_tools": ["tools that are useful for the selected object only"],
  "shay_context": {
    "can_read": ["state Shay sees"],
    "can_propose": ["changes Shay can draft"],
    "requires_approval_for": ["writes, deploys, cost, canonical memory"]
  },
  "proof_required": ["what proves this work is done"],
  "promotion_targets": ["cerebrum", "SITE-LEARNINGS", "plan registry", "component library", "brand kit"],
  "anti_patterns": ["dashboard cards replacing the bench", "tools shown without purpose"]
}
```

Hard rule: if the contract cannot be filled in, the screen is not ready to
build. Missing contract fields become known gaps, not hidden assumptions.

## 9. Frozen Decisions

These are resolved by the freeze and should not be reopened during normal
implementation.

1. **Shay is ambient.** Shay Lite is the orb/presence. Shay Desk is invoked
   from the current workspace as an overlay/right-edge/threaded surface with
   page context; Shay is not a left-nav domain.
2. **Media is Media Studio.** Library is a supporting surface. The center job
   is prompt-first generation, comparison, promotion, and usage proof.
3. **The bench is the work.** Cards may represent repeated items such as sites
   or components, but they must never replace the task-shaped primary surface.
4. **Tools are contextual.** A tool appears because the selected object needs
   it. Tool order, visibility, and grouping are workspace state, not fixed nav.
5. **Plan-then-approve remains universal.** Any canonical write, brand-kit
   change, deploy, expensive generation, or destructive action proposes first.

---

## 10. Open questions (tracked after freeze)

These are honest gaps. Each becomes a `decisions.jsonl` entry once decided.

1. **Is "Brainstorm" the final name** or should it be "Inbox" / "Capture"
   / something else? Brainstorm reads as ideation; the actual purpose is
   *capture before promotion*. Naming should match purpose.
2. **Does Sites need a "Stages" mode** (Idea / Blueprint / Build / Ship /
   Operate) or does the portfolio default already convey lifecycle via
   status chips on each card?
3. **Where does the Capability Manifest belong** — Admin (current) or its
   own left-nav slot? Argument for own slot: it's a first-class platform
   service. Argument against: it's read-only most of the time.
4. **CMD-K scope** — does it search across all domains, or only within the
   current workspace? Recommend: across all, with the active workspace
   biased to the top.

---

## 11. What this doc IS, and IS NOT

**This doc IS:**
- The non-negotiable foundation for FAMtastic Site Studio's UI
- The rule book any agent (Claude, Codex, Cowork, Shay, future hires) reads first
- The supersession of any prior layout/shell proposal that conflicts with R1–R4

**This doc is NOT:**
- A spec (specs cite this doc; this doc doesn't replace them)
- A mockup (mockups cite this doc; this doc doesn't replace them)
- A roadmap (the master plan owns timing; this doc owns rules)

**Update procedure.** Changes to R1–R4, Section 2, Section 8, or Section 9
require a written
decision entry and your explicit approval. Changes to Section 4 (left-nav
discovery) require following the Section 5 procedure. Open questions
(Section 10) close as decisions are made and become entries in their
relevant section.

---

**Last reviewed by:** Fritz
**Next review trigger:** when adding any new left-nav domain, or when any
visual rule in Section 2 is challenged.
